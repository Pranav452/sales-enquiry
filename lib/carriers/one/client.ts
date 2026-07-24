// ─────────────────────────────────────────────────────────────────────────────
// ONE API client — thin fetch wrapper that:
//   • attaches the Auth0 bearer (from auth.ts),
//   • throttles outgoing calls (Apigee rate-limits ONE → 429 on rapid repeat),
//   • retries ONCE on 401 by invalidating + re-logging-in the bearer.
// SERVER-SIDE ONLY. Never import from a client component.
// ─────────────────────────────────────────────────────────────────────────────

// ── Auth switch point ─────────────────────────────────────────────────────────
// Default to the browserless HTTP login (Vercel serverless can't run Playwright).
// Set ONE_AUTH_MODE="browser" to fall back to the Playwright login (local capture).
import { getOneBearerHttp, invalidateOneBearerHttp } from "./auth-http"
import { getOneBearer as getOneBearerBrowser, invalidateOneBearer as invalidateOneBearerBrowser } from "./auth"

const USE_BROWSER_AUTH = process.env.ONE_AUTH_MODE === "browser"
const getOneBearer = USE_BROWSER_AUTH ? getOneBearerBrowser : getOneBearerHttp
const invalidateOneBearer = USE_BROWSER_AUTH ? invalidateOneBearerBrowser : invalidateOneBearerHttp

export const ONE_BASE = "https://ecomm.one-line.com"

// ── Simple global throttle: min gap between ONE calls (Apigee friendliness) ──
const MIN_GAP_MS = 1200

declare global {
  // eslint-disable-next-line no-var
  var __oneLastCallAt: number | undefined
}

async function throttle(): Promise<void> {
  const last = global.__oneLastCallAt ?? 0
  const wait = last + MIN_GAP_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  global.__oneLastCallAt = Date.now()
}

export interface OneFetchOptions {
  method?: "GET" | "POST"
  body?: unknown
  // extra query params for GET convenience
  query?: Record<string, string | number | undefined>
}

/**
 * Authenticated fetch against ONE. Returns parsed JSON (typed by caller).
 * Throws on non-OK responses (after a single 401 re-login retry).
 */
export async function oneFetch<T>(path: string, opts: OneFetchOptions = {}): Promise<T> {
  const { method = "GET", body, query } = opts

  const url = new URL(path.startsWith("http") ? path : `${ONE_BASE}${path}`)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v))
    }
  }

  async function attempt(token: string): Promise<Response> {
    await throttle()
    return fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      // ONE calls are dynamic spot prices — never cache.
      cache: "no-store",
    })
  }

  let token = await getOneBearer()
  let res = await attempt(token)

  // ── 401 → invalidate + re-login once ──────────────────────────────────────
  if (res.status === 401) {
    invalidateOneBearer()
    token = await getOneBearer()
    res = await attempt(token)
  }

  if (res.status === 429) {
    throw new Error("ONE rate limit hit (429) — please retry in a moment.")
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`ONE request failed (${res.status}) for ${path}${text ? `: ${text.slice(0, 300)}` : ""}`)
  }

  return (await res.json()) as T
}
