"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuotationForm, QuotationEditing, RatePrefill } from "@/components/quotation/QuotationForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EnquirySource } from "@/lib/quotation-enquiry-map"
import {
  quotationStatusLabel,
  quotationStatusVariant,
} from "@/lib/constants/quotation-status"

interface Props {
  company: string
}

export function QuotationPageContent({ company }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get("edit")
  const dupId = searchParams.get("dup")
  const enqId = searchParams.get("enq")

  // Seeded from a Rate Explorer card click (?pol=&pod=&container_type=&
  // freight_amount=&freight_currency=&carrier=&transit_time=&
  // freight_validity_date=&surcharges=). Ignored once an edit/dup is loading.
  const rPol = searchParams.get("pol")
  const rPod = searchParams.get("pod")
  const rContainer = searchParams.get("container_type")
  const rAmount = searchParams.get("freight_amount")
  const ratePrefill: RatePrefill | null =
    !editId && !dupId && (rPol || rPod || rContainer || rAmount)
      ? {
          carrier: searchParams.get("carrier") ?? "",
          pol: rPol,
          pod: rPod,
          container_type: rContainer ?? "",
          amount: rAmount ? Number(rAmount) : null,
          currency: searchParams.get("freight_currency") ?? "USD",
          transit_time: searchParams.get("transit_time"),
          freight_validity_date: searchParams.get("freight_validity_date"),
          surcharges: searchParams.get("surcharges"),
        }
      : null

  const [editing, setEditing] = useState<QuotationEditing | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  // Status of the quotation being edited, plus the transition in flight.
  const [status, setStatus] = useState<string>("DRAFT")
  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Enq ref no of the linked enquiry — auto-reflected on the form when a
  // quotation is started from an enquiry (?enq=ID) or opened for edit.
  const [linkedEnq, setLinkedEnq] = useState<{ id: string; ref: string | null } | null>(null)
  // Full enquiry record — only used to seed a NEW quotation (?enq=ID).
  const [enqPrefill, setEnqPrefill] = useState<EnquirySource | null>(null)
  // Seeded true when the page opens on ?enq= so the form is never mounted
  // (and lazily initialised) before the enquiry has been fetched.
  const [enqLoading, setEnqLoading] = useState(() => Boolean(enqId) && !editId && !dupId)

  // Load for edit or dup
  useEffect(() => {
    const id = editId ?? dupId
    if (!id) return

    setLoading(true)
    fetch(`/api/quotations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const q: QuotationEditing = {
          id: dupId ? "" : String(data.QUOT_ID ?? id),
          quot_ref_no: dupId ? "" : (data.QUOT_REF_NO ?? ""),
          quot_date: data.QUOT_DATE ?? null,
          mode: data.MODE ?? null,
          exim: data.EXIM ?? null,
          fn: data.FN ?? null,
          enq_type: data.ENQ_TYPE ?? null,
          incoterms: data.INCOTERMS ?? null,
          pol: data.POL ?? null,
          pod: data.POD ?? null,
          container_type: data.CONTAINER_TYPE ?? null,
          shipper: data.SHIPPER ?? null,
          shipment_type: data.SHIPMENT_TYPE ?? null,
          freight_charge: data.freight_charge ?? null,
          vessel_name: data.VESSEL_NAME ?? null,
          etd: data.ETD ?? null,
          eta: data.ETA ?? null,
          transit_time: data.TRANSIT_TIME ?? null,
          free_time: data.FREE_TIME ?? null,
          routing: data.routing ?? null,
          local_charges: data.local_charges ?? null,
          stuffing_type: data.STUFFING_TYPE ?? null,
          cc_charges: data.cc_charges ?? null,
          transport_enabled: !!data.TRANSPORT_ENABLED,
          transport_cost: data.transport_cost ?? null,
          clauses: data.CLAUSES ?? null,
          sales_person: data.SALES_PERSON ?? null,
          branch: data.BRANCH ?? null,
          enq_id: data.ENQ_ID ? String(data.ENQ_ID) : null,
          exchange_rate: data.EXCHANGE_RATE ?? null,
          display_currency: data.DISPLAY_CURRENCY ?? null,
          total_inr: data.TOTAL_INR ?? null,
          total_display: data.TOTAL_DISPLAY ?? null,
          extra_freight: data.extra_freight ?? [],
          extra_local: data.extra_local ?? [],
          extra_cc: data.extra_cc ?? [],
          freight_validity: data.freight_validity ?? null,
          freight_validity_date: data.freight_validity_date ?? null,
          shipping_line: data.SHIPPING_LINE ?? null,
          quoted_rate: data.QUOTED_RATE ?? null,
          status: data.STATUS ?? "DRAFT",
        }
        setEditing(q)
        setStatus((data.STATUS as string) ?? "DRAFT")
      })
      .catch((e) => { console.error(e); setLoadFailed(true) })
      .finally(() => setLoading(false))
  }, [editId, dupId])

  // Resolve the linked enquiry's ref no so the form can show it read-only.
  const linkEnqId = enqId ?? editing?.enq_id ?? null
  // A new quotation started from an enquiry is also prefilled from it —
  // never when editing or duplicating an existing quotation.
  const prefillFromEnquiry = Boolean(enqId) && !editId && !dupId

  useEffect(() => {
    if (!linkEnqId) {
      setLinkedEnq(null)
      setEnqPrefill(null)
      setEnqLoading(false)
      return
    }
    let cancelled = false
    setEnqLoading(true)
    fetch(`/api/enquiries/${linkEnqId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("enquiry lookup failed"))))
      .then((e) => {
        if (cancelled) return
        setLinkedEnq({ id: String(e.id ?? linkEnqId), ref: e.enq_ref_no ?? null })
        setEnqPrefill(prefillFromEnquiry ? (e as EnquirySource) : null)
      })
      .catch(() => {
        if (cancelled) return
        setLinkedEnq(null)
        setEnqPrefill(null)
      })
      .finally(() => { if (!cancelled) setEnqLoading(false) })
    return () => { cancelled = true }
  }, [linkEnqId, prefillFromEnquiry])

  async function transition(action: "submit" | "close" | "approve", confirmMsg: string) {
    if (!editId) return
    if (!window.confirm(confirmMsg)) return
    setTransitioning(action)
    setActionError(null)
    try {
      const res = await fetch(`/api/quotations/${editId}/${action}`, {
        method: action === "approve" ? "POST" : "PATCH",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setActionError(data?.error ?? `Failed to ${action} quotation`)
        return
      }
      setStatus((data?.status as string) ?? status)
    } catch {
      setActionError("Network error — please try again.")
    } finally {
      setTransitioning(null)
    }
  }

  function handleSuccess(id: string, refNo: string) {
    router.push(`/quotations`)
  }

  const title = editId ? "Edit Quotation" : dupId ? "Duplicate Quotation" : "New Quotation"
  const formKey =
    editId ??
    dupId ??
    (ratePrefill ? searchParams.toString() : enqPrefill ? `enq-${enqId}` : "new")

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Fill in details and generate a PDF quotation</p>
      </div>

      {editId && (
        <div className="rounded-lg border border-border px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={quotationStatusVariant(status)}>{quotationStatusLabel(status)}</Badge>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={status !== "DRAFT" || transitioning !== null}
              onClick={() => transition("submit", "Submit this quotation for approval?")}
            >
              {transitioning === "submit" ? "Submitting..." : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={status === "APPROVED" || status === "CLOSED_NOT_QUOTED" || transitioning !== null}
              onClick={() =>
                transition("approve", "Approve this quotation? The linked contact will be promoted to CLIENT.")
              }
            >
              {transitioning === "approve" ? "Approving..." : "Approve"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={status === "CLOSED_NOT_QUOTED" || transitioning !== null}
              onClick={() =>
                transition("close", "Close this enquiry as Not Quoted? No quotation will be issued.")
              }
            >
              {transitioning === "close" ? "Closing..." : "Close - Not Quoted"}
            </Button>
          </div>

          {actionError && (
            <p className="w-full text-sm text-destructive">{actionError}</p>
          )}
        </div>
      )}

      {/* Wait for the fetch before mounting the form so it lazy-inits
          with the editing data — Radix Selects don't reliably reflect a
          value applied async after an empty mount. */}
      {loading || ((editId || dupId) && !editing && !loadFailed) || (prefillFromEnquiry && enqLoading) ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <QuotationForm
          key={formKey}
          company={company}
          editingQuotation={editing}
          ratePrefill={ratePrefill}
          prefilledEnqId={linkEnqId}
          linkedEnqRefNo={linkedEnq?.ref ?? null}
          enquiryPrefill={enqPrefill}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
