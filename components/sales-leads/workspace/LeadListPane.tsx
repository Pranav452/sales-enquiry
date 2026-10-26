"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Calendar, Filter, Inbox, Plus, Search, SearchX, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import {
  TEXT_DIM,
  TEXT_SUBTLE,
  fmtShortDate,
  initials,
  ModeIcon,
  routeLine,
  str,
  useDismiss,
  type LeadFilters,
} from "./lead-utils"

// Shared geometry for the bordered top-bar buttons (Figma: p-8, 12px icon, 12px label, r-6)
export const toolbarBtn = cn(
  "inline-flex h-[30px] shrink-0 items-center justify-center gap-2 rounded-md border border-border px-2",
  "text-xs leading-none transition-colors",
  "hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:pointer-events-none disabled:opacity-50",
  TEXT_SUBTLE,
)

type Option = { value: string; label: string }

interface ListPaneProps {
  rows: SalesLead[]
  filtered: SalesLead[]
  loading: boolean
  selectedId: string | null
  search: string
  onSearchChange: (v: string) => void
  filters: LeadFilters
  onFiltersChange: (f: LeadFilters) => void
  options: { statuses: Option[]; persons: Option[]; countries: Option[] }
  onSelect: (id: string) => void
  onNew: () => void
  className?: string
}

const FILTER_FIELDS: { key: keyof LeadFilters; label: string; all: string; opt: "statuses" | "persons" | "countries" }[] = [
  { key: "status", label: "Status", all: "All statuses", opt: "statuses" },
  { key: "person", label: "Sales person", all: "All sales persons", opt: "persons" },
  { key: "country", label: "Destination country", all: "All countries", opt: "countries" },
]

