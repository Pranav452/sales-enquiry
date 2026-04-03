export interface FreightRate {
  id: string
  shipping_line: string
  origin_country: string
  dest_country: string
  origin_port: string | null
  dest_port: string | null
  currency: string
  rate_20: number | null
  rate_40: number | null
  valid_from: string | null
  valid_to: string | null
  transit_days: number | null
  via_port: string | null
  surcharges: string | null
  notes: string | null
  pdf_url: string | null
  clauses: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ParsedSurcharge {
  name: string
  value: string
}

export interface RatePayload {
  shipping_line: string
  origin_country: string
  dest_country: string
  origin_port?: string | null
  dest_port?: string | null
  currency?: string
  rate_20?: number | null
  rate_40?: number | null
  valid_from?: string | null
  valid_to?: string | null
  transit_days?: number | null
  via_port?: string | null
  surcharges?: string | null
  notes?: string | null
  pdf_url?: string | null
  clauses?: string | null
  is_active?: boolean
}
