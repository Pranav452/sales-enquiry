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
import { RotateCcw, Send } from "lucide-react"
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
  AGENTS,
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
}

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
    status: "",
    email_subject_line: "",
    shipper: "",
    consignee: "",
    remarks: "",
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
}

interface Props {
  onSuccess?: () => void
  editingEnquiry?: EnquiryFormEditing | null
  onEditComplete?: () => void
}

export function EnquiryForm({ onSuccess, editingEnquiry, onEditComplete }: Props) {
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(getDefaultForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (editingEnquiry) {
      setEditingId(editingEnquiry.id)
      setForm({
        enq_receipt_date:
          editingEnquiry.enq_receipt_date?.split("T")[0] ??
          new Date().toISOString().split("T")[0],
        mode: editingEnquiry.mode ?? "",
        enq_type: editingEnquiry.enq_type ?? "",
        exim: editingEnquiry.exim ?? "",
        fn: editingEnquiry.fn ?? "",
        sales_person: editingEnquiry.sales_person ?? "",
        agent_name: editingEnquiry.agent_name ?? "",
        country: editingEnquiry.country ?? "",
        branch: editingEnquiry.branch ?? "",
        network: editingEnquiry.network ?? "",
        pol: editingEnquiry.pol ?? "",
        pod: editingEnquiry.pod ?? "",
        incoterms: editingEnquiry.incoterms ?? "",
        container_type: editingEnquiry.container_type ?? "",
        status: editingEnquiry.status ?? "",
        email_subject_line: editingEnquiry.email_subject_line ?? "",
        shipper: editingEnquiry.shipper ?? "",
        consignee: editingEnquiry.consignee ?? "",
        remarks: editingEnquiry.remarks ?? "",
      })
    } else {
      setEditingId(null)
      setForm(getDefaultForm())
    }
  }, [editingEnquiry])

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Not authenticated")
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
      status: editingId ? (form.status || null) : "PENDING",
      email_subject_line: form.email_subject_line || null,
      shipper: form.shipper || null,
      consignee: form.consignee || null,
      remarks: form.remarks || null,
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
        setForm(getDefaultForm())
        setEditingId(null)
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
        setForm(getDefaultForm())
        onSuccess?.()
      }
    }

    setLoading(false)
  }

  function handleReset() {
    if (editingEnquiry) {
      setForm({
        enq_receipt_date:
          editingEnquiry.enq_receipt_date?.split("T")[0] ??
          new Date().toISOString().split("T")[0],
        mode: editingEnquiry.mode ?? "",
        enq_type: editingEnquiry.enq_type ?? "",
        exim: editingEnquiry.exim ?? "",
        fn: editingEnquiry.fn ?? "",
        sales_person: editingEnquiry.sales_person ?? "",
        agent_name: editingEnquiry.agent_name ?? "",
        country: editingEnquiry.country ?? "",
        branch: editingEnquiry.branch ?? "",
        network: editingEnquiry.network ?? "",
        pol: editingEnquiry.pol ?? "",
        pod: editingEnquiry.pod ?? "",
        incoterms: editingEnquiry.incoterms ?? "",
        container_type: editingEnquiry.container_type ?? "",
        status: editingEnquiry.status ?? "",
        email_subject_line: editingEnquiry.email_subject_line ?? "",
        shipper: editingEnquiry.shipper ?? "",
        consignee: editingEnquiry.consignee ?? "",
        remarks: editingEnquiry.remarks ?? "",
      })
    } else {
      setForm(getDefaultForm())
    }
    setError(null)
    setSuccess(null)
  }

  function handleCancelEdit() {
    setForm(getDefaultForm())
    setEditingId(null)
    setError(null)
    setSuccess(null)
    onEditComplete?.()
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
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-5 py-3 mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-blue-900">
          {editingId ? "Edit Enquiry" : "Enquiry Details"}
        </h2>
        {editingEnquiry?.enq_ref_no && (
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded">
            {editingEnquiry.enq_ref_no}
          </span>
        )}
      </div>

      {/* Grid — 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">

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
          <Label>Mode</Label>
          <Select value={form.mode} onValueChange={(v) => setField("mode", v)}>
            <SelectTrigger><SelectValue placeholder="--Mode--" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Air">Air</SelectItem>
              <SelectItem value="Sea">Sea</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Enq Type</Label>
          <Select value={form.enq_type} onValueChange={(v) => setField("enq_type", v)}>
            <SelectTrigger><SelectValue placeholder="--Enq Type--" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Local">Local</SelectItem>
              <SelectItem value="Overseas">Overseas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Row 2 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Exim</Label>
          <Select value={form.exim} onValueChange={(v) => setField("exim", v)}>
            <SelectTrigger><SelectValue placeholder="--Exim--" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Export">Export</SelectItem>
              <SelectItem value="Import">Import</SelectItem>
              <SelectItem value="Cross Trade">Cross Trade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>F / N</Label>
          <Select value={form.fn} onValueChange={(v) => setField("fn", v)}>
            <SelectTrigger><SelectValue placeholder="--F/N--" /></SelectTrigger>
            <SelectContent>
              {FN_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Sales Person</Label>
          <Select value={form.sales_person} onValueChange={(v) => setField("sales_person", v)}>
            <SelectTrigger><SelectValue placeholder="--Sales Person--" /></SelectTrigger>
            <SelectContent>
              {SALES_PERSONS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select value={form.branch} onValueChange={(v) => setField("branch", v)}>
            <SelectTrigger><SelectValue placeholder="--Branch--" /></SelectTrigger>
            <SelectContent>
              {BRANCHES.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Row 3 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>Agent Name</Label>
          <Combobox
            value={form.agent_name}
            onChange={(v) => setField("agent_name", v)}
            options={AGENTS}
            placeholder="Search agent..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Country</Label>
          <Combobox
            value={form.country}
            onChange={(v) => setField("country", v)}
            options={COUNTRIES}
            placeholder="Search country..."
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
          <Label>Container Type</Label>
          <Select value={form.container_type} onValueChange={(v) => setField("container_type", v)}>
            <SelectTrigger><SelectValue placeholder="--Container Type--" /></SelectTrigger>
            <SelectContent>
              {CONTAINER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Row 4 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label>POL</Label>
          <Combobox
            value={form.pol}
            onChange={(v) => setField("pol", v)}
            options={PORT_CITIES}
            placeholder="Search port..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>POD</Label>
          <Combobox
            value={form.pod}
            onChange={(v) => setField("pod", v)}
            options={PORT_CITIES}
            placeholder="Search port..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Incoterms</Label>
          <Select value={form.incoterms} onValueChange={(v) => setField("incoterms", v)}>
            <SelectTrigger><SelectValue placeholder="--Incoterms--" /></SelectTrigger>
            <SelectContent>
              {INCOTERMS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setField("status", v)}>
            <SelectTrigger disabled={!editingId}>
              <SelectValue placeholder={editingId ? "--Status--" : "PENDING"} />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Row 5 ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label htmlFor="email_subject_line">Email Subject Line</Label>
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
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <p className="mt-4 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
          {success}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <Button type="submit" disabled={loading} className="gap-2">
          <Send className="h-4 w-4" />
          {loading
            ? editingId
              ? "Updating..."
              : "Submitting..."
            : editingId
              ? "Update"
              : "Submit"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {editingId && (
          <Button type="button" variant="outline" onClick={handleCancelEdit}>
            Cancel Edit
          </Button>
        )}
      </div>
    </form>
  )
}
