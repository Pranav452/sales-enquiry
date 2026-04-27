"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, PhoneForwarded, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ACTIVITY_TYPE_MAP,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
} from "@/lib/constants/activities"
import { BRANCHES } from "@/lib/constants/dropdowns"

export interface Activity {
  id: string
  activity_date:   string | null
  activity_type:   string | null
  sales_person:    string | null
  branch:          string | null
  client_name:     string | null
  contact_person:  string | null
  contact_number:  string | null
  email:           string | null
  mode:            string | null
  pol:             string | null
  pod:             string | null
  commodity:       string | null
  status:          string | null
  notes:           string | null
  points:          number | null
  reminder_date:   string | null
  reminder_done:   boolean | number | null
  created_at:      string | null
}

const PAGE_SIZE = 20

interface Props {
  onEdit?:      (a: Activity) => void
  onFollowUp?:  (a: Activity) => void
  refresh?:     number
}

function TypeBadge({ type }: { type: string | null }) {
  const def = type ? ACTIVITY_TYPE_MAP[type] : null
  if (!def) return <span className="text-muted-foreground text-xs">{type ?? "—"}</span>
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
      def.color, def.textColor
    )}>
      {def.label}
      <span className="opacity-60">+{def.points}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const def = ACTIVITY_STATUSES.find((s) => s.value === status)
  if (!def) return <span className="text-muted-foreground text-xs">{status ?? "—"}</span>
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", def.color, def.textColor)}>
      {def.label}
    </span>
  )
}

function ReminderDot({ date, done }: { date: string | null; done: boolean }) {
  if (!date || done) return null
  const today    = new Date().toISOString().split("T")[0]
  const isOverdue = date < today
  const isToday   = date === today
  if (!isOverdue && !isToday) return null
  return (
    <span title={isOverdue ? `Reminder overdue: ${date}` : `Reminder today: ${date}`}
      className={cn("inline-block h-2 w-2 rounded-full shrink-0", isOverdue ? "bg-red-500" : "bg-amber-400")} />
  )
}

