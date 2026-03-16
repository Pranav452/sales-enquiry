"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EnquiryForm, type EnquiryFormEditing } from "@/components/enquiry/EnquiryForm"
import { RecentEnquiries } from "@/components/enquiry/RecentEnquiries"

function EnquiryPageContent() {
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryFormEditing | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const searchParams = useSearchParams()

  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId) {
      setEditingEnquiry(null)
      return
    }
    fetch(`/api/enquiries/${editId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setEditingEnquiry(data as EnquiryFormEditing) })
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
