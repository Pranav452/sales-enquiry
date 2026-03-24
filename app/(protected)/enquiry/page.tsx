"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EnquiryForm, type EnquiryFormEditing } from "@/components/enquiry/EnquiryForm"
import { RecentEnquiries } from "@/components/enquiry/RecentEnquiries"
import { EnquiryAuditLog } from "@/components/enquiry/EnquiryAuditLog"

function EnquiryPageContent() {
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryFormEditing | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const editId = searchParams.get("edit")
    if (!editId) {
      setEditingEnquiry(null)
      setEditLoadError(null)
      return
    }
    setEditLoadError(null)
    fetch(`/api/enquiries/${editId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null as any)
          throw new Error(data?.error ?? `Failed to load enquiry (${res.status})`)
        }
        return res.json()
      })
      .then((data) => { setEditingEnquiry(data as EnquiryFormEditing) })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load enquiry"
        setEditingEnquiry(null)
        setEditLoadError(msg)
      })
  }, [searchParams])

  const handleEditComplete = useCallback(() => {
    setEditingEnquiry(null)
    setEditLoadError(null)
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

      {editLoadError && (
        <p className="mb-5 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
          {editLoadError}
        </p>
      )}

      <EnquiryForm
        editingEnquiry={editingEnquiry}
        onEditComplete={handleEditComplete}
        onSuccess={handleSuccess}
      />

      {editingEnquiry?.id && (
        <EnquiryAuditLog enquiryId={editingEnquiry.id} />
      )}

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
