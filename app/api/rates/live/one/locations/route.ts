// GET /api/rates/live/one/locations?q=<text>&type=origin|destination
// Autocomplete proxy for the ONE live-quote form. Server-side (bearer never
// reaches the client). Returns OneLocation[].

export const runtime = "nodejs"
export const maxDuration = 120   // first call may trigger a headless login

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { searchLocations } from "@/lib/carriers/one/quote"

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const typeParam = req.nextUrl.searchParams.get("type")
  const orgDest = typeParam === "destination" ? "destination" : "origin"

  if (q.length < 2) return NextResponse.json([])

  try {
    const locations = await searchLocations(q, orgDest)
    return NextResponse.json(locations)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Location search failed"
    console.error("[rates/live/one/locations] Error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
