"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuotationForm, QuotationEditing } from "@/components/quotation/QuotationForm"

interface Props {
  company: string
}

export function QuotationPageContent({ company }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get("edit")
  const dupId = searchParams.get("dup")
  const enqId = searchParams.get("enq")

  const [editing, setEditing] = useState<QuotationEditing | null>(null)
  const [loading, setLoading] = useState(false)

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
        }
        setEditing(q)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [editId, dupId])

  function handleSuccess(id: string, refNo: string) {
    router.push(`/quotations`)
  }

  const title = editId ? "Edit Quotation" : dupId ? "Duplicate Quotation" : "New Quotation"

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">Fill in details and generate a PDF quotation</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <QuotationForm
          company={company}
          editingQuotation={editing}
          prefilledEnqId={enqId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
