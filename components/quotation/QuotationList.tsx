"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Copy, FileDown, Pencil } from "lucide-react"

interface Quotation {
  QUOT_ID: number
  QUOT_REF_NO: string
  QUOT_DATE: string
  MODE: string | null
  EXIM: string | null
  SHIPPER: string | null
  POL: string | null
  POD: string | null
  SHIPMENT_TYPE: string | null
  TOTAL_INR: number | null
  SALES_PERSON: string | null
  BRANCH: string | null
  CREATED_AT: string
}

export function QuotationList() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/quotations")
      if (res.ok) setQuotations(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = quotations.filter((q) => {
    const s = search.toLowerCase()
    return !s || [
      q.QUOT_REF_NO, q.SHIPPER, q.POL, q.POD,
      q.MODE, q.EXIM, q.SALES_PERSON, q.BRANCH,
    ].some((v) => v?.toLowerCase().includes(s))
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function formatDate(raw: string | null) {
    if (!raw) return "-"
    return new Date(raw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search quotations..."
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : pageItems.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No quotations found.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Quot No</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Shipper</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">POL</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">POD</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Mode</th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Total (INR)</th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Sales</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageItems.map((q, i) => (
                <tr
                  key={q.QUOT_ID}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors hover:bg-accent/30",
                    i % 2 === 0 ? "bg-background" : "bg-muted/20"
                  )}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/quotation?edit=${q.QUOT_ID}`)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {q.QUOT_REF_NO}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(q.QUOT_DATE)}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate">{q.SHIPPER || "-"}</td>
                  <td className="px-3 py-2">{q.POL || "-"}</td>
                  <td className="px-3 py-2">{q.POD || "-"}</td>
                  <td className="px-3 py-2">
                    {q.MODE && (
                      <Badge variant="outline" className="text-xs">{q.MODE}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {q.TOTAL_INR != null
                      ? q.TOTAL_INR.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{q.SALES_PERSON || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => router.push(`/quotation?edit=${q.QUOT_ID}`)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Duplicate"
                        onClick={() => router.push(`/quotation?dup=${q.QUOT_ID}`)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
