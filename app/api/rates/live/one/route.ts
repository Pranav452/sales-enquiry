// POST /api/rates/live/one
// Body: { originLocationCode, destinationLocationCode, equipment, quantity, cargoWeight, commodityGroup?, commodityCode?, date? }
// → normalized OneQuoteResult { fetchedAt, sailings:[...] }
//
// All ONE calls (headless login + quote) run here on the server — the bearer
// token and ONE credentials are NEVER exposed to the client.

export const runtime = "nodejs"       // playwright + chromium need the Node runtime
export const maxDuration = 120        // headless login can take a while on cold start

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getVesselDates, isEquipmentKey } from "@/lib/carriers/one/quote"
import type { OneQuoteRequest } from "@/lib/carriers/one/types"

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: Partial<OneQuoteRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const originLocationCode = body.originLocationCode?.trim()
  const destinationLocationCode = body.destinationLocationCode?.trim()
  const equipment = body.equipment
  const quantity = Number(body.quantity ?? 1)
  const cargoWeight = Number(body.cargoWeight ?? 0)

  if (!originLocationCode || !destinationLocationCode) {
    return NextResponse.json({ error: "originLocationCode and destinationLocationCode are required" }, { status: 400 })
  }
  if (!equipment || !isEquipmentKey(equipment)) {
    return NextResponse.json({ error: "Invalid or missing equipment" }, { status: 400 })
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "quantity must be >= 1" }, { status: 400 })
  }
  if (!Number.isFinite(cargoWeight) || cargoWeight <= 0) {
    return NextResponse.json({ error: "cargoWeight (KGS) must be > 0" }, { status: 400 })
  }

  try {
    const result = await getVesselDates({
      originLocationCode,
      destinationLocationCode,
      originLocationType: body.originLocationType?.trim() || "CY",
      destinationLocationType: body.destinationLocationType?.trim() || "CY",
      originRhqCode: body.originRhqCode?.trim() || undefined,
      equipment,
      quantity,
      cargoWeight,
      commodityGroup: body.commodityGroup?.trim() || "FAK DRY",
      commodityCode: body.commodityCode?.trim() || undefined,
      date: body.date?.trim() || undefined,
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "ONE live quote failed"
    console.error("[rates/live/one] Error:", message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
