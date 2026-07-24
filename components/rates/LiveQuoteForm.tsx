"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EQUIPMENT_LABEL, type EquipmentKey, type OneLocation, type OneCommodity, type OneQuoteResult } from "@/lib/carriers/one/types"

interface Props {
  onResult: (result: OneQuoteResult) => void
}

const EQUIPMENT_KEYS = Object.keys(EQUIPMENT_LABEL) as EquipmentKey[]

export function LiveQuoteForm({ onResult }: Props) {
  const [origin, setOrigin] = useState<OneLocation | null>(null)
  const [dest, setDest] = useState<OneLocation | null>(null)
  const [equipment, setEquipment] = useState<EquipmentKey>("DRY20")
  const [quantity, setQuantity] = useState(1)
  const [weight, setWeight] = useState(18000)
  const [commodity, setCommodity] = useState<OneCommodity | null>(null)
  const [date, setDate] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin || !dest) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/rates/live/one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLocationCode: origin.code,
          destinationLocationCode: dest.code,
          originLocationType: origin.locationType ?? "CY",
          destinationLocationType: dest.locationType ?? "CY",
          originRhqCode: origin.rhqCode,
          equipment,
          quantity,
          cargoWeight: weight,
          commodityCode: commodity?.code || undefined,
          date: date || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Live quote failed")
        return
      }
      onResult(data as OneQuoteResult)
    } catch {
      setError("Live quote request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 min-w-0">
          <Label className="mb-1.5 block text-sm">Origin (Port of Loading)</Label>
          <LocationAutocomplete type="origin" value={origin} onSelect={setOrigin} placeholder="e.g. Nhava Sheva" />
        </div>
        <div className="hidden sm:flex items-end pb-2.5 text-muted-foreground text-lg font-light select-none">→</div>
        <div className="flex-1 min-w-0">
          <Label className="mb-1.5 block text-sm">Destination (Port of Discharge)</Label>
          <LocationAutocomplete type="destination" value={dest} onSelect={setDest} placeholder="e.g. Rotterdam" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label className="mb-1.5 block text-sm">Equipment</Label>
          <Select value={equipment} onValueChange={(v) => setEquipment(v as EquipmentKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>{EQUIPMENT_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Quantity</Label>
          <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Cargo Weight (KGS)</Label>
          <Input type="number" min={1} value={weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">
            Commodity <span className="text-xs text-muted-foreground">(optional — defaults to FAK DRY)</span>
          </Label>
          <CommodityAutocomplete value={commodity} onSelect={setCommodity} placeholder="Search name or HS code" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            Sailing date <span className="text-muted-foreground/60">(optional)</span>
          </Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex-1" />
        <Button type="submit" disabled={!origin || !dest || loading}>
          {loading ? "Fetching live rates…" : "Get Live Rates"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </form>
  )
}

// ── Debounced location autocomplete hitting our server-side proxy ────────────
function LocationAutocomplete({
  type,
  value,
  onSelect,
  placeholder,
}: {
  type: "origin" | "destination"
  value: OneLocation | null
  onSelect: (loc: OneLocation | null) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState(value ? `${value.name} (${value.code})` : "")
  const [options, setOptions] = useState<OneLocation[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounced fetch
  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([])
      return
    }
    // If the query matches the current selection label, don't re-search.
    if (value && query === `${value.name} (${value.code})`) return

    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/rates/live/one/locations?q=${encodeURIComponent(query.trim())}&type=${type}`,
          { signal: ctrl.signal }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          setOptions(data)
          setOpen(true)
        }
      } catch {
        /* aborted or failed — ignore */
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, type, value])

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          onSelect(null)
        }}
        onFocus={() => options.length && setOpen(true)}
        autoComplete="off"
      />
      {open && (options.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {options.map((loc) => (
            <button
              key={loc.code}
              type="button"
              onClick={() => {
                onSelect(loc)
                setQuery(`${loc.name} (${loc.code})`)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate text-foreground">{loc.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{loc.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Debounced commodity autocomplete hitting our server-side proxy ───────────
function CommodityAutocomplete({
  value,
  onSelect,
  placeholder,
}: {
  value: OneCommodity | null
  onSelect: (commodity: OneCommodity | null) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState(value ? `${value.name} (${value.code})` : "")
  const [options, setOptions] = useState<OneCommodity[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounced fetch
  useEffect(() => {
    if (query.trim().length < 2) {
      setOptions([])
      return
    }
    // If the query matches the current selection label, don't re-search.
    if (value && query === `${value.name} (${value.code})`) return

    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/rates/live/one/commodity?q=${encodeURIComponent(query.trim())}`,
          { signal: ctrl.signal }
        )
        const data = await res.json()
        if (Array.isArray(data)) {
          setOptions(data)
          setOpen(true)
        }
      } catch {
        /* aborted or failed — ignore */
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, value])

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          onSelect(null)
        }}
        onFocus={() => options.length && setOpen(true)}
        autoComplete="off"
      />
      {open && (options.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover shadow-md">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
          {options.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onSelect(c)
                setQuery(`${c.name} (${c.code})`)
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <span className="truncate text-foreground">{c.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
