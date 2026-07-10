"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
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
import { RotateCcw, FileDown, Save, Plus, X, Loader2 } from "lucide-react"
import { drawCompanyLogo } from "@/lib/pdf-logo"
import type { RowInput } from "jspdf-autotable"
import { parseSurcharges } from "@/lib/utils/surcharges"

// Port list is static — expand it once at module load, not on every
// render. (Re-mapping ~600 entries on each keystroke made the form janky.)
const PORT_OPTIONS = PORT_CITIES.map(expandPortCity)

// ─── Types ───────────────────────────────────────────────────

interface ChargeField {
  amount: string
  currency: string
  remarks: string
}

// User-added custom line item — has its own editable label
interface ExtraCharge {
  label: string
  amount: string
  currency: string
  remarks: string
}

function emptyCharge(currency = "USD"): ChargeField {
  return { amount: "", currency, remarks: "" }
}

function emptyExtra(currency = "INR"): ExtraCharge {
  return { label: "", amount: "", currency, remarks: "" }
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
  extra_freight: ExtraCharge[]
  extra_local: ExtraCharge[]
  extra_cc: ExtraCharge[]
  vessel_name: string
  etd: string
  eta: string
  transit_time: string
  free_time: string
  routing: string
  local_charges: LocalCharges
  stuffing_type: "doc" | "factory" | ""
  doc_charges: DocCharges
  factory_charges: FactoryCharges
  transport_enabled: boolean
  transport_cost: TransportCost
  clauses: string
  sales_person: string
  branch: string
  freight_validity: string
  freight_validity_date: string
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
    extra_freight: [],
    extra_local: [],
    extra_cc: [],
    vessel_name: "",
    etd: "",
    eta: "",
    transit_time: "",
    free_time: "",
    routing: "",
    local_charges: defaultLocalCharges(),
    stuffing_type: "",
    doc_charges: defaultDocCharges(),
    factory_charges: defaultFactoryCharges(),
    transport_enabled: false,
    transport_cost: { amount: "", currency: "INR", description: "" },
    clauses: DEFAULT_CLAUSES,
    sales_person: "",
    branch: "",
    freight_validity: "",
    freight_validity_date: "",
  }
}

// Build form state from a quotation being edited/duplicated. Used both
// as the lazy initial state (so Radix Selects mount with the correct
// value — they don't reliably reflect a value applied async after an
// empty mount) and in the effect for later prop changes.
function formFromQuotation(q: QuotationEditing): FormData {
  const stuffType = (q.stuffing_type ?? "") as "doc" | "factory" | ""
  return {
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
    extra_freight: q.extra_freight ?? [],
    extra_local: q.extra_local ?? [],
    extra_cc: q.extra_cc ?? [],
    vessel_name: q.vessel_name ?? "",
    etd: normDate(q.etd),
    eta: normDate(q.eta),
    transit_time: q.transit_time ?? "",
    free_time: q.free_time ?? "",
    routing: q.routing ?? "",
    local_charges: q.local_charges ?? defaultLocalCharges(),
    stuffing_type: stuffType,
    doc_charges: (stuffType === "doc" ? (q.cc_charges as DocCharges) : null) ?? defaultDocCharges(),
    factory_charges: (stuffType === "factory" ? (q.cc_charges as FactoryCharges) : null) ?? defaultFactoryCharges(),
    transport_enabled: q.transport_enabled ?? false,
    transport_cost: q.transport_cost ?? { amount: "", currency: "INR", description: "" },
    clauses: q.clauses ?? DEFAULT_CLAUSES,
    sales_person: q.sales_person ?? "",
    branch: q.branch ?? "",
    freight_validity: q.freight_validity ?? "",
    freight_validity_date: q.freight_validity_date ?? "",
  }
}

// Prefill source when a form is seeded from a Rate Explorer card click
// rather than an existing quotation — no id/ref, just lane + rate.
export interface RatePrefill {
  carrier: string
  pol: string | null
  pod: string | null
  container_type: string
  amount: number | null
  currency: string
  transit_time: string | null
  freight_validity_date: string | null
  surcharges: string | null
}

