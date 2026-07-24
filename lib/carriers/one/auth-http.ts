// ─────────────────────────────────────────────────────────────────────────────
// ONE (Ocean Network Express) browserless Auth0 login — pure fetch, no Playwright.
//
// This is the SERVERLESS-SAFE replacement for auth.ts's headless-chromium login.
// Vercel/Render serverless functions can't run Playwright, so we replicate ONE's
// Auth0 (classic Universal Login, auth0.js 9.26.1) authorization-code + PKCE flow
// with raw fetch() calls and a hand-rolled cookie jar (Node fetch does NOT persist
// cookies). The resulting access_token is an encrypted JWE that is used verbatim as
// the Bearer for /api/v2/quotation/* — same cache/dedup contract as auth.ts.
//
// REQUIRED ENV (set in .env.local / Vercel — NEVER hardcode credential values):
//   ONE_USERNAME   — ONE eCommerce login e-mail
//   ONE_PASSWORD   — ONE eCommerce password
//
// The token is cached in a module-global (hot-reload safe) so we only re-login when
// the token is missing/expired/401'd. Runs SERVER-SIDE ONLY.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "node:crypto"

// ── Auth0 flow constants (captured live from a real ONE login) ───────────────
const AUTHORIZE = "https://auth.one-line.com/authorize"
const TOKEN_URL = "https://auth.one-line.com/oauth/token"
const USERNAMEPASSWORD_URL = "https://auth.one-line.com/usernamepassword/login"
const LOGIN_CALLBACK_URL = "https://auth.one-line.com/login/callback"
const CLIENT_ID = "aKx0rt9fRDcjsG2PrdeQBLRjQs7cqZin"
const TENANT = "one-ciam-prod"
const CONNECTION = "Username-Password-Authentication"
const REDIRECT_URI = "https://ecomm.one-line.com/one-ecom/authorization/o-callback"
const SCOPE = "openid profile email offline_access"
const AUTH0_CLIENT_HEADER = "eyJuYW1lIjoiYXV0aDAuanMtdWxwIiwidmVyc2lvbiI6IjkuMjYuMSJ9"
const REDIRECT_URL_AFTER = "/prices/one-quote-booking"

// Assume ~55 min token life if `expires_in` is absent. Auth0 access tokens are
// typically 1h; we refresh a little early to avoid mid-request expiry.
const DEFAULT_TTL_MS = 55 * 60 * 1000

interface BearerCache {
  token: string
  expiresAt: number // epoch ms
}

// ── Module-global cache (survives Next.js hot-reload in dev) ─────────────────
declare global {
  // eslint-disable-next-line no-var
  var __oneBearerHttp: BearerCache | null | undefined
  // eslint-disable-next-line no-var
  var __oneBearerHttpInflight: Promise<string> | undefined
}
if (global.__oneBearerHttp === undefined) global.__oneBearerHttp = null

// Decode a JWT `exp` (seconds) → epoch ms, best-effort. Returns null on failure.
// (Kept for parity with auth.ts, though ONE's token is a JWE with no readable exp.)
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

// ── PKCE helpers ─────────────────────────────────────────────────────────────
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

// ── Cookie jar: simple Map<name,value>, same-host only (all auth hops share host)
class CookieJar {
  private jar = new Map<string, string>()

  absorb(res: Response): void {
    // undici exposes multiple Set-Cookie via getSetCookie(); fall back to get().
    const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] }
    const cookies: string[] =
      typeof anyHeaders.getSetCookie === "function"
        ? anyHeaders.getSetCookie()
        : res.headers.get("set-cookie")
          ? [res.headers.get("set-cookie") as string]
          : []
    for (const c of cookies) {
      const first = c.split(";")[0]
      const eq = first.indexOf("=")
      if (eq <= 0) continue
      const name = first.slice(0, eq).trim()
      const value = first.slice(eq + 1).trim()
      if (name) this.jar.set(name, value)
    }
  }

  header(): string {
    return Array.from(this.jar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")
  }
}

// Fetch with our cookie jar: sends the jar as Cookie, absorbs Set-Cookie, never
// auto-follows redirects (redirect:"manual") so callers can inspect Location.
async function jarFetch(
  jar: CookieJar,
  url: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers || {}) }
  const cookie = jar.header()
  if (cookie) headers["Cookie"] = cookie
  const res = await fetch(url, { ...init, headers, redirect: "manual" })
  jar.absorb(res)
  return res
}

// Follow up to `max` manual 3xx redirects on GET, accumulating cookies. Returns
// the final (non-redirect) response and the URL it was fetched from.
async function followRedirects(
  jar: CookieJar,
  startUrl: string,
  headers: Record<string, string>,
  max = 10
): Promise<{ res: Response; url: string }> {
  let url = startUrl
  for (let i = 0; i < max; i++) {
    const res = await jarFetch(jar, url, { method: "GET", headers })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location")
      if (!loc) return { res, url }
      url = new URL(loc, url).toString()
      continue
    }
    return { res, url }
  }
  throw new Error(`too many redirects starting from ${startUrl}`)
}

