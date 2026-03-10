"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
import { Paperclip, RotateCcw, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  SALES_PERSONS,
  FN_OPTIONS,
  BRANCHES,
  NETWORKS,
  CONTAINER_TYPES,
  STATUSES,
  INCOTERMS,
  COUNTRIES,
  PORT_CITIES,
} from "@/lib/constants/dropdowns"

interface FormData {
  enq_receipt_date: string
  mode: string
  enq_type: string
  exim: string
  fn: string
  sales_person: string
  agent_name: string
  country: string
  branch: string
  network: string
  pol: string
  pod: string
  incoterms: string
  container_type: string
  status: string
  email_subject_line: string
  shipper: string
  consignee: string
  remarks: string
  mbl_awb_no: string
  job_invoice_no: string
  gop: string
  assigned_user: string
  assigned_date: string
  buy_rate_file: string
  sell_rate_file: string
}

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "mode", "enq_type", "exim", "fn", "sales_person", "branch",
  "pol", "pod", "incoterms", "status", "container_type",
]

function getDefaultForm(): FormData {
  return {
    enq_receipt_date: new Date().toISOString().split("T")[0],
    mode: "",
    enq_type: "",
    exim: "",
    fn: "",
    sales_person: "",
    agent_name: "",
    country: "",
    branch: "",
    network: "",
    pol: "",
    pod: "",
    incoterms: "",
    container_type: "",
    status: "PENDING",
    email_subject_line: "",
    shipper: "",
    consignee: "",
    remarks: "",
    mbl_awb_no: "",
    job_invoice_no: "",
    gop: "",
    assigned_user: "",
    assigned_date: "",
    buy_rate_file: "",
    sell_rate_file: "",
  }
}

export interface EnquiryFormEditing {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  enq_type: string | null
  mode: string | null
  exim: string | null
  fn: string | null
  sales_person: string | null
  agent_name: string | null
  country: string | null
  branch: string | null
  network: string | null
  pol: string | null
  pod: string | null
  incoterms: string | null
  container_type: string | null
  status: string | null
  email_subject_line: string | null
  shipper: string | null
  consignee: string | null
  remarks: string | null
  mbl_awb_no?: string | null
  job_invoice_no?: string | null
  gop?: string | null
  assigned_user?: string | null
  assigned_date?: string | null
  buy_rate_file?: string | null
  sell_rate_file?: string | null
}

interface Props {
  onSuccess?: () => void
  editingEnquiry?: EnquiryFormEditing | null
  onEditComplete?: () => void
}

function populateFromEditing(e: EnquiryFormEditing): FormData {
  return {
    enq_receipt_date:
      e.enq_receipt_date?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    mode: e.mode ?? "",
    enq_type: e.enq_type ?? "",
    exim: e.exim ?? "",
    fn: e.fn ?? "",
    sales_person: e.sales_person ?? "",
    agent_name: e.agent_name ?? "",
    country: e.country ?? "",
    branch: e.branch ?? "",
    network: e.network ?? "",
    pol: e.pol ?? "",
    pod: e.pod ?? "",
    incoterms: e.incoterms ?? "",
    container_type: e.container_type ?? "",
    status: e.status ?? "PENDING",
    email_subject_line: e.email_subject_line ?? "",
    shipper: e.shipper ?? "",
    consignee: e.consignee ?? "",
    remarks: e.remarks ?? "",
    mbl_awb_no: e.mbl_awb_no ?? "",
    job_invoice_no: e.job_invoice_no ?? "",
    gop: e.gop ?? "",
    assigned_user: e.assigned_user ?? "",
    assigned_date: e.assigned_date ? e.assigned_date.split("T")[0] : "",
    buy_rate_file: e.buy_rate_file ?? "",
    sell_rate_file: e.sell_rate_file ?? "",
  }
}

