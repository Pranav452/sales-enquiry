"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { FileDown } from "lucide-react"
import { LEAD_STATUSES } from "@/lib/constants/sales-leads"
import { MANILAL_SALES_PERSONS, LINKS_SALES_PERSONS } from "@/lib/constants/dropdowns"
import type { SalesLead } from "./SalesLeadList"

const ALL_SALES_PERSONS = [...new Set([...MANILAL_SALES_PERSONS, ...LINKS_SALES_PERSONS])].sort()

interface Props {
  editing?:            SalesLead | null
  defaultSalesPerson?: string
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

export function SalesLeadForm({ editing, defaultSalesPerson, onSuccess, onCancel }: Props) {
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
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 14

    try {
      const blob = await fetch("/logo.jpeg").then((r) => r.blob())
      const logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      doc.addImage(logoDataUrl, "JPEG", margin, y, 40, 16)
    } catch { /* skip logo */ }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("SALES LEAD", margin + 46, y + 8)
    if (editing?.ref_code) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100)
      doc.text(`Ref: ${editing.ref_code}`, pageW - margin, y, { align: "right" })
      doc.text(`Date: ${form.date_sent || ""}`, pageW - margin, y + 5, { align: "right" })
      doc.setTextColor(0)
    }
    y += 22

    const basicRows: [string, string][] = [
      ["Sent By", form.sent_by || "—"],
      ["Date Sent", form.date_sent || "—"],
      ["Status", form.status || "—"],
      ["Agent Name", form.agent_name || "—"],
      ["Agent Email", form.agent_email || "—"],
    ].filter((r): r is [string, string] => Boolean(r[1] && r[1] !== "—"))

    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: basicRows,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 6

    const shipperRows: [string, string][] = [
      ["Shipper", form.shipper || "—"],
      ["Shipper Website", form.shipper_website || ""],
      ["Shipper Address", form.shipper_address || ""],
      ["City", form.city || ""],
    ].filter((r): r is [string, string] => Boolean(r[1]))

    if (shipperRows.length) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Shipper", margin, y)
      y += 2
      autoTable(doc, {
        startY: y,
        body: shipperRows,
        theme: "grid",
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    const consigneeRows: [string, string][] = [
      ["Consignee", form.consignee || ""],
      ["Consignee Address", form.consignee_address || ""],
      ["Consignee Website", form.consignee_website || ""],
      ["Destination Country", form.dest_country || ""],
    ].filter((r): r is [string, string] => Boolean(r[1]))

    if (consigneeRows.length) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Consignee", margin, y)
      y += 2
      autoTable(doc, {
        startY: y,
        body: consigneeRows,
        theme: "grid",
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    const shipmentRows: [string, string][] = [
      ["Mode of Transport", form.mode_of_transport || ""],
      ["Origin Port / Airport", form.origin_port || ""],
      ["Destination Port / Airport", form.dest_port || ""],
      ["Commodity", form.commodity || ""],
      ["HS Code", form.hs_code || ""],
      ["Special Requirements", form.special_requirements || ""],
    ].filter((r): r is [string, string] => Boolean(r[1]))

    if (shipmentRows.length) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Shipment Details", margin, y)
      y += 2
      autoTable(doc, {
        startY: y,
        body: shipmentRows,
        theme: "grid",
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    const rateRows: [string, string][] = [
      ["FCL Rate", form.rate_fcl || ""],
      ["LCL Rate", form.rate_lcl || ""],
      ["Validity", form.rate_validity || ""],
    ].filter((r): r is [string, string] => Boolean(r[1]))

    if (rateRows.length) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Rate", margin, y)
      y += 2
      autoTable(doc, {
        startY: y,
        body: rateRows,
        theme: "grid",
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    const remarksRows: [string, string][] = [
      ["Remarks", form.remarks || ""],
      ["Remarks 2", form.remarks_2 || ""],
      ["Notes", form.notes || ""],
    ].filter((r): r is [string, string] => Boolean(r[1]))

    if (remarksRows.length) {
      autoTable(doc, {
        startY: y,
        body: remarksRows,
        theme: "grid",
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 6
    }

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80)
    const footerY = doc.internal.pageSize.getHeight() - 20
    doc.line(margin, footerY - 2, pageW - margin, footerY - 2)
    doc.text(`${form.sent_by || "Sales"} · MP Cargo · www.manilal.com`, margin, footerY + 2)
    doc.setTextColor(0)

    const filename = `SalesLead_${editing?.ref_code ?? "Draft"}_${form.date_sent || "today"}.pdf`
    doc.save(filename)
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
