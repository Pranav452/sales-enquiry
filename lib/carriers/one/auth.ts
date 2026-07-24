// ─────────────────────────────────────────────────────────────────────────────
// ONE (Ocean Network Express) headless auth — captures an Auth0 bearer token.
//
// ONE's quote endpoints (/api/v2/quotation/*) sit behind Auth0 at auth.one-line.com
// and require an `Authorization: Bearer <access_token>` header (cookies alone → 401).
// We obtain that token by driving a headless chromium through the real login once,
// then intercepting the bearer header off the first authenticated in-page request.
//
// REQUIRED ENV (set in .env.local — NEVER hardcode credential values):
//   ONE_USERNAME   — ONE eCommerce login e-mail
//   ONE_PASSWORD   — ONE eCommerce password
//
// The token is cached in a module-global (hot-reload safe, same pattern as
// lib/mssql/client.ts) so we only re-login when the token is missing/expired/401'd.
// All of this runs SERVER-SIDE ONLY — creds and bearer never reach the client.
// ─────────────────────────────────────────────────────────────────────────────

import type { Browser } from "playwright"

const QUOTE_PAGE_URL = "https://ecomm.one-line.com/one-ecom/prices/one-quote-booking"
// Any authenticated quotation call carries the bearer we want to lift.
const QUOTE_API_MATCH = "/api/v2/quotation/"

// Assume ~55 min token life if we can't decode an exp claim. Auth0 access tokens
// are typically 1h; we refresh a little early to avoid mid-request expiry.
const DEFAULT_TTL_MS = 55 * 60 * 1000

interface BearerCache {
  token: string
  expiresAt: number   // epoch ms
}

// ── Module-global cache (survives Next.js hot-reload in dev) ─────────────────
declare global {
  // eslint-disable-next-line no-var
  var __oneBearer: BearerCache | null | undefined
  // eslint-disable-next-line no-var
  var __oneBearerInflight: Promise<string> | undefined
}
if (global.__oneBearer === undefined) global.__oneBearer = null

// Decode a JWT `exp` (seconds) → epoch ms, best-effort. Returns null on failure.
function jwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1]
    if (!payload) return null
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    const exp = JSON.parse(json).exp
    if (typeof exp === "number") return exp * 1000
    return null
  } catch {
    return null
  }
}

function isValid(cache: BearerCache | null | undefined): cache is BearerCache {
  return !!cache && Date.now() < cache.expiresAt - 30_000 // 30s safety margin
}

/**
 * Headless-login and capture the Authorization bearer.
 * Throws a clear, descriptive error on missing creds, CAPTCHA/challenge, or timeout.
 */
