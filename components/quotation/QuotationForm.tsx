"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import { cn } from "@/lib/utils"
import {
  MANILAL_SALES_PERSONS,
  LINKS_SALES_PERSONS,
  BRANCHES,
  CONTAINER_TYPES,
  INCOTERMS,
  PORT_CITIES,
  expandPortCity,
} from "@/lib/constants/dropdowns"
import { RotateCcw, FileDown, Save } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface ChargeField {
  amount: string
  currency: string
  remarks: string
}

function emptyCharge(currency = "USD"): ChargeField {
  return { amount: "", currency, remarks: "" }
}

interface LocalCharges {
  bl_fee: ChargeField
  thc: ChargeField
  seal_charges: ChargeField
  muc: ChargeField
  toll: ChargeField
  bl_surrendered: ChargeField
}

interface DocCharges {
  agency_charges: ChargeField
  customs_clearance: ChargeField
  doc_examine: ChargeField
  cfs_onwheel: ChargeField
  vgm_charges: ChargeField
  warai_charges: ChargeField
  loading_unloading: ChargeField
  cfs_stuffing: ChargeField
}

interface FactoryCharges {
  customs_clearance: ChargeField
}

interface TransportCost {
  amount: string
  currency: string
  description: string
}

interface FormData {
  quot_date: string
  mode: string
  exim: string
  fn: string
  enq_type: string
  incoterms: string
  pol: string
  pod: string
  container_type: string
  shipper: string
  shipment_type: "freight" | "custom_clearance" | "both" | ""
  freight_charge: ChargeField
  vessel_name: string
  etd: string
  eta: string
  transit_time: string
  free_time: string
  local_charges: LocalCharges
  stuffing_type: "doc" | "factory" | ""
  doc_charges: DocCharges
  factory_charges: FactoryCharges
  transport_enabled: boolean
  transport_cost: TransportCost
  clauses: string
  sales_person: string
  branch: string
}

const DEFAULT_CLAUSES = `Note: Rates are subject to inventory / Space / Vessel availability
Request you to please confirm to proceed for Booking release
Hope you find our quote up to your mark
Awaiting for response to proceed further`

function defaultLocalCharges(): LocalCharges {
  return {
    bl_fee: emptyCharge(),
    thc: emptyCharge(),
    seal_charges: emptyCharge(),
    muc: emptyCharge(),
    toll: emptyCharge(),
    bl_surrendered: emptyCharge(),
  }
}

function defaultDocCharges(): DocCharges {
  return {
    agency_charges: emptyCharge(),
    customs_clearance: emptyCharge(),
    doc_examine: emptyCharge(),
    cfs_onwheel: emptyCharge(),
    vgm_charges: emptyCharge(),
    warai_charges: emptyCharge(),
    loading_unloading: emptyCharge(),
    cfs_stuffing: emptyCharge(),
  }
}

function defaultFactoryCharges(): FactoryCharges {
  return {
    customs_clearance: emptyCharge(),
  }
}

function getDefaultForm(): FormData {
  return {
    quot_date: new Date().toISOString().split("T")[0],
    mode: "",
    exim: "",
    fn: "",
    enq_type: "",
    incoterms: "",
    pol: "",
    pod: "",
    container_type: "",
    shipper: "",
    shipment_type: "",
    freight_charge: emptyCharge(),
    vessel_name: "",
    etd: "",
    eta: "",
    transit_time: "",
    free_time: "",
    local_charges: defaultLocalCharges(),
    stuffing_type: "",
    doc_charges: defaultDocCharges(),
    factory_charges: defaultFactoryCharges(),
    transport_enabled: false,
    transport_cost: { amount: "", currency: "INR", description: "" },
    clauses: DEFAULT_CLAUSES,
    sales_person: "",
    branch: "",
  }
}

