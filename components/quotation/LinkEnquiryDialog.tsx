"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { useCallback, useEffect, useState } from "react"
import { Link2, Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface EnquirySuggestion {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  shipper: string | null
  pol: string | null
  pod: string | null
  sales_person: string | null
  status: string | null
  mode: string | null
  score: number
  matched: string[]
  quotation_count: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  quotId: number | string
  quotRefNo?: string | null
  /** Called after a successful link with the enquiry that was attached. */
  onLinked: (enq: { id: string; ref: string | null }) => void
}

/**
 * Attach an existing enquiry to an unlinked quotation. Suggestions come back
 * pre-ranked from /api/quotations/[id]/link-enquiry; the search box switches
 * the same endpoint into free-text lookup for a manual pick.
 */
export function LinkEnquiryDialog({ open, onOpenChange, quotId, quotRefNo, onLinked }: Props) {
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<EnquirySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)

  const load = useCallback(
    async (q: string) => {
      setLoading(true)
      setError(null)
      try {
        const url = `/api/quotations/${quotId}/link-enquiry${q ? `?q=${encodeURIComponent(q)}` : ""}`
        const res = await fetch(url)
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          setError(data?.error ?? "Could not load enquiries")
          setRows([])
          return
        }
        setRows(data.suggestions ?? [])
      } catch {
        setError("Network error - please try again.")
        setRows([])
      } finally {
        setLoading(false)
      }
    },
    [quotId]
  )

  // Reset on open, then debounce subsequent searches.
  useEffect(() => {
    if (!open) return
    setQuery("")
    setError(null)
    setLinkingId(null)
  }, [open])

  // Single fetch path: initial load on open, debounced while typing.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => { load(query.trim()) }, query.trim() ? 300 : 0)
    return () => clearTimeout(t)
  }, [open, query, load])

  async function handleLink(row: EnquirySuggestion) {
    setLinkingId(row.id)
    setError(null)
    try {
      const res = await fetch(`/api/quotations/${quotId}/link-enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enq_id: row.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? "Could not link the enquiry")
        return
      }
      onLinked({ id: String(data.enq_id), ref: data.enq_ref_no ?? null })
      onOpenChange(false)
    } catch {
      setError("Network error - please try again.")
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2",
            "bg-card border border-border rounded-xl shadow-xl"
          )}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <Dialog.Title className="font-semibold text-sm">Link to Enquiry</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {quotRefNo
                  ? `Attach ${quotRefNo} to an enquiry that already exists.`
                  : "Attach this quotation to an enquiry that already exists."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-md p-1 hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by enquiry ref no or shipper..."
                className="h-9 pl-8 text-sm"
                aria-label="Search enquiries"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {query.trim()
                ? "Search results."
                : "Best matches first, based on shipper, POL/POD, sales person, mode and date."}
            </p>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="max-h-[52vh] overflow-auto rounded-md border border-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No matching enquiries found.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 text-left font-medium">Enq No</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Shipper</th>
                      <th className="px-3 py-2 text-left font-medium">POL</th>
                      <th className="px-3 py-2 text-left font-medium">POD</th>
                      <th className="px-3 py-2 text-left font-medium">Sales Person</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Quots</th>
                      <th className="px-3 py-2 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const hit = (f: string) =>
                        r.matched?.includes(f) ? "text-foreground font-medium" : ""
                      return (
                        <tr
                          key={r.id}
                          className={cn(
                            "border-b border-border last:border-0",
                            i % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                            {r.enq_ref_no ?? `#${r.id}`}
                            {i === 0 && !query.trim() && r.score >= 60 && r.matched.includes("shipper") && (
                              <Badge variant="outline" className="ml-2 text-[10px]">
                                Best match
                              </Badge>
                            )}
                          </td>
                          <td className={cn("px-3 py-2 whitespace-nowrap text-muted-foreground", hit("date"))}>
                            {r.enq_receipt_date ?? "-"}
                          </td>
                          <td className={cn("px-3 py-2 max-w-[180px] truncate text-muted-foreground", hit("shipper"))}>
                            {r.shipper || "-"}
                          </td>
                          <td className={cn("px-3 py-2 text-muted-foreground", hit("pol"))}>{r.pol || "-"}</td>
                          <td className={cn("px-3 py-2 text-muted-foreground", hit("pod"))}>{r.pod || "-"}</td>
                          <td className={cn("px-3 py-2 text-xs text-muted-foreground", hit("sales_person"))}>
                            {r.sales_person || "-"}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{r.status || "-"}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{r.quotation_count}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              disabled={linkingId !== null}
                              onClick={() => handleLink(r)}
                              className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-blue-600 hover:bg-accent transition-colors disabled:opacity-50"
                            >
                              {linkingId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                              Link
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
