"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  quotationStatusLabel,
  quotationStatusVariant,
} from "@/lib/constants/quotation-status"

interface QuotationRow {
  id: string
  quot_ref_no: string | null
  quot_date: string | null
  shipping_line: string | null
  vessel_name: string | null
  quoted_rate: number | null
  total_inr: number | null
  total_display: number | null
  display_currency: string | null
  sales_person: string | null
  status: string
  created_at: string | null
}

interface Response {
  enq_id: string
  enq_ref_no: string | null
  quotation_status: string
  quotations: QuotationRow[]
}

interface Props {
  enquiryId: string
  enqRefNo?: string | null
}

function formatDate(raw: string | null) {
  if (!raw) return "—"
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-GB")
}

function formatRate(q: QuotationRow) {
  const amount = q.quoted_rate ?? q.total_display ?? q.total_inr
  if (amount == null) return "—"
  const currency = q.quoted_rate != null
    ? (q.display_currency || "INR")
    : q.total_display != null
      ? (q.display_currency || "INR")
      : "INR"
  return `${currency} ${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

/**
 * Quotation history for one enquiry — every quotation ever raised
 * against it, newest first. Read-only; each row links to the quotation.
 */
export function EnquiryQuotations({ enquiryId, enqRefNo }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<QuotationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/enquiries/${enquiryId}/quotations`)
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error ?? `Failed to load quotations (${res.status})`)
        return data as Response
      })
      .then((data) => {
        if (cancelled) return
        setRows(data.quotations ?? [])
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load quotations")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [enquiryId])

  const COLS = ["Quotation No", "Date", "Shipping Line", "Quoted Rate", "Sales Person", "Status"]

  return (
    <section className="mt-8 rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quotations</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enqRefNo
              ? `All quotations raised against ${enqRefNo}`
              : "All quotations raised against this enquiry"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.push(`/quotation?enq=${enquiryId}`)}
        >
          New Quotation
        </Button>
      </div>

      {loading ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">Loading quotations...</p>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-destructive text-center">{error}</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">
          Not Prepared — no quotation has been raised for this enquiry yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {COLS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.id} className="border-b border-border/50 last:border-0 hover:bg-accent transition-colors">
                  <td className="px-4 py-2.5 font-mono font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => router.push(`/quotation?edit=${q.id}`)}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      {q.quot_ref_no ?? `#${q.id}`}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatDate(q.quot_date)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {q.shipping_line || q.vessel_name || "—"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium">{formatRate(q)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{q.sales_person || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <Badge variant={quotationStatusVariant(q.status)}>
                      {quotationStatusLabel(q.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
