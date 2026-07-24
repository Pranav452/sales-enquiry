// TS types for the ONE (Ocean Network Express) live-quote integration.
// All shapes here are the *normalized* result our own UI consumes — the raw ONE
// response is mapped into these in quote.ts so the client never sees ONE's shape.

// ── Equipment ──────────────────────────────────────────────────
// User-facing equipment keys → ONE ISO codes (verified 2026-07-22).
export type EquipmentKey =
  | "DRY20"
  | "DRY40"
  | "DRY40H"
  | "REEFER20"
  | "REEFER40H"

export const EQUIPMENT_ISO: Record<EquipmentKey, string> = {
  DRY20: "22G1",
  DRY40: "42G1",
  DRY40H: "45G1",
  REEFER20: "22R1",
  REEFER40H: "45R1",
}

export const EQUIPMENT_LABEL: Record<EquipmentKey, string> = {
  DRY20: "Dry 20'",
  DRY40: "Dry 40'",
  DRY40H: "Dry 40' HC",
  REEFER20: "Reefer 20'",
  REEFER40H: "Reefer 40' HC",
}

// ── Location autocomplete ──────────────────────────────────────
export interface OneLocation {
  code: string          // UN/LOCODE, e.g. "INNSA"
  name: string          // "NHAVA SHEVA, INDIA"
  countryCode?: string
  countryName?: string
}

// ── Quote request (params our API route accepts) ───────────────
export interface OneQuoteRequest {
  originLocationCode: string        // UN/LOCODE from autocomplete
  destinationLocationCode: string
  equipment: EquipmentKey
  quantity: number
  cargoWeight: number               // per-container weight
  commodityGroup?: string           // default "FAK DRY"
  date?: string                     // optional target sailing date (YYYY-MM-DD)
}

// ── A single charge line in the detail breakdown ───────────────
export interface OneCharge {
  chargeCode: string
  chargeName: string
  currency: string
  amount: number                    // native currency amount
  amountUSD: number
}

// ── One sailing = one tile in the Vessel Available Date grid ───
export interface OneSailing {
  date: string                      // departureDateEstimated (YYYY-MM-DD)
  arrival: string | null            // arrivalDateEstimated
  price: number                     // totalPrice (USD, all-in)
  currency: string                  // "USD"
  serviceCode: string
  serviceName: string
  transitDays: number | null
  status: "Available" | "Sold out" | string
  vessel: string | null             // transportName
  voyage: string | null             // conveyanceNumber / vvd
  routeType: string | null
  numberOfTransits: number | null
  charges: {
    ocean: OneCharge[]
    surcharges: OneCharge[]
    origin: OneCharge[]
    dest: OneCharge[]
  }
  cutoffs: {
    vgm?: string | null
    doc?: string | null
    cy?: string | null
    port?: string | null
  }
  validFrom: string | null          // validFromDateTime
  validTo: string | null            // validToDateTime (~20 min after fetch)
}

// ── The full normalized response our POST route returns ────────
export interface OneQuoteResult {
  fetchedAt: string                 // ISO — when our server got the data
  origin: string
  destination: string
  equipment: EquipmentKey
  quantity: number
  sailings: OneSailing[]
}
