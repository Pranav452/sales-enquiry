"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FileDown } from "lucide-react"
import { LEAD_STATUSES } from "@/lib/constants/sales-leads"
import { MANILAL_SALES_PERSONS, LINKS_SALES_PERSONS } from "@/lib/constants/dropdowns"
import { generateSalesLeadPdf } from "@/lib/sales-lead-pdf"
import type { SalesLead } from "./SalesLeadList"

const ALL_SALES_PERSONS = [...new Set([...MANILAL_SALES_PERSONS, ...LINKS_SALES_PERSONS])].sort()

interface Props {
  editing?:            SalesLead | null
  defaultSalesPerson?: string
  company?:            string | null
  onSuccess:           (id: string, refCode: string | undefined, isEdit: boolean) => void
  onCancel?:           () => void
}

interface FormState {
  sent_by:              string
  date_sent:            string
  shipper:              string
  shipper_website:      string
  city:                 string
  consignee:            string
  dest_country:         string
  agent_name:           string
  agent_email:          string
  status:               string
  remarks:              string
  remarks_2:            string
  last_follow_up:       string
  notes:                string
  shipper_address:      string
  consignee_address:    string
  consignee_website:    string
  mode_of_transport:    string
  origin_port:          string
  dest_port:            string
  commodity:            string
  hs_code:              string
  special_requirements: string
  rate_fcl:             string
  rate_lcl:             string
  rate_validity:        string
}