export function EnquiryForm({ onSuccess, editingEnquiry, onEditComplete }: Props) {
  const supabase = createClient()
  const [form, setFormState] = useState<FormData>(getDefaultForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, boolean>>>({})
  const [buyRateFile, setBuyRateFile] = useState<File | null>(null)
  const [sellRateFile, setSellRateFile] = useState<File | null>(null)

  useEffect(() => {
    if (editingEnquiry) {
      setEditingId(editingEnquiry.id)
      setFormState(populateFromEditing(editingEnquiry))
      setErrors({})
    } else {
      setEditingId(null)
      setFormState(getDefaultForm())
      setErrors({})
    }
  }, [editingEnquiry])

  function setField(field: keyof FormData, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }))
    }
  }

  async function uploadFile(file: File, userId: string): Promise<string> {
    const path = `${userId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from("enquiry-files")
      .upload(path, file, { upsert: true })
    if (upErr) throw new Error(upErr.message)
    return path
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const missing: Partial<Record<keyof FormData, boolean>> = {}
    for (const field of REQUIRED_FIELDS) {
      if (!form[field]) missing[field] = true
    }
    if (Object.keys(missing).length > 0) {
      setErrors(missing)
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setErrors({})

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Not authenticated")
      setLoading(false)
      return
    }

    let buyPath = form.buy_rate_file
    let sellPath = form.sell_rate_file

    try {
      if (buyRateFile) buyPath = await uploadFile(buyRateFile, user.id)
      if (sellRateFile) sellPath = await uploadFile(sellRateFile, user.id)
    } catch (uploadErr: any) {
      setError("File upload failed: " + uploadErr.message)
      setLoading(false)
      return
    }

    const payload = {
      enq_receipt_date: form.enq_receipt_date,
      mode: form.mode || null,
      enq_type: form.enq_type || null,
      exim: form.exim || null,
      fn: form.fn || null,
      sales_person: form.sales_person || null,
      agent_name: form.agent_name || null,
      country: form.country || null,
      branch: form.branch || null,
      network: form.network || null,
      pol: form.pol || null,
      pod: form.pod || null,
      incoterms: form.incoterms || null,
      container_type: form.container_type || null,
      status: form.status || "PENDING",
      email_subject_line: form.email_subject_line || null,
      shipper: form.shipper || null,
      consignee: form.consignee || null,
      remarks: form.remarks || null,
      mbl_awb_no: form.mbl_awb_no || null,
      job_invoice_no: form.job_invoice_no || null,
      gop: form.gop || null,
      assigned_user: form.assigned_user || null,
      assigned_date: form.assigned_date || null,
      buy_rate_file: buyPath || null,
      sell_rate_file: sellPath || null,
    }

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from("enquiries")
        .update(payload)
        .eq("id", editingId)
        .select("enq_ref_no")
        .single()

      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(`Enquiry ${data?.enq_ref_no ?? ""} updated successfully.`)
        setFormState(getDefaultForm())
        setEditingId(null)
        setBuyRateFile(null)
        setSellRateFile(null)
        onEditComplete?.()
        onSuccess?.()
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("enquiries")
        .insert({ ...payload, created_by: user.id })
        .select("enq_ref_no")
        .single()

      if (insertError) {
        setError(insertError.message)
      } else {
        setSuccess(`Enquiry ${data?.enq_ref_no ?? ""} submitted successfully.`)
        setFormState(getDefaultForm())
        setBuyRateFile(null)
        setSellRateFile(null)
        onSuccess?.()
      }
    }

    setLoading(false)
  }

  function handleReset() {
    if (editingEnquiry) {
      setFormState(populateFromEditing(editingEnquiry))
    } else {
      setFormState(getDefaultForm())
    }
    setBuyRateFile(null)
    setSellRateFile(null)
    setError(null)
    setSuccess(null)
    setErrors({})
  }

  function handleCancelEdit() {
    setFormState(getDefaultForm())
    setEditingId(null)
    setBuyRateFile(null)
    setSellRateFile(null)
    setError(null)
    setSuccess(null)
    setErrors({})
    onEditComplete?.()
  }

  const fieldErr = (f: keyof FormData) =>
    errors[f] ? "border-destructive focus-visible:ring-destructive" : ""

  function fileName(path: string) {
    return path.split("/").pop() ?? path
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target instanceof HTMLElement && e.target.tagName !== "TEXTAREA") {
          e.preventDefault()
        }
      }}
    >
      {/* Header */}
      <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 rounded-lg px-5 py-3 mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {editingId ? "Edit Enquiry" : "Enquiry Details"}
        </h2>
        {editingEnquiry?.enq_ref_no && (
          <span className="text-xs font-medium text-primary bg-primary/20 dark:bg-primary/30 px-2 py-1 rounded">
            {editingEnquiry.enq_ref_no}
          </span>
        )}
      </div>

      {/* Grid — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3">

        {/* ── Row 1 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Enq Ref No.</Label>
          <Input
            value={editingEnquiry?.enq_ref_no ?? "Auto Generated"}
            disabled
            className="bg-muted text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="enq_receipt_date">Enq Receipt Date</Label>
          <Input
            id="enq_receipt_date"
            type="date"
            value={form.enq_receipt_date}
            onChange={(e) => setField("enq_receipt_date", e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Enq Mode Air / Sea <span className="text-destructive">*</span></Label>
          <Select value={form.mode} onValueChange={(v) => setField("mode", v)}>
            <SelectTrigger className={fieldErr("mode")}>
              <SelectValue placeholder="--Mode--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Air">Air</SelectItem>
              <SelectItem value="Sea">Sea</SelectItem>
            </SelectContent>
          </Select>
          {errors.mode && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Enq Recvd from Overseas / Local Office <span className="text-destructive">*</span></Label>
          <Select value={form.enq_type} onValueChange={(v) => setField("enq_type", v)}>
            <SelectTrigger className={fieldErr("enq_type")}>
              <SelectValue placeholder="--Enq Type--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="Overseas">Overseas</SelectItem>
            </SelectContent>
          </Select>
          {errors.enq_type && <p className="text-xs text-destructive">Required</p>}
        </div>

        {/* ── Row 2 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Exim <span className="text-destructive">*</span></Label>
          <Select value={form.exim} onValueChange={(v) => setField("exim", v)}>
            <SelectTrigger className={fieldErr("exim")}>
              <SelectValue placeholder="--Exim--" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Export">Export</SelectItem>
              <SelectItem value="Import">Import</SelectItem>
              <SelectItem value="Cross Trade">Cross Trade</SelectItem>
            </SelectContent>
          </Select>
          {errors.exim && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>F / N <span className="text-destructive">*</span></Label>
          <Select value={form.fn} onValueChange={(v) => setField("fn", v)}>
            <SelectTrigger className={fieldErr("fn")}>
              <SelectValue placeholder="--F/N--" />
            </SelectTrigger>
            <SelectContent>
              {FN_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fn && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Sales Person <span className="text-destructive">*</span></Label>
          <Select value={form.sales_person} onValueChange={(v) => setField("sales_person", v)}>
            <SelectTrigger className={fieldErr("sales_person")}>
              <SelectValue placeholder="--Sales Person--" />
            </SelectTrigger>
            <SelectContent>
              {SALES_PERSONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sales_person && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Enq Recvd From Branch <span className="text-destructive">*</span></Label>
          <Select value={form.branch} onValueChange={(v) => setField("branch", v)}>
            <SelectTrigger className={fieldErr("branch")}>
              <SelectValue placeholder="--Branch--" />
            </SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.branch && <p className="text-xs text-destructive">Required</p>}
        </div>

        {/* ── Row 3 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="agent_name">Enq Recvd from Agent</Label>
          <Input
            id="agent_name"
            value={form.agent_name}
            onChange={(e) => setField("agent_name", e.target.value)}
            placeholder="Type agent name..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Country</Label>
          <Combobox
            value={form.country}
            onChange={(v) => setField("country", v)}
            options={COUNTRIES}
            placeholder="Overseas agent's country..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Network</Label>
          <Select value={form.network} onValueChange={(v) => setField("network", v)}>
            <SelectTrigger><SelectValue placeholder="--Network--" /></SelectTrigger>
            <SelectContent>
              {NETWORKS.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Container Type / Dimension <span className="text-destructive">*</span></Label>
          <Select value={form.container_type} onValueChange={(v) => setField("container_type", v)}>
            <SelectTrigger className={fieldErr("container_type")}>
              <SelectValue placeholder="--Container Type--" />
            </SelectTrigger>
            <SelectContent>
              {CONTAINER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.container_type && <p className="text-xs text-destructive">Required</p>}
        </div>

        {/* ── Row 4 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>POL / Origin Airport <span className="text-destructive">*</span></Label>
          <Combobox
            value={form.pol}
            onChange={(v) => setField("pol", v)}
            options={PORT_CITIES}
            placeholder="Search port..."
          />
          {errors.pol && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>POD / Dest. Airport <span className="text-destructive">*</span></Label>
          <Combobox
            value={form.pod}
            onChange={(v) => setField("pod", v)}
            options={PORT_CITIES}
            placeholder="Search port..."
          />
          {errors.pod && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Incoterms <span className="text-destructive">*</span></Label>
          <Select value={form.incoterms} onValueChange={(v) => setField("incoterms", v)}>
            <SelectTrigger className={fieldErr("incoterms")}>
              <SelectValue placeholder="--Incoterms--" />
            </SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.incoterms && <p className="text-xs text-destructive">Required</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Enq Status <span className="text-destructive">*</span></Label>
          <Select value={form.status} onValueChange={(v) => setField("status", v)}>
            <SelectTrigger className={fieldErr("status")}>
              <SelectValue placeholder="--Status--" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && <p className="text-xs text-destructive">Required</p>}
        </div>

        {/* ── Row 5 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="email_subject_line">Shipment Awarded to Agent / Carrier</Label>
          <Input
            id="email_subject_line"
            value={form.email_subject_line}
            onChange={(e) => setField("email_subject_line", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shipper">Shipper</Label>
          <Input
            id="shipper"
            value={form.shipper}
            onChange={(e) => setField("shipper", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="consignee">Consignee</Label>
          <Input
            id="consignee"
            value={form.consignee}
            onChange={(e) => setField("consignee", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="remarks">Remarks</Label>
          <textarea
            id="remarks"
            rows={2}
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            className="flex w-full rounded-md border border-input bg-[hsl(var(--input-bg))] px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* ── Row 6 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="mbl_awb_no">MBL / AWB No.</Label>
          <Input
            id="mbl_awb_no"
            value={form.mbl_awb_no}
            onChange={(e) => setField("mbl_awb_no", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job_invoice_no">Job / Invoice No.</Label>
          <Input
            id="job_invoice_no"
            value={form.job_invoice_no}
            onChange={(e) => setField("job_invoice_no", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="gop">GOP</Label>
          <Input
            id="gop"
            value={form.gop}
            onChange={(e) => setField("gop", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assigned_user">Assigned To</Label>
          <Input
            id="assigned_user"
            value={form.assigned_user}
            onChange={(e) => setField("assigned_user", e.target.value)}
            placeholder="Employee name..."
          />
        </div>

        {/* ── Row 7 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="assigned_date">Assigned Date</Label>
          <Input
            id="assigned_date"
            type="date"
            value={form.assigned_date}
            onChange={(e) => setField("assigned_date", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Buy Rate Attachment</Label>
          <Input
            type="file"
            accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => setBuyRateFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer"
          />
          {form.buy_rate_file && !buyRateFile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {fileName(form.buy_rate_file)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Sell Rate Attachment</Label>
          <Input
            type="file"
            accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => setSellRateFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer"
          />
          {form.sell_rate_file && !sellRateFile && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {fileName(form.sell_rate_file)}
            </p>
          )}
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="mt-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-500/20 px-3 py-2 rounded-md">
          {success}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <Button type="submit" disabled={loading} className="gap-2 cursor-pointer">
          <Send className="h-4 w-4" />
          {loading
            ? editingId ? "Updating..." : "Submitting..."
            : editingId ? "Update" : "Submit"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2 cursor-pointer">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {editingId && (
          <Button type="button" variant="outline" onClick={handleCancelEdit} className="cursor-pointer">
            Cancel Edit
          </Button>
        )}
      </div>
    </form>
  )
}
