"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  Link2, Copy, CheckCheck, Ship, Globe, AlertTriangle
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface Destination {
  DEST_ID: number
  DEST_NAME: string
  PORT_NAME: string | null
  CONTINENT: string | null
  REQUIREMENTS: string | null
  ACTIVE: number
}

interface Rate {
  RATE_ID: number
  DEST_ID: number
  CARRIER: string
  CONTAINER_TYPE: string
  RATE_USD: string | null
  FREE_DAYS: string | null
  VALIDITY: string | null
  IS_SUSPENDED: boolean
  UPDATED_AT: string
  UPDATED_BY: string | null
}

interface Schedule {
  SCHED_ID: number
  DEST_ID: number
  CARRIER: string
  VESSEL_NAME: string | null
  VOYAGE_NO: string | null
  ETD: string | null
  ETA: string | null
  TRANSIT_DAYS: string | null
  VIA_PORT: string | null
  GATE_IN: string | null
}

interface Token {
  TOKEN_ID: number
  TOKEN: string
  COMPANY: string
  DEST_ID: number
  CLIENT_NAME: string | null
  CLIENT_EMAIL: string | null
  CREATED_BY: string | null
  CREATED_AT: string
  LAST_VIEWED: string | null
  ACTIVE: number
  DEST_NAME: string
  PORT_NAME: string | null
}

const CARRIERS = ["CMA CGM", "Maersk", "MSC", "ONE LINE", "Hapag-Lloyd", "Evergreen"]
const CONTINENTS = ["Africa", "Far East", "Middle East", "Europe", "Americas"]

