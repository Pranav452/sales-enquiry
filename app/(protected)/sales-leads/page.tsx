"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"
import { useUser } from "@/components/layout/UserContext"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import { SalesLeadWorkspace } from "@/components/sales-leads/workspace/SalesLeadWorkspace"
import { LeadFormDrawer } from "@/components/sales-leads/workspace/LeadFormDrawer"
import { invalidateLeads, patchLeadInCache } from "@/components/sales-leads/workspace/lead-queries"

interface Flash { text: string; tone: "success" | "error" }

function SalesLeadsPageContent() {
  const searchParams = useSearchParams()
  const [initialLead] = useState(() => searchParams.get("lead"))
  const user = useUser()
  const qc = useQueryClient()

  const [selectedId, setSelectedId]     = useState<string | null>(initialLead)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editing, setEditing]           = useState<SalesLead | null>(null)
  const [flash, setFlash]               = useState<Flash | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  const [resetToken, setResetToken]     = useState(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  function showFlash(text: string, tone: Flash["tone"] = "success") {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setFlash({ text, tone })
    flashTimer.current = setTimeout(() => setFlash(null), 4000)
  }

  // Selection lives in ?lead=<id> so a lead can be deep-linked
  const selectLead = useCallback((id: string) => {
    setSelectedId(id)
    const params = new URLSearchParams(window.location.search)
    if (params.get("lead") === id) return
    params.set("lead", id)
    window.history.replaceState(null, "", `?${params.toString()}`)
  }, [])

  async function handleConvert(lead: SalesLead) {
    setConvertingId(lead.id)
    try {
      const res = await fetch(`/api/sales-leads/${lead.id}/convert`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Conversion failed")
      showFlash(
        data.already_converted
          ? `${lead.shipper ?? "Lead"} is already linked to a contact.`
          : `${lead.shipper ?? "Lead"} converted to contact.`
      )
      void invalidateLeads(qc)
    } catch (err) {
      showFlash(err instanceof Error ? err.message : "Conversion failed", "error")
    } finally {
      setConvertingId(null)
    }
  }

  async function handleStatusChange(lead: SalesLead, status: string) {
    const label = LEAD_STATUS_MAP[status]?.label ?? status
    setUpdatingId(lead.id)
    // Optimistic: show the new status right away, roll back if the PATCH fails
    patchLeadInCache(qc, lead.id, { status })
    try {
      const res = await fetch(`/api/sales-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Status update failed")
      showFlash(`${lead.shipper ?? "Lead"} marked ${label}.`)
    } catch (err) {
      patchLeadInCache(qc, lead.id, { status: lead.status })
      showFlash(err instanceof Error ? err.message : "Status update failed", "error")
    } finally {
      setUpdatingId(null)
      void invalidateLeads(qc)
    }
  }

  async function handleSuccess(id: string, refCode: string | undefined, isEdit: boolean) {
    setDrawerOpen(false)
    setEditing(null)
    showFlash(isEdit ? "Lead updated." : `Lead created${refCode ? ` — ${refCode}` : ""}.`)
    await invalidateLeads(qc)
    if (!isEdit) setResetToken((t) => t + 1) // new lead sits at the top of the unfiltered list
    if (id) selectLead(String(id))
  }

  return (
    <div className="relative h-full min-h-0">
      <SalesLeadWorkspace
        company={user?.company}
        selectedId={selectedId}
        onSelect={selectLead}
        initialMobileDetail={!!initialLead}
        resetToken={resetToken}
        onNew={() => { setEditing(null); setDrawerOpen(true) }}
        onEdit={(lead) => { setEditing(lead); setDrawerOpen(true) }}
        onConvert={handleConvert}
        convertingId={convertingId}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />

      {flash && (
        <div
          role="status"
          className={cn(
            "pointer-events-none absolute left-1/2 top-[68px] z-40 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm shadow-md",
            flash.tone === "success"
              ? "border-green-300! bg-green-50 text-green-700 dark:border-green-800! dark:bg-green-950 dark:text-green-300"
              : "border-red-300! bg-red-50 text-red-700 dark:border-red-800! dark:bg-red-950 dark:text-red-300",
          )}
        >
          {flash.text}
        </div>
      )}

      <LeadFormDrawer
        open={drawerOpen}
        editing={editing}
        defaultSalesPerson={user?.salesperson ?? undefined}
        defaultSenderEmail={user?.email ?? undefined}
        company={user?.company}
        onSuccess={handleSuccess}
        onClose={() => { setDrawerOpen(false); setEditing(null) }}
      />
    </div>
  )
}

export default function SalesLeadsPage() {
  return (
    <Suspense>
      <SalesLeadsPageContent />
    </Suspense>
  )
}
