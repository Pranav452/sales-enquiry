// Field mapping between an enquiry and a quotation, in both directions.
//
// Forward  (enquiry -> quotation form): used to one-click prefill a new
//          quotation opened from /quotation?enq=<id>.
// Reverse  (quotation -> enquiry insert): used by
//          POST /api/quotations/[id]/create-enquiry.
//
// Only compatible values are carried over: a value is mapped when it
// matches the target field's option set case-insensitively, otherwise the
// target keeps its default. Free-text fields (POL/POD/shipper) pass through.

import {
  BRANCHES,
  CONTAINER_TYPES,
  INCOTERMS,
  FN_OPTIONS,
  SALESPERSON_CODE_MAP,
} from "@/lib/constants/dropdowns"

/** Case-insensitive match against an option set. Returns "" when no option fits. */
export function matchOptionCI(
  value: string | null | undefined,
  options: readonly string[]
): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  const exact = options.find((o) => o === raw)
  if (exact) return exact
  const folded = raw.toLowerCase()
  return options.find((o) => o.toLowerCase() === folded) ?? ""
}

/**
 * Incoterms are stored truncated on the enquiry side (INCOTERM is
 * varchar(10)), so allow a unique prefix match before giving up.
 */
export function matchIncoterms(value: string | null | undefined): string {
  const exact = matchOptionCI(value, INCOTERMS)
  if (exact) return exact
  const raw = (value ?? "").trim().toLowerCase()
  if (!raw) return ""
  const hits = INCOTERMS.filter((o) => o.toLowerCase().startsWith(raw))
  return hits.length === 1 ? hits[0] : ""
}

// Branch codes seen in legacy enquiry rows.
const BRANCH_CODE_MAP: Record<string, string> = {
  MUM: "MUMBAI", BOM: "MUMBAI",
  DEL: "NEW DELHI", DLI: "NEW DELHI",
  BLR: "BANGALORE", BAN: "BANGALORE",
  MAA: "MADRAS", CHE: "MADRAS",
  COK: "COCHIN",
  AMD: "AHMEDABAD", AHD: "AHMEDABAD",
  BRC: "VADODARA",
  NSK: "NASIK",
}

export function matchBranch(value: string | null | undefined): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  return matchOptionCI(BRANCH_CODE_MAP[raw.toUpperCase()] ?? raw, BRANCHES)
}

export function matchSalesPerson(
  value: string | null | undefined,
  options: readonly string[]
): string {
  const raw = (value ?? "").trim()
  if (!raw) return ""
  return matchOptionCI(SALESPERSON_CODE_MAP[raw] ?? raw, options)
}

// ─── Option sets used by the quotation form ───────────────────

export const QUOT_MODES = ["SEA", "AIR"] as const
export const QUOT_EXIM = ["EXPORT", "IMPORT", "CROSS TRADE"] as const
export const QUOT_FN = FN_OPTIONS
export const QUOT_ENQ_TYPES = ["LOCAL", "OVERSEAS"] as const

// ─── Option sets used by the enquiry form ─────────────────────

export const ENQ_MODES = ["Air", "Sea"] as const
export const ENQ_EXIM = ["Export", "Import", "Cross Trade"] as const
export const ENQ_TYPES = ["Local", "Overseas"] as const

/** The enquiry shape returned by GET /api/enquiries/[id]. */
export interface EnquirySource {
  id?: string | null
  enq_ref_no?: string | null
  mode?: string | null
  exim?: string | null
  fn?: string | null
  enq_type?: string | null
  incoterms?: string | null
  pol?: string | null
  pod?: string | null
  container_type?: string | null
  shipper?: string | null
  consignee?: string | null
  sales_person?: string | null
  branch?: string | null
}

/** Quotation columns the reverse mapping reads. */
export interface QuotationSource {
  QUOT_REF_NO?: string | null
  QUOT_DATE?: string | Date | null
  MODE?: string | null
  EXIM?: string | null
  FN?: string | null
  ENQ_TYPE?: string | null
  INCOTERMS?: string | null
  POL?: string | null
  POD?: string | null
  CONTAINER_TYPE?: string | null
  SHIPPER?: string | null
  SALES_PERSON?: string | null
  BRANCH?: string | null
}

/** Payload accepted by the enquiry insert (same field names as POST /api/enquiries). */
export interface EnquiryDraft {
  enq_receipt_date: string
  mode: string | null
  exim: string | null
  fn: string | null
  enq_type: string | null
  incoterms: string | null
  pol: string | null
  pod: string | null
  container_type: string | null
  shipper: string | null
  sales_person: string | null
  branch: string
  status: string
  remarks: string | null
}

function orNull(s: string): string | null {
  return s === "" ? null : s
}

function toDateStr(raw: string | Date | null | undefined): string {
  if (!raw) return new Date().toISOString().split("T")[0]
  const d = raw instanceof Date ? raw : new Date(raw)
  return isNaN(d.getTime())
    ? new Date().toISOString().split("T")[0]
    : d.toISOString().split("T")[0]
}

/**
 * Reverse mapping — build an enquiry draft from a saved quotation.
 * Mandatory enquiry fields that the quotation cannot supply fall back to
 * safe defaults (branch MUMBAI, status QUOTED) so the row is usable.
 */
export function enquiryDraftFromQuotation(q: QuotationSource): EnquiryDraft {
  return {
    enq_receipt_date: toDateStr(q.QUOT_DATE),
    mode: orNull(matchOptionCI(q.MODE, ENQ_MODES)),
    exim: orNull(matchOptionCI(q.EXIM, ENQ_EXIM)),
    fn: orNull(matchOptionCI(q.FN, QUOT_FN)),
    enq_type: orNull(matchOptionCI(q.ENQ_TYPE, ENQ_TYPES)),
    incoterms: orNull(matchIncoterms(q.INCOTERMS)),
    pol: orNull((q.POL ?? "").trim()),
    pod: orNull((q.POD ?? "").trim()),
    container_type: orNull(matchOptionCI(q.CONTAINER_TYPE, CONTAINER_TYPES)),
    shipper: orNull((q.SHIPPER ?? "").trim()),
    sales_person: orNull((q.SALES_PERSON ?? "").trim()),
    branch: matchBranch(q.BRANCH) || "MUMBAI",
    status: "QUOTED",
    remarks: q.QUOT_REF_NO ? `Created from quotation ${q.QUOT_REF_NO}` : null,
  }
}
