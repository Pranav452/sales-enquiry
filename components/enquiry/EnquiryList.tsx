"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SALESPERSON_CODE_MAP, expandPortCity } from "@/lib/constants/dropdowns"

export interface Enquiry {
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
  mbl_awb_no?: string | null
  job_invoice_no?: string | null
  gop?: string | null
  assigned_user?: string | null
  assigned_date?: string | null
  buy_rate_file?: string | null
  sell_rate_file?: string | null
}

const PAGE_SIZE = 20

function statusVariant(status: string | null) {
  const s = (status ?? "").toUpperCase()
  switch (s) {
    case "WIN":        return "success"
    case "LOSE":       return "danger"
    case "FOLLOW UP":  return "warning"
    case "QUOTED":
    case "PENDING":
    case "NO FEEDBACK": return "info"
    default:           return "secondary"
  }
}

function resolveSalesPerson(value: string | null) {
  if (!value) return value
  return SALESPERSON_CODE_MAP[value] ?? value
}

interface EnquiryListProps {
  onSelectEnquiry?: (row: Enquiry) => void
  editingId?: string | null
  navigateOnEdit?: boolean
}

export function EnquiryList({ onSelectEnquiry, editingId, navigateOnEdit }: EnquiryListProps) {
  const router = useRouter()
  const [rows, setRows] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      Object.values(r).some(
        (v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)
      )
    )
  }, [rows, search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return Array.from({ length: 5 }, (_, i) => start + i)
  }, [page, totalPages])

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/enquiries")
      if (res.ok) {
        const data: Enquiry[] = await res.json()
        setRows(data.map((r) => ({ ...r, sales_person: resolveSalesPerson(r.sales_person) })))
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleRowClick(r: Enquiry) {
    if (navigateOnEdit) {
      router.push(`/enquiry?edit=${r.id}`)
    } else {
      onSelectEnquiry?.(r)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground text-center">
        Loading enquiries...
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground text-center">
        No enquiries found.
      </div>
    )
  }

  const COLS = ["Enq No", "Date", "Shipper", "POL", "POD", "Sales Person", "Branch", "Remarks", "Status"]

  return (
    <div>
      <div className="px-6 py-3 border-b border-border flex justify-end">
        <Input
          type="search"
          placeholder="Search across all fields — Enq No, Shipper, Consignee, Status, POL, POD, Mode, Country, Agent..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
          aria-label="Search enquiries"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {COLS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-sm text-muted-foreground text-center">
                  No enquiries match your search.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent transition-colors",
                    editingId === r.id && "bg-primary/10 dark:bg-primary/20"
                  )}
                >
                  <td className="px-4 py-3 font-mono font-medium whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleRowClick(r)}
                      className="text-blue-600 hover:underline text-left cursor-pointer"
                      aria-label={`Edit enquiry ${r.enq_ref_no ?? r.id}`}
                    >
                      {r.enq_ref_no ?? "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {r.enq_receipt_date
                      ? new Date(r.enq_receipt_date).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 max-w-[110px] truncate">{r.shipper || "—"}</td>
                  <td
                    className="px-3 py-3 font-mono whitespace-nowrap"
                    title={expandPortCity(r.pol) || undefined}
                  >
                    {r.pol || "—"}
                  </td>
                  <td
                    className="px-3 py-3 font-mono whitespace-nowrap"
                    title={expandPortCity(r.pod) || undefined}
                  >
                    {r.pod || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.sales_person ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.branch ?? "—"}</td>
                  <td className="px-4 py-3 max-w-[160px] whitespace-normal break-words text-muted-foreground">
                    {r.remarks || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {filteredRows.length} result{filteredRows.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </Button>
            {pageNumbers.map((p) => (
              <Button
                key={p}
                type="button"
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