async function login(): Promise<string> {
  const username = process.env.ONE_USERNAME
  const password = process.env.ONE_PASSWORD
  if (!username || !password) {
    throw new Error(
      "ONE credentials missing — set ONE_USERNAME and ONE_PASSWORD in .env.local (server-side only)."
    )
  }

  // Lazy import so the (heavy, native) playwright module only loads when a live
  // quote is actually requested — keeps cold API routes light.
  const { chromium } = await import("playwright")

  // ONE_HEADFUL=1 → run a visible browser so you can watch the login.
  // ONE_DEBUG=1   → verbose console diagnostics + a failure screenshot.
  const headful = process.env.ONE_HEADFUL === "1"
  const debug = process.env.ONE_DEBUG === "1" || headful
  const dlog = (...a: unknown[]) => debug && console.log("[one/auth]", ...a)

  let browser: Browser | null = null
  const trace: unknown[] = [] // ONE_CAPTURE trace, read in finally
  try {
    browser = await chromium.launch({ headless: !headful })
    const context = await browser.newContext()
    const page = await context.newPage()

    // Capture the bearer off the first authenticated quotation request.
    // Track EVERY quotation URL seen (with/without auth) for diagnostics.
    let capturedToken: string | null = null
    const quotationHits: string[] = []
    page.on("request", (req) => {
      if (!req.url().includes(QUOTE_API_MATCH)) return
      const auth = req.headers()["authorization"]
      quotationHits.push(`${req.method()} ${req.url()} auth=${auth ? "yes" : "no"}`)
      if (capturedToken) return
      if (auth && /^bearer\s+/i.test(auth)) {
        capturedToken = auth.replace(/^bearer\s+/i, "").trim()
        dlog("bearer captured from", req.url())
      }
    })

    // ONE_CAPTURE=1 → record the full Auth0 login network trace so the flow can be
    // rebuilt as browserless fetch() calls (Vercel serverless can't run Playwright).
    // Password value is REDACTED; only request/response shape is written to disk.
    const capture = process.env.ONE_CAPTURE === "1"
    if (capture) {
      const redact = (s: string | null) =>
        !s ? s : s.replace(new RegExp(encodeURIComponent(password).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "«PW»")
              .replace(new RegExp(password.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "«PW»")
      page.on("request", (req) => {
        const u = req.url()
        if (!/auth\.one-line\.com|o-callback|\/oauth\/|\/authorize|\/login|\/usernamepassword/.test(u)) return
        trace.push({
          kind: "request",
          method: req.method(),
          url: u,
          resourceType: req.resourceType(),
          headers: req.headers(),
          postData: redact(req.postData()),
        })
      })
      page.on("response", async (res) => {
        const u = res.url()
        if (!/auth\.one-line\.com|o-callback|\/oauth\/|\/authorize|\/login|\/usernamepassword/.test(u)) return
        const h = res.headers()
        trace.push({
          kind: "response",
          status: res.status(),
          url: u,
          location: h["location"] || null,
          setCookie: h["set-cookie"] ? "«present»" : null,
          contentType: h["content-type"] || null,
        })
      })
    }

    // 1) Navigate to the quote page — Auth0 redirects to auth.one-line.com login.
    await page.goto(QUOTE_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 })

    // 2) Defensive CAPTCHA / challenge detection (none seen 2026-07-22).
    const challenge = await page
      .locator(
        "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], div.g-recaptcha, [id*='captcha'], text=/verify you are human/i"
      )
      .first()
      .isVisible()
      .catch(() => false)
    if (challenge) {
      throw new Error(
        "ONE login blocked by a CAPTCHA/challenge — headless auto-login cannot proceed; a manual token refresh is required."
      )
    }

    // 3) Fill credentials. Auth0's Universal Login uses name=username / name=password.
    //    Kept resilient with a couple of fallback selectors.
    const userField = page.locator(
      "input[name='username'], input[name='email'], input[type='email']"
    ).first()
    await userField.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {
      throw new Error("ONE login form not found — Auth0 page layout may have changed.")
    })
    await userField.fill(username)

    const passField = page.locator("input[name='password'], input[type='password']").first()
    // Some Auth0 flows split username/password into two steps — advance if needed.
    if (!(await passField.isVisible().catch(() => false))) {
      await page.locator("button[type='submit'], button:has-text('Continue')").first().click().catch(() => {})
      await passField.waitFor({ state: "visible", timeout: 15_000 })
    }
    await passField.fill(password)

    // 4) Submit and wait to land back on ecomm.one-line.com.
    dlog("submitting credentials…")
    await page.locator("button[type='submit'], button:has-text('Continue'), button:has-text('Log In')").first().click()
    await page.waitForURL(/ecomm\.one-line\.com/, { timeout: 60_000 }).catch(() => {
      // Not fatal by itself — the interceptor may still fire — but usually signals bad creds.
    })
    await page.waitForTimeout(2_000) // let post-login redirects settle
    dlog("post-submit URL:", page.url())
    // If still on the auth domain, credentials/flow failed — surface the on-page error.
    if (/auth\.one-line\.com/.test(page.url())) {
      const errText = await page
        .locator("[class*='error'], [role='alert'], .ulp-error-info")
        .first()
        .innerText()
        .catch(() => "")
      throw new Error(
        `ONE login did not complete — still on the Auth0 login page after submit${
          errText ? ` (page says: "${errText.trim()}")` : ""
        }. Check ONE_USERNAME / ONE_PASSWORD, or a challenge was shown.`
      )
    }

    // 5) After auth, ONE lands on the eCommerce dashboard — which fires NO
    //    /api/v2/quotation/* calls, so the interceptor would never see a bearer.
    //    Explicitly load the quote page: on mount its SPA calls quotation endpoints
    //    (locations-history, service-scope-config, recent-search-history), each
    //    carrying the bearer we lift. Re-navigate only if we don't already have it.
    if (!capturedToken) {
      dlog("re-navigating to quote page to trigger quotation calls…")
      await page
        .goto(QUOTE_PAGE_URL, { waitUntil: "networkidle", timeout: 60_000 })
        .catch(() => {})
      dlog("quote page URL after nav:", page.url())
    }

    // 6) Poll for the intercepted bearer.
    const deadline = Date.now() + 30_000
    while (!capturedToken && Date.now() < deadline) {
      await page.waitForTimeout(500)
    }
    dlog(`quotation requests seen: ${quotationHits.length}`)
    quotationHits.slice(0, 12).forEach((h) => dlog("  •", h))

    // 6b) Fallback: some builds attach the token from an Auth0 SPA cache in
    //     localStorage rather than a request we caught. Scan storage for a JWT.
    if (!capturedToken) {
      capturedToken = await page
        .evaluate(() => {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              if (!k) continue
              const raw = localStorage.getItem(k) || ""
              // Auth0 stores an object with body.access_token; also match a bare JWT.
              try {
                const obj = JSON.parse(raw)
                const t = obj?.body?.access_token || obj?.access_token
                if (typeof t === "string" && t.split(".").length === 3) return t
              } catch {
                if (/^ey[\w-]+\.[\w-]+\.[\w-]+$/.test(raw)) return raw
              }
            }
          } catch {
            /* storage may be inaccessible */
          }
          return null
        })
        .catch(() => null)
    }

    if (!capturedToken) {
      if (debug) {
        const keys = await page
          .evaluate(() => {
            const ls = Object.keys(localStorage)
            const ss = Object.keys(sessionStorage)
            return { url: location.href, localStorage: ls, sessionStorage: ss }
          })
          .catch(() => null)
        dlog("FAILURE state:", JSON.stringify(keys))
        dlog("quotation hits total:", quotationHits.length, quotationHits)
        await page
          .screenshot({ path: "one-auth-failure.png", fullPage: true })
          .then(() => dlog("saved screenshot → one-auth-failure.png (project root)"))
          .catch(() => {})
      }
      throw new Error(
        "ONE login completed but no bearer token was captured. Re-run with ONE_DEBUG=1 " +
          "(or ONE_HEADFUL=1 to watch) — check server console for the post-login URL, the " +
          "quotation requests seen, and one-auth-failure.png."
      )
    }

    dlog("SUCCESS — bearer length", capturedToken.length)
    return capturedToken
  } finally {
    if (process.env.ONE_CAPTURE === "1" && trace.length) {
      try {
        const fs = await import("fs")
        fs.writeFileSync("one-auth-trace.json", JSON.stringify(trace, null, 2))
        console.log(`[one/auth] wrote ${trace.length} trace entries → one-auth-trace.json`)
      } catch (e) {
        console.log("[one/auth] failed to write trace:", e)
      }
    }
    await browser?.close().catch(() => {})
  }
}

