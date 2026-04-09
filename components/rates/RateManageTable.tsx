"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ValidityBadge } from "./ValidityBadge"
import { RateFormModal } from "./RateFormModal"
import { RateImportModal } from "./RateImportModal"
import type { FreightRate } from "@/lib/types/rates"
import { Plus, Pencil, Trash2, FileUp, ChevronLeft, ChevronRight, Search } from "lucide-react"

const PAGE_SIZE = 20

export function RateManageTable() {
  const [rates, setRates]               = useState<FreightRate[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(1)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [importOpen, setImportOpen]     = useState(false)
  const [editing, setEditing]           = useState<FreightRate | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Filter state
  const [originPortQ, setOriginPortQ]   = useState("")
  const [destPortQ, setDestPortQ]       = useState("")
  const [lineQ, setLineQ]               = useState("")

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadRates = useCallback(async (pg: number, op: string, dp: string, sl: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ admin: "true", page: String(pg), limit: String(PAGE_SIZE) })
      if (op) params.set("origin_port",   op)
      if (dp) params.set("dest_port",     dp)
      if (sl) params.set("shipping_line", sl)

      const res = await fetch(`/api/rates?${params}`)
      if (!res.ok) throw new Error("Failed to load rates")
      const json = await res.json()
      setRates(json.data ?? [])
      setTotal(json.total ?? 0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRates(page, originPortQ, destPortQ, lineQ)
  }, [loadRates, page, originPortQ, destPortQ, lineQ])

  // Debounce filter inputs — reset to page 1 when filters change
  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/rates/${id}`, { method: "DELETE" })
      // Reload current page (count may have changed)
      loadRates(page, originPortQ, destPortQ, lineQ)
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  function openAdd() { setEditing(null); setModalOpen(true) }
  function openEdit(rate: FreightRate) { setEditing(rate); setModalOpen(true) }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Manage Rates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add and update freight rates by shipping line and route.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4" />
            Import PDF
          </Button>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Rate
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={lineQ}
            onChange={handleFilterChange(setLineQ)}
            placeholder="Shipping line…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-44"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={originPortQ}
            onChange={handleFilterChange(setOriginPortQ)}
            placeholder="Origin port…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-40"
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={destPortQ}
            onChange={handleFilterChange(setDestPortQ)}
            placeholder="Dest port…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-40"
          />
        </div>
        {(lineQ || originPortQ || destPortQ) && (
          <button
            onClick={() => { setLineQ(""); setOriginPortQ(""); setDestPortQ(""); setPage(1) }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          {loading ? "Loading…" : `${total.toLocaleString()} rate${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="h-12 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {lineQ || originPortQ || destPortQ ? "No rates match your filters." : "No rates yet. Click \"Add Rate\" to get started."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Line</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Route</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Ports</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">20'</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">40'</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap min-w-[155px]">Validity</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rates.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{r.shipping_line}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-muted-foreground">{r.origin_country}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      {r.dest_country}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {r.dest_port ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.rate_20 != null
                        ? <span className="font-medium">{r.currency} {r.rate_20.toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.rate_40 != null
                        ? <span className="font-medium">{r.currency} {r.rate_40.toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[155px]">
                      <ValidityBadge valid_from={r.valid_from} valid_to={r.valid_to} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {confirmDelete === r.id ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="danger" className="text-xs cursor-default">Delete?</Badge>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              className="text-xs text-destructive hover:underline px-1"
                            >
                              {deletingId === r.id ? "..." : "Yes"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs text-muted-foreground hover:underline px-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(r.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const pg = start + i
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  disabled={loading}
                  className={`min-w-[32px] h-8 rounded-md text-xs font-medium border transition-colors ${
                    pg === page
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {pg}
                </button>
              )
            })}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <RateFormModal
        open={modalOpen}
        rate={editing}
        onClose={() => setModalOpen(false)}
        onSaved={() => loadRates(page, originPortQ, destPortQ, lineQ)}
      />

      {importOpen && (
        <RateImportModal
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false)
            loadRates(1, originPortQ, destPortQ, lineQ)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}
