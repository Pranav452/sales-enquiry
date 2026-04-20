"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  created_at:      string | null
}

const PAGE_SIZE = 20

interface Props {
  onEdit?: (a: Activity) => void
  refresh?: number  // bump to reload
}

function TypeBadge({ type }: { type: string | null }) {
  const def = type ? ACTIVITY_TYPE_MAP[type] : null
  if (!def) return <span className="text-muted-foreground text-xs">{type ?? "—"}</span>
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", def.color, def.textColor)}>
      {def.label}
      <span className="opacity-70">+{def.points}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: string | null }) {
  const def = ACTIVITY_STATUSES.find((s) => s.value === status)
  if (!def) return <span className="text-muted-foreground text-xs">{status ?? "—"}</span>
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", def.color, def.textColor)}>
      {def.label}
    </span>
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

export function ActivityList({ onEdit, refresh = 0 }: Props) {
  const [rows, setRows]       = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")
  const [page, setPage]       = useState(1)

  // Filters
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

  if (loading) return <div className="py-8 text-sm text-center text-muted-foreground">Loading activities...</div>

  return (
    <div>
      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search client, contact, notes..."
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
          {filtered.length} records · <span className="font-medium text-foreground">{totalXp} XP</span>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["Date", "Type", "Client", "Contact", "Mode / Route", "Sales Person", "Branch", "Status", "Notes", "XP"].map((h) => (
                <th key={h} className="px-3 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  No activities found.
                </td>
              </tr>
            ) : (
              paginated.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => onEdit?.(r)}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {r.activity_date ? new Date(r.activity_date).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <TypeBadge type={r.activity_type} />
                  </td>
                  <td className="px-3 py-2.5 max-w-[140px] truncate font-medium">{r.client_name || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.contact_person || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {[r.mode, r.pol && r.pod ? `${r.pol} → ${r.pod}` : r.pol || r.pod].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.sales_person || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{r.branch || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] whitespace-normal break-words text-muted-foreground">
                    {r.notes || "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-primary">
                    {r.points != null ? `+${r.points}` : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
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