/**
 * Returns a cached valid bearer, or performs a headless login to obtain a fresh one.
 * Concurrent callers share a single in-flight login (no thundering herd).
 */
export async function getOneBearer(): Promise<string> {
  if (isValid(global.__oneBearer)) return global.__oneBearer!.token

  if (global.__oneBearerInflight) return global.__oneBearerInflight

  global.__oneBearerInflight = (async () => {
    try {
      const token = await login()
      const expiresAt = jwtExpiryMs(token) ?? Date.now() + DEFAULT_TTL_MS
      global.__oneBearer = { token, expiresAt }
      return token
    } finally {
      global.__oneBearerInflight = undefined
    }
  })()

  return global.__oneBearerInflight
}

/** Invalidate the cached bearer — call on a 401 so the next request re-logs-in. */
export function invalidateOneBearer(): void {
  global.__oneBearer = null
}

// ─────────────────────────────────────────────────────────────────────────────
// captureQuoteBodyTemplate() — DEV HELPER STUB (not wired into any route).
//
// The exact request body for POST /api/v2/quotation/schedules/vessel-dates-booking
// was NOT captured during recon (the page uses interceptor-resistant calls). To
// finish quote.ts's body shape, run a real headless session ONCE, drive the ONE
// form for a known lane (e.g. Nhava Sheva → Rotterdam, DRY20, 18000 KGS, FAK DRY),
// and log the outgoing POST body. Steps:
//
//   1. Reuse the login() flow above (do NOT close the browser after capture).
//   2. Register a request listener BEFORE submitting the form:
//        page.on("request", (req) => {
//          if (req.method() === "POST" &&
//              req.url().includes("/quotation/schedules/vessel-dates-booking")) {
//            console.log("VESSEL-DATES BODY:", req.postData())
//          }
//        })
//   3. Programmatically fill the ONE form (origin, dest, equipment, qty, weight,
//      commodity) and click "Search" so the SPA issues the real POST.
//   4. Copy the logged JSON into buildVesselDatesBody() in quote.ts and remove the
//      `// TODO verify against live capture` markers there.
//
// Left as a documented stub because no ONE credentials are available at build time.
// ─────────────────────────────────────────────────────────────────────────────
// export async function captureQuoteBodyTemplate(): Promise<void> { /* see notes above */ }
