"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { EnquiryForm, type EnquiryFormEditing } from "@/components/enquiry/EnquiryForm"
import { RecentEnquiries } from "@/components/enquiry/RecentEnquiries"

function normalizeMode(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toUpperCase()
  if (v === "AIR") return "Air"
  if (v === "SEA") return "Sea"
  return ""
}

interface PrefillState {
  values:    Record<string, string>
  contactId: string | null
  leadId:    string | null
  label:     string
}

function EnquiryPageContent() {
  const [editingEnquiry, setEditingEnquiry] = useState<EnquiryFormEditing | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<PrefillState | null>(null)
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

  // ?contact=ID — new enquiry prefilled from a contact
  // ?lead=ID    — new enquiry prefilled from a sales lead (keeps provenance)
  useEffect(() => {
    const contactId = searchParams.get("contact")
    const leadId = searchParams.get("lead")
    if (searchParams.get("edit") || (!contactId && !leadId)) {
      setPrefill(null)
      return
    }

    if (contactId) {
      fetch(`/api/contacts/${contactId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          const c = data.contact
          if (!c) return
          setPrefill({
            values: {
              shipper:   c.shipper_name   || "",
              consignee: c.consignee_name || "",
              mode:      normalizeMode(c.mode),
              pol:       c.pol || "",
              pod:       c.pod || "",
            },
            contactId: c.id,
            leadId:    null,
            label:     c.shipper_name || "contact",
          })
        })
        .catch(() => setPrefill(null))
    } else if (leadId) {
      fetch(`/api/sales-leads/${leadId}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((l) => {
          setPrefill({
            values: {
              shipper:   l.shipper || "",
              consignee: l.consignee || "",
              country:   l.dest_country || "",
              agent_name: l.agent_name || "",
            },
            contactId: l.contact_id ?? null,
            leadId:    l.id,
            label:     l.shipper || l.ref_code || "lead",
          })
        })
        .catch(() => setPrefill(null))
    }
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

      {!editingEnquiry && prefill && (
        <p className="mb-5 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-md border border-blue-200 dark:border-blue-800">
          Prefilled from {prefill.leadId ? "lead" : "contact"} — {prefill.label}. The enquiry will be linked automatically.
        </p>
      )}

      <EnquiryForm
        editingEnquiry={editingEnquiry}
        onEditComplete={handleEditComplete}
        onSuccess={handleSuccess}
        prefill={prefill?.values ?? null}
        linkContactId={prefill?.contactId ?? null}
        linkLeadId={prefill?.leadId ?? null}
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
