"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { COUNTRIES, PORT_CITIES } from "@/lib/constants/dropdowns"
import { parseSurcharges, serializeSurcharges } from "@/lib/utils/surcharges"
import type { FreightRate, ParsedSurcharge, RatePayload } from "@/lib/types/rates"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: boolean
  rate: FreightRate | null
  onClose: () => void
  onSaved: () => void
}

const SHIPPING_LINES = ["MSC", "PIL", "EVERGREEN", "COSCO", "HAPAG-LLOYD", "ONE", "CMA CGM", "MAERSK", "ZIM", "YANG MING"]

export function RateFormModal({ open, rate, onClose, onSaved }: Props) {
  const isEdit = rate !== null

  const [form, setForm] = useState<RatePayload>({
    shipping_line: "",
    origin_country: "INDIA",
    dest_country: "",
    origin_port: "",
    dest_port: "",
    currency: "USD",
    rate_20: null,
    rate_40: null,
    valid_from: "",
    valid_to: "",
    transit_days: null,
    via_port: "",
    surcharges: null,
    notes: "",
  })

  const [surchargeRows, setSurchargeRows] = useState<ParsedSurcharge[]>([{ name: "", value: "" }])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Populate form when editing
  useEffect(() => {
    if (!open) return
    if (rate) {
      setForm({
        shipping_line:   rate.shipping_line,
        origin_country:  rate.origin_country,
        dest_country:    rate.dest_country,
        origin_port:     rate.origin_port ?? "",
        dest_port:       rate.dest_port ?? "",
        currency:        rate.currency,
        rate_20:         rate.rate_20,
        rate_40:         rate.rate_40,
        valid_from:      rate.valid_from ?? "",
        valid_to:        rate.valid_to ?? "",
        transit_days:    rate.transit_days,
        via_port:        rate.via_port ?? "",
        surcharges:      rate.surcharges,
        notes:           rate.notes ?? "",
      })
      const parsed = parseSurcharges(rate.surcharges)
      setSurchargeRows(parsed.length > 0 ? parsed : [{ name: "", value: "" }])
    } else {
      setForm({
        shipping_line: "",
        origin_country: "INDIA",
        dest_country: "",
        origin_port: "",
        dest_port: "",
        currency: "USD",
        rate_20: null,
        rate_40: null,
        valid_from: "",
        valid_to: "",
        transit_days: null,
        via_port: "",
        surcharges: null,
        notes: "",
      })
      setSurchargeRows([{ name: "", value: "" }])
    }
    setError(null)
  }, [open, rate])

  function set(key: keyof RatePayload, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateSurchargeRow(idx: number, field: "name" | "value", val: string) {
    setSurchargeRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function addSurchargeRow() {
    setSurchargeRows((prev) => [...prev, { name: "", value: "" }])
  }

  function removeSurchargeRow(idx: number) {
    setSurchargeRows((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload: RatePayload = {
      ...form,
      surcharges: serializeSurcharges(surchargeRows.filter((r) => r.name.trim())) || null,
      origin_port: form.origin_port || null,
      dest_port:   form.dest_port   || null,
      via_port:    form.via_port    || null,
      notes:       form.notes       || null,
      valid_from:  form.valid_from  || null,
      valid_to:    form.valid_to    || null,
    }

    setSaving(true)
    try {
      const url    = isEdit ? `/api/rates/${rate!.id}` : "/api/rates"
      const method = isEdit ? "PATCH" : "POST"
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to save")
      }

      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-semibold">{isEdit ? "Edit Rate" : "Add Rate"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Shipping line */}
          <div>
            <Label className="mb-1.5 block text-sm">Shipping Line *</Label>
            <Combobox
              value={form.shipping_line}
              onChange={(v) => set("shipping_line", v)}
              options={SHIPPING_LINES}
              placeholder="e.g. MSC"
            />
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Origin Country *</Label>
              <Combobox value={form.origin_country ?? ""} onChange={(v) => set("origin_country", v)} options={COUNTRIES} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination Country *</Label>
              <Combobox value={form.dest_country} onChange={(v) => set("dest_country", v)} options={COUNTRIES} />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Origin Port</Label>
              <Combobox value={form.origin_port ?? ""} onChange={(v) => set("origin_port", v)} options={PORT_CITIES} placeholder="e.g. NHAVA SHEVA" />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Destination Port</Label>
              <Combobox value={form.dest_port ?? ""} onChange={(v) => set("dest_port", v)} options={PORT_CITIES} placeholder="e.g. SANTOS" />
            </div>
          </div>

          {/* Rates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Currency</Label>
              <Input
                value={form.currency ?? "USD"}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                maxLength={5}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">20' Rate</Label>
              <Input
                type="number"
                min={0}
                value={form.rate_20 ?? ""}
                onChange={(e) => set("rate_20", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 1400"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">40' Rate</Label>
              <Input
                type="number"
                min={0}
                value={form.rate_40 ?? ""}
                onChange={(e) => set("rate_40", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="e.g. 1500"
              />
            </div>
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Valid From</Label>
              <Input
                type="date"
                value={form.valid_from ?? ""}
                onChange={(e) => set("valid_from", e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Valid To</Label>
              <Input
                type="date"
                value={form.valid_to ?? ""}
                onChange={(e) => set("valid_to", e.target.value)}
              />
            </div>
          </div>

          {/* Transit + via */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Transit Days</Label>
              <Input
                type="number"
                min={1}
                value={form.transit_days ?? ""}
                onChange={(e) => set("transit_days", e.target.value ? parseInt(e.target.value, 10) : null)}
                placeholder="e.g. 20"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Via Port</Label>
              <Input
                value={form.via_port ?? ""}
                onChange={(e) => set("via_port", e.target.value)}
                placeholder="e.g. COLOMBO, SALALAH"
              />
            </div>
          </div>

          {/* Surcharges */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm">Surcharges</Label>
              <button
                type="button"
                onClick={addSurchargeRow}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {surchargeRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={row.name}
                    onChange={(e) => updateSurchargeRow(idx, "name", e.target.value.toUpperCase())}
                    placeholder="Name (e.g. EBS)"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm shrink-0">:</span>
                  <Input
                    value={row.value}
                    onChange={(e) => updateSurchargeRow(idx, "value", e.target.value)}
                    placeholder="Value (e.g. 160)"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeSurchargeRow(idx)}
                    className={cn(
                      "shrink-0 text-muted-foreground hover:text-destructive transition-colors",
                      surchargeRows.length === 1 && "opacity-30 pointer-events-none"
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block text-sm">Notes</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Subject to THC both sides"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{error}</p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.shipping_line || !form.origin_country || !form.dest_country}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Rate"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