// ─── Small reusable pieces ────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function SectionHeader({ title, icon: Icon, action }: { title: string; icon: React.ElementType; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {action}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export default function RateSheetPageContent({ company }: { company: string }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null)
  const [rates, setRates] = useState<Rate[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [tokens, setTokens] = useState<Token[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"rates" | "schedules" | "share">("rates")

  // Add-destination form
  const [showAddDest, setShowAddDest] = useState(false)
  const [newDest, setNewDest] = useState({ dest_name: "", port_name: "", continent: "", requirements: "" })
  const [savingDest, setSavingDest] = useState(false)

  // Edit-destination inline
  const [editingDest, setEditingDest] = useState<Destination | null>(null)

  // Add-rate form
  const [showAddRate, setShowAddRate] = useState(false)
  const [newRate, setNewRate] = useState({ carrier: "", container_type: "40HC", rate_usd: "", free_days: "", validity: "", is_suspended: false })
  const [editingRate, setEditingRate] = useState<Rate | null>(null)
  const [savingRate, setSavingRate] = useState(false)

  // Add-schedule form
  const [showAddSched, setShowAddSched] = useState(false)
  const [newSched, setNewSched] = useState({ carrier: "", vessel_name: "", voyage_no: "", etd: "", eta: "", transit_days: "", via_port: "", gate_in: "", sort_order: 0 })
  const [editingSched, setEditingSched] = useState<Schedule | null>(null)
  const [savingSched, setSavingSched] = useState(false)

  // Add-token form
  const [showAddToken, setShowAddToken] = useState(false)
  const [newToken, setNewToken] = useState({ client_name: "", client_email: "" })
  const [savingToken, setSavingToken] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const [error, setError] = useState("")

  // ── Loaders ────────────────────────────────────────────────

  const loadDestinations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/rate-sheet/destinations")
      if (res.ok) setDestinations(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDestData = useCallback(async (destId: number) => {
    const [rRes, sRes, tRes] = await Promise.all([
      fetch(`/api/rate-sheet/rates?dest_id=${destId}`),
      fetch(`/api/rate-sheet/schedules?dest_id=${destId}`),
      fetch("/api/rate-sheet/tokens"),
    ])
    if (rRes.ok) setRates(await rRes.json())
    if (sRes.ok) setSchedules(await sRes.json())
    if (tRes.ok) {
      const all: Token[] = await tRes.json()
      setTokens(all.filter(t => t.DEST_ID === destId && t.ACTIVE))
    }
  }, [])

  useEffect(() => { loadDestinations() }, [loadDestinations])

  useEffect(() => {
    if (selectedDest) loadDestData(selectedDest.DEST_ID)
  }, [selectedDest, loadDestData])

  // ── Destination actions ────────────────────────────────────

  async function addDestination() {
    if (!newDest.dest_name.trim()) return
    setSavingDest(true)
    setError("")
    try {
      const res = await fetch("/api/rate-sheet/destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDest),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewDest({ dest_name: "", port_name: "", continent: "", requirements: "" })
      setShowAddDest(false)
      await loadDestinations()
    } catch (e) {
      setError(String(e))
    } finally {
      setSavingDest(false)
    }
  }

  async function saveEditDest() {
    if (!editingDest) return
    setSavingDest(true)
    try {
      await fetch(`/api/rate-sheet/destinations/${editingDest.DEST_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dest_name: editingDest.DEST_NAME,
          port_name: editingDest.PORT_NAME,
          continent: editingDest.CONTINENT,
          requirements: editingDest.REQUIREMENTS,
          active: editingDest.ACTIVE,
        }),
      })
      setEditingDest(null)
      await loadDestinations()
    } finally {
      setSavingDest(false)
    }
  }

  async function deleteDest(id: number) {
    if (!confirm("Delete this destination and all its rates/schedules/tokens?")) return
    await fetch(`/api/rate-sheet/destinations/${id}`, { method: "DELETE" })
    if (selectedDest?.DEST_ID === id) setSelectedDest(null)
    await loadDestinations()
  }

  // ── Rate actions ───────────────────────────────────────────

  async function addRate() {
    if (!selectedDest || !newRate.carrier) return
    setSavingRate(true)
    setError("")
    try {
      const res = await fetch("/api/rate-sheet/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRate, dest_id: selectedDest.DEST_ID }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewRate({ carrier: "", container_type: "40HC", rate_usd: "", free_days: "", validity: "", is_suspended: false })
      setShowAddRate(false)
      await loadDestData(selectedDest.DEST_ID)
    } catch (e) {
      setError(String(e))
    } finally {
      setSavingRate(false)
    }
  }

  async function saveEditRate() {
    if (!editingRate) return
    setSavingRate(true)
    try {
      await fetch(`/api/rate-sheet/rates/${editingRate.RATE_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRate),
      })
      setEditingRate(null)
      if (selectedDest) await loadDestData(selectedDest.DEST_ID)
    } finally {
      setSavingRate(false)
    }
  }

  async function deleteRate(id: number) {
    await fetch(`/api/rate-sheet/rates/${id}`, { method: "DELETE" })
    if (selectedDest) await loadDestData(selectedDest.DEST_ID)
  }

  // ── Schedule actions ───────────────────────────────────────

  async function addSchedule() {
    if (!selectedDest || !newSched.carrier) return
    setSavingSched(true)
    setError("")
    try {
      const res = await fetch("/api/rate-sheet/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSched, dest_id: selectedDest.DEST_ID }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewSched({ carrier: "", vessel_name: "", voyage_no: "", etd: "", eta: "", transit_days: "", via_port: "", gate_in: "", sort_order: 0 })
      setShowAddSched(false)
      await loadDestData(selectedDest.DEST_ID)
    } catch (e) {
      setError(String(e))
    } finally {
      setSavingSched(false)
    }
  }

  async function saveEditSched() {
    if (!editingSched) return
    setSavingSched(true)
    try {
      await fetch(`/api/rate-sheet/schedules/${editingSched.SCHED_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSched),
      })
      setEditingSched(null)
      if (selectedDest) await loadDestData(selectedDest.DEST_ID)
    } finally {
      setSavingSched(false)
    }
  }

  async function deleteSched(id: number) {
    await fetch(`/api/rate-sheet/schedules/${id}`, { method: "DELETE" })
    if (selectedDest) await loadDestData(selectedDest.DEST_ID)
  }

  // ── Token actions ──────────────────────────────────────────

  async function generateToken() {
    if (!selectedDest) return
    setSavingToken(true)
    setError("")
    try {
      const res = await fetch("/api/rate-sheet/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dest_id: selectedDest.DEST_ID, ...newToken }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setNewToken({ client_name: "", client_email: "" })
      setShowAddToken(false)
      await loadDestData(selectedDest.DEST_ID)
    } catch (e) {
      setError(String(e))
    } finally {
      setSavingToken(false)
    }
  }

  async function revokeToken(id: number) {
    await fetch(`/api/rate-sheet/tokens/${id}`, { method: "DELETE" })
    if (selectedDest) await loadDestData(selectedDest.DEST_ID)
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/r/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // ── Helpers ────────────────────────────────────────────────

  const carriersByDest = (items: Rate[] | Schedule[], key: keyof Rate | keyof Schedule) =>
    [...new Set(items.map(i => i[key as keyof typeof i] as string))]

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden">

      {/* ── Left: Destinations ─────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">Rate Sheet</h1>
            <p className="text-xs text-muted-foreground capitalize">{company === "links" ? "Links" : "MP Cargo"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddDest(v => !v)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Add destination form */}
        {showAddDest && (
          <div className="p-3 border-b border-border bg-muted/30 space-y-2 text-sm">
            <Input placeholder="Destination name *" value={newDest.dest_name}
              onChange={e => setNewDest(p => ({ ...p, dest_name: e.target.value }))} autoFocus />
            <Input placeholder="Port name" value={newDest.port_name}
              onChange={e => setNewDest(p => ({ ...p, port_name: e.target.value }))} />
            <select
              value={newDest.continent}
              onChange={e => setNewDest(p => ({ ...p, continent: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Continent…</option>
              {CONTINENTS.map(c => <option key={c}>{c}</option>)}
            </select>
            <textarea placeholder="Country requirements (one per line)" rows={2}
              value={newDest.requirements}
              onChange={e => setNewDest(p => ({ ...p, requirements: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none" />
            <div className="flex gap-2">
              <Button size="sm" onClick={addDestination} disabled={savingDest} className="flex-1">
                {savingDest ? "Saving…" : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddDest(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Destinations list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4 text-center">Loading…</p>
          ) : destinations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">No destinations yet.<br />Add one above.</p>
          ) : (
            destinations.map(d => (
              <div key={d.DEST_ID}
                onClick={() => { setSelectedDest(d); setEditingDest(null) }}
                className={cn(
                  "px-4 py-3 cursor-pointer border-b border-border transition-colors hover:bg-accent/40",
                  selectedDest?.DEST_ID === d.DEST_ID && "bg-accent"
                )}
              >
                {editingDest?.DEST_ID === d.DEST_ID ? (
                  <div className="space-y-1.5" onClick={e => e.stopPropagation()}>
                    <Input value={editingDest.DEST_NAME} autoFocus
                      onChange={e => setEditingDest(p => p ? { ...p, DEST_NAME: e.target.value } : p)} className="h-7 text-xs" />
                    <Input value={editingDest.PORT_NAME ?? ""} placeholder="Port"
                      onChange={e => setEditingDest(p => p ? { ...p, PORT_NAME: e.target.value } : p)} className="h-7 text-xs" />
                    <Input value={editingDest.CONTINENT ?? ""} placeholder="Continent"
                      onChange={e => setEditingDest(p => p ? { ...p, CONTINENT: e.target.value } : p)} className="h-7 text-xs" />
                    <textarea value={editingDest.REQUIREMENTS ?? ""} placeholder="Requirements" rows={2}
                      onChange={e => setEditingDest(p => p ? { ...p, REQUIREMENTS: e.target.value } : p)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs resize-none" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEditDest} disabled={savingDest} className="h-6 text-xs flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingDest(null)} className="h-6 text-xs">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.DEST_NAME}</p>
                      {d.PORT_NAME && <p className="text-xs text-muted-foreground truncate">{d.PORT_NAME}</p>}
                      {d.CONTINENT && <Badge variant="outline" className="text-[10px] mt-0.5">{d.CONTINENT}</Badge>}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); setEditingDest(d) }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteDest(d.DEST_ID) }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Detail panel ─────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedDest ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Globe className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-sm">Select a destination to manage rates &amp; schedules</p>
            </div>
          </div>
        ) : (
          <>
            {/* Destination header */}
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <h2 className="font-bold text-base">{selectedDest.DEST_NAME}</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {selectedDest.PORT_NAME && <span>{selectedDest.PORT_NAME}</span>}
                {selectedDest.CONTINENT && <span>{selectedDest.CONTINENT}</span>}
              </div>
              {selectedDest.REQUIREMENTS && (
                <div className="mt-2 flex items-start gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-2.5 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-line">{selectedDest.REQUIREMENTS}</p>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border px-5">
              {(["rates", "schedules", "share"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                    activeTab === tab
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}>
                  {tab === "share" ? "Share Links" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {error && (
              <div className="mx-5 mt-3 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* ── RATES TAB ─────────────────────────────── */}
              {activeTab === "rates" && (
                <div>
                  <SectionHeader title="Carrier Rates" icon={Globe}
                    action={
                      <Button size="sm" variant="outline" onClick={() => setShowAddRate(v => !v)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Rate
                      </Button>
                    }
                  />

                  {/* Add rate form */}
                  {showAddRate && (
                    <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Carrier *">
                          <select value={newRate.carrier}
                            onChange={e => setNewRate(p => ({ ...p, carrier: e.target.value }))}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                            <option value="">Select…</option>
                            {CARRIERS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Container">
                          <Input value={newRate.container_type}
                            onChange={e => setNewRate(p => ({ ...p, container_type: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label="Rate (USD)">
                        <Input placeholder="e.g. USD 2673 per 40&quot;HC" value={newRate.rate_usd}
                          onChange={e => setNewRate(p => ({ ...p, rate_usd: e.target.value }))} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Free Days">
                          <Input placeholder="e.g. 14 days at POD" value={newRate.free_days}
                            onChange={e => setNewRate(p => ({ ...p, free_days: e.target.value }))} />
                        </Field>
                        <Field label="Validity">
                          <Input placeholder="e.g. End of July 2026" value={newRate.validity}
                            onChange={e => setNewRate(p => ({ ...p, validity: e.target.value }))} />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={newRate.is_suspended}
                          onChange={e => setNewRate(p => ({ ...p, is_suspended: e.target.checked }))} />
                        Service Suspended
                      </label>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addRate} disabled={savingRate} className="flex-1">
                          {savingRate ? "Saving…" : "Add Rate"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddRate(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Rates table */}
                  {rates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No rates yet. Add one above.</p>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Carrier</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Rate</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Free Days</th>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Validity</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {rates.map((r, i) => (
                            <tr key={r.RATE_ID} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                              {editingRate?.RATE_ID === r.RATE_ID ? (
                                <>
                                  <td className="px-2 py-1.5" colSpan={4}>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <Input value={editingRate.RATE_USD ?? ""}
                                        placeholder="Rate USD"
                                        onChange={e => setEditingRate(p => p ? { ...p, RATE_USD: e.target.value } : p)} className="h-7 text-xs" />
                                      <Input value={editingRate.FREE_DAYS ?? ""}
                                        placeholder="Free days"
                                        onChange={e => setEditingRate(p => p ? { ...p, FREE_DAYS: e.target.value } : p)} className="h-7 text-xs" />
                                      <Input value={editingRate.VALIDITY ?? ""}
                                        placeholder="Validity"
                                        onChange={e => setEditingRate(p => p ? { ...p, VALIDITY: e.target.value } : p)} className="h-7 text-xs col-span-2" />
                                      <label className="flex items-center gap-1.5 text-xs col-span-2">
                                        <input type="checkbox" checked={!!editingRate.IS_SUSPENDED}
                                          onChange={e => setEditingRate(p => p ? { ...p, IS_SUSPENDED: e.target.checked } : p)} />
                                        Service Suspended
                                      </label>
                                    </div>
                                    <div className="flex gap-1 mt-1.5">
                                      <Button size="sm" onClick={saveEditRate} disabled={savingRate} className="h-6 text-xs">
                                        <Check className="h-3 w-3 mr-1" /> Save
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingRate(null)} className="h-6 text-xs">
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                                    {r.CARRIER}
                                    {r.IS_SUSPENDED && <Badge variant="outline" className="ml-1.5 text-[10px] text-destructive border-destructive/30">Suspended</Badge>}
                                  </td>
                                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.RATE_USD || "—"}</td>
                                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.FREE_DAYS || "—"}</td>
                                  <td className="px-3 py-2 text-muted-foreground text-xs">{r.VALIDITY || "—"}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-0.5 justify-end">
                                      <button onClick={() => setEditingRate(r)}
                                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button onClick={() => deleteRate(r.RATE_ID)}
                                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── SCHEDULES TAB ─────────────────────────── */}
              {activeTab === "schedules" && (
                <div>
                  <SectionHeader title="Vessel Schedules" icon={Ship}
                    action={
                      <Button size="sm" variant="outline" onClick={() => setShowAddSched(v => !v)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Sailing
                      </Button>
                    }
                  />

                  {/* Add schedule form */}
                  {showAddSched && (
                    <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Carrier *">
                          <select value={newSched.carrier}
                            onChange={e => setNewSched(p => ({ ...p, carrier: e.target.value }))}
                            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
                            <option value="">Select…</option>
                            {CARRIERS.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Via Port">
                          <Input value={newSched.via_port} placeholder="e.g. Durban"
                            onChange={e => setNewSched(p => ({ ...p, via_port: e.target.value }))} />
                        </Field>
                        <Field label="Vessel Name">
                          <Input value={newSched.vessel_name} placeholder="e.g. MAERSK CUBANGO"
                            onChange={e => setNewSched(p => ({ ...p, vessel_name: e.target.value }))} />
                        </Field>
                        <Field label="Voyage No">
                          <Input value={newSched.voyage_no} placeholder="e.g. 626W"
                            onChange={e => setNewSched(p => ({ ...p, voyage_no: e.target.value }))} />
                        </Field>
                        <Field label="ETD (Departure)">
                          <Input value={newSched.etd} placeholder="e.g. 9 Jul 2026"
                            onChange={e => setNewSched(p => ({ ...p, etd: e.target.value }))} />
                        </Field>
                        <Field label="ETA (Arrival)">
                          <Input value={newSched.eta} placeholder="e.g. 8 Aug 2026"
                            onChange={e => setNewSched(p => ({ ...p, eta: e.target.value }))} />
                        </Field>
                        <Field label="Transit Days">
                          <Input value={newSched.transit_days} placeholder="e.g. 30 days"
                            onChange={e => setNewSched(p => ({ ...p, transit_days: e.target.value }))} />
                        </Field>
                        <Field label="Gate-In Deadline">
                          <Input value={newSched.gate_in} placeholder="e.g. 5 Jul 2026"
                            onChange={e => setNewSched(p => ({ ...p, gate_in: e.target.value }))} />
                        </Field>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addSchedule} disabled={savingSched} className="flex-1">
                          {savingSched ? "Saving…" : "Add Sailing"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddSched(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Schedules grouped by carrier */}
                  {schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No schedules yet. Add sailings above.</p>
                  ) : (
                    <div className="space-y-4">
                      {[...new Set(schedules.map(s => s.CARRIER))].map(carrier => (
                        <div key={carrier}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{carrier}</h4>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Vessel / Voyage</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">ETD</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">ETA</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Transit</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Via</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {schedules.filter(s => s.CARRIER === carrier).map((s, i) => (
                                  <tr key={s.SCHED_ID} className={cn("border-b border-border last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                                    {editingSched?.SCHED_ID === s.SCHED_ID ? (
                                      <td colSpan={6} className="px-2 py-1.5">
                                        <div className="grid grid-cols-3 gap-1.5">
                                          {(["VESSEL_NAME","VOYAGE_NO","ETD","ETA","TRANSIT_DAYS","VIA_PORT","GATE_IN"] as (keyof Schedule)[]).map(field => (
                                            <Input key={field} value={(editingSched[field] as string) ?? ""}
                                              placeholder={field.replace("_", " ").toLowerCase()}
                                              onChange={e => setEditingSched(p => p ? { ...p, [field]: e.target.value } : p)}
                                              className="h-7 text-xs" />
                                          ))}
                                        </div>
                                        <div className="flex gap-1 mt-1.5">
                                          <Button size="sm" onClick={saveEditSched} disabled={savingSched} className="h-6 text-xs">
                                            <Check className="h-3 w-3 mr-1" /> Save
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => setEditingSched(null)} className="h-6 text-xs">
                                            <X className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </td>
                                    ) : (
                                      <>
                                        <td className="px-3 py-2 text-xs">
                                          <p className="font-medium">{s.VESSEL_NAME || "TBN"}</p>
                                          {s.VOYAGE_NO && <p className="text-muted-foreground">{s.VOYAGE_NO}</p>}
                                          {s.GATE_IN && <p className="text-[10px] text-amber-600">Gate-in: {s.GATE_IN}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.ETD || "—"}</td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.ETA || "—"}</td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.TRANSIT_DAYS || "—"}</td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">{s.VIA_PORT || "—"}</td>
                                        <td className="px-3 py-2">
                                          <div className="flex gap-0.5 justify-end">
                                            <button onClick={() => setEditingSched(s)}
                                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => deleteSched(s.SCHED_ID)}
                                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SHARE TAB ─────────────────────────────── */}
              {activeTab === "share" && (
                <div>
                  <SectionHeader title="Client Share Links" icon={Link2}
                    action={
                      <Button size="sm" variant="outline" onClick={() => setShowAddToken(v => !v)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Generate Link
                      </Button>
                    }
                  />

                  {showAddToken && (
                    <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 space-y-3 text-sm">
                      <Field label="Client Name">
                        <Input value={newToken.client_name} placeholder="e.g. ABC Exports Ltd"
                          onChange={e => setNewToken(p => ({ ...p, client_name: e.target.value }))} />
                      </Field>
                      <Field label="Client Email (optional)">
                        <Input value={newToken.client_email} type="email" placeholder="client@example.com"
                          onChange={e => setNewToken(p => ({ ...p, client_email: e.target.value }))} />
                      </Field>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={generateToken} disabled={savingToken} className="flex-1">
                          {savingToken ? "Generating…" : "Generate Link"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddToken(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {tokens.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No share links yet. Generate one to send to a client.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {tokens.map(t => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/r/${t.TOKEN}`
                        const isCopied = copiedToken === t.TOKEN
                        return (
                          <div key={t.TOKEN_ID} className="rounded-lg border border-border bg-muted/20 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{t.CLIENT_NAME || "Unnamed Client"}</p>
                                {t.CLIENT_EMAIL && <p className="text-xs text-muted-foreground">{t.CLIENT_EMAIL}</p>}
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  Created {new Date(t.CREATED_AT).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                  {t.LAST_VIEWED && ` · Last viewed ${new Date(t.LAST_VIEWED).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}
                                </p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => copyLink(t.TOKEN)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background text-xs hover:bg-accent transition-colors">
                                  {isCopied ? <CheckCheck className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  {isCopied ? "Copied!" : "Copy link"}
                                </button>
                                <button onClick={() => revokeToken(t.TOKEN_ID)}
                                  title="Revoke"
                                  className="p-1.5 rounded-md border border-border bg-background hover:bg-accent text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 bg-background rounded border border-border px-2 py-1">
                              <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[11px] text-muted-foreground font-mono truncate">{url}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
