// Quotation lifecycle, shared by the quotation APIs and the enquiry UI.
//
// DRAFT | SUBMITTED | APPROVED | CLOSED_NOT_QUOTED are stored on
// TBL_QUOTATIONS.STATUS. NOT_PREPARED is never stored — it is the
// enquiry-side derived state meaning "no quotation row exists yet".

export const QUOTATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "CLOSED_NOT_QUOTED",
] as const

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number]

export type EnquiryQuotationStatus = QuotationStatus | "NOT_PREPARED"

export function isQuotationStatus(v: unknown): v is QuotationStatus {
  return typeof v === "string" && (QUOTATION_STATUSES as readonly string[]).includes(v)
}

const LABELS: Record<EnquiryQuotationStatus, string> = {
  NOT_PREPARED:      "Not Prepared",
  DRAFT:             "Draft",
  SUBMITTED:         "Submitted",
  APPROVED:          "Approved",
  CLOSED_NOT_QUOTED: "Closed - Not Quoted",
}

export function quotationStatusLabel(status: string | null | undefined): string {
  const s = (status ?? "NOT_PREPARED").toUpperCase() as EnquiryQuotationStatus
  return LABELS[s] ?? (status ?? "—")
}

// Maps onto the existing Badge variants used by the enquiry STATUS column.
export type QuotationBadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "secondary"

export function quotationStatusVariant(
  status: string | null | undefined
): QuotationBadgeVariant {
  switch ((status ?? "NOT_PREPARED").toUpperCase()) {
    case "APPROVED":          return "success"
    case "CLOSED_NOT_QUOTED": return "danger"
    case "SUBMITTED":         return "info"
    case "DRAFT":             return "warning"
    default:                  return "secondary"
  }
}
