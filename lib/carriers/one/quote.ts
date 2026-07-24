// ─────────────────────────────────────────────────────────────────────────────
// ONE quote functions — location autocomplete + vessel-dates grid.
// Maps ONE's raw response into our normalized types (types.ts). SERVER-SIDE ONLY.
// ─────────────────────────────────────────────────────────────────────────────

import { oneFetch } from "./client"
import {
  EQUIPMENT_ISO,
  type EquipmentKey,
  type OneLocation,
  type OneQuoteRequest,
  type OneQuoteResult,
  type OneSailing,
  type OneCharge,
} from "./types"

// ── Location autocomplete ────────────────────────────────────────────────────
// GET /api/v2/quotation/locations?location=<text>&orgDest=origin|destination&searchFrom=mdm (bearer)
export async function searchLocations(
  text: string,
  orgDest: "origin" | "destination"
): Promise<OneLocation[]> {
  if (!text.trim()) return []

  const raw = await oneFetch<{
    // ONE returns a list of location objects; field names vary slightly across
    // the mdm feed vs schedule feed — we defensively read both.
    data?: unknown[]
    locations?: unknown[]
    points?: unknown[]
  }>("/api/v2/quotation/locations", {
    query: { location: text.trim(), orgDest, searchFrom: "mdm" },
  })

  const list = (raw.data ?? raw.locations ?? raw.points ?? []) as Record<string, unknown>[]
  return list
    .map((p) => {
      const code = String(p.code ?? p.locationCode ?? p.unLocCode ?? "").trim()
      const name = String(p.name ?? p.locationName ?? p.fullName ?? "").trim()
      if (!code) return null
      return {
        code,
        name: name || code,
        countryCode: p.countryCode ? String(p.countryCode) : undefined,
        countryName: p.countryName ? String(p.countryName) : undefined,
      } as OneLocation
    })
    .filter((x): x is OneLocation => x !== null)
}

// ─────────────────────────────────────────────────────────────────────────────
// buildVesselDatesBody — request body for
//   POST /api/v2/quotation/schedules/vessel-dates-booking
//
// TODO verify against live capture ───────────────────────────────────────────
// The EXACT body was NOT captured during recon (the page uses interceptor-
// resistant calls). The shape below is reconstructed from the documented quote
// params + the preceding GET calls. Confirm ALL of the following against a real
// captured request (see captureQuoteBodyTemplate() in auth.ts):
//   • top-level key names (originLocationCode vs fromCode, etc.)
//   • equipment array key name + isoCode vs sizeType, and the qty field name
//   • cargoWeight: is it per-container or total? unit field name (weightUnit)
//   • commodity: commodityGroup string vs commodityCode; is FAK DRY the group?
//   • whether a sessionId / trips token / service scope is required
//   • date handling: is a target sailing date sent, or all dates returned?
// Until verified, live calls may 400/422. Do NOT ship to users as "final".
// ─────────────────────────────────────────────────────────────────────────────
function buildVesselDatesBody(req: OneQuoteRequest): Record<string, unknown> {
  const isoCode = EQUIPMENT_ISO[req.equipment]
  return {
    originLocationCode: req.originLocationCode,
    destinationLocationCode: req.destinationLocationCode,
    originLocationType: "CY",
    destinationLocationType: "CY",
    equipment: [{ isoCode, qty: req.quantity }],
    cargoWeight: req.cargoWeight,
    weightUnit: "KGS",
    commodityGroup: req.commodityGroup ?? "FAK DRY",
    searchFrom: "all",
    ...(req.date ? { departureDate: req.date } : {}),
  }
}

// ── Raw ONE sailing shape (only the fields we read; verified 2026-07-22) ─────
interface RawCharge {
  chargeCode?: string
  chargeName?: string
  chargeCurrency?: string
  chargeAmount?: number
  totalAmountInUSD?: number
}
interface RawFreightInfo {
  serviceCode?: string
  serviceName?: string
  duration?: number
  price?: number
  status?: string
  transportName?: string
  conveyanceNumber?: string
  vvd?: string
  routeType?: string
  numberOfTransits?: number
  basicOceanFreightCharges?: RawCharge[]
  freightCharges?: RawCharge[]
  originCharges?: RawCharge[]
  destinationCharges?: RawCharge[]
  vgmCutoff?: string
  docCutoff?: string
  cyCutoff?: string
  portCutoff?: string
  validFromDateTime?: string
  validToDateTime?: string
}
interface RawSailing {
  departureDateEstimated?: string
  arrivalDateEstimated?: string
  totalPrice?: number
  freightInfos?: RawFreightInfo[]
}

function mapCharge(c: RawCharge): OneCharge {
  return {
    chargeCode: String(c.chargeCode ?? ""),
    chargeName: String(c.chargeName ?? ""),
    currency: String(c.chargeCurrency ?? "USD"),
    amount: Number(c.chargeAmount ?? 0),
    amountUSD: Number(c.totalAmountInUSD ?? 0),
  }
}

function mapSailing(s: RawSailing): OneSailing | null {
  if (!s.departureDateEstimated) return null
  // Prefer the first freightInfo as the headline service for the tile.
  const fi = (s.freightInfos ?? [])[0] ?? {}
  return {
    date: s.departureDateEstimated,
    arrival: s.arrivalDateEstimated ?? null,
    price: Number(s.totalPrice ?? fi.price ?? 0),
    currency: "USD",
    serviceCode: String(fi.serviceCode ?? ""),
    serviceName: String(fi.serviceName ?? ""),
    transitDays: fi.duration != null ? Number(fi.duration) : null,
    status: (fi.status as OneSailing["status"]) ?? "Available",
    vessel: fi.transportName ?? null,
    voyage: fi.conveyanceNumber ?? fi.vvd ?? null,
    routeType: fi.routeType ?? null,
    numberOfTransits: fi.numberOfTransits != null ? Number(fi.numberOfTransits) : null,
    charges: {
      ocean: (fi.basicOceanFreightCharges ?? []).map(mapCharge),
      surcharges: (fi.freightCharges ?? []).map(mapCharge),
      origin: (fi.originCharges ?? []).map(mapCharge),
      dest: (fi.destinationCharges ?? []).map(mapCharge),
    },
    cutoffs: {
      vgm: fi.vgmCutoff ?? null,
      doc: fi.docCutoff ?? null,
      cy: fi.cyCutoff ?? null,
      port: fi.portCutoff ?? null,
    },
    validFrom: fi.validFromDateTime ?? null,
    validTo: fi.validToDateTime ?? null,
  }
}

/**
 * Fetch the vessel-dates + prices grid for a lane and normalize it.
 */
export async function getVesselDates(req: OneQuoteRequest): Promise<OneQuoteResult> {
  const body = buildVesselDatesBody(req)

  // POST returns 201 with { data: [ SAILING, ... ] } (verified shape).
  const raw = await oneFetch<{ data?: RawSailing[] }>(
    "/api/v2/quotation/schedules/vessel-dates-booking",
    { method: "POST", body }
  )

  const sailings = (raw.data ?? [])
    .map(mapSailing)
    .filter((x): x is OneSailing => x !== null)
    // sort chronologically by sailing date
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    fetchedAt: new Date().toISOString(),
    origin: req.originLocationCode,
    destination: req.destinationLocationCode,
    equipment: req.equipment,
    quantity: req.quantity,
    sailings,
  }
}

// Re-export so API routes can validate the equipment key.
export function isEquipmentKey(v: string): v is EquipmentKey {
  return v in EQUIPMENT_ISO
}
