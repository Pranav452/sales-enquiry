import { NextResponse } from "next/server"

const CDN = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1"
const FALLBACK = "https://latest.currency-api.pages.dev/v1"

// ─── DGFT customs-notified rates ───────────────────────────────
// Source: https://www.dgft.gov.in/CP/?opt=currency-list-exchange-rates
// Two-step: GET the page to obtain a CSRF token + session cookie,
// then POST to the viewRates service endpoint (same call the page's
// DataTable makes). Rates change only on customs notifications
// (roughly fortnightly), so a long cache is fine.

const DGFT_PAGE = "https://www.dgft.gov.in/CP/?opt=currency-list-exchange-rates"
const DGFT_API =
  "https://www.dgft.gov.in/CP/webHP?requestType=ApplicationRH&actionVal=service&screen=viewRates&screenId=9000012354"

export interface DgftRate {
  name: string
  import: number   // INR per unit — customs import rate
  export: number   // INR per unit — customs export rate
  unit: number     // units of foreign currency (e.g. 100 for JPY)
  effectiveDate: string
}

interface DgftCache {
  fetchedAt: number
  rates: Record<string, DgftRate> | null
}

// Module-level cache survives across requests within a warm lambda /
// dev server (same global-var pattern as the MSSQL pools).
const globalForDgft = globalThis as unknown as { __dgftCache?: DgftCache }

const DGFT_TTL = 6 * 60 * 60 * 1000 // 6 hours

interface DgftApiRow {
  currcode: string | null
  currname: string | null
  effdate: string | null
  importval: number | null
  expovalue: number | null
  fcrUnit: number | null
}

async function fetchDgftRates(): Promise<Record<string, DgftRate> | null> {
  const cached = globalForDgft.__dgftCache
  if (cached && Date.now() - cached.fetchedAt < DGFT_TTL) return cached.rates

  try {
    const pageRes = await fetch(DGFT_PAGE, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!pageRes.ok) throw new Error(`DGFT page ${pageRes.status}`)

    const html = await pageRes.text()
    const csrf = /name="_csrf"\s+content="([^"]+)"/.exec(html)?.[1]
    if (!csrf) throw new Error("DGFT csrf token not found")

    const setCookies: string[] =
      typeof pageRes.headers.getSetCookie === "function"
        ? pageRes.headers.getSetCookie()
        : [pageRes.headers.get("set-cookie") ?? ""].filter(Boolean)
    const cookieHeader = setCookies.map((c) => c.split(";")[0]).join("; ")

    const body =
      "dataJson%5BformData%5D=" +
      encodeURIComponent(JSON.stringify({ dateFrom: "", dateTo: "", currencyCodeInput: "" }))

    const apiRes = await fetch(`${DGFT_API}&_csrf=${csrf}`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookieHeader,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    if (!apiRes.ok) throw new Error(`DGFT api ${apiRes.status}`)

    const json = (await apiRes.json()) as { data?: DgftApiRow[] }
    if (!Array.isArray(json.data) || json.data.length === 0) throw new Error("DGFT empty data")

    const rates: Record<string, DgftRate> = {}
    for (const row of json.data) {
      if (!row.currcode || row.importval == null || row.expovalue == null) continue
      rates[row.currcode.toUpperCase()] = {
        name: row.currname ?? row.currcode,
        import: row.importval,
        export: row.expovalue,
        unit: row.fcrUnit ?? 1,
        effectiveDate: row.effdate ?? "",
      }
    }

    globalForDgft.__dgftCache = { fetchedAt: Date.now(), rates }
    return rates
  } catch {
    // Keep stale cache if we have one; otherwise record the failure
    // briefly so we don't hammer DGFT on every request.
    if (cached?.rates) return cached.rates
    globalForDgft.__dgftCache = { fetchedAt: Date.now() - DGFT_TTL + 5 * 60 * 1000, rates: null }
    return null
  }
}

// ─── Live market rates (existing) ──────────────────────────────

async function fetchWithFallback(path: string) {
  try {
    const res = await fetch(`${CDN}${path}`, { next: { revalidate: 3600 } })
    if (res.ok) return res.json()
  } catch { /* fall through */ }
  const res = await fetch(`${FALLBACK}${path}`, { next: { revalidate: 3600 } })
  return res.json()
}

export async function GET() {
  const [market, dgft] = await Promise.allSettled([
    Promise.all([
      fetchWithFallback("/currencies/usd.json"),
      fetchWithFallback("/currencies.json"),
    ]),
    fetchDgftRates(),
  ])

  const [rates, currencies] =
    market.status === "fulfilled" ? market.value : [null, null]

  return NextResponse.json({
    usdToInr: rates?.usd?.inr ?? 84,
    rates: rates?.usd ?? { inr: 84, usd: 1 },
    currencies: currencies ?? {},
    dgft: dgft.status === "fulfilled" ? dgft.value : null,
  })
}