function FilterSelect({
  value, options, onChange, placeholder,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-md border border-input bg-background px-2 text-xs",
        "text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function ActivityRow({
  r,
  onEdit,
  onFollowUp,
}: {
  r: Activity
  onEdit?:     (a: Activity) => void
  onFollowUp?: (a: Activity) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const route = [r.mode, r.pol && r.pod ? `${r.pol} → ${r.pod}` : r.pol || r.pod]
    .filter(Boolean).join(" · ")

  const hasNotes = !!r.notes?.trim()
  const notesShort = r.notes && r.notes.length > 80 ? r.notes.slice(0, 80) + "…" : r.notes

  return (
    <div className="border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">

        {/* ── Actions (always visible, left side) ─── */}
        <div className="flex flex-col gap-1 shrink-0 pt-0.5">
          <button
            type="button"
            title="Edit"
            onClick={() => onEdit?.(r)}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {onFollowUp && r.client_name && (
            <button
              type="button"
              title="Log follow-up warm call"
              onClick={() => onFollowUp(r)}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400 transition-colors"
            >
              <PhoneForwarded className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Main content ─────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-1">

          {/* Row 1: Type · Client · Status · Date · XP */}
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={r.activity_type} />
            <span className="font-semibold text-sm text-foreground truncate max-w-[200px]">
              {r.client_name || "—"}
            </span>
            <StatusBadge status={r.status} />
            <span className="text-xs text-muted-foreground ml-auto shrink-0 flex items-center gap-1.5">
              <ReminderDot date={r.reminder_date} done={!!r.reminder_done} />
              {r.activity_date
                ? new Date(r.activity_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
              {r.points != null && (
                <span className="font-bold text-primary">+{r.points} XP</span>
              )}
            </span>
          </div>

          {/* Row 2: Contact · Route · Sales Person */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {r.contact_person && <span>{r.contact_person}</span>}
            {r.contact_person && (route || r.sales_person) && <span className="opacity-30">·</span>}
            {route && <span>{route}</span>}
            {route && r.sales_person && <span className="opacity-30">·</span>}
            {r.sales_person && <span className="font-medium text-foreground/70">{r.sales_person}</span>}
            {r.branch && <span className="opacity-50 ml-auto">{r.branch}</span>}
          </div>

          {/* Row 3: Notes */}
          {hasNotes && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {expanded ? (
                <span className="whitespace-pre-line">{r.notes}</span>
              ) : (
                <span>{notesShort}</span>
              )}
              {r.notes && r.notes.length > 80 && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  {expanded ? (
                    <><ChevronUp className="h-3 w-3" />less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" />more</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityList({ onEdit, onFollowUp, refresh = 0 }: Props) {
  const [rows, setRows]       = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")
  const [page, setPage]       = useState(1)

  const [filterType,   setFilterType]   = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterBranch, setFilterBranch] = useState("")

  useEffect(() => {
    setLoading(true)
    fetch("/api/activities")
      .then((r) => r.json())
      .then((data: Activity[]) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [refresh])

  const filtered = useMemo(() => {
    let result = rows
    if (filterType)   result = result.filter((r) => r.activity_type === filterType)
    if (filterStatus) result = result.filter((r) => r.status === filterStatus)
    if (filterBranch) result = result.filter((r) => r.branch === filterBranch)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) =>
        [r.client_name, r.contact_person, r.sales_person, r.notes, r.commodity, r.pol, r.pod]
          .some((v) => v?.toLowerCase().includes(q))
      )
    }
    return result
  }, [rows, filterType, filterStatus, filterBranch, search])

  useEffect(() => { setPage(1) }, [search, filterType, filterStatus, filterBranch])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return Array.from({ length: 5 }, (_, i) => start + i)
  }, [page, totalPages])

  const totalXp = filtered.reduce((s, r) => s + (r.points ?? 0), 0)

  if (loading) return (
    <div className="py-10 text-sm text-center text-muted-foreground">Loading activities…</div>
  )

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search client, contact, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs w-48"
        />
        <FilterSelect
          value={filterType}
          options={ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          onChange={setFilterType}
          placeholder="All Types"
        />
        <FilterSelect
          value={filterStatus}
          options={ACTIVITY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={setFilterStatus}
          placeholder="All Statuses"
        />
        <FilterSelect
          value={filterBranch}
          options={BRANCHES.map((b) => ({ value: b, label: b }))}
          onChange={setFilterBranch}
          placeholder="All Branches"
        />
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} records · <span className="font-semibold text-foreground">{totalXp} XP</span>
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <div className="px-4 py-2 border-b border-border/40 flex items-center gap-1 text-[11px] text-muted-foreground">
        <span className="mr-1">Actions:</span>
        <span className="inline-flex items-center gap-1 border border-border rounded px-1.5 py-0.5">
          <Pencil className="h-3 w-3" /> Edit
        </span>
        <span className="inline-flex items-center gap-1 border border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 rounded px-1.5 py-0.5">
          <PhoneForwarded className="h-3 w-3" /> Follow-up
        </span>
        <span className="ml-3 opacity-60">Red dot = overdue reminder · Amber dot = reminder today</span>
      </div>

      {/* ── List ────────────────────────────────────────── */}
      <div>
        {paginated.length === 0 ? (
          <div className="py-10 text-sm text-center text-muted-foreground">No activities found.</div>
        ) : (
          paginated.map((r) => (
            <ActivityRow key={r.id} r={r} onEdit={onEdit} onFollowUp={onFollowUp} />
          ))
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </Button>
            {pageNumbers.map((p) => (
              <Button key={p} type="button" variant={p === page ? "default" : "outline"} size="sm"
                className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>
                {p}
              </Button>
            ))}
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
