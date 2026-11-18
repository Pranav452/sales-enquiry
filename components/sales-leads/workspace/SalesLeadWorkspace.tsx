"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { generateSalesLeadPdf } from "@/lib/sales-lead-pdf"
import { useDebounced, usePagedList } from "@/lib/hooks/usePagedList"
import { LEAD_STATUSES } from "@/lib/constants/sales-leads"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import { LeadListPane, toolbarBtn } from "./LeadListPane"
import { LeadDetailPane } from "./LeadDetailPane"
import { LeadDetailsPanel } from "./LeadDetailsPanel"
import { EMPTY_FILTERS, type LeadFilters } from "./lead-utils"
import {
  LEADS_ENDPOINT, LEAD_PAGE_SIZE, fetchLeadPage, leadPageKey, useLead, useLeadOptions,
  type LeadListParams, type LeadPage,
} from "./lead-queries"

export interface SalesLeadWorkspaceProps {
  company?: string | null
  /** Lead shown in the detail pane; the container falls back to the first lead of the page. */
  selectedId: string | null
  onSelect: (id: string) => void
  /** Open straight into the detail view on narrow screens (deep link). */
  initialMobileDetail?: boolean
  /** Bump to clear search / filters and go back to page 1 (e.g. after creating a lead). */
  resetToken?: number
  onNew: () => void
  onEdit: (lead: SalesLead) => void
  onConvert: (lead: SalesLead) => void
  convertingId?: string | null
  onStatusChange: (lead: SalesLead, status: string) => void
  updatingId?: string | null
  className?: string
}

const STATUS_OPTIONS = LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))
const toOptions = (vals: string[] | undefined) => (vals ?? []).map((v) => ({ value: v, label: v }))

/**
 * Three-pane sales lead workspace: list (352px) · lead (flex) · details (392px).
 * 1024–1279px drops the details pane under the lead content; below 1024px it
 * becomes a single pane that switches between list and lead.
 *
 * The list is server-paginated (20/page) with server-side search + filters.
 * The detail pane shows the selected row from the current page, or fetches the
 * lead by id when it is not on the page (deep link).
 */
export function SalesLeadWorkspace({
  company, selectedId, onSelect, initialMobileDetail = false, resetToken = 0,
  onNew, onEdit, onConvert, convertingId, onStatusChange, updatingId, className,
}: SalesLeadWorkspaceProps) {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [mobileView, setMobileView] = useState<"list" | "detail">(initialMobileDetail ? "detail" : "list")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [paging, setPaging] = useState(false)

  // Parent asked for a clean list (new lead created): drop search + filters
  const [prevReset, setPrevReset] = useState(resetToken)
  if (resetToken !== prevReset) {
    setPrevReset(resetToken)
    setSearch("")
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const q = useDebounced(search.trim(), 300)
  const params = useMemo<LeadListParams>(
    () => ({ q, status: filters.status, person: filters.person, country: filters.country }),
    [q, filters.status, filters.person, filters.country],
  )

  // New search / filters: back to page 1, and once results arrive select the
  // first match if the current lead is not among them.
  const paramsKey = JSON.stringify(params)
  const [prevParamsKey, setPrevParamsKey] = useState(paramsKey)
  const [pickFirst, setPickFirst] = useState(false)
  if (paramsKey !== prevParamsKey) {
    setPrevParamsKey(paramsKey)
    setPage(1)
    setPickFirst(true)
  }

  const list = usePagedList<SalesLead>(LEADS_ENDPOINT, page, params, LEAD_PAGE_SIZE)
  const rows = list.rows
  const loading = list.isLoading
  const ready = !list.isLoading && !list.isFetching // rows belong to the current page/params

  // WON count comes with the page; hold the last value while the next page loads
  const freshWon = qc.getQueryData<LeadPage>(leadPageKey(params, page))?.won
  const [won, setWon] = useState(0)
  if (freshWon !== undefined && freshWon !== won) setWon(freshWon)

  const optionsQuery = useLeadOptions()
  const options = useMemo(() => ({
    statuses: STATUS_OPTIONS,
    persons: toOptions(optionsQuery.data?.persons),
    countries: toOptions(optionsQuery.data?.countries),
  }), [optionsQuery.data])
  const allTotal = optionsQuery.data?.total ?? null

  const index = selectedId ? rows.findIndex((r) => r.id === selectedId) : -1
  const inPage = index >= 0 ? rows[index] : null
  const detail = useLead(selectedId, !inPage && !pickFirst && !loading)
  const current = loading ? null : inPage ?? (detail.data?.id === selectedId ? detail.data : null) ?? null
  const detailLoading = loading || (!current && !!selectedId && !pickFirst && detail.isFetching)
  const position = index >= 0 ? (page - 1) * LEAD_PAGE_SIZE + index : -1

  // Keep the parent's selection (and so the URL) on a lead that can be shown
  useEffect(() => {
    if (loading || !rows.length) return
    const first = rows[0].id
    if (!selectedId) onSelect(first)
    else if (pickFirst && ready && index < 0) onSelect(first)
    else if (detail.isError && index < 0) onSelect(first)
  }, [loading, rows, selectedId, pickFirst, ready, index, detail.isError, onSelect])

  const select = useCallback((id: string) => {
    onSelect(id)
    setMobileView("detail")
  }, [onSelect])

  // Load another page first, then switch to it and select one of its leads
  const openPage = useCallback(async (target: number, pick: "first" | "last") => {
    setPaging(true)
    try {
      const data = await fetchLeadPage(qc, params, target)
      setPage(target)
      const lead = pick === "first" ? data.data[0] : data.data[data.data.length - 1]
      if (lead) onSelect(lead.id)
    } catch {
      setPage(target) // let the list show its own error state
    } finally {
      setPaging(false)
    }
  }, [qc, params, onSelect])

  const step = (delta: number) => {
    if (index < 0 || paging) return
    const next = rows[index + delta]
    if (next) onSelect(next.id)
    else if (delta > 0 && page < list.totalPages) void openPage(page + 1, "first")
    else if (delta < 0 && page > 1) void openPage(page - 1, "last")
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
        total={list.total}
        allTotal={allTotal}
        won={won}
        page={page}
        totalPages={list.totalPages}
        onPageChange={(p) => void openPage(p, "first")}
        paging={paging || (list.isFetching && !loading)}
        error={list.error}
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
        loading={detailLoading}
        hasRows={(allTotal ?? list.total) > 0}
        position={position}
        total={list.total}
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
        <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
          <h2 className="text-sm font-medium leading-none text-foreground">Details</h2>
          {current && (
            <button
              type="button"
              onClick={() => onEdit(current)}
              className={cn(toolbarBtn, "absolute right-4 text-primary hover:text-primary")}
              title="Edit this lead's details"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.75} />
              Edit
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {detailLoading ? <LeadDetailsPanel lead={null} loading /> : details}
        </div>
      </aside>
    </div>
  )
}
