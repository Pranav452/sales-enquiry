// GET /api/rates/live/one/commodity?q=<text>
// Autocomplete proxy for the ONE live-quote commodity search. Server-side (bearer
// never reaches the client). Returns OneCommodity[].

export const runtime = "nodejs"
export const maxDuration = 120   // first call may trigger a headless login

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { searchCommodities } from "@/lib/carriers/one/quote"

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""

  if (q.length < 2) return NextResponse.json([])

  try {
    const commodities = await searchCommodities(q)
    return NextResponse.json(commodities)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Commodity search failed"
    console.error("[rates/live/one/commodity] Error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
