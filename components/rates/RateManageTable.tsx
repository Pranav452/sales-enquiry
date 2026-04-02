"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ValidityBadge } from "./ValidityBadge"
import { RateFormModal } from "./RateFormModal"
import type { FreightRate } from "@/lib/types/rates"
import { Plus, Pencil, Trash2 } from "lucide-react"

export function RateManageTable() {
  const [rates, setRates]               = useState<FreightRate[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editing, setEditing]           = useState<FreightRate | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/rates?admin=true")
      if (!res.ok) throw new Error("Failed to load rates")
      setRates(await res.json())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRates() }, [loadRates])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/rates/${id}`, { method: "DELETE" })
      setRates((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(rate: FreightRate) {
    setEditing(rate)
    setModalOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Manage Rates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Add and update freight rates by shipping line and route.</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Rate
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map((n) => (
            <div key={n} className="h-12 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground text-sm">No rates yet. Click "Add Rate" to get started.</p>
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
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Validity</th>
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
                    <td className="px-4 py-3 whitespace-nowrap">
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

      <RateFormModal
        open={modalOpen}
        rate={editing}
        onClose={() => setModalOpen(false)}
        onSaved={loadRates}
      />
    </div>
  )
}
