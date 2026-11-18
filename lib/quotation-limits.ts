// Width of each text column in dbo.TBL_QUOTATIONS (nvarchar(n)). Kept in one
// place so the form can cap its inputs and the API can name the offending
// field, instead of MSSQL's bare "String or binary data would be truncated."
// LOCAL_CHARGES, CC_CHARGES, TRANSPORT_COST and CLAUSES are nvarchar(max).
export const QUOT_TEXT_LIMITS = {
  mode:             { max: 10,  label: "Mode" },
  exim:             { max: 30,  label: "Exim" },
  fn:               { max: 20,  label: "F/N" },
  enq_type:         { max: 30,  label: "Enquiry Type" },
  incoterms:        { max: 50,  label: "Incoterms" },
  pol:              { max: 100, label: "POL" },
  pod:              { max: 100, label: "POD" },
  container_type:   { max: 100, label: "Container Type" },
  shipper:          { max: 200, label: "Shipper" },
  shipment_type:    { max: 30,  label: "Shipment Type" },
  vessel_name:      { max: 255, label: "Vessel Name" },
  shipping_line:    { max: 100, label: "Shipping Line" },
  transit_time:     { max: 255, label: "Transit Time" },
  free_time:        { max: 255, label: "Free Time" },
  stuffing_type:    { max: 20,  label: "Stuffing Type" },
  display_currency: { max: 10,  label: "Display Currency" },
  sales_person:     { max: 100, label: "Sales Person" },
  branch:           { max: 50,  label: "Branch" },
} as const

export type QuotTextField = keyof typeof QUOT_TEXT_LIMITS

/** Returns a user-facing message for the first over-long field, or null. */
export function quotLengthError(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(QUOT_TEXT_LIMITS) as QuotTextField[]) {
    const value = body[key]
    const { max, label } = QUOT_TEXT_LIMITS[key]
    if (typeof value === "string" && value.length > max) {
      return `${label} is too long (${value.length} characters, maximum ${max}). Please shorten it and save again.`
    }
  }
  return null
}
