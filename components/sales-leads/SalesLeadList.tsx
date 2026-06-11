"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, ChevronDown, ChevronUp, ExternalLink, UserPlus, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { LEAD_STATUSES, LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"

export interface SalesLead {
  id:              string
  ref_code:        string
  sent_by:         string | null
  date_sent:       string | null
  shipper:         string | null
  shipper_website: string | null
  city:            string | null
  consignee:       string | null
  dest_country:    string | null
  agent_name:      string | null
  agent_email:     string | null
  status:          string | null
  remarks:         string | null
  remarks_2:       string | null
  last_follow_up:  string | null
  notes:           string | null
  contact_id:      string | null
  created_by:      string | null
  created_at:      string | null
}

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: string | null }) {
  const def = status ? LEAD_STATUS_MAP[status] : null
  if (!def) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", def.color, def.textColor)}>
      {def.label}
    </span>
  )
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  const parsed = new Date(d + "T00:00:00")
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
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

function LeadRow({ r, onEdit, onConvert, converting }: {
  r: SalesLead
  onEdit?: (l: SalesLead) => void
  onConvert?: (l: SalesLead) => void
  converting?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const remarksAll = [r.remarks, r.remarks_2, r.notes].filter((v) => v?.trim()).join(" · ")
  const remarksShort = remarksAll.length > 110 ? remarksAll.slice(0, 110) + "…" : remarksAll

  return (
    <div className="border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">

        <div className="shrink-0 pt-0.5 flex flex-col gap-1">
          <button
            type="button"
            title="Edit lead"
            onClick={() => onEdit?.(r)}
            className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {r.contact_id ? (
            <Link
              href={`/contacts/${r.contact_id}`}
              title="View contact (Client 360)"
              className="h-7 w-7 flex items-center justify-center rounded-md border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              title="Convert to Contact"
              disabled={converting}
              onClick={() => onConvert?.(r)}
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">

          {/* Row 1: Ref · Shipper · Status · Date */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-primary shrink-0">{r.ref_code}</span>
            <span className="font-semibold text-sm text-foreground truncate max-w-[260px]">
              {r.shipper || "—"}
            </span>
            {r.shipper_website?.startsWith("http") && (
              <a href={r.shipper_website} target="_blank" rel="noopener noreferrer"
                 className="text-muted-foreground hover:text-primary transition-colors" title={r.shipper_website}>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <StatusBadge status={r.status} />
            <span className="text-xs text-muted-foreground ml-auto shrink-0">
              {fmtDate(r.date_sent)}
            </span>
          </div>

          {/* Row 2: Consignee → Country · Agent · Sent by */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {r.consignee && (
              <span className="truncate max-w-[280px]">
                → {r.consignee}{r.dest_country ? `, ${r.dest_country}` : ""}
              </span>
            )}
            {!r.consignee && r.dest_country && <span>→ {r.dest_country}</span>}
            {r.agent_name && <span className="opacity-80">via {r.agent_name}</span>}
            {r.sent_by && <span className="font-medium text-foreground/70 ml-auto">{r.sent_by}</span>}
          </div>

          {/* Row 3: Remarks */}
          {remarksAll && (
            <div className="text-xs text-muted-foreground leading-relaxed">
              {expanded ? (
                <div className="space-y-1 whitespace-pre-line">
                  {r.remarks?.trim()   && <p><span className="font-semibold text-foreground/60">Remarks:</span> {r.remarks}</p>}
                  {r.remarks_2?.trim() && <p><span className="font-semibold text-foreground/60">Remarks 2:</span> {r.remarks_2}</p>}
                  {r.notes?.trim()     && <p><span className="font-semibold text-foreground/60">Notes:</span> {r.notes}</p>}
                  {r.agent_email?.trim() && <p><span className="font-semibold text-foreground/60">Agent email:</span> {r.agent_email}</p>}
                  {r.city?.trim()      && <p><span className="font-semibold text-foreground/60">City:</span> {r.city}</p>}
                </div>
              ) : (
                <span>{remarksShort}</span>
              )}
              {(remarksAll.length > 110 || r.agent_email || r.city) && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  {expanded
                    ? <><ChevronUp className="h-3 w-3" />less</>
                    : <><ChevronDown className="h-3 w-3" />more</>}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  rows:          SalesLead[]
  loading:       boolean
  onEdit?:       (l: SalesLead) => void
  onConvert?:    (l: SalesLead) => void
  convertingId?: string | null
}

export function SalesLeadList({ rows, loading, onEdit, onConvert, convertingId }: Props) {
  const [search, setSearch]           = useState("")
  const [page, setPage]               = useState(1)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterPerson, setFilterPerson] = useState("")
  const [filterCountry, setFilterCountry] = useState("")

  const persons = useMemo(
    () => [...new Set(rows.map((r) => r.sent_by).filter(Boolean) as string[])].sort(),
    [rows]
  )
  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.dest_country).filter(Boolean) as string[])].sort(),
    [rows]
  )

  const filtered = useMemo(() => {
    let result = rows
    if (filterStatus)  result = result.filter((r) => r.status === filterStatus)
    if (filterPerson)  result = result.filter((r) => r.sent_by === filterPerson)
    if (filterCountry) result = result.filter((r) => r.dest_country === filterCountry)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((r) =>
        [r.ref_code, r.shipper, r.consignee, r.dest_country, r.agent_name, r.agent_email, r.city, r.remarks, r.remarks_2, r.notes, r.sent_by]
          .some((v) => v?.toLowerCase().includes(q))
      )
    }
    return result
  }, [rows, filterStatus, filterPerson, filterCountry, search])

  useEffect(() => { setPage(1) }, [search, filterStatus, filterPerson, filterCountry])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
    return Array.from({ length: 5 }, (_, i) => start + i)
  }, [page, totalPages])

  if (loading) return (
    <div className="py-10 text-sm text-center text-muted-foreground">Loading leads…</div>
  )

  return (
    <div>
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search ref, shipper, consignee, agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs w-56"
        />
        <FilterSelect
          value={filterStatus}
          options={LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          onChange={setFilterStatus}
          placeholder="All Statuses"
        />
        <FilterSelect
          value={filterPerson}
          options={persons.map((p) => ({ value: p, label: p }))}
          onChange={setFilterPerson}
          placeholder="All Sales Persons"
        />
        <FilterSelect
          value={filterCountry}
          options={countries.map((c) => ({ value: c, label: c }))}
          onChange={setFilterCountry}
          placeholder="All Countries"
        />
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────── */}
      <div>
        {paginated.length === 0 ? (
          <div className="py-10 text-sm text-center text-muted-foreground">No leads found.</div>
        ) : (
          paginated.map((r) => (
            <LeadRow key={r.id} r={r} onEdit={onEdit} onConvert={onConvert} converting={convertingId === r.id} />
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