const BROWSERISH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

// Extract the `state` value out of a /login?state=... URL.
function stateFromLoginUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("state")
  } catch {
    return null
  }
}

// Pull a hidden-input value out of an HTML form: <input name="X" value="Y">.
function hiddenInput(html: string, name: string): string | null {
  // Order-agnostic: match an <input ...> tag that has both the name and a value.
  const tagRe = new RegExp(`<input\\b[^>]*\\bname=["']${name}["'][^>]*>`, "i")
  const tag = html.match(tagRe)?.[0]
  if (!tag) return null
  const val = tag.match(/\bvalue=["']([\s\S]*?)["']/i)?.[1]
  return val != null ? decodeHtmlEntities(val) : null
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

// Extract `_csrf` from the /login HTML. Auth0 classic embeds a JSON config blob
// (sometimes base64 in window.atob(...)) — be resilient across a few shapes.
function extractCsrf(html: string): string | null {
  // (a) hidden input name="_csrf"
  const fromInput = hiddenInput(html, "_csrf")
  if (fromInput) return fromInput

  // (b) a JSON key "_csrf":"..." anywhere in the page (inline config object)
  const inline = html.match(/"_csrf"\s*:\s*"([^"]+)"/)
  if (inline?.[1]) return inline[1]

  // (c) config embedded as base64 inside window.atob('...') — decode then search
  const atobMatches = html.match(/atob\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/g) || []
  for (const m of atobMatches) {
    const b64 = m.match(/["']([A-Za-z0-9+/=]+)["']/)?.[1]
    if (!b64) continue
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8")
      const hit = decoded.match(/"_csrf"\s*:\s*"([^"]+)"/)
      if (hit?.[1]) return hit[1]
    } catch {
      /* not base64 — skip */
    }
  }
  return null
}

/**
 * Browserless Auth0 login. Throws descriptive errors naming the failing step.
 */
async function loginHttp(): Promise<{ token: string; expiresIn: number | null }> {
  const username = process.env.ONE_USERNAME
  const password = process.env.ONE_PASSWORD
  if (!username || !password) {
    throw new Error(
      "ONE credentials missing — set ONE_USERNAME and ONE_PASSWORD in .env.local (server-side only)."
    )
  }

  const jar = new CookieJar()

  // 1) PKCE
  const codeVerifier = base64url(crypto.randomBytes(32))
  const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest())

  // 2) GET /authorize → follow 302s until the 200 /login HTML.
  let loginUrl: string
  let loginHtml: string
  try {
    const stateParam = JSON.stringify({
      state: crypto.randomUUID(),
      redirectUrl: REDIRECT_URL_AFTER,
    })
    const authorizeUrl =
      `${AUTHORIZE}?` +
      new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
        state: stateParam,
        prompt: "login",
      }).toString()

    const { res, url } = await followRedirects(jar, authorizeUrl, BROWSERISH_HEADERS)
    if (res.status !== 200) {
      throw new Error(`expected 200 at /login, got ${res.status} (url: ${url})`)
    }
    loginUrl = url
    loginHtml = await res.text()
    if (!/\/login\b/.test(loginUrl)) {
      throw new Error(`did not land on /login — final url was ${loginUrl}`)
    }
  } catch (e) {
    throw new Error(`ONE login step 2 (GET /authorize → /login) failed: ${errMsg(e)}`)
  }

  // 3) Parse _csrf + AUTH0_STATE from the /login page.
  let csrf: string
  let auth0State: string
  try {
    const s = stateFromLoginUrl(loginUrl)
    if (!s) throw new Error("no `state` in /login URL")
    auth0State = s
    const c = extractCsrf(loginHtml)
    if (!c) throw new Error("could not extract `_csrf` from /login HTML")
    csrf = c
  } catch (e) {
    throw new Error(`ONE login step 3 (parse /login HTML) failed: ${errMsg(e)}`)
  }

  // 4) POST /usernamepassword/login → 200 HTML with a wsfed auto-submit form.
  let wa: string
  let wresult: string
  let wctx: string
  try {
    const res = await jarFetch(jar, USERNAMEPASSWORD_URL, {
      method: "POST",
      headers: {
        ...BROWSERISH_HEADERS,
        "Content-Type": "application/json",
        Accept: "*/*",
        "auth0-client": AUTH0_CLIENT_HEADER,
        Origin: "https://auth.one-line.com",
        Referer: loginUrl,
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        tenant: TENANT,
        response_type: "code",
        scope: SCOPE,
        _csrf: csrf,
        state: auth0State,
        _intstate: "deprecated",
        username,
        password,
        connection: CONNECTION,
      }),
    })

    const html = await res.text()

    // Wrong creds / other errors → JSON or HTML error message.
    if (res.status !== 200) {
      let msg = html.slice(0, 300)
      try {
        const j = JSON.parse(html)
        msg = j.description || j.error_description || j.message || j.error || msg
      } catch {
        /* not JSON */
      }
      throw new Error(`ONE login failed: ${msg}`)
    }
    // A 200 can still be an error JSON body rather than the wsfed form.
    if (!/wresult/i.test(html)) {
      let msg = html.slice(0, 300)
      try {
        const j = JSON.parse(html)
        msg = j.description || j.error_description || j.message || j.error || msg
      } catch {
        /* not JSON */
      }
      throw new Error(`ONE login failed: ${msg}`)
    }

    const _wa = hiddenInput(html, "wa")
    const _wresult = hiddenInput(html, "wresult")
    const _wctx = hiddenInput(html, "wctx")
    if (!_wa || !_wresult || !_wctx) {
      throw new Error("could not parse wa/wresult/wctx from usernamepassword response")
    }
    wa = _wa
    wresult = _wresult
    wctx = _wctx
  } catch (e) {
    throw new Error(`ONE login step 4 (POST /usernamepassword/login) failed: ${errMsg(e)}`)
  }

  // 5) POST /login/callback (form-urlencoded) → 302 to /authorize/resume?state=...
  let resumeUrl: string
  try {
    const res = await jarFetch(jar, LOGIN_CALLBACK_URL, {
      method: "POST",
      headers: {
        ...BROWSERISH_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://auth.one-line.com",
        Referer: loginUrl,
      },
      body: new URLSearchParams({ wa, wresult, wctx }).toString(),
    })
    if (res.status < 300 || res.status >= 400) {
      throw new Error(`expected 302 from /login/callback, got ${res.status}`)
    }
    const loc = res.headers.get("location")
    if (!loc) throw new Error("no Location on /login/callback 302")
    resumeUrl = new URL(loc, LOGIN_CALLBACK_URL).toString()
    if (!/\/authorize\/resume/.test(resumeUrl)) {
      throw new Error(`unexpected redirect target: ${resumeUrl}`)
    }
  } catch (e) {
    throw new Error(`ONE login step 5 (POST /login/callback) failed: ${errMsg(e)}`)
  }

  // 6) GET /authorize/resume → 302 to o-callback?code=...
  let code: string
  try {
    const res = await jarFetch(jar, resumeUrl, { method: "GET", headers: BROWSERISH_HEADERS })
    if (res.status < 300 || res.status >= 400) {
      throw new Error(`expected 302 from /authorize/resume, got ${res.status}`)
    }
    const loc = res.headers.get("location")
    if (!loc) throw new Error("no Location on /authorize/resume 302")
    const target = new URL(loc, resumeUrl)
    const c = target.searchParams.get("code")
    if (!c) throw new Error(`no ?code in resume redirect: ${target.toString()}`)
    code = c
  } catch (e) {
    throw new Error(`ONE login step 6 (GET /authorize/resume) failed: ${errMsg(e)}`)
  }

  // 7) POST /oauth/token → 200 JSON with access_token + expires_in.
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        ...BROWSERISH_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    })
    const text = await res.text()
    if (res.status !== 200) {
      throw new Error(`token endpoint returned ${res.status}: ${text.slice(0, 300)}`)
    }
    let json: { access_token?: string; expires_in?: number }
    try {
      json = JSON.parse(text)
    } catch {
      throw new Error(`token endpoint returned non-JSON: ${text.slice(0, 200)}`)
    }
    if (!json.access_token) {
      throw new Error(`token endpoint JSON had no access_token: ${text.slice(0, 200)}`)
    }
    return {
      token: json.access_token,
      expiresIn: typeof json.expires_in === "number" ? json.expires_in : null,
    }
  } catch (e) {
    throw new Error(`ONE login step 7 (POST /oauth/token) failed: ${errMsg(e)}`)
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Returns a cached valid bearer, or performs a browserless login to obtain one.
 * Concurrent callers share a single in-flight login (no thundering herd).
 */
export async function getOneBearerHttp(): Promise<string> {
  if (isValid(global.__oneBearerHttp)) return global.__oneBearerHttp!.token

  if (global.__oneBearerHttpInflight) return global.__oneBearerHttpInflight

  global.__oneBearerHttpInflight = (async () => {
    try {
      const { token, expiresIn } = await loginHttp()
      // ONE's access_token is an encrypted JWE (no readable exp) — prefer the
      // token endpoint's `expires_in`, then a decodable JWT exp, then default TTL.
      const expiresAt =
        (expiresIn != null ? Date.now() + expiresIn * 1000 : null) ??
        jwtExpiryMs(token) ??
        Date.now() + DEFAULT_TTL_MS
      global.__oneBearerHttp = { token, expiresAt }
      return token
    } finally {
      global.__oneBearerHttpInflight = undefined
    }
  })()

  return global.__oneBearerHttpInflight
}

/** Invalidate the cached bearer — call on a 401 so the next request re-logs-in. */
export function invalidateOneBearerHttp(): void {
  global.__oneBearerHttp = null
}