export interface QuotationEditing {
  id: string
  quot_ref_no: string
  quot_date: string | null
  mode: string | null
  exim: string | null
  fn: string | null
  enq_type: string | null
  incoterms: string | null
  pol: string | null
  pod: string | null
  container_type: string | null
  shipper: string | null
  shipment_type: string | null
  freight_charge: ChargeField | null
  vessel_name: string | null
  etd: string | null
  eta: string | null
  transit_time: string | null
  free_time: string | null
  local_charges: LocalCharges | null
  stuffing_type: string | null
  cc_charges: (DocCharges | FactoryCharges) | null
  transport_enabled: boolean
  transport_cost: TransportCost | null
  clauses: string | null
  sales_person: string | null
  branch: string | null
  enq_id: string | null
}

interface Props {
  company: string
  editingQuotation?: QuotationEditing | null
  prefilledEnqId?: string | null
  onSuccess?: (id: string, refNo: string) => void
}

// ─── Exchange rate hook ───────────────────────────────────────

interface ExchangeData {
  usdToInr: number
  rates: Record<string, number>
  currencies: Record<string, string>
  currencyList: string[]
}

function useExchangeRate() {
  const [data, setData] = useState<ExchangeData>({
    usdToInr: 84,
    rates: { usd: 1, inr: 84 },
    currencies: {},
    currencyList: ["USD", "INR", "EUR", "GBP", "AED", "SGD", "JPY", "CNY", "AUD", "CAD"],
  })

  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        const currencyList = Object.keys(d.currencies ?? {})
          .map((c) => c.toUpperCase())
          .sort()
        setData({
          usdToInr: d.usdToInr ?? 84,
          rates: d.rates ?? {},
          currencies: d.currencies ?? {},
          currencyList: currencyList.length > 0 ? currencyList : ["USD", "INR", "EUR"],
        })
      })
      .catch(() => {})
  }, [])

  return data
}

// ─── Helpers ─────────────────────────────────────────────────

function normDate(raw: string | null | undefined): string {
  if (!raw) return ""
  const s = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0]
}

function toInr(amount: string, currency: string, rates: Record<string, number>): number {
  const n = parseFloat(amount)
  if (!n || isNaN(n)) return 0
  const cur = currency.toLowerCase()
  const inrRate = rates["inr"] ?? 84
  const curRate = rates[cur] ?? 1
  return n * (inrRate / curRate)
}

// ─── Sub-components ───────────────────────────────────────────

function CurrencySelect({
  value,
  onChange,
  currencyList,
}: {
  value: string
  onChange: (v: string) => void
  currencyList: string[]
}) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={currencyList}
      placeholder="CUR"
      className="w-24 shrink-0"
    />
  )
}

function ChargeRow({
  label,
  field,
  onChange,
  currencyList,
}: {
  label: string
  field: ChargeField
  onChange: (f: ChargeField) => void
  currencyList: string[]
}) {
  return (
    <div className="grid grid-cols-[minmax(140px,1fr)_120px_96px_minmax(120px,1fr)] items-center gap-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={field.amount}
        onChange={(e) => onChange({ ...field, amount: e.target.value })}
        placeholder="0.00"
        className="text-right"
      />
      <CurrencySelect
        value={field.currency}
        onChange={(v) => onChange({ ...field, currency: v })}
        currencyList={currencyList}
      />
      <Input
        value={field.remarks}
        onChange={(e) => onChange({ ...field, remarks: e.target.value })}
        placeholder="Remarks"
        className="text-sm"
      />
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1 mb-3 mt-6">
      {children}
    </h3>
  )
}

// ─── Main component ───────────────────────────────────────────