const EMPTY: FormState = {
  sent_by: "", date_sent: "", shipper: "", shipper_website: "", city: "",
  consignee: "", dest_country: "", agent_name: "", agent_email: "",
  status: "LEAD_SENT", remarks: "", remarks_2: "", last_follow_up: "", notes: "",
  shipper_address: "", consignee_address: "", consignee_website: "",
  mode_of_transport: "", origin_port: "", dest_port: "",
  commodity: "", hs_code: "", special_requirements: "",
  rate_fcl: "", rate_lcl: "", rate_validity: "",
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

const selectCls = cn(
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm",
  "text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
)
const textareaCls = cn(
  "w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm min-h-[64px]",
  "text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
)

export function SalesLeadForm({ editing, defaultSalesPerson, company, onSuccess, onCancel }: Props) {
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        sent_by:              editing.sent_by              ?? "",
        date_sent:            editing.date_sent            ?? "",
        shipper:              editing.shipper              ?? "",
        shipper_website:      editing.shipper_website      ?? "",
        city:                 editing.city                 ?? "",
        consignee:            editing.consignee            ?? "",
        dest_country:         editing.dest_country         ?? "",
        agent_name:           editing.agent_name           ?? "",
        agent_email:          editing.agent_email          ?? "",
        status:               editing.status               ?? "",
        remarks:              editing.remarks              ?? "",
        remarks_2:            editing.remarks_2            ?? "",
        last_follow_up:       editing.last_follow_up       ?? "",
        notes:                editing.notes                ?? "",
        shipper_address:      editing.shipper_address      ?? "",
        consignee_address:    editing.consignee_address    ?? "",
        consignee_website:    editing.consignee_website    ?? "",
        mode_of_transport:    editing.mode_of_transport    ?? "",
        origin_port:          editing.origin_port          ?? "",
        dest_port:            editing.dest_port            ?? "",
        commodity:            editing.commodity            ?? "",
        hs_code:              editing.hs_code              ?? "",
        special_requirements: editing.special_requirements ?? "",
        rate_fcl:             editing.rate_fcl             ?? "",
        rate_lcl:             editing.rate_lcl             ?? "",
        rate_validity:        editing.rate_validity         ?? "",
      })
    } else {
      setForm({
        ...EMPTY,
        sent_by:   defaultSalesPerson ?? "",
        date_sent: new Date().toISOString().split("T")[0],
      })
    }
  }, [editing, defaultSalesPerson])

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.shipper.trim()) { setError("Shipper is required."); return }
    if (!form.sent_by)        { setError("Sent By is required.");  return }
    if (!form.date_sent)      { setError("Date Sent is required."); return }

    setSaving(true)
    try {
      const url    = editing ? `/api/sales-leads/${editing.id}` : "/api/sales-leads"
      const method = editing ? "PATCH" : "POST"
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Save failed")
      onSuccess(editing ? editing.id : data.id, data.ref_code, !!editing)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadPdf() {
    await generateSalesLeadPdf({ ...form, ref_code: editing?.ref_code ?? null }, company)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {editing && (
        <p className="text-xs text-muted-foreground">
          Editing <span className="font-semibold text-foreground">{editing.ref_code}</span>
        </p>
      )}

      {/* ── Lead basics ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Sent By" required>
          <select value={form.sent_by} onChange={(e) => set("sent_by", e.target.value)} className={selectCls}>
            <option value="">Select…</option>
            {ALL_SALES_PERSONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Date Sent" required>
          <Input type="date" value={form.date_sent} onChange={(e) => set("date_sent", e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={selectCls}>
            <option value="">—</option>
            {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      {/* ── Shipper ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Shipper" required>
          <Input value={form.shipper} onChange={(e) => set("shipper", e.target.value)} placeholder="Shipper company name" className="h-9 text-sm" />
        </Field>
        <Field label="Shipper Website">
          <Input value={form.shipper_website} onChange={(e) => set("shipper_website", e.target.value)} placeholder="https://…" className="h-9 text-sm" />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-9 text-sm" />
        </Field>
      </div>

      {/* ── Consignee + agent ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Consignee">
          <Input value={form.consignee} onChange={(e) => set("consignee", e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Destination Country">
          <Input value={form.dest_country} onChange={(e) => set("dest_country", e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Agent Name">
          <Input value={form.agent_name} onChange={(e) => set("agent_name", e.target.value)} className="h-9 text-sm" />
        </Field>
        <Field label="Agent Email(s)">
          <Input value={form.agent_email} onChange={(e) => set("agent_email", e.target.value)} placeholder="a@x.com; b@y.com" className="h-9 text-sm" />
        </Field>
      </div>

      {/* ── Remarks ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Field label="Remarks">
          <textarea value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={textareaCls} />
        </Field>
        <Field label="Remarks 2">
          <textarea value={form.remarks_2} onChange={(e) => set("remarks_2", e.target.value)} className={textareaCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Last Follow-up">
          <Input type="date" value={form.last_follow_up} onChange={(e) => set("last_follow_up", e.target.value)} className="h-9 text-sm" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className={cn(textareaCls, "min-h-[40px]")} />
          </Field>
        </div>
      </div>

      {/* ── Shipment Details ──────────────────────────────── */}
      <div className="border-t border-border pt-4 mt-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shipment Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Mode of Transport">
            <select value={form.mode_of_transport} onChange={(e) => set("mode_of_transport", e.target.value)} className={selectCls}>
              <option value="">—</option>
              <option value="Sea">Sea</option>
              <option value="Air">Air</option>
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
            </select>
          </Field>
          <Field label="Origin Port / Airport">
            <Input value={form.origin_port} onChange={(e) => set("origin_port", e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Destination Port / Airport">
            <Input value={form.dest_port} onChange={(e) => set("dest_port", e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="HS Code">
            <Input value={form.hs_code} onChange={(e) => set("hs_code", e.target.value)} className="h-9 text-sm" />
          </Field>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          <Field label="Commodity / Goods Description">
            <textarea value={form.commodity} onChange={(e) => set("commodity", e.target.value)} className={textareaCls} />
          </Field>
          <Field label="Special Requirements">
            <textarea value={form.special_requirements} onChange={(e) => set("special_requirements", e.target.value)} className={textareaCls} />
          </Field>
        </div>
      </div>

      {/* ── Shipper & Consignee Details ───────────────────── */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shipper & Consignee Details</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Field label="Shipper Address">
            <textarea value={form.shipper_address} onChange={(e) => set("shipper_address", e.target.value)} className={textareaCls} placeholder="Full address" />
          </Field>
          <div className="space-y-3">
            <Field label="Consignee Address">
              <textarea value={form.consignee_address} onChange={(e) => set("consignee_address", e.target.value)} className={textareaCls} placeholder="Full address" />
            </Field>
            <Field label="Consignee Website">
              <Input value={form.consignee_website} onChange={(e) => set("consignee_website", e.target.value)} placeholder="https://…" className="h-9 text-sm" />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Rate ──────────────────────────────────────────── */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rate</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="FCL Rate">
            <Input value={form.rate_fcl} onChange={(e) => set("rate_fcl", e.target.value)} placeholder="e.g. USD 1200/20'" className="h-9 text-sm" />
          </Field>
          <Field label="LCL Rate">
            <Input value={form.rate_lcl} onChange={(e) => set("rate_lcl", e.target.value)} placeholder="e.g. USD 35/CBM" className="h-9 text-sm" />
          </Field>
          <Field label="Validity">
            <Input value={form.rate_validity} onChange={(e) => set("rate_validity", e.target.value)} placeholder="e.g. 30 days" className="h-9 text-sm" />
          </Field>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Create Lead"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-1.5">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </form>
  )
}
