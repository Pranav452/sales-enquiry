"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface RecentEnquiry {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  enq_type: string | null
  mode: string | null
  exim: string | null
  fn: string | null
  sales_person: string | null
  agent_name: string | null
  country: string | null
  branch: string | null
  network: string | null
  pol: string | null
  pod: string | null
  incoterms: string | null
  container_type: string | null
  status: string | null
  email_subject_line: string | null
  shipper: string | null
  consignee: string | null
  remarks: string | null
  mbl_awb_no: string | null
  job_invoice_no: string | null
  gop: string | null
  assigned_user: string | null
  assigned_date: string | null
  buy_rate_file: string | null
  sell_rate_file: string | null
}

function statusVariant(status: string | null) {
  const s = (status ?? "").toUpperCase()
  switch (s) {
    case "WIN":         return "success"
    case "LOSE":        return "danger"
    case "FOLLOW UP":  return "warning"
    case "QUOTED":
    case "PENDING":
    case "NO FEEDBACK": return "info"
    default:            return "secondary"
  }
}

interface RecentEnquiriesProps {
  refreshKey?: number
}

const COLS = ["Enq No", "Date", "Shipper", "Consignee", "Sales Person", "Branch", "Remarks", "Status"]

export function RecentEnquiries({ refreshKey }: RecentEnquiriesProps) {
  const router = useRouter()
  const [rows, setRows] = useState<RecentEnquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch("/api/enquiries?mine=true")
      if (!res.ok) { setLoading(false); return }
      const json = await res.json()
      setRows((json as RecentEnquiry[]).slice(0, 5))
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      Object.values(r).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    )
  }, [rows, search])

  if (loading) {
    return (
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground text-center py-6">Loading recent enquiries...</p>
      </div>
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">My Recent Enquiries</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your last 5 submitted enquiries — click an Enq No to edit</p>
        </div>
        <Input
          type="search"
          placeholder="Search across all fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs text-xs h-8"
          aria-label="Search recent enquiries"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {COLS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap text-[10px] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-6 text-xs text-muted-foreground text-center">
                    No results match your search.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => router.push(`/enquiry?edit=${r.id}`)}
                        className="text-blue-600 hover:underline text-left cursor-pointer"
                        aria-label={`Edit enquiry ${r.enq_ref_no ?? r.id}`}
                      >
                        {r.enq_ref_no ?? "—"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {r.enq_receipt_date
                        ? new Date(r.enq_receipt_date).toLocaleDateString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 max-w-[140px] truncate">{r.shipper || "—"}</td>
                    <td className="px-4 py-2.5 max-w-[140px] truncate">{r.consignee || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.sales_person ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.branch ?? "—"}</td>
                    <td className="px-4 py-2.5 max-w-[200px] whitespace-normal break-words text-muted-foreground">
                      {r.remarks || "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge
                        variant={
                          statusVariant(r.status) as
                            | "success"
                            | "danger"
                            | "warning"
                            | "info"
                            | "secondary"
                        }
                      >
                        {r.status ?? "—"}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