export function QuotationForm({ company, editingQuotation, prefilledEnqId, onSuccess }: Props) {
  const router = useRouter()
  const exchange = useExchangeRate()
  const [form, setForm] = useState<FormData>(getDefaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const salesPersons = company === "links" ? LINKS_SALES_PERSONS : MANILAL_SALES_PERSONS
  const portOptions = PORT_CITIES.map(expandPortCity)

  // Populate from editing quotation
  useEffect(() => {
    if (!editingQuotation) return
    setEditId(editingQuotation.id)

    const q = editingQuotation
    const stuffType = (q.stuffing_type ?? "") as "doc" | "factory" | ""

    setForm({
      quot_date: normDate(q.quot_date) || new Date().toISOString().split("T")[0],
      mode: q.mode ?? "",
      exim: q.exim ?? "",
      fn: q.fn ?? "",
      enq_type: q.enq_type ?? "",
      incoterms: q.incoterms ?? "",
      pol: q.pol ?? "",
      pod: q.pod ?? "",
      container_type: q.container_type ?? "",
      shipper: q.shipper ?? "",
      shipment_type: (q.shipment_type as FormData["shipment_type"]) ?? "",
      freight_charge: q.freight_charge ?? emptyCharge(),
      vessel_name: q.vessel_name ?? "",
      etd: normDate(q.etd),
      eta: normDate(q.eta),
      transit_time: q.transit_time ?? "",
      free_time: q.free_time ?? "",
      local_charges: q.local_charges ?? defaultLocalCharges(),
      stuffing_type: stuffType,
      doc_charges: (stuffType === "doc" ? (q.cc_charges as DocCharges) : null) ?? defaultDocCharges(),
      factory_charges: (stuffType === "factory" ? (q.cc_charges as FactoryCharges) : null) ?? defaultFactoryCharges(),
      transport_enabled: q.transport_enabled ?? false,
      transport_cost: q.transport_cost ?? { amount: "", currency: "INR", description: "" },
      clauses: q.clauses ?? DEFAULT_CLAUSES,
      sales_person: q.sales_person ?? "",
      branch: q.branch ?? "",
    })
  }, [editingQuotation])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setLocalCharge(key: keyof LocalCharges, value: ChargeField) {
    setForm((f) => ({ ...f, local_charges: { ...f.local_charges, [key]: value } }))
  }

  function setDocCharge(key: keyof DocCharges, value: ChargeField) {
    setForm((f) => ({ ...f, doc_charges: { ...f.doc_charges, [key]: value } }))
  }

  function setFactoryCharge(key: keyof FactoryCharges, value: ChargeField) {
    setForm((f) => ({ ...f, factory_charges: { ...f.factory_charges, [key]: value } }))
  }

  const showFreight = form.shipment_type === "freight" || form.shipment_type === "both"
  const showCC = form.shipment_type === "custom_clearance" || form.shipment_type === "both"

  // ─── Total calculation ────────────────────────────────────

  const totalInr = useCallback(() => {
    let sum = 0
    const r = exchange.rates

    if (showFreight) {
      sum += toInr(form.freight_charge.amount, form.freight_charge.currency, r)
      const lc = form.local_charges
      sum += toInr(lc.bl_fee.amount, lc.bl_fee.currency, r)
      sum += toInr(lc.thc.amount, lc.thc.currency, r)
      sum += toInr(lc.seal_charges.amount, lc.seal_charges.currency, r)
      sum += toInr(lc.muc.amount, lc.muc.currency, r)
      sum += toInr(lc.toll.amount, lc.toll.currency, r)
      sum += toInr(lc.bl_surrendered.amount, lc.bl_surrendered.currency, r)
    }

    if (showCC) {
      if (form.stuffing_type === "doc") {
        const dc = form.doc_charges
        sum += toInr(dc.agency_charges.amount, dc.agency_charges.currency, r)
        sum += toInr(dc.customs_clearance.amount, dc.customs_clearance.currency, r)
        sum += toInr(dc.doc_examine.amount, dc.doc_examine.currency, r)
        sum += toInr(dc.cfs_onwheel.amount, dc.cfs_onwheel.currency, r)
        sum += toInr(dc.vgm_charges.amount, dc.vgm_charges.currency, r)
        sum += toInr(dc.warai_charges.amount, dc.warai_charges.currency, r)
        sum += toInr(dc.loading_unloading.amount, dc.loading_unloading.currency, r)
        sum += toInr(dc.cfs_stuffing.amount, dc.cfs_stuffing.currency, r)
      } else if (form.stuffing_type === "factory") {
        const fc = form.factory_charges
        sum += toInr(fc.customs_clearance.amount, fc.customs_clearance.currency, r)
      }
    }

    if (form.transport_enabled) {
      sum += toInr(form.transport_cost.amount, form.transport_cost.currency, r)
    }

    return sum
  }, [form, exchange.rates, showFreight, showCC])

  // ─── Submit ───────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const ccCharges = form.stuffing_type === "doc"
      ? form.doc_charges
      : form.stuffing_type === "factory"
        ? form.factory_charges
        : null

    const payload = {
      quot_date: form.quot_date,
      mode: form.mode,
      exim: form.exim,
      fn: form.fn,
      enq_type: form.enq_type,
      incoterms: form.incoterms,
      pol: form.pol,
      pod: form.pod,
      container_type: form.container_type,
      shipper: form.shipper,
      shipment_type: form.shipment_type,
      freight_charge: showFreight ? form.freight_charge : null,
      vessel_name: showFreight ? form.vessel_name : null,
      etd: showFreight && form.etd ? form.etd : null,
      eta: showFreight && form.eta ? form.eta : null,
      transit_time: showFreight ? form.transit_time : null,
      free_time: showFreight ? form.free_time : null,
      local_charges: showFreight ? form.local_charges : null,
      stuffing_type: showCC ? form.stuffing_type : null,
      cc_charges: showCC ? ccCharges : null,
      transport_enabled: form.transport_enabled,
      transport_cost: form.transport_enabled ? form.transport_cost : null,
      total_inr: totalInr(),
      exchange_rate: exchange.usdToInr,
      clauses: form.clauses,
      sales_person: form.sales_person,
      branch: form.branch,
      enq_id: prefilledEnqId ?? null,
    }

    try {
      const url = editId ? `/api/quotations/${editId}` : "/api/quotations"
      const method = editId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to save")
        return
      }

      const data = await res.json()
      const id = editId ?? data.id
      const refNo = editingQuotation?.quot_ref_no ?? data.quot_ref_no
      setSaved(true)
      onSuccess?.(id, refNo)
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  // ─── PDF generation ───────────────────────────────────────

  async function handleGeneratePdf() {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 14

    // ── Logo ──────────────────────────────────────────────
    try {
      const isLinks = company === "links"
      let logoDataUrl: string

      if (isLinks) {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
        const pdf = await pdfjsLib.getDocument("/Links logo (3).pdf").promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 3 })
        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise
        logoDataUrl = canvas.toDataURL("image/png")
      } else {
        const blob = await fetch("/logo.jpeg").then((r) => r.blob())
        logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }

      doc.addImage(logoDataUrl, isLinks ? "PNG" : "JPEG", margin, y, 40, 16)
    } catch { /* logo load failed — continue without */ }

    // ── Header ────────────────────────────────────────────
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("FREIGHT QUOTATION", margin + 36, y + 10)

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    const refLabel = editingQuotation?.quot_ref_no ?? "DRAFT"
    doc.text(`Ref: ${refLabel}`, pageW - margin, y, { align: "right" })
    y += 5
    doc.text(`Date: ${form.quot_date}`, pageW - margin, y, { align: "right" })
    doc.text(
      `USD / INR: ${exchange.usdToInr.toFixed(2)}`,
      pageW - margin,
      y + 5,
      { align: "right" }
    )
    doc.setTextColor(0)
    y += 20

    // ── Shipment details ──────────────────────────────────
    const details: [string, string][] = [
      ["Mode", form.mode],
      ["Exim", form.exim],
      ["F/N", form.fn],
      ["Enquiry Type", form.enq_type],
      ["Incoterms", form.incoterms],
      ["POL / Origin", form.pol],
      ["POD / Destination", form.pod],
      ["Container Type", form.container_type],
      ["Shipper", form.shipper],
      ["Shipment Type", form.shipment_type.replace("_", " ")],
      ["Sales Person", form.sales_person],
    ].filter((row): row is [string, string] => Boolean(row[1]))

    autoTable(doc, {
      startY: y,
      head: [["Field", "Value"]],
      body: details,
      theme: "grid",
      headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

    // ── Vessel Schedule ───────────────────────────────────
    if (showFreight) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Vessel Schedule", margin, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head: [["Vessel Name", "ETD", "ETA", "Transit Time", "Free Time"]],
        body: [[
          form.vessel_name || "-",
          form.etd || "-",
          form.eta || "-",
          form.transit_time || "-",
          form.free_time || "-",
        ]],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

      // Freight charge
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Freight Charge", margin, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head: [["Charge", "Amount", "Currency", "Remarks"]],
        body: [["Freight", form.freight_charge.amount || "-", form.freight_charge.currency, form.freight_charge.remarks || ""]],
        theme: "grid",
        headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

      // Local charges
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Origin Local Charges", margin, y)
      y += 2

      const localRows: [string, string, string, string][] = [
        ["BL Fee", form.local_charges.bl_fee.amount || "-", form.local_charges.bl_fee.currency, form.local_charges.bl_fee.remarks || ""],
        ["THC", form.local_charges.thc.amount || "-", form.local_charges.thc.currency, form.local_charges.thc.remarks || ""],
        ["Seal Charges", form.local_charges.seal_charges.amount || "-", form.local_charges.seal_charges.currency, form.local_charges.seal_charges.remarks || ""],
        ["MUC", form.local_charges.muc.amount || "-", form.local_charges.muc.currency, form.local_charges.muc.remarks || ""],
        ["Toll", form.local_charges.toll.amount || "-", form.local_charges.toll.currency, form.local_charges.toll.remarks || ""],
        ["BL Surrendered / Seaway Bill", form.local_charges.bl_surrendered.amount || "-", form.local_charges.bl_surrendered.currency, form.local_charges.bl_surrendered.remarks || ""],
      ]

      autoTable(doc, {
        startY: y,
        head: [["Charge", "Amount", "Currency", "Remarks"]],
        body: localRows,
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    }

    // ── CC Charges ────────────────────────────────────────
    if (showCC) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(`Custom Clearance — ${form.stuffing_type === "doc" ? "DOC Stuffing" : "Factory Stuffing"}`, margin, y)
      y += 2

      let ccRows: [string, string, string, string][] = []

      if (form.stuffing_type === "doc") {
        const dc = form.doc_charges
        ccRows = [
          ["Agency Charges", dc.agency_charges.amount || "-", dc.agency_charges.currency, dc.agency_charges.remarks || ""],
          ["Customs Clearance Charges", dc.customs_clearance.amount || "-", dc.customs_clearance.currency, dc.customs_clearance.remarks || ""],
          ["Doc & Examine", dc.doc_examine.amount || "-", dc.doc_examine.currency, dc.doc_examine.remarks || ""],
          ["CFS Onwheel Party Vehicle Charges", dc.cfs_onwheel.amount || "-", dc.cfs_onwheel.currency, dc.cfs_onwheel.remarks || ""],
          ["VGM Charges", dc.vgm_charges.amount || "-", dc.vgm_charges.currency, dc.vgm_charges.remarks || ""],
          ["Warai Charges", dc.warai_charges.amount || "-", dc.warai_charges.currency, dc.warai_charges.remarks || ""],
          ["Loading & Unloading", dc.loading_unloading.amount || "-", dc.loading_unloading.currency, dc.loading_unloading.remarks || ""],
          ["CFS Stuffing Charges", dc.cfs_stuffing.amount || "-", dc.cfs_stuffing.currency, dc.cfs_stuffing.remarks || ""],
        ]
      } else if (form.stuffing_type === "factory") {
        const fc = form.factory_charges
        ccRows = [
          ["Customs Clearance Charges", fc.customs_clearance.amount || "-", fc.customs_clearance.currency, fc.customs_clearance.remarks || ""],
        ]
      }

      autoTable(doc, {
        startY: y,
        head: [["Charge", "Amount", "Currency", "Remarks"]],
        body: ccRows,
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    }

    // ── Transportation ────────────────────────────────────
    if (form.transport_enabled) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Transportation Cost", margin, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head: [["Description", "Amount", "Currency"]],
        body: [[
          form.transport_cost.description || "Transportation",
          form.transport_cost.amount || "-",
          form.transport_cost.currency,
        ]],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
    }

    // ── Total ─────────────────────────────────────────────
    const total = totalInr()
    autoTable(doc, {
      startY: y,
      body: [
        [{ content: `Exchange Rate: 1 USD = ${exchange.usdToInr.toFixed(2)} INR`, colSpan: 2, styles: { fontSize: 8, textColor: [100, 100, 100] } }],
        [
          { content: "TOTAL COST", styles: { fontStyle: "bold", fontSize: 10 } },
          { content: `INR ${total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { fontStyle: "bold", fontSize: 10, halign: "right" } },
        ],
      ],
      theme: "grid",
      margin: { left: margin, right: margin },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    // ── Clauses ───────────────────────────────────────────
    if (form.clauses) {
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text("Terms & Conditions", margin, y)
      y += 4
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(80)
      const lines = form.clauses.split("\n")
      lines.forEach((line) => {
        if (y > 270) {
          doc.addPage()
          y = 14
        }
        doc.text(`• ${line}`, margin, y)
        y += 5
      })
    }

    doc.save(`Quotation_${refLabel}_${form.quot_date}.pdf`)
  }

  // ─── Render ───────────────────────────────────────────────

  const currencyList = exchange.currencyList
  const total = totalInr()

  return (
    <form onSubmit={handleSubmit} className="space-y-2">

      {/* ── Exchange rate banner ────────────────────────────── */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-2 text-sm">
        <span className="text-muted-foreground">Live Rate</span>
        <span className="font-semibold">
          1 USD = <span className="text-blue-600">{exchange.usdToInr.toFixed(2)} INR</span>
        </span>
        <span className="text-muted-foreground text-xs">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
      </div>

      {/* ── Base Details ─────────────────────────────────────── */}
      <div className="rounded-lg border border-border p-4">
        <SectionHeader>Quotation Details</SectionHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          <div className="space-y-1">
            <Label>Date</Label>
            <Input type="date" value={form.quot_date} onChange={(e) => set("quot_date", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Mode <span className="text-destructive">*</span></Label>
            <Select value={form.mode} onValueChange={(v) => set("mode", v)}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SEA">Sea</SelectItem>
                <SelectItem value="AIR">Air</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Exim <span className="text-destructive">*</span></Label>
            <Select value={form.exim} onValueChange={(v) => set("exim", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPORT">Export</SelectItem>
                <SelectItem value="IMPORT">Import</SelectItem>
                <SelectItem value="CROSS TRADE">Cross Trade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>F/N <span className="text-destructive">*</span></Label>
            <Select value={form.fn} onValueChange={(v) => set("fn", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FREEHAND">Freehand</SelectItem>
                <SelectItem value="NOMINATION">Nomination</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Enquiry Type <span className="text-destructive">*</span></Label>
            <Select value={form.enq_type} onValueChange={(v) => set("enq_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LOCAL">Local</SelectItem>
                <SelectItem value="OVERSEAS">Overseas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Incoterms <span className="text-destructive">*</span></Label>
            <Select value={form.incoterms} onValueChange={(v) => set("incoterms", v)}>
              <SelectTrigger><SelectValue placeholder="Select incoterms" /></SelectTrigger>
              <SelectContent>
                {INCOTERMS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>POL / Origin Airport <span className="text-destructive">*</span></Label>
            <Combobox value={form.pol} onChange={(v) => set("pol", v)} options={portOptions} placeholder="Search port..." />
          </div>

          <div className="space-y-1">
            <Label>POD / Dest. Airport <span className="text-destructive">*</span></Label>
            <Combobox value={form.pod} onChange={(v) => set("pod", v)} options={portOptions} placeholder="Search port..." />
          </div>

          <div className="space-y-1">
            <Label>Container Type <span className="text-destructive">*</span></Label>
            <Select value={form.container_type} onValueChange={(v) => set("container_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Shipper</Label>
            <Input value={form.shipper} onChange={(e) => set("shipper", e.target.value)} placeholder="Shipper name" />
          </div>

          <div className="space-y-1">
            <Label>Sales Person</Label>
            <Select value={form.sales_person} onValueChange={(v) => set("sales_person", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {salesPersons.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => set("branch", v)}>
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Type of Shipment */}
        <div className="mt-4 space-y-1">
          <Label>Type of Shipment <span className="text-destructive">*</span></Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {(["freight", "custom_clearance", "both"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("shipment_type", t)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                  form.shipment_type === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-background text-foreground border-border hover:border-blue-400"
                )}
              >
                {t === "freight" ? "Freight" : t === "custom_clearance" ? "Custom Clearance" : "Both"}
              </button>
            ))}
          </div>
        </div>

        {/* Freight charge — shown when freight or both */}
        {showFreight && (
          <div className="mt-4">
            <Label className="text-sm font-semibold mb-2 block">Freight Charge</Label>
            <div className="grid grid-cols-[minmax(140px,1fr)_120px_96px_minmax(120px,1fr)] gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charge</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currency</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remarks</span>
            </div>
            <ChargeRow
              label="Freight"
              field={form.freight_charge}
              onChange={(f) => set("freight_charge", f)}
              currencyList={currencyList}
            />
          </div>
        )}
      </div>

      {/* ── Freight sections ──────────────────────────────────── */}
      {showFreight && (
        <div className="rounded-lg border border-border p-4">
          <SectionHeader>Vessel Schedule</SectionHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label>Vessel Name</Label>
              <Input value={form.vessel_name} onChange={(e) => set("vessel_name", e.target.value)} placeholder="Vessel name" />
            </div>
            <div className="space-y-1">
              <Label>ETD at Origin</Label>
              <Input type="date" value={form.etd} onChange={(e) => set("etd", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>ETA at Destination</Label>
              <Input type="date" value={form.eta} onChange={(e) => set("eta", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Transit Time</Label>
              <Input value={form.transit_time} onChange={(e) => set("transit_time", e.target.value)} placeholder="e.g. 14 days" />
            </div>
            <div className="space-y-1">
              <Label>Free Time</Label>
              <Input value={form.free_time} onChange={(e) => set("free_time", e.target.value)} placeholder="e.g. 7 days" />
            </div>
          </div>

          <SectionHeader>Origin Local Charges</SectionHeader>

          {/* Column headers */}
          <div className="grid grid-cols-[minmax(140px,1fr)_120px_96px_minmax(120px,1fr)] gap-2 px-0 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charge</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currency</span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remarks</span>
          </div>

          <div className="space-y-2">
            <ChargeRow label="BL Fee" field={form.local_charges.bl_fee} onChange={(f) => setLocalCharge("bl_fee", f)} currencyList={currencyList} />
            <ChargeRow label="THC" field={form.local_charges.thc} onChange={(f) => setLocalCharge("thc", f)} currencyList={currencyList} />
            <ChargeRow label="Seal Charges" field={form.local_charges.seal_charges} onChange={(f) => setLocalCharge("seal_charges", f)} currencyList={currencyList} />
            <ChargeRow label="MUC" field={form.local_charges.muc} onChange={(f) => setLocalCharge("muc", f)} currencyList={currencyList} />
            <ChargeRow label="Toll" field={form.local_charges.toll} onChange={(f) => setLocalCharge("toll", f)} currencyList={currencyList} />
            <ChargeRow label="BL Surrendered / Seaway Bill" field={form.local_charges.bl_surrendered} onChange={(f) => setLocalCharge("bl_surrendered", f)} currencyList={currencyList} />
          </div>
        </div>
      )}

      {/* ── Custom Clearance sections ─────────────────────────── */}
      {showCC && (
        <div className="rounded-lg border border-border p-4">
          <SectionHeader>Custom Clearance Costing</SectionHeader>

          <div className="flex gap-2 mb-4">
            {(["doc", "factory"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("stuffing_type", t)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                  form.stuffing_type === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-background text-foreground border-border hover:border-blue-400"
                )}
              >
                {t === "doc" ? "DOC Stuffing" : "Factory Stuffing"}
              </button>
            ))}
          </div>

          {(form.stuffing_type === "doc" || form.stuffing_type === "factory") && (
            <div className="grid grid-cols-[minmax(140px,1fr)_120px_96px_minmax(120px,1fr)] gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Charge</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Amount</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Currency</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Remarks</span>
            </div>
          )}

          {form.stuffing_type === "doc" && (
            <div className="space-y-2">
              <ChargeRow label="Agency Charges" field={form.doc_charges.agency_charges} onChange={(f) => setDocCharge("agency_charges", f)} currencyList={currencyList} />
              <ChargeRow label="Customs Clearance Charges" field={form.doc_charges.customs_clearance} onChange={(f) => setDocCharge("customs_clearance", f)} currencyList={currencyList} />
              <ChargeRow label="Doc & Examine" field={form.doc_charges.doc_examine} onChange={(f) => setDocCharge("doc_examine", f)} currencyList={currencyList} />
              <ChargeRow label="CFS Onwheel Party Vehicle Charges" field={form.doc_charges.cfs_onwheel} onChange={(f) => setDocCharge("cfs_onwheel", f)} currencyList={currencyList} />
              <ChargeRow label="VGM Charges" field={form.doc_charges.vgm_charges} onChange={(f) => setDocCharge("vgm_charges", f)} currencyList={currencyList} />
              <ChargeRow label="Warai Charges" field={form.doc_charges.warai_charges} onChange={(f) => setDocCharge("warai_charges", f)} currencyList={currencyList} />
              <ChargeRow label="Loading & Unloading" field={form.doc_charges.loading_unloading} onChange={(f) => setDocCharge("loading_unloading", f)} currencyList={currencyList} />
              <ChargeRow label="CFS Stuffing Charges" field={form.doc_charges.cfs_stuffing} onChange={(f) => setDocCharge("cfs_stuffing", f)} currencyList={currencyList} />
            </div>
          )}

          {form.stuffing_type === "factory" && (
            <div className="space-y-2">
              <ChargeRow label="Customs Clearance Charges" field={form.factory_charges.customs_clearance} onChange={(f) => setFactoryCharge("customs_clearance", f)} currencyList={currencyList} />
            </div>
          )}
        </div>
      )}

      {/* ── Transportation Cost ───────────────────────────────── */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <input
            id="transport-toggle"
            type="checkbox"
            checked={form.transport_enabled}
            onChange={(e) => set("transport_enabled", e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <Label htmlFor="transport-toggle" className="text-sm font-semibold cursor-pointer">
            Include Transportation Cost
          </Label>
        </div>

        {form.transport_enabled && (
          <div className="space-y-3 max-w-lg">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <Label className="text-sm text-muted-foreground">Transportation Cost</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.transport_cost.amount}
                onChange={(e) => set("transport_cost", { ...form.transport_cost, amount: e.target.value })}
                placeholder="0.00"
                className="w-32 text-right"
              />
              <CurrencySelect
                value={form.transport_cost.currency}
                onChange={(v) => set("transport_cost", { ...form.transport_cost, currency: v })}
                currencyList={currencyList}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Description</Label>
              <Input
                value={form.transport_cost.description}
                onChange={(e) => set("transport_cost", { ...form.transport_cost, description: e.target.value })}
                placeholder="e.g. Road transport, Mumbai to CFS"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Total Cost ────────────────────────────────────────── */}
      {total > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4">
          <SectionHeader>Total Cost</SectionHeader>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Exchange rate: 1 USD = {exchange.usdToInr.toFixed(2)} INR
            </span>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              INR {total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* ── Clauses ───────────────────────────────────────────── */}
      <div className="rounded-lg border border-border p-4">
        <SectionHeader>Clauses</SectionHeader>
        <textarea
          value={form.clauses}
          onChange={(e) => set("clauses", e.target.value)}
          rows={6}
          className={cn(
            "w-full rounded-md border border-input bg-[hsl(var(--input-bg))] px-3 py-2 text-sm",
            "placeholder:text-muted-foreground resize-y",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          )}
        />
      </div>

      {/* ── Actions ───────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {saved && (
        <p className="text-sm text-green-600">Saved successfully.</p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="gap-2">
          <Save className="h-4 w-4" />
          {submitting ? "Saving..." : editId ? "Update Quotation" : "Save Quotation"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleGeneratePdf}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Generate PDF
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setForm(getDefaultForm())
            setEditId(null)
            setSaved(false)
            setError("")
          }}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

    </form>
  )
}
