// ─────────────────────────────────────────────────────────────────────────────
// ONE quote functions — location autocomplete + vessel-dates grid.
// Maps ONE's raw response into our normalized types (types.ts). SERVER-SIDE ONLY.
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from "node:crypto"
import { oneFetch } from "./client"
import {
  EQUIPMENT_ISO,
  EQUIPMENT_SPEC,
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
  const mapped = list
    .map((p) => {
      const code = String(p.locationCode ?? p.UNLocationCode ?? p.code ?? p.unLocCode ?? "").trim()
      // Real ONE field is `displayedName` (e.g. "NHAVA SHEVA"); keep fallbacks.
      const name = String(p.displayedName ?? p.name ?? p.locationName ?? p.fullName ?? "").trim()
      if (!code) return null
      return {
        code,
        name: name || code,
        countryCode: p.countryCode ? String(p.countryCode) : undefined,
        countryName: p.countryName ? String(p.countryName) : undefined,
        locationType: p.locationType ? String(p.locationType) : undefined,
        rhqCode: p.regionHeadQuarter ? String(p.regionHeadQuarter) : undefined,
      } as OneLocation
    })
    .filter((x): x is OneLocation => x !== null)

  // ONE returns the same port twice (locationType CY and Door). Prefer CY; dedupe by code.
  const byCode = new Map<string, OneLocation>()
  for (const loc of mapped) {
    const prev = byCode.get(loc.code)
    if (!prev || (loc.locationType === "CY" && prev.locationType !== "CY")) byCode.set(loc.code, loc)
  }
  return [...byCode.values()]
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

// ── Trips (call 1) — resolves the service scope for the lane ─────────────────
interface RawTripLocation {
  regionHeadQuarter?: string
}
interface RawTrip {
  serviceScopeCode?: string
  origin?: RawTripLocation
  destination?: RawTripLocation
}

// ── schedule-rates-information (call 2) — commodity groups + session context ─
interface RawEquipmentType {
  [key: string]: unknown
}
interface RawScheduleRatesInfo {
  equipmentTypes?: RawEquipmentType[]
  commodityCode?: string
  commodityGroups?: unknown[]
  polLocs?: unknown[]
  podLocs?: unknown[]
  serviceScopeCode?: string
  includeSvcScopeCd?: unknown[]
}

/**
 * Fetch the vessel-dates + prices grid for a lane and normalize it.
 *
 * ONE's vessel-dates endpoint requires a 3-call sequential handshake:
 *   1. GET trips → serviceScopeCode for the lane
 *   2. GET schedule-rates-information (with a fresh sessionId) → commodityGroups
 *      + a pre-assembled "session" body (equipmentTypes, polLocs, podLocs, …)
 *   3. POST vessel-dates-booking — the body is call-2's `data` echoed back, with
 *      the chosen container's equipment fields + quantity/cargoWeight overlaid.
 * The same sessionId is reused across calls 2 and 3.
 */
export async function getVesselDates(req: OneQuoteRequest): Promise<OneQuoteResult> {
  const originCode = req.originLocationCode
  const destCode = req.destinationLocationCode
  const originType = req.originLocationType || "CY"
  const destType = req.destinationLocationType || "CY"

  // ── Call 1: trips → serviceScopeCode ──────────────────────────────────────
  const trips = await oneFetch<{ data?: RawTrip[] }>("/api/v2/quotation/trips", {
    query: {
      fromCode: originCode,
      toCode: destCode,
      originLocationType: originType,
      destinationLocationType: destType,
      searchFrom: "all",
    },
  })
  const trip = (trips.data ?? [])[0]
  if (!trip) throw new Error("ONE has no service for this lane")
  const serviceScope = String(trip.serviceScopeCode ?? "")
  // Prefer the rhqCode supplied by the selected origin location; fall back to
  // the origin's regionHeadQuarter reported by the trips response.
  const originRhqCode = req.originRhqCode || String(trip.origin?.regionHeadQuarter ?? "")

  // ── Call 2: schedule-rates-information → commodity groups + session ────────
  const sessionId = randomUUID()
  const sriRaw = await oneFetch<{ data?: RawScheduleRatesInfo }>(
    "/api/v2/quotation/schedules/schedule-rates-information",
    {
      query: {
        originLoc: originCode,
        destinationLoc: destCode,
        originLocationType: originType,
        destinationLocationType: destType,
        porRhqCode: originRhqCode,
        includeSvcScopeCd: serviceScope,
        sessionId,
      },
    }
  )
  const sri = sriRaw.data
  if (!sri || !(sri.equipmentTypes ?? [])[0]) {
    throw new Error("ONE returned no equipment/rate context for this lane")
  }

  // ── Call 3: vessel-dates-booking — echo the session data + overlay container
  const spec = EQUIPMENT_SPEC[req.equipment]
  const baseContainer = sri.equipmentTypes![0]
  const container = {
    ...baseContainer, // keeps commodityGroups (string exclude), availPolPods, isSoc, isFoodGrade
    chargeType: "CN",
    equipmentIsoCode: spec.iso,
    equipmentDisplayName: spec.displayName,
    equipmentName: spec.displayName,
    cargoType: spec.cargoType,
    equipmentSize: spec.size,
    equipmentONECntrTpSz: spec.oneTpSz,
    sortIndex: 1,
    quantity: req.quantity,
    cargoWeight: String(req.cargoWeight),
    unit: "KGS",
    uuid: randomUUID(),
    isSelected: false,
    isFocus: false,
    isWeightError: false,
    isInland: false,
    isError: {
      quantity: { isError: false, errMessage: "" },
      cargoWeight: { isError: false, errMessage: "", isWarning: false, warningMessage: "" },
    },
  }

  const body = {
    originLoc: originCode,
    originLocationType: originType,
    destinationLoc: destCode,
    destinationLocationType: destType,
    containers: [container],
    commodityCode: sri.commodityCode,
    reeferType: "",
    isSoc: false,
    isFoodGrade: false,
    commodityGroups: sri.commodityGroups,
    polLocs: sri.polLocs,
    podLocs: sri.podLocs,
    serviceScopeCode: sri.serviceScopeCode,
    includeSvcScopeCd: sri.includeSvcScopeCd,
    sessionId,
    isInlandProcess: false,
  }

  // POST returns { data: [ SAILING, ... ] } (verified shape).
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
