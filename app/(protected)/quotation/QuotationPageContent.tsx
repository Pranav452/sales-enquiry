"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuotationForm, QuotationEditing, RatePrefill } from "@/components/quotation/QuotationForm"

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
        }
        setEditing(q)
      })
      .catch((e) => { console.error(e); setLoadFailed(true) })
      .finally(() => setLoading(false))
  }, [editId, dupId])

  function handleSuccess(id: string, refNo: string) {
    router.push(`/quotations`)
  }

  const title = editId ? "Edit Quotation" : dupId ? "Duplicate Quotation" : "New Quotation"
  const formKey = editId ?? dupId ?? (ratePrefill ? searchParams.toString() : "new")

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Fill in details and generate a PDF quotation</p>
      </div>

      {/* Wait for the fetch before mounting the form so it lazy-inits
          with the editing data — Radix Selects don't reliably reflect a
          value applied async after an empty mount. */}
      {loading || ((editId || dupId) && !editing && !loadFailed) ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <QuotationForm
          key={formKey}
          company={company}
          editingQuotation={editing}
          ratePrefill={ratePrefill}
          prefilledEnqId={enqId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