function formFromRatePrefill(p: RatePrefill): FormData {
  const base = getDefaultForm()
  const extraFreight: ExtraCharge[] = parseSurcharges(p.surcharges).map((s) => ({
    label: s.name,
    amount: /^\d+(\.\d+)?$/.test(s.value) ? s.value : "",
    currency: p.currency,
    remarks: s.value === "included" ? "included" : "",
  }))
  return {
    ...base,
    mode: "SEA",
    pol: p.pol ?? "",
    pod: p.pod ?? "",
    container_type: p.container_type,
    shipment_type: "freight",
    freight_charge: {
      amount: p.amount != null ? String(p.amount) : "",
      currency: p.currency,
      remarks: p.carrier ? `${p.carrier} rate` : "",
    },
    extra_freight: extraFreight,
    transit_time: p.transit_time ?? "",
    freight_validity_date: p.freight_validity_date ?? "",
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
  routing?: string | null
  local_charges: LocalCharges | null
  stuffing_type: string | null
  cc_charges: (DocCharges | FactoryCharges) | null
  transport_enabled: boolean
  transport_cost: TransportCost | null
  clauses: string | null
  sales_person: string | null
  branch: string | null
  enq_id: string | null
  exchange_rate?: number | null
  display_currency?: string | null
  total_inr?: number | null
  total_display?: number | null
  extra_freight?: ExtraCharge[] | null
  extra_local?: ExtraCharge[] | null
  extra_cc?: ExtraCharge[] | null
  freight_validity?: string | null
  freight_validity_date?: string | null
}

interface Props {
  company: string
  editingQuotation?: QuotationEditing | null
  ratePrefill?: RatePrefill | null
  prefilledEnqId?: string | null
  onSuccess?: (id: string, refNo: string) => void
}

// ─── Exchange rate hook ───────────────────────────────────────

interface DgftRate {
  name: string
  import: number   // INR per unit — customs import rate
  export: number   // INR per unit — customs export rate
  unit: number
  effectiveDate: string
}

interface ExchangeData {
  usdToInr: number
  rates: Record<string, number>
  currencies: Record<string, string>
  currencyList: string[]
  dgft: Record<string, DgftRate> | null
}

function useExchangeRate() {
  const [data, setData] = useState<ExchangeData>({
    usdToInr: 84,
    rates: { usd: 1, inr: 84 },
    currencies: {},
    currencyList: ["USD", "INR", "EUR", "GBP", "AED", "SGD", "JPY", "CNY", "AUD", "CAD"],
    dgft: null,
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
          dgft: d.dgft ?? null,
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

function fromInr(inrAmount: number, currency: string, rates: Record<string, number>): number {
  const cur = currency.toLowerCase()
  if (cur === "inr") return inrAmount
  const inrRate = rates["inr"] ?? 84
  const curRate = rates[cur]
  // Rate unknown (e.g. live feed degraded) — fall back to the INR figure
  // rather than emitting a wildly wrong number from a bogus rate of 1.
  if (!curRate) return inrAmount
  return inrAmount * (curRate / inrRate)
}

// When editing an existing quotation the display total must stay frozen at
// the rate it was quoted with (a quotation is a fixed offer, and the list
// shows the stored figure). We reconstruct that rate from the two stored
// totals — display-per-INR = TOTAL_DISPLAY / TOTAL_INR — so no extra DB
// column is needed. Per-charge INR math stays live; only the final display
// conversion is locked, and only for the originally-saved currency.
function lockedDisplayFrom(
  q: QuotationEditing | null | undefined
): { cur: string; rate: number } | null {
  if (!q) return null
  const cur = q.display_currency || "INR"
  const inr = q.total_inr
  const disp = q.total_display
  if (!inr || inr <= 0 || disp == null) return null
  return { cur, rate: disp / inr }
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

// Editable custom row: label is typed by the user, plus amount/currency/remarks
function ExtraChargeRow({
  field,
  onChange,
  onRemove,
  currencyList,
}: {
  field: ExtraCharge
  onChange: (f: ExtraCharge) => void
  onRemove: () => void
  currencyList: string[]
}) {
  return (
    <div className="grid grid-cols-[minmax(140px,1fr)_120px_96px_minmax(120px,1fr)_auto] items-center gap-2">
      <Input
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
        placeholder="Charge name"
        className="text-sm"
      />
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
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors p-1"
        title="Remove row"
        aria-label="Remove row"
      >
        <X className="h-4 w-4" />
      </button>
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

export function QuotationForm({ company, editingQuotation, ratePrefill, prefilledEnqId, onSuccess }: Props) {
  const router = useRouter()
  const exchange = useExchangeRate()
  // Lazy-init from editing data so controlled Radix Selects mount with
  // the correct value (a value applied async after an empty mount is
  // not reliably reflected by the Select trigger under React 19).
  const [form, setForm] = useState<FormData>(() =>
    editingQuotation ? formFromQuotation(editingQuotation)
      : ratePrefill ? formFromRatePrefill(ratePrefill)
      : getDefaultForm()
  )
  const [submitting, setSubmitting] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [displayCurrency, setDisplayCurrency] = useState(
    () => editingQuotation?.display_currency || "INR"
  )
  // Frozen display rate for the saved currency (null for a new quote).
  const [lockedDisplay, setLockedDisplay] = useState(
    () => lockedDisplayFrom(editingQuotation)
  )
  const [editId, setEditId] = useState<string | null>(editingQuotation?.id ?? null)

  const salesPersons = company === "links" ? LINKS_SALES_PERSONS : MANILAL_SALES_PERSONS
  const portOptions = PORT_OPTIONS

  // ─── Exchange rate source + manual override ────────────────
  type RateSource = "live" | "dgft_import" | "dgft_export"
  const [rateSource, setRateSource]   = useState<RateSource>("live")
  const [rateInput, setRateInput]     = useState(
    () => editingQuotation?.exchange_rate ? String(editingQuotation.exchange_rate) : ""
  )
  const [rateTouched, setRateTouched] = useState(() => !!editingQuotation?.exchange_rate)

  const dgftUsd = exchange.dgft?.["USD"]
  const sourceUsdInr =
    rateSource === "dgft_import" && dgftUsd ? dgftUsd.import / dgftUsd.unit :
    rateSource === "dgft_export" && dgftUsd ? dgftUsd.export / dgftUsd.unit :
    exchange.usdToInr

  // Track the source value until the user edits the number by hand
  useEffect(() => {
    if (!rateTouched) setRateInput(sourceUsdInr.toFixed(2))
  }, [sourceUsdInr, rateTouched])

  const usdInr = (() => {
    const n = parseFloat(rateInput)
    return n > 0 ? n : sourceUsdInr
  })()

  // Conversion table all calculations use. USD-based like the live
  // API (rates["inr"] = INR per USD). In DGFT mode, currencies on the
  // customs notification are rebuilt from their notified INR parity;
  // anything else falls back to live market rates.
  const effectiveRates = useMemo(() => {
    const base: Record<string, number> = { ...exchange.rates }
    if (rateSource !== "live" && exchange.dgft) {
      for (const [code, r] of Object.entries(exchange.dgft)) {
        const inrPerUnit = (rateSource === "dgft_import" ? r.import : r.export) / (r.unit || 1)
        if (inrPerUnit > 0) base[code.toLowerCase()] = usdInr / inrPerUnit
      }
      base["usd"] = 1
    }
    base["inr"] = usdInr
    return base
  }, [exchange.rates, exchange.dgft, rateSource, usdInr])

  // Re-sync when the editing prop changes after mount (e.g. navigating
  // between quotations without a remount). Initial mount is already
  // handled by the lazy initializers above.
  useEffect(() => {
    if (!editingQuotation) return
    setEditId(editingQuotation.id)
    setForm(formFromQuotation(editingQuotation))
    setDisplayCurrency(editingQuotation.display_currency || "INR")
    setLockedDisplay(lockedDisplayFrom(editingQuotation))
    if (editingQuotation.exchange_rate && editingQuotation.exchange_rate > 0) {
      setRateInput(String(editingQuotation.exchange_rate))
      setRateTouched(true)
    }
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

  // Custom extra-row helpers (add / update / remove) for each section
  type ExtraKey = "extra_freight" | "extra_local" | "extra_cc"
  function addExtra(key: ExtraKey) {
    setForm((f) => ({ ...f, [key]: [...f[key], emptyExtra()] }))
  }
  function updateExtra(key: ExtraKey, idx: number, value: ExtraCharge) {
    setForm((f) => ({ ...f, [key]: f[key].map((r, i) => (i === idx ? value : r)) }))
  }
  function removeExtra(key: ExtraKey, idx: number) {
    setForm((f) => ({ ...f, [key]: f[key].filter((_, i) => i !== idx) }))
  }

  const showFreight = form.shipment_type === "freight" || form.shipment_type === "both"
  const showCC = form.shipment_type === "custom_clearance" || form.shipment_type === "both"

  // ─── Total calculation ────────────────────────────────────

  const totalInr = useCallback(() => {
    let sum = 0
    const r = effectiveRates

    if (showFreight) {
      sum += toInr(form.freight_charge.amount, form.freight_charge.currency, r)
      const lc = form.local_charges
      sum += toInr(lc.bl_fee.amount, lc.bl_fee.currency, r)
      sum += toInr(lc.thc.amount, lc.thc.currency, r)
      sum += toInr(lc.seal_charges.amount, lc.seal_charges.currency, r)
      sum += toInr(lc.muc.amount, lc.muc.currency, r)
      sum += toInr(lc.toll.amount, lc.toll.currency, r)
      sum += toInr(lc.bl_surrendered.amount, lc.bl_surrendered.currency, r)
      form.extra_freight.forEach((x) => { sum += toInr(x.amount, x.currency, r) })
      form.extra_local.forEach((x) => { sum += toInr(x.amount, x.currency, r) })
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
      form.extra_cc.forEach((x) => { sum += toInr(x.amount, x.currency, r) })
    }

    if (form.transport_enabled) {
      sum += toInr(form.transport_cost.amount, form.transport_cost.currency, r)
    }

    return sum
  }, [form, effectiveRates, showFreight, showCC])

  // Convert an INR total into the display currency. For the originally-saved
  // currency we use the frozen rate so the on-screen total, the PDF and the
  // list never disagree; everything else converts at live rates.
  function displayTotal(inr: number, cur: string): number {
    if (lockedDisplay && lockedDisplay.cur === cur) return inr * lockedDisplay.rate
    return fromInr(inr, cur, effectiveRates)
  }

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
      extra_freight: showFreight ? form.extra_freight : [],
      extra_local: showFreight ? form.extra_local : [],
      extra_cc: showCC ? form.extra_cc : [],
      vessel_name: showFreight ? form.vessel_name : null,
      etd: showFreight && form.etd ? form.etd : null,
      eta: showFreight && form.eta ? form.eta : null,
      transit_time: showFreight ? form.transit_time : null,
      free_time: showFreight ? form.free_time : null,
      routing: showFreight ? form.routing : null,
      local_charges: showFreight ? form.local_charges : null,
      stuffing_type: showCC ? form.stuffing_type : null,
      cc_charges: showCC ? ccCharges : null,
      transport_enabled: form.transport_enabled,
      transport_cost: form.transport_enabled ? form.transport_cost : null,
      total_inr: totalInr(),
      total_display: displayTotal(totalInr(), displayCurrency),
      display_currency: displayCurrency,
      exchange_rate: usdInr,
      clauses: form.clauses,
      sales_person: form.sales_person,
      branch: form.branch,
      enq_id: prefilledEnqId ?? null,
      freight_validity: showFreight ? form.freight_validity : null,
      freight_validity_date: showFreight && form.freight_validity_date ? form.freight_validity_date : null,
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

  // Public handler: guards against double-clicks (the build is async and
  // can take a couple of seconds) and shows progress on the button.
  async function handleGeneratePdf() {
    if (pdfGenerating) return
    setPdfGenerating(true)
    setError("")
    try {
      await buildAndSavePdf()
    } catch (err) {
      console.error("PDF generation failed", err)
      setError("Could not generate the PDF. Please try again.")
    } finally {
      setPdfGenerating(false)
    }
  }

  async function buildAndSavePdf() {
    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    // Only charges the user actually filled in make it onto the PDF — a
    // row counts as filled when it has an amount or a remark.
    const isFilled = (f: { amount: string; remarks: string }) =>
      Boolean(f.amount || f.remarks)
    const chargeRow = (
      label: string,
      f: { amount: string; currency: string; remarks: string }
    ): [string, string, string, string] =>
      [label, f.amount || "-", f.currency, f.remarks || ""]

    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 14
    let y = 14

    // ── Logo ──────────────────────────────────────────────
    // Company-aware logo (Manilal / Links), contain-fit + downscaled before
    // embed. Returns the drawn width so the title clears the logo.
    const drawnLogoW = await drawCompanyLogo(doc, company, margin, y)

    // ── Header ────────────────────────────────────────────
    // Place the title 4mm to the right of the actual logo width so it
    // never overlaps, regardless of which company's logo was drawn.
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("FREIGHT QUOTATION", margin + drawnLogoW + 4, y + 10)

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    const refLabel = editingQuotation?.quot_ref_no ?? "DRAFT"
    doc.text(`Ref: ${refLabel}`, pageW - margin, y, { align: "right" })
    y += 5
    doc.text(`Date: ${form.quot_date}`, pageW - margin, y, { align: "right" })
    doc.setTextColor(0)
    y += 15

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
        head: [["Vessel Name", "ETD", "ETA", "Transit Time", "Free Time", "Routing"]],
        body: [[
          form.vessel_name || "-",
          form.etd || "-",
          form.eta || "-",
          form.transit_time || "-",
          form.free_time || "-",
          form.routing || "-",
        ]],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

      // Freight charge — only rows the user actually filled in
      const freightRows: [string, string, string, string][] = [
        ...(isFilled(form.freight_charge) ? [chargeRow("Freight", form.freight_charge)] : []),
        ...form.extra_freight
          .filter(isFilled)
          .map((x) => chargeRow(x.label || "-", x)),
      ]

      if (freightRows.length > 0) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("Freight Charge", margin, y)
        y += 2

        autoTable(doc, {
          startY: y,
          head: [["Charge", "Amount", "Currency", "Remarks"]],
          body: freightRows,
          theme: "grid",
          headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 1: { halign: "right" } },
          margin: { left: margin, right: margin },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      }

      if (form.freight_validity || form.freight_validity_date) {
        const validityParts = []
        if (form.freight_validity) validityParts.push(`Validity: ${form.freight_validity}`)
        if (form.freight_validity_date) validityParts.push(`Valid Until: ${form.freight_validity_date}`)
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(80)
        doc.text(validityParts.join("  ·  "), margin, y)
        doc.setTextColor(0)
        y += 5
      }

      // Local charges — only rows the user actually filled in
      const localPairs: [string, ChargeField][] = [
        ["BL Fee", form.local_charges.bl_fee],
        ["THC", form.local_charges.thc],
        ["Seal Charges", form.local_charges.seal_charges],
        ["MUC", form.local_charges.muc],
        ["Toll", form.local_charges.toll],
        ["BL Surrendered / Seaway Bill", form.local_charges.bl_surrendered],
      ]
      const localRows: [string, string, string, string][] = [
        ...localPairs.filter(([, f]) => isFilled(f)).map(([label, f]) => chargeRow(label, f)),
        ...form.extra_local
          .filter(isFilled)
          .map((x) => chargeRow(x.label || "-", x)),
      ]

      if (localRows.length > 0) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("Origin Local Charges", margin, y)
        y += 2

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
    }

    // ── CC Charges ────────────────────────────────────────
    if (showCC) {
      let ccPairs: [string, ChargeField][] = []

      if (form.stuffing_type === "doc") {
        const dc = form.doc_charges
        ccPairs = [
          ["Agency Charges", dc.agency_charges],
          ["Customs Clearance Charges", dc.customs_clearance],
          ["Doc & Examine", dc.doc_examine],
          ["CFS Onwheel Party Vehicle Charges", dc.cfs_onwheel],
          ["VGM Charges", dc.vgm_charges],
          ["Warai Charges", dc.warai_charges],
          ["Loading & Unloading", dc.loading_unloading],
          ["CFS Stuffing Charges", dc.cfs_stuffing],
        ]
      } else if (form.stuffing_type === "factory") {
        ccPairs = [
          ["Customs Clearance Charges", form.factory_charges.customs_clearance],
        ]
      }

      const ccRows: [string, string, string, string][] = [
        ...ccPairs.filter(([, f]) => isFilled(f)).map(([label, f]) => chargeRow(label, f)),
        ...form.extra_cc
          .filter(isFilled)
          .map((x) => chargeRow(x.label || "-", x)),
      ]

      if (ccRows.length > 0) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text(`Custom Clearance — ${form.stuffing_type === "doc" ? "DOC Stuffing" : "Factory Stuffing"}`, margin, y)
        y += 2

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
    }

    // ── Transportation ────────────────────────────────────
    if (form.transport_enabled && (form.transport_cost.amount || form.transport_cost.description)) {
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
    const totalDisplay = displayTotal(total, displayCurrency)
    const fmtMoney = (n: number) =>
      n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const totalRows: RowInput[] = [
      [
        { content: "TOTAL COST", styles: { fontStyle: "bold", fontSize: 10 } },
        { content: `${displayCurrency} ${fmtMoney(totalDisplay)}`, styles: { fontStyle: "bold", fontSize: 10, halign: "right" } },
      ],
    ]

    autoTable(doc, {
      startY: y,
      body: totalRows,
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-muted/40 px-4 py-2 text-sm">
        <span className="text-muted-foreground shrink-0">Exchange Rate</span>

        <select
          value={rateSource}
          onChange={(e) => {
            setRateSource(e.target.value as RateSource)
            setRateTouched(false)
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="live">Live Market</option>
          <option value="dgft_import" disabled={!dgftUsd}>DGFT Customs — Import</option>
          <option value="dgft_export" disabled={!dgftUsd}>DGFT Customs — Export</option>
        </select>

        <span className="flex items-center gap-1.5 font-semibold">
          1 USD =
          <Input
            type="number"
            min="0"
            step="0.01"
            value={rateInput}
            onChange={(e) => {
              setRateInput(e.target.value)
              setRateTouched(true)
            }}
            className="h-8 w-24 text-right text-blue-600 font-semibold"
          />
          INR
        </span>

        {rateTouched && (
          <button
            type="button"
            onClick={() => setRateTouched(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Reset to source rate"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}

        <span className="text-muted-foreground text-xs ml-auto">
          {rateSource !== "live" && dgftUsd
            ? `Customs notification w.e.f. ${dgftUsd.effectiveDate}`
            : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          {rateTouched && " · edited manually"}
        </span>
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
            {form.extra_freight.length > 0 && (
              <div className="space-y-2 mt-2">
                {form.extra_freight.map((row, i) => (
                  <ExtraChargeRow
                    key={i}
                    field={row}
                    onChange={(f) => updateExtra("extra_freight", i, f)}
                    onRemove={() => removeExtra("extra_freight", i)}
                    currencyList={currencyList}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => addExtra("extra_freight")}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add charge
            </button>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Validity</Label>
                <Input
                  value={form.freight_validity}
                  onChange={(e) => set("freight_validity", e.target.value)}
                  placeholder="e.g. 30 days"
                  className="h-9 w-40 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valid Until</Label>
                <Input
                  type="date"
                  value={form.freight_validity_date}
                  onChange={(e) => set("freight_validity_date", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
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
            <div className="space-y-1">
              <Label>Routing</Label>
              <Input value={form.routing} onChange={(e) => set("routing", e.target.value)} placeholder="e.g. Direct / Via Singapore" />
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
            {form.extra_local.map((row, i) => (
              <ExtraChargeRow
                key={i}
                field={row}
                onChange={(f) => updateExtra("extra_local", i, f)}
                onRemove={() => removeExtra("extra_local", i)}
                currencyList={currencyList}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => addExtra("extra_local")}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add charge
          </button>
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

          {(form.stuffing_type === "doc" || form.stuffing_type === "factory") && (
            <>
              {form.extra_cc.length > 0 && (
                <div className="space-y-2 mt-2">
                  {form.extra_cc.map((row, i) => (
                    <ExtraChargeRow
                      key={i}
                      field={row}
                      onChange={(f) => updateExtra("extra_cc", i, f)}
                      onRemove={() => removeExtra("extra_cc", i)}
                      currencyList={currencyList}
                    />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => addExtra("extra_cc")}
                className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add charge
              </button>
            </>
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                Exchange rate: 1 USD = {usdInr.toFixed(2)} INR
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Display in</span>
                <select
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value)}
                  className="h-7 rounded-md border border-input bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="INR">INR</option>
                  {/* Always include the selected currency even if today's
                      live feed doesn't list it, so an edited quote's saved
                      currency stays selectable. */}
                  {Array.from(new Set([displayCurrency, ...currencyList]))
                    .filter((c) => c !== "INR")
                    .map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                </select>
              </div>
            </div>
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {displayCurrency}{" "}
              {displayTotal(total, displayCurrency).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
          disabled={pdfGenerating}
          className="gap-2"
        >
          {pdfGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Generate PDF
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setForm(getDefaultForm())
            setEditId(null)
            setDisplayCurrency("INR")
            setLockedDisplay(null)
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
