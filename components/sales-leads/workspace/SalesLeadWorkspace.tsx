"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { generateSalesLeadPdf } from "@/lib/sales-lead-pdf"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import { LeadListPane } from "./LeadListPane"
import { LeadDetailPane } from "./LeadDetailPane"
import { LeadDetailsPanel } from "./LeadDetailsPanel"
import { EMPTY_FILTERS, filterLeads, filterOptions, type LeadFilters } from "./lead-utils"

export interface SalesLeadWorkspaceProps {
  rows: SalesLead[]
  loading: boolean
  company?: string | null
  /** Lead shown in the detail pane; the container falls back to the first visible lead. */
  selectedId: string | null
  onSelect: (id: string) => void
  /** Open straight into the detail view on narrow screens (deep link). */
  initialMobileDetail?: boolean
  onNew: () => void
  onEdit: (lead: SalesLead) => void
  onConvert: (lead: SalesLead) => void
  convertingId?: string | null
  onStatusChange: (lead: SalesLead, status: string) => void
  updatingId?: string | null
  className?: string
}

/**
 * Three-pane sales lead workspace: list (352px) · lead (flex) · details (392px).
 * 1024–1279px drops the details pane under the lead content; below 1024px it
 * becomes a single pane that switches between list and lead.
 */
export function SalesLeadWorkspace({
  rows, loading, company, selectedId, onSelect, initialMobileDetail = false,
  onNew, onEdit, onConvert, convertingId, onStatusChange, updatingId, className,
}: SalesLeadWorkspaceProps) {
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS)
  const [mobileView, setMobileView] = useState<"list" | "detail">(initialMobileDetail ? "detail" : "list")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const options = useMemo(() => filterOptions(rows), [rows])
  const filtered = useMemo(() => filterLeads(rows, filters, search), [rows, filters, search])

  // A lead selected from outside (just saved, deep link) but hidden by the
  // current search/filters: clear them so it is visible in the list.
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId)
  if (selectedId !== prevSelectedId) {
    setPrevSelectedId(selectedId)
    if (
      selectedId &&
      !filtered.some((r) => r.id === selectedId) &&
      rows.some((r) => r.id === selectedId)
    ) {
      setSearch("")
      setFilters(EMPTY_FILTERS)
    }
  }

  const index = loading ? -1 : filtered.findIndex((r) => r.id === selectedId)
  const current = loading ? null : index >= 0 ? filtered[index] : filtered[0] ?? null
  const position = index >= 0 ? index : current ? 0 : -1

  // Keep the parent's selection (and so the URL) in step with what is shown
  useEffect(() => {
    if (!loading && current && current.id !== selectedId) onSelect(current.id)
  }, [loading, current, selectedId, onSelect])

  const select = useCallback((id: string) => {
    onSelect(id)
    setMobileView("detail")
  }, [onSelect])

  const step = (delta: number) => {
    const next = filtered[position + delta]
    if (next) onSelect(next.id)
  }

  const downloadPdf = useCallback(async (lead: SalesLead) => {
    setDownloadingId(lead.id)
    try {
      await generateSalesLeadPdf(lead, company)
    } catch (err) {
      console.error("Sales lead PDF failed", err)
    } finally {
      setDownloadingId(null)
    }
  }, [company])

  const downloading = !!current && downloadingId === current.id
  const details = (
    <LeadDetailsPanel lead={current} downloading={downloading} onDownloadPdf={downloadPdf} />
  )

  return (
    <div className={cn("flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground", className)}>
      <LeadListPane
        rows={rows}
        filtered={filtered}
        loading={loading}
        selectedId={current?.id ?? null}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        options={options}
        onSelect={select}
        onNew={onNew}
        className={cn(
          "w-full border-border lg:flex lg:w-[352px] lg:shrink-0 lg:border-r",
          mobileView === "detail" ? "hidden" : "flex",
        )}
      />

      <LeadDetailPane
        lead={current}
        loading={loading}
        hasRows={rows.length > 0}
        position={position}
        total={filtered.length}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onBack={() => setMobileView("list")}
        onNew={onNew}
        onEdit={onEdit}
        onConvert={onConvert}
        converting={!!current && convertingId === current.id}
        onStatusChange={onStatusChange}
        updating={!!current && updatingId === current.id}
        onDownloadPdf={downloadPdf}
        downloading={downloading}
        inlineDetails={details}
        className={cn("flex-1 lg:flex", mobileView === "list" ? "hidden" : "flex")}
      />

      <aside aria-label="Lead details" className="hidden min-h-0 w-[392px] shrink-0 flex-col border-l border-border xl:flex">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
          <h2 className="text-sm font-medium leading-none text-foreground">Details</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <LeadDetailsPanel lead={null} loading /> : details}
        </div>
      </aside>
    </div>
  )
}