function FilterMenu({ filters, onChange, options }: {
  filters: LeadFilters
  onChange: (f: LeadFilters) => void
  options: ListPaneProps["options"]
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const active = FILTER_FIELDS.filter((f) => filters[f.key]).length

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(toolbarBtn, (open || active > 0) && "bg-accent text-foreground")}
      >
        <Filter className="h-3 w-3" strokeWidth={1.75} />
        Filter
        {active > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
            {active}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter leads"
          className="absolute left-[16px] top-full z-30 mt-1 w-64 max-w-[calc(100%-2rem)] space-y-3 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          {FILTER_FIELDS.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className={cn("block text-xs leading-none", TEXT_DIM)}>{f.label}</span>
              <select
                value={filters[f.key]}
                onChange={(e) => onChange({ ...filters, [f.key]: e.target.value })}
                className="h-8 w-full rounded-md border border-input bg-[hsl(var(--input-bg))] px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{f.all}</option>
                {options[f.opt].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={active === 0}
              onClick={() => onChange({ status: "", person: "", country: "" })}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            >
              Clear all
            </button>
            <button type="button" onClick={close} className={toolbarBtn}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterChip({ field, value, onRemove }: { field: string; value: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-border p-2 text-xs leading-none">
      <span className="flex min-w-0 items-center gap-1">
        <span className="shrink-0 font-semibold text-foreground">{field}</span>
        <span className={cn("shrink-0", TEXT_DIM)}>is</span>
        <span className={cn("truncate", TEXT_SUBTLE)}>{value}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${field} filter`}
        className="-m-1 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-2.5 w-2.5" strokeWidth={2} />
      </button>
    </span>
  )
}

function Chip({ selected, className, children }: { selected?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-xs leading-none",
        selected ? "border-muted-foreground/50!" : "border-border",
        TEXT_SUBTLE,
        className,
      )}
    >
      {children}
    </span>
  )
}

function LeadRow({ lead, selected, now, onSelect }: {
  lead: SalesLead
  selected: boolean
  now: Date
  onSelect: (id: string) => void
}) {
  const status = lead.status ? LEAD_STATUS_MAP[lead.status] : null
  const subtitle = [str(lead.consignee), str(lead.dest_country)].filter(Boolean).join(", ")
  const route = routeLine(lead)
  const date = fmtShortDate(lead.date_sent, now)
  const mode = str(lead.mode_of_transport)
  const lineTone = selected ? TEXT_SUBTLE : TEXT_DIM

  return (
    <button
      type="button"
      data-lead-id={lead.id}
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(lead.id)}
      className={cn(
        "flex w-full items-start gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        selected ? "bg-accent" : "hover:bg-accent/50",
      )}
    >
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold tracking-wide text-primary"
      >
        {initials(lead.shipper)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-4">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-base font-semibold leading-5 text-foreground">
            {str(lead.shipper) || "Unnamed shipper"}
          </span>
          <span className={cn("truncate text-xs leading-4", lineTone)}>
            {subtitle || "Consignee not set"}
          </span>
        </span>
        <span className="flex min-w-0 flex-col gap-2">
          <span className={cn("truncate text-xs leading-4", lineTone)}>
            {route || <span className="italic">Route not set</span>}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            {date && (
              <Chip selected={selected}>
                <Calendar className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />
                {date}
              </Chip>
            )}
            {mode && (
              <Chip selected={selected}>
                <ModeIcon transport={mode} className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />
                {mode}
              </Chip>
            )}
            {status && (
              <Chip className={cn("border-transparent!", status.color, status.textColor)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status.label}
              </Chip>
            )}
          </span>
        </span>
      </span>
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="flex gap-3 border-b border-border px-4 py-3.5">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-1 flex-col gap-4">
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ListMessage({ icon: Icon, title, body, action }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className={cn("text-xs leading-relaxed", TEXT_DIM)}>{body}</p>
      </div>
      {action}
    </div>
  )
}

export function LeadListPane({
  rows, filtered, loading, selectedId, search, onSearchChange, filters, onFiltersChange,
  options, onSelect, onNew, className,
}: ListPaneProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const [now] = useState(() => new Date())

  // Keep the selected row visible when it changes via prev/next or deep link
  useEffect(() => {
    if (!selectedId) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-lead-id="${CSS.escape(selectedId)}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedId])

  const chips = FILTER_FIELDS.filter((f) => filters[f.key]).map((f) => ({
    key: f.key,
    field: f.label,
    value: f.key === "status" ? LEAD_STATUS_MAP[filters.status]?.label ?? filters.status : filters[f.key],
  }))
  const won = useMemo(() => filtered.filter((r) => r.status === "WON").length, [filtered])
  const narrowed = filtered.length !== rows.length
  const hasQuery = chips.length > 0 || search.trim() !== ""

  return (
    <section aria-label="Sales leads" className={cn("min-h-0 flex-col", className)}>
      {/* Top bar — left */}
      <div className="relative flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <h1 className="truncate text-base font-medium leading-none text-foreground">Sales Leads</h1>
        <div className="flex items-center gap-2">
          <FilterMenu filters={filters} onChange={onFiltersChange} options={options} />
          <button
            type="button"
            onClick={onNew}
            className={cn(toolbarBtn, "border-primary! bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:text-primary-foreground")}
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            New Lead
          </button>
        </div>
      </div>

      {/* Search */}
      <label className="flex shrink-0 items-center gap-2 px-4 py-3.5">
        <Search className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search shipper, consignee, agent, port…"
          aria-label="Search leads"
          className="min-w-0 flex-1 bg-transparent text-xs leading-none text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
      </label>

      {/* Active filters + count */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3.5">
        {chips.map((c) => (
          <FilterChip
            key={c.key}
            field={c.field}
            value={c.value}
            onRemove={() => onFiltersChange({ ...filters, [c.key]: "" })}
          />
        ))}
        {!loading && rows.length > 0 && (
          <p className={cn("text-xs leading-none", TEXT_DIM, chips.length > 0 && "ml-auto")}>
            {narrowed ? `${filtered.length} of ${rows.length}` : filtered.length} lead{(narrowed ? rows.length : filtered.length) !== 1 ? "s" : ""}
            {" · "}{won} won
          </p>
        )}
      </div>

      {/* Results */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }, (_, i) => <RowSkeleton key={i} />)
        ) : rows.length === 0 ? (
          <ListMessage
            icon={Inbox}
            title="No leads yet"
            body="Leads you send to overseas agents will show up here."
            action={
              <button type="button" onClick={onNew} className={cn(toolbarBtn, "border-primary! bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:text-primary-foreground")}>
                <Plus className="h-3 w-3" strokeWidth={2} /> New Lead
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <ListMessage
            icon={SearchX}
            title="No leads match"
            body="Try a different search, or clear the filters."
            action={hasQuery ? (
              <button
                type="button"
                onClick={() => { onSearchChange(""); onFiltersChange({ status: "", person: "", country: "" }) }}
                className={toolbarBtn}
              >
                Clear search and filters
              </button>
            ) : undefined}
          />
        ) : (
          filtered.map((lead) => (
            <LeadRow key={lead.id} lead={lead} selected={lead.id === selectedId} now={now} onSelect={onSelect} />
          ))
        )}
      </div>
    </section>
  )
}
