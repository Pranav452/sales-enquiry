"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  getActivityPoints,
  ACTIVITY_TYPE_MAP,
} from "@/lib/constants/activities"
import { BRANCHES, MANILAL_SALES_PERSONS, LINKS_SALES_PERSONS } from "@/lib/constants/dropdowns"

const ALL_SALES_PERSONS = [...LINKS_SALES_PERSONS, ...MANILAL_SALES_PERSONS].sort()

const CALL_TYPES = new Set(["COLD_CALL", "WARM_CALL"])

interface Props {
  editingId?:           string | null
  defaultSalesPerson?:  string
  defaultBranch?:       string
  defaultValues?:       Partial<FormState>
  onSuccess?:           (id: string, points: number, isEdit: boolean) => void
  onCancel?:            () => void
}

interface FormState {
  activity_date:   string
  activity_type:   string
  sales_person:    string
  branch:          string
  client_name:     string
  contact_person:  string
  contact_number:  string
  email:           string
  mode:            string
  pol:             string
  pod:             string
  commodity:       string
  status:          string
  notes:           string
  reminder_date:   string
  reminder_done:   boolean
}

function today() {
  return new Date().toISOString().split("T")[0]
}

function NativeSelect({
  label, value, options, onChange, required, placeholder,
}: {
  label: string
  value: string
  options: string[] | { value: string; label: string }[]
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  )
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={cn(
          "h-9 rounded-md border border-input bg-background px-3 text-sm",
          "text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          "transition-colors"
        )}
      >
        <option value="">{placeholder ?? `Select ${label}`}</option>
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export function ActivityForm({ editingId, defaultSalesPerson, defaultBranch, defaultValues, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({
    activity_date:  today(),
    activity_type:  "",
    sales_person:   defaultSalesPerson ?? "",
    branch:         defaultBranch ?? "",
    client_name:    "",
    contact_person: "",
    contact_number: "",
    email:          "",
    mode:           "",
    pol:            "",
    pod:            "",
    commodity:      "",
    status:         "",
    notes:          "",
    reminder_date:  "",
    reminder_done:  false,
    ...defaultValues,
  })
  const [saving, setSaving]           = useState(false)
  const [error,  setError]            = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)

  const isCall         = CALL_TYPES.has(form.activity_type)
  const reminderMissing = isCall && !form.reminder_date

  // Load existing record for edit
  useEffect(() => {
    if (!editingId) return
    setLoadingEdit(true)
    fetch(`/api/activities/${editingId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          activity_date:  data.activity_date  ?? today(),
          activity_type:  data.activity_type  ?? "",
          sales_person:   data.sales_person   ?? defaultSalesPerson ?? "",
          branch:         data.branch         ?? defaultBranch ?? "",
          client_name:    data.client_name    ?? "",
          contact_person: data.contact_person ?? "",
          contact_number: data.contact_number ?? "",
          email:          data.email          ?? "",
          mode:           data.mode           ?? "",
          pol:            data.pol            ?? "",
          pod:            data.pod            ?? "",
          commodity:      data.commodity      ?? "",
          status:         data.status         ?? "",
          notes:          data.notes          ?? "",
          reminder_date:  data.reminder_date  ?? "",
          reminder_done:  !!data.reminder_done,
        })
      })
      .catch(() => setError("Failed to load activity"))
      .finally(() => setLoadingEdit(false))
  }, [editingId, defaultSalesPerson, defaultBranch])

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Clear reminder_date when switching away from call types
    if (field === "activity_type" && !CALL_TYPES.has(value as string)) {
      setForm((prev) => ({ ...prev, [field]: value, reminder_date: "" }))
    }
  }

  const previewPoints = form.activity_type ? getActivityPoints(form.activity_type) : null
  const typeDef       = form.activity_type ? ACTIVITY_TYPE_MAP[form.activity_type] : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.activity_type || !form.activity_date) {
      setError("Date and Activity Type are required.")
      return
    }
    if (reminderMissing) {
      setError("Reminder Call Date is required for call activities.")
      return
    }
    setSaving(true)
    setError(null)

    const url    = editingId ? `/api/activities/${editingId}` : "/api/activities"
    const method = editingId ? "PATCH" : "POST"

    const payload = {
      ...form,
      reminder_date: form.reminder_date || null,
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Save failed")
      onSuccess?.(json.id ?? editingId ?? "", json.points ?? previewPoints ?? 1, !!editingId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setSaving(false)
    }
  }

  if (loadingEdit) {
    return <div className="py-6 text-sm text-center text-muted-foreground">Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Activity type + point preview ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Activity Type<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set("activity_type", t.value)}
                className={cn(
                  "flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all",
                  form.activity_type === t.value
                    ? `${t.color} ${t.textColor} border-current ring-1 ring-current`
                    : "bg-background border-border text-muted-foreground hover:border-input hover:text-foreground"
                )}
              >
                <span className="text-xs font-semibold">{t.label}</span>
                <span className="text-[10px] mt-0.5 opacity-80">+{t.points} XP</span>
              </button>
            ))}
          </div>
          {typeDef && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{typeDef.description}</p>
          )}
        </div>

        {/* Point preview card */}
        <div className={cn(
          "rounded-lg border flex flex-col items-center justify-center gap-1 p-4 transition-colors",
          previewPoints
            ? `${typeDef?.color ?? "bg-muted"} ${typeDef?.textColor ?? ""} border-current`
            : "border-dashed border-border text-muted-foreground"
        )}>
          <span className="text-3xl font-bold leading-none">
            {previewPoints != null ? `+${previewPoints}` : "?"}
          </span>
          <span className="text-xs font-medium">XP Points</span>
          {form.activity_type && (
            <span className="text-[11px] opacity-70 text-center">{typeDef?.label}</span>
          )}
        </div>
      </div>

      {/* ── Date + Sales Person + Branch ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Activity Date<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <Input
            type="date"
            value={form.activity_date}
            onChange={(e) => set("activity_date", e.target.value)}
            required
            className="h-9 text-sm"
          />
        </div>
        <NativeSelect
          label="Sales Person"
          value={form.sales_person}
          options={ALL_SALES_PERSONS}
          onChange={(v) => set("sales_person", v)}
          required
        />
        <NativeSelect
          label="Branch"
          value={form.branch}
          options={BRANCHES}
          onChange={(v) => set("branch", v)}
          required
        />
      </div>

      {/* ── Reminder Call Date (mandatory for calls) ────── */}
      {isCall && (
        <div className={cn(
          "rounded-lg border px-4 py-3 space-y-2 transition-colors",
          reminderMissing
            ? "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
            : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">
              Reminder Required
            </span>
            {editingId && (
              <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.reminder_done}
                  onChange={(e) => set("reminder_done", e.target.checked)}
                  className="h-3.5 w-3.5 rounded"
                />
                Mark reminder done
              </label>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Reminder Call Date<span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              type="date"
              value={form.reminder_date}
              onChange={(e) => set("reminder_date", e.target.value)}
              min={today()}
              className={cn(
                "h-9 text-sm max-w-xs",
                reminderMissing && "border-red-400 focus-visible:ring-red-400"
              )}
            />
            {reminderMissing && (
              <p className="text-xs text-red-600 dark:text-red-400">
                Set a date to follow up with this client — required for all calls.
              </p>
            )}
            {!reminderMissing && form.reminder_date && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                You will be reminded on {new Date(form.reminder_date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Client details ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            Client / Company Name<span className="text-red-500 ml-0.5">*</span>
          </Label>
          <Input
            value={form.client_name}
            onChange={(e) => set("client_name", e.target.value)}
            placeholder="e.g. High Street Essentials Pvt Ltd"
            required
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Contact Person</Label>
          <Input
            value={form.contact_person}
            onChange={(e) => set("contact_person", e.target.value)}
            placeholder="Name"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Contact Number</Label>
          <Input
            value={form.contact_number}
            onChange={(e) => set("contact_number", e.target.value)}
            placeholder="+91 ..."
            className="h-9 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="contact@company.com"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* ── Shipment details ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <NativeSelect
          label="Mode"
          value={form.mode}
          options={["SEA", "AIR", "LAND", "COURIER"]}
          onChange={(v) => set("mode", v)}
          placeholder="Mode"
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">POL</Label>
          <Input value={form.pol} onChange={(e) => set("pol", e.target.value)} placeholder="POL" className="h-9 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">POD</Label>
          <Input value={form.pod} onChange={(e) => set("pod", e.target.value)} placeholder="POD" className="h-9 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Commodity / HS Category</Label>
          <Input value={form.commodity} onChange={(e) => set("commodity", e.target.value)} placeholder="e.g. Garments / 62" className="h-9 text-sm" />
        </div>
      </div>

      {/* ── Status + Notes ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NativeSelect
          label="Status"
          value={form.status}
          options={ACTIVITY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) => set("status", v)}
          required
          placeholder="Select outcome"
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Notes</Label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Brief notes on the conversation or visit..."
            rows={3}
            className={cn(
              "rounded-md border border-input bg-background px-3 py-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              "resize-none transition-colors"
            )}
          />
        </div>
      </div>

      {/* ── Error + actions ──────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={saving || (isCall && reminderMissing)}>
          {saving
            ? editingId ? "Saving..." : "Logging..."
            : editingId ? "Save Changes" : `Log Activity ${previewPoints != null ? `(+${previewPoints} XP)` : ""}`
          }
        </Button>
      </div>
    </form>
  )
}
