import { NextResponse } from "next/server"

const CDN = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1"
const FALLBACK = "https://latest.currency-api.pages.dev/v1"

async function fetchWithFallback(path: string) {
  try {
    const res = await fetch(`${CDN}${path}`, { next: { revalidate: 3600 } })
    if (res.ok) return res.json()
  } catch { /* fall through */ }
  const res = await fetch(`${FALLBACK}${path}`, { next: { revalidate: 3600 } })
  return res.json()
}

export async function GET() {
  try {
    const [rates, currencies] = await Promise.all([
      fetchWithFallback("/currencies/usd.json"),
      fetchWithFallback("/currencies.json"),
    ])

    return NextResponse.json({
      usdToInr: rates?.usd?.inr ?? 84,
      rates: rates?.usd ?? {},
      currencies: currencies ?? {},
    })
  } catch {
    return NextResponse.json({ usdToInr: 84, rates: { inr: 84, usd: 1 }, currencies: {} })
  }
}
