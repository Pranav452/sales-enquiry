"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { EnquiryForm, type EnquiryFormEditing } from "@/components/enquiry/EnquiryForm"
import { RecentEnquiries } from "@/components/enquiry/RecentEnquiries"

const SELECT_COLS =
  "id,enq_ref_no,enq_receipt_date,enq_type,mode,exim,fn,sales_person,agent_name,country,branch,network,pol,pod,incoterms,container_type,status,email_subject_line,shipper,consignee,remarks,mbl_awb_no,job_invoice_no,gop,assigned_user,assigned_date,buy_rate_file,sell_rate_file"

function EnquiryPageContent() {
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryFormEditing | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId) {
      setEditingEnquiry(null)
      return
    }
    supabase
      .from("enquiries")
      .select(SELECT_COLS)
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (data) setEditingEnquiry(data as EnquiryFormEditing)
      })
  }, [searchParams])

  const handleEditComplete = useCallback(() => {
    setEditingEnquiry(null)
    window.history.replaceState({}, "", "/enquiry")
  }, [])

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">
          {editingEnquiry
            ? `Editing — ${editingEnquiry.enq_ref_no ?? "Enquiry"}`
            : "New Enquiry"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {editingEnquiry
            ? "Update the fields below and click Update to save changes"
            : "Fill in the details below — required fields marked with *"}
        </p>
      </div>

      <EnquiryForm
        editingEnquiry={editingEnquiry}
        onEditComplete={handleEditComplete}
        onSuccess={handleSuccess}
      />

      <RecentEnquiries refreshKey={refreshKey} />
    </div>
  )
}

export default function EnquiryPage() {
  return (
    <Suspense>
      <EnquiryPageContent />
    </Suspense>
  )
}
