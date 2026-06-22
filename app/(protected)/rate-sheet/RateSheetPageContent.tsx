"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight,
  Link2, Copy, CheckCheck, Ship, Globe, AlertTriangle, Camera
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

interface ExtractedSailing {
  vessel_name: string
  voyage_no: string
  etd: string
  eta: string
  transit_days: string
  via_port: string
  gate_in: string
}

const CARRIER_EXTRACT_TIPS: Record<string, string[]> = {
  "CMA CGM": [
    "CMA CGM shows multiple sailings per page in a vertical timeline",
    "Each entry shows: departure date (top) → service code → vessel name → arrival date (bottom)",
    "1–2 full-page screenshots usually covers a full month",
    "Include the full card — don't crop departure or arrival dates at the edges",
  ],
  "Maersk": [
    "Maersk shows ONE sailing per card — upload a separate screenshot per sailing",
    "Make sure the full card is visible: Departure · Gate-in Deadline · Arrival · Transit · Vessel/Voyage",
    "5 sailings = 5 screenshots — shift-select all files at once when uploading",
    "Even if a card says 'sold out', the sailing dates are still real — upload it",
  ],
  "MSC": [
    "MSC shows sailings in a table — one screenshot covers 5–6 rows",
    "Capture the full table including the header row (Departure / Arrival / Vessel / Transit / Routing)",
    "1–2 screenshots typically covers a full month of sailings",
  ],
  "ONE LINE": [
    "Upload a screenshot of the ONE LINE schedule table",
    "Include all columns: Vessel, Voyage, ETD, ETA, Transit, Via port",
    "Multiple sailings can be captured in a single screenshot",
  ],
  "Hapag-Lloyd": [
    "Take a screenshot of the Hapag-Lloyd schedule results page",
    "Include the full table: Vessel, Voyage, Departure, Arrival, Transit",
    "The 'SI Cutoff' date is the gate-in deadline — make sure it's visible",
  ],
  "Evergreen": [
    "Upload screenshots of the Evergreen schedule search results table",
    "Include all columns: Vessel, Voyage, CY Closing (gate-in), ETD, ETA, Transit",
    "Multiple sailings can be captured per screenshot",
  ],
}

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

  // Extract from images
  const [showExtractModal, setShowExtractModal] = useState(false)
  const [extractCarrier, setExtractCarrier] = useState("")
  const [extractFiles, setExtractFiles] = useState<File[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractedRows, setExtractedRows] = useState<ExtractedSailing[]>([])
  const [extractStep, setExtractStep] = useState<"upload" | "preview">("upload")
  const [importingExtract, setImportingExtract] = useState(false)

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
    if (rRes.ok) {
      setRates(await rRes.json())
    } else {
      const txt = await rRes.text().catch(() => rRes.status.toString())
      setError(`Rates load failed (${rRes.status}): ${txt}`)
    }
    if (sRes.ok) {
      setSchedules(await sRes.json())
    } else {
      const txt = await sRes.text().catch(() => sRes.status.toString())
      setError(prev => prev || `Schedules load failed (${sRes.status}): ${txt}`)
    }
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

  // ── Extract from images ────────────────────────────────────

  function resetExtract() {
    setShowExtractModal(false)
    setExtractStep("upload")
    setExtractedRows([])
    setExtractFiles([])
    setExtractCarrier("")
    setExtracting(false)
  }

  async function runExtraction() {
    if (!extractCarrier || extractFiles.length === 0) return
    setExtracting(true)
    setError("")
    try {
      const fd = new FormData()
      fd.append("carrier", extractCarrier)
      extractFiles.forEach(f => fd.append("images", f))
      const res = await fetch("/api/rate-sheet/extract-schedule", { method: "POST", body: fd })
      if (!res.ok) throw new Error(await res.text())
      const rows: ExtractedSailing[] = (await res.json()).map((r: Record<string, string | null>) => ({
        vessel_name:  r.vessel_name  ?? "",
        voyage_no:    r.voyage_no    ?? "",
        etd:          r.etd          ?? "",
        eta:          r.eta          ?? "",
        transit_days: r.transit_days ?? "",
        via_port:     r.via_port     ?? "",
        gate_in:      r.gate_in      ?? "",
      }))
      setExtractedRows(rows)
      setExtractStep("preview")
    } catch (e) {
      setError(`Extraction failed: ${String(e)}`)
    } finally {
      setExtracting(false)
    }
  }

  async function importExtracted() {
    if (!selectedDest || extractedRows.length === 0) return
    setImportingExtract(true)
    setError("")
    try {
      for (const [i, row] of extractedRows.entries()) {
        await fetch("/api/rate-sheet/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dest_id:      selectedDest.DEST_ID,
            carrier:      extractCarrier,
            vessel_name:  row.vessel_name  || null,
            voyage_no:    row.voyage_no    || null,
            etd:          row.etd          || null,
            eta:          row.eta          || null,
            transit_days: row.transit_days || null,
            via_port:     row.via_port     || null,
            gate_in:      row.gate_in      || null,
            sort_order:   i,
          }),
        })
      }
      resetExtract()
      await loadDestData(selectedDest.DEST_ID)
    } catch (e) {
      setError(`Import failed: ${String(e)}`)
    } finally {
      setImportingExtract(false)
    }
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowExtractModal(true)}>
                          <Camera className="h-3.5 w-3.5 mr-1" /> Extract from images
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddSched(v => !v)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Sailing
                        </Button>
                      </div>
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

                  {/* Schedules grouped by carrier — journey timeline view */}
                  {schedules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No schedules yet. Add sailings above.</p>
                  ) : (
                    <div className="space-y-4">
                      {[...new Set(schedules.map(s => s.CARRIER))].map(carrier => {
                        const destShort = selectedDest?.PORT_NAME?.split(",")[0] ?? selectedDest?.DEST_NAME ?? "Dest"
                        return (
                          <div key={carrier}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                              <Ship className="h-3 w-3" />{carrier}
                            </h4>
                            <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
                              {schedules.filter(s => s.CARRIER === carrier).map(s => (
                                <div key={s.SCHED_ID}>
                                  {editingSched?.SCHED_ID === s.SCHED_ID ? (
                                    <div className="px-3 py-2.5 bg-muted/20">
                                      <div className="grid grid-cols-3 gap-1.5">
                                        {(["VESSEL_NAME","VOYAGE_NO","ETD","ETA","TRANSIT_DAYS","VIA_PORT","GATE_IN"] as (keyof Schedule)[]).map(field => (
                                          <Input key={field} value={(editingSched[field] as string) ?? ""}
                                            placeholder={field.replace(/_/g, " ").toLowerCase()}
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
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 group transition-colors">
                                      {/* Vessel info */}
                                      <div className="w-36 flex-shrink-0">
                                        <div className="font-semibold text-xs flex items-center gap-1.5">
                                          <Ship className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                          <span className="truncate">{s.VESSEL_NAME || "TBN"}</span>
                                        </div>
                                        {s.VOYAGE_NO && (
                                          <div className="text-[10px] text-muted-foreground ml-[18px]">{s.VOYAGE_NO}</div>
                                        )}
                                        {s.GATE_IN && (
                                          <div className="text-[10px] text-amber-600 font-semibold ml-[18px] mt-0.5">
                                            ⏰ {s.GATE_IN}
                                          </div>
                                        )}
                                      </div>

                                      {/* Journey bar */}
                                      <div className="flex-1 flex items-center gap-2 min-w-0">
                                        {/* Origin */}
                                        <div className="flex-shrink-0 text-center">
                                          <div className="text-[11px] font-bold text-foreground whitespace-nowrap">{s.ETD || "—"}</div>
                                          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">India</div>
                                        </div>

                                        {/* Track line */}
                                        <div className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                                          <div className="flex items-center w-full">
                                            <div className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0"
                                              style={{ boxShadow: "0 0 0 2px rgba(51,65,85,0.2)" }} />
                                            <div className="flex-1 h-px"
                                              style={{ background: "repeating-linear-gradient(to right, #94a3b8 0,#94a3b8 3px,transparent 3px,transparent 6px)" }} />
                                            <span className="text-base flex-shrink-0 px-0.5">🚢</span>
                                            <div className="flex-1 h-px"
                                              style={{ background: "repeating-linear-gradient(to right, #94a3b8 0,#94a3b8 3px,transparent 3px,transparent 6px)" }} />
                                            <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0"
                                              style={{ boxShadow: "0 0 0 2px rgba(37,99,235,0.2)" }} />
                                          </div>
                                          {s.TRANSIT_DAYS && (
                                            <div className="text-[9px] font-bold text-slate-600 whitespace-nowrap">{s.TRANSIT_DAYS}</div>
                                          )}
                                          {s.VIA_PORT && s.VIA_PORT !== "—" && (
                                            <div className="text-[9px] text-muted-foreground truncate max-w-full">via {s.VIA_PORT}</div>
                                          )}
                                        </div>

                                        {/* Destination */}
                                        <div className="flex-shrink-0 text-center">
                                          <div className="text-[11px] font-bold text-foreground whitespace-nowrap">{s.ETA || "—"}</div>
                                          <div className="text-[9px] text-muted-foreground uppercase tracking-wide truncate max-w-[56px]">{destShort}</div>
                                        </div>
                                      </div>

                                      {/* Actions — visible on hover */}
                                      <div className="flex gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingSched(s)}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => deleteSched(s.SCHED_ID)}
                                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
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

      {/* ── Extract from images modal ───────────────────────── */}
      {showExtractModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold flex items-center gap-2 text-base">
                  <Camera className="h-4 w-4" /> Extract Schedule from Screenshots
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  GPT-4o Vision reads your carrier screenshots and fills in the sailing data automatically
                </p>
              </div>
              <button onClick={resetExtract} className="p-1.5 rounded-md hover:bg-accent flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {extractStep === "upload" ? (
              /* ── Step 1: Upload ──────────────────────────── */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Carrier selector */}
                <Field label="Which carrier are these screenshots from? *">
                  <select
                    value={extractCarrier}
                    onChange={e => setExtractCarrier(e.target.value)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select carrier…</option>
                    {CARRIERS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>

                {/* Carrier-specific tips */}
                {extractCarrier && CARRIER_EXTRACT_TIPS[extractCarrier] && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      📸 How to screenshot {extractCarrier}:
                    </p>
                    <ul className="space-y-1">
                      {CARRIER_EXTRACT_TIPS[extractCarrier].map((tip, i) => (
                        <li key={i} className="text-xs text-blue-700 dark:text-blue-400 flex gap-1.5">
                          <span className="flex-shrink-0 mt-0.5">•</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Drop zone */}
                <div>
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors p-8 text-center gap-3",
                      extractFiles.length > 0
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    )}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const picked = Array.from(e.target.files ?? [])
                        setExtractFiles(prev => [...prev, ...picked].slice(0, 15))
                        e.target.value = ""
                      }}
                    />
                    <Camera className="h-9 w-9 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Drop images here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP · Up to 15 images</p>
                    </div>
                  </label>

                  {/* High-res warning */}
                  <div className="mt-2.5 flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Upload high-resolution screenshots for maximum accuracy.</strong>{" "}
                      Screenshot at 100% browser zoom. Blurry or cropped images cause extraction errors.
                    </p>
                  </div>
                </div>

                {/* Selected files list */}
                {extractFiles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {extractFiles.length} image{extractFiles.length !== 1 ? "s" : ""} selected:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {extractFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5 text-xs gap-2">
                          <span className="truncate text-foreground flex-1">{f.name}</span>
                          <span className="text-muted-foreground flex-shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                          <button
                            onClick={() => setExtractFiles(prev => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Step 2: Preview ─────────────────────────── */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
                  <p className="text-sm">
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ✓ {extractedRows.length} sailing{extractedRows.length !== 1 ? "s" : ""} extracted
                    </span>
                    <span className="text-muted-foreground ml-2">
                      from {extractFiles.length} image{extractFiles.length !== 1 ? "s" : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">Edit any cell, delete wrong rows, then import</p>
                </div>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                      <tr>
                        {["Vessel", "Voyage", "ETD", "ETA", "Transit", "Via", "Gate-in", ""].map(h => (
                          <th key={h} className="text-left px-2.5 py-2 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {extractedRows.map((row, i) => (
                        <tr key={i} className={cn("border-b border-border/50", i % 2 === 0 ? "" : "bg-muted/20")}>
                          {(["vessel_name", "voyage_no", "etd", "eta", "transit_days", "via_port", "gate_in"] as (keyof ExtractedSailing)[]).map(field => (
                            <td key={field} className="px-1.5 py-1">
                              <Input
                                value={row[field]}
                                onChange={e => setExtractedRows(prev =>
                                  prev.map((r, j) => j === i ? { ...r, [field]: e.target.value } : r)
                                )}
                                className="h-7 text-xs"
                                style={{ minWidth: field === "vessel_name" ? "130px" : field === "via_port" ? "110px" : "90px" }}
                                placeholder="—"
                              />
                            </td>
                          ))}
                          <td className="px-1.5 py-1">
                            <button
                              onClick={() => setExtractedRows(prev => prev.filter((_, j) => j !== i))}
                              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {extractedRows.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">
                      All rows deleted. Go back to re-extract.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between">
              {extractStep === "upload" ? (
                <>
                  <Button variant="ghost" size="sm" onClick={resetExtract}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={runExtraction}
                    disabled={!extractCarrier || extractFiles.length === 0 || extracting}
                  >
                    {extracting
                      ? `Extracting from ${extractFiles.length} image${extractFiles.length !== 1 ? "s" : ""}…`
                      : `Extract from ${extractFiles.length || "—"} image${extractFiles.length !== 1 ? "s" : ""} →`}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setExtractStep("upload")}>← Back</Button>
                  <Button
                    size="sm"
                    onClick={importExtracted}
                    disabled={extractedRows.length === 0 || importingExtract}
                  >
                    {importingExtract
                      ? "Importing…"
                      : `Import ${extractedRows.length} sailing${extractedRows.length !== 1 ? "s" : ""} →`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
