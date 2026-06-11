"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ActivityForm } from "@/components/activities/ActivityForm"
import { Timeline, type TimelineItem } from "@/components/ui/timeline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import {
  Upload, Search, X, Trash2, Phone, Mail, FileDown,
  MapPin, User, AlertCircle, CheckCircle2, ChevronLeft,
  ChevronRight, Pencil, PhoneCall, PhoneForwarded, Users,
  Trophy, PhoneIncoming, Skull, RotateCcw,
} from "lucide-react"
import { ACTIVITY_TYPE_MAP, ACTIVITY_STATUSES } from "@/lib/constants/activities"

// ─── Types ─────────────────────────────────────────────────────

interface Contact {
  id:                  string
  shipper_name:        string
  consignee_name:      string
  mode:                string
  pol:                 string
  pod:                 string
  contact_person:      string
  contact_number:      string
  email:               string
  source:              "contact" | "activity"
  activity_count:      number
  last_activity_date:  string | null
  created_by:          string
  created_at:          string
  is_dead_lead:        boolean | number
  stage:               string
}

interface ActivityHistoryItem {
  id:             string
  activity_date:  string
  activity_type:  string
  sales_person:   string
  status:         string
  notes:          string
  points:         number
  contact_person: string
  contact_number: string
  mode:           string
  pol:            string
  pod:            string
}

interface ParsedRow {
  shipper_name:   string
  consignee_name: string
  mode:           string
  pol:            string
  pod:            string
  contact_person: string
  contact_number: string
  email:          string
}

type RowField = keyof ParsedRow

// ─── Constants ─────────────────────────────────────────────────

const PAGE_SIZE = 20

const PREVIEW_COLS: { key: RowField; label: string; width: string }[] = [
  { key: "shipper_name",   label: "Shipper",        width: "min-w-[160px]" },
  { key: "consignee_name", label: "Consignee",      width: "min-w-[160px]" },
  { key: "mode",           label: "Mode",           width: "min-w-[80px]"  },
  { key: "pol",            label: "POL",            width: "min-w-[90px]"  },
  { key: "pod",            label: "POD",            width: "min-w-[90px]"  },
  { key: "contact_person", label: "Contact Person", width: "min-w-[130px]" },
  { key: "contact_number", label: "Phone",          width: "min-w-[140px]" },
  { key: "email",          label: "Email",          width: "min-w-[180px]" },
]

// Per activity type: dot colour + icon
const TYPE_STYLE: Record<string, { dot: string; icon: React.ReactNode; label: string }> = {
  COLD_CALL:     { dot: "bg-blue-500",   icon: <PhoneIncoming />,  label: "Cold Call" },
  WARM_CALL:     { dot: "bg-amber-500",  icon: <PhoneForwarded />, label: "Warm Call" },
  CLIENT_VISIT:  { dot: "bg-green-500",  icon: <Users />,          label: "Client Visit" },
  VISIT_SECURED: { dot: "bg-purple-600", icon: <Trophy />,         label: "Visit Secured" },
}

// ─── Helpers ───────────────────────────────────────────────────

function highlight(text: string, query: string) {
  if (!query || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function formatDate(d: string | null) {
  if (!d) return ""
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

function statusLabel(val: string) {
  return ACTIVITY_STATUSES.find((s) => s.value === val)?.label ?? val
}

/** Map an ActivityHistoryItem → generic TimelineItem for the Timeline component */
function toTimelineItem(h: ActivityHistoryItem): TimelineItem {
  const style = TYPE_STYLE[h.activity_type] ?? { dot: "bg-muted-foreground/40", icon: <Phone />, label: h.activity_type }

  const descParts: string[] = []
  if (h.status)         descParts.push(statusLabel(h.status))
  if (h.mode || h.pol || h.pod) {
    const route = [h.mode, h.pol && h.pod ? `${h.pol} → ${h.pod}` : h.pol || h.pod].filter(Boolean).join(" · ")
    if (route) descParts.push(route)
  }
  if (h.notes) descParts.push(h.notes)

  return {
    id:          h.id,
    date:        h.activity_date,
    title:       style.label,
    subtitle:    h.sales_person || undefined,
    description: descParts.join("\n") || undefined,
    icon:        style.icon,
    dotColor:    style.dot,
    badge: (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
        +{h.points} XP
      </span>
    ),
  }
}

// ─── Editable preview modal ────────────────────────────────────

function PreviewModal({
  rows, onChange, onDeleteRow, onConfirm, onCancel, saving,
}: {
  rows:        ParsedRow[]
  onChange:    (idx: number, field: RowField, value: string) => void
  onDeleteRow: (idx: number) => void
  onConfirm:   () => void
  onCancel:    () => void
  saving:      boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-6xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Preview &amp; Edit Extracted Contacts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rows.length} contact{rows.length !== 1 ? "s" : ""} found — click any cell to edit before importing
            </p>
          </div>
          <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 border-b border-border">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-8">#</th>
                {PREVIEW_COLS.map((c) => (
                  <th key={c.key} className={cn("px-2 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap", c.width)}>
                    {c.label}
                  </th>
                ))}
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={cn("border-b border-border/40 group", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                  <td className="px-3 py-1 text-muted-foreground text-[11px] align-middle">{i + 1}</td>
                  {PREVIEW_COLS.map((col) => (
                    <td key={col.key} className="px-1 py-1 align-middle">
                      <input
                        type="text"
                        value={row[col.key]}
                        onChange={(e) => onChange(i, col.key, e.target.value)}
                        className={cn(
                          "w-full h-7 px-2 rounded border border-transparent bg-transparent text-xs",
                          "hover:border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30",
                          "transition-colors", col.width
                        )}
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 align-middle">
                    <button type="button" onClick={() => onDeleteRow(i)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Pencil className="h-3 w-3" />
            Click any cell to edit · hover row to delete
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={onConfirm} disabled={saving || rows.length === 0}>
              {saving ? "Importing…" : `Import ${rows.length} contact${rows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Client Detail modal (timeline + log form) ─────────────────

function ClientDetailModal({
  contact,
  defaultSalesPerson,
  onClose,
}: {
  contact:            Contact
  defaultSalesPerson: string | undefined
  onClose:            () => void
}) {
  const router = useRouter()
  const [history,     setHistory]     = useState<ActivityHistoryItem[]>([])
  const [histLoading, setHistLoading] = useState(true)
  const [showForm,    setShowForm]    = useState(false)

  // Real TBL_CONTACTS rows have "c_<ID>" ids; activity-only clients have "a_…"
  const numericId = contact.source === "contact" && contact.id.startsWith("c_")
    ? contact.id.slice(2)
    : null

  // totalXp across all history entries
  const totalXp = history.reduce((s, h) => s + (h.points ?? 0), 0)

  // Pre-select WARM_CALL if prior history exists
  const defaultType = history.length > 0 ? "WARM_CALL" : undefined

  useEffect(() => {
    if (!contact.shipper_name) { setHistLoading(false); return }
    fetch(`/api/contacts/history?client=${encodeURIComponent(contact.shipper_name)}`)
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setHistLoading(false))
  }, [contact.shipper_name])

  const timelineItems: TimelineItem[] = history.map(toTimelineItem)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {contact.shipper_name || contact.consignee_name || "Client"}
              </h2>
              {contact.stage === "CLIENT" && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
                  Client
                </span>
              )}
              {numericId && (
                <Link
                  href={`/contacts/${numericId}`}
                  className="text-[11px] text-primary hover:underline shrink-0"
                >
                  Client 360 →
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {contact.contact_person && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />{contact.contact_person}
                </span>
              )}
              {contact.contact_number && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />{contact.contact_number}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />{contact.email}
                </span>
              )}
              {(contact.pol || contact.pod) && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {contact.pol || "—"} → {contact.pod || "—"}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-3 mt-0.5 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── XP summary strip ───────────────────────────── */}
        {!histLoading && history.length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2.5 bg-muted/40 border-b border-border flex-shrink-0 flex-wrap">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{history.length}</span> call{history.length !== 1 ? "s" : ""} logged
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">{totalXp} XP</span> earned
            </span>
            {/* Type breakdown */}
            <div className="flex items-center gap-2 ml-auto">
              {(["COLD_CALL","WARM_CALL","CLIENT_VISIT","VISIT_SECURED"] as const).map((type) => {
                const count = history.filter((h) => h.activity_type === type).length
                if (!count) return null
                const s = TYPE_STYLE[type]
                return (
                  <span key={type} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                    {count}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Body: timeline or form ─────────────────────── */}
        <div className="overflow-y-auto flex-1">

          {showForm ? (
            /* ── Log activity form ──────────────────────── */
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">
                    {history.length > 0 ? "Log Follow-up Call" : "Log Activity"}
                  </h3>
                  {history.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Warm Call pre-selected — you earn 1 XP for every follow-up
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                  ← Back to timeline
                </button>
              </div>
              <ActivityForm
                defaultSalesPerson={defaultSalesPerson}
                defaultValues={{
                  client_name:    contact.shipper_name    || "",
                  contact_person: contact.contact_person  || "",
                  contact_number: contact.contact_number  || "",
                  email:          contact.email           || "",
                  mode:           contact.mode            || "",
                  pol:            contact.pol             || "",
                  pod:            contact.pod             || "",
                  ...(defaultType ? { activity_type: defaultType } : {}),
                }}
                onSuccess={() => {
                  setShowForm(false)
                  // Refresh history after logging
                  setHistLoading(true)
                  fetch(`/api/contacts/history?client=${encodeURIComponent(contact.shipper_name)}`)
                    .then((r) => r.json())
                    .then((d) => setHistory(Array.isArray(d) ? d : []))
                    .catch(() => {})
                    .finally(() => setHistLoading(false))
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          ) : (
            /* ── Call timeline ──────────────────────────── */
            <div className="px-5 pt-5 pb-4">

              {histLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading call history…</p>
              ) : timelineItems.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Phone className="h-7 w-7 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-medium text-foreground">No calls logged yet</p>
                  <p className="text-xs text-muted-foreground">Log the first Cold Call to start the timeline.</p>
                </div>
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    {Object.entries(TYPE_STYLE).map(([type, s]) => (
                      <span key={type} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                        {s.label}
                      </span>
                    ))}
                  </div>

                  <Timeline
                    items={timelineItems}
                    initialCount={6}
                    showMoreText="Show older calls"
                    showLessText="Show less"
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer CTA ─────────────────────────────────── */}
        {!showForm && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border flex-shrink-0 bg-card">
            <p className="text-xs text-muted-foreground">
              {history.length > 0
                ? `Last call ${formatDate(history[0]?.activity_date)}`
                : "No calls yet"}
            </p>
            <div className="flex items-center gap-2">
              {numericId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => router.push(`/enquiry?contact=${numericId}`)}
                >
                  New Enquiry
                </Button>
              )}
              <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
                <Phone className="h-3.5 w-3.5" />
                {history.length > 0 ? "Log Follow-up" : "Log First Call"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Contact card ──────────────────────────────────────────────

function ContactCard({
  contact, query, onClick, onDelete, onToggleDeadLead,
  isAdmin,
}: {
  contact:           Contact
  query:             string
  onClick:           (c: Contact) => void
  onDelete:          (id: string) => void
  onToggleDeadLead:  (c: Contact) => void
  isAdmin:           boolean
}) {
  const [hovered, setHovered] = useState(false)
  const canDelete = contact.source === "contact"
  const isDead    = !!contact.is_dead_lead

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-all duration-150 flex flex-col cursor-pointer",
        isDead
          ? "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20 opacity-75 hover:opacity-100"
          : "border-border hover:border-primary/40 hover:shadow-sm"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isDead && onClick(contact)}
    >
      <div className="p-4 flex-1">

        {/* Dead lead banner */}
        {isDead && (
          <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-medium text-red-600 dark:text-red-400">
            <Skull className="h-3.5 w-3.5 shrink-0" />
            Dead Lead — not pursuing
          </div>
        )}

        {/* Source / stage badges */}
        {(contact.source === "activity" || contact.stage === "CLIENT") && !isDead && (
          <div className="mb-2 flex items-center gap-1.5 flex-wrap">
            {contact.stage === "CLIENT" && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Client
              </span>
            )}
            {contact.source === "activity" && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                From Activity Tracker
              </span>
            )}
          </div>
        )}

        {/* Name + mode */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            {contact.shipper_name && (
              <p className={cn(
                "text-sm font-semibold truncate leading-snug",
                isDead ? "text-muted-foreground line-through" : "text-foreground"
              )}>
                {highlight(contact.shipper_name, query)}
              </p>
            )}
            {contact.consignee_name && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                <span className="font-medium text-[10px] uppercase tracking-wide">Consignee · </span>
                {highlight(contact.consignee_name, query)}
              </p>
            )}
          </div>
          {contact.mode && !isDead && (
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 mt-0.5",
              contact.mode === "AIR"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
            )}>
              {contact.mode}
            </span>
          )}
        </div>

        {!isDead && (
          <>
            {/* Route */}
            {(contact.pol || contact.pod) && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{contact.pol || "—"}</span>
                <span className="text-border">→</span>
                <span>{contact.pod || "—"}</span>
              </div>
            )}

            {/* Contact detail */}
            <div className="space-y-1">
              {contact.contact_person && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{highlight(contact.contact_person, query)}</span>
                </div>
              )}
              {contact.contact_number && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{highlight(contact.contact_number, query)}</span>
                </div>
              )}
              {contact.email && hovered && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{highlight(contact.email, query)}</span>
                </div>
              )}
            </div>

            {/* Call count */}
            {contact.activity_count > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
                <PhoneCall className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {contact.activity_count} call{contact.activity_count !== 1 ? "s" : ""}
                </span>
                {contact.last_activity_date && (
                  <span className="text-muted-foreground">· last {formatDate(contact.last_activity_date)}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action bar — always visible */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-t rounded-b-lg",
        isDead
          ? "border-red-200 dark:border-red-800/50 bg-red-100/40 dark:bg-red-950/30"
          : "border-border/60 bg-muted/30"
      )}>
        {isDead ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-red-500 dark:text-red-400">Dead lead</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleDeadLead(contact) }}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded border border-border hover:border-foreground/30"
            >
              <RotateCcw className="h-3 w-3" /> Restore
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-muted-foreground">Click to view timeline</span>
            <div className="flex items-center gap-0.5">
              {/* Mark as dead lead — always visible */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleDeadLead(contact) }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Mark as dead lead"
              >
                <Skull className="h-3 w-3" />
                <span>Dead lead</span>
              </button>
              {/* Delete — admin only, contact-source only */}
              {isAdmin && canDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(contact.id) }}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                  title="Delete contact"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty state — Excel format hint ──────────────────────────

const TEMPLATE_COLS = ["Shipper Name", "Consignee Name", "SEA/AIR", "POL", "POD", "Contact Person", "Contact (Phone)", "Email ID"]
const DUMMY_ROWS = [
  ["ABC Textiles Pvt Ltd", "Global Traders GmbH", "SEA", "JNPT", "HAMBURG", "Ramesh Kumar", "91-98765 43210", "ramesh@abctex..."],
  ["Sunshine Garments", "Fashion House Inc", "AIR", "DELHI", "NEW YORK", "Priya Singh", "91-91234 56789", "priya@sunshine..."],
  ["Spice Exports Ltd", "Arabian Foods LLC", "SEA", "COCHIN", "DUBAI", "Anil Menon", "91-99887 76655", "anil@spiceexp..."],
]

function ExcelFormatHint({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="mt-2 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <p className="text-xs text-muted-foreground font-medium">Format your Excel like this before uploading</p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b border-border">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          <div className="ml-2 h-4 w-32 rounded bg-background/70 border border-border/60" />
          <div className="flex-1" />
          <div className="h-3 w-16 rounded bg-muted-foreground/20" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-muted/80">
                <th className="w-8 border-r border-b border-border px-2 py-1.5 text-center text-muted-foreground/50 font-normal">1</th>
                {TEMPLATE_COLS.map((col) => (
                  <th key={col} className="border-r border-b border-border px-3 py-1.5 text-left font-semibold text-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DUMMY_ROWS.map((row, ri) => (
                <tr key={ri} className="bg-background">
                  <td className="border-r border-b border-border/50 px-2 py-1.5 text-center text-muted-foreground/40 bg-muted/40">{ri + 2}</td>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border-r border-b border-border/50 px-3 py-1.5 text-muted-foreground/60 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              ))}
              {[0, 1].map((i) => (
                <tr key={`g${i}`} className="bg-background">
                  <td className="border-r border-b border-border/30 px-2 py-1.5 text-center text-muted-foreground/20 bg-muted/20">{DUMMY_ROWS.length + 2 + i}</td>
                  {TEMPLATE_COLS.map((_, ci) => (
                    <td key={ci} className="border-r border-b border-border/20 px-3 py-1.5">
                      <div className={cn("h-2.5 rounded-full bg-muted-foreground/10", ci === 0 ? "w-28" : ci === 1 ? "w-24" : ci === 7 ? "w-32" : "w-16")} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center pb-4">
        <Button size="sm" variant="outline" className="gap-2" onClick={onUpload}>
          <Upload className="h-4 w-4" />
          Upload your Excel
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2">Column names are flexible — SEA/AIR, Mode, Shipping Mode all work</p>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────

export default function ContactsPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [loading,     setLoading]     = useState(true)
  const [query,       setQuery]       = useState("")
  const [page,        setPage]        = useState(1)

  const [parsing,     setParsing]     = useState(false)
  const [parseError,  setParseError]  = useState<string | null>(null)
  const [previewRows, setPreviewRows] = useState<ParsedRow[] | null>(null)
  const [importing,   setImporting]   = useState(false)
  const [importMsg,   setImportMsg]   = useState<string | null>(null)

  // Client detail modal
  const [detailContact, setDetailContact] = useState<Contact | null>(null)

  // Dead lead filter: "active" | "dead" | "all"
  const [deadFilter, setDeadFilter] = useState<"active" | "dead" | "all">("active")

  const [userInfo, setUserInfo] = useState<{ role: string; salesperson: string | null } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("user_profiles")
        .select("role, salesperson")
        .eq("id", user.id)
        .single()
      setUserInfo({ role: data?.role ?? "sales", salesperson: data?.salesperson ?? null })
    })
  }, [])

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/contacts")
      if (res.ok) setContacts(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const filtered = contacts.filter((c) => {
    // Dead lead filter
    const dead = !!c.is_dead_lead
    if (deadFilter === "active" && dead)  return false
    if (deadFilter === "dead"   && !dead) return false
    // Text search
    if (!query) return true
    const q = query.toLowerCase()
    return (
      c.shipper_name?.toLowerCase().includes(q)   ||
      c.consignee_name?.toLowerCase().includes(q) ||
      c.mode?.toLowerCase().includes(q)           ||
      c.pol?.toLowerCase().includes(q)            ||
      c.pod?.toLowerCase().includes(q)            ||
      c.contact_person?.toLowerCase().includes(q) ||
      c.contact_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageContacts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function handleQueryChange(v: string) { setQuery(v); setPage(1) }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ""
    setParsing(true); setParseError(null); setImportMsg(null)
    const fd = new FormData(); fd.append("file", file)
    try {
      const res = await fetch("/api/contacts/parse", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) { setParseError(json.error ?? "Parse failed"); return }
      setPreviewRows(json.contacts)
    } catch { setParseError("Failed to read file") }
    finally   { setParsing(false) }
  }

  function handlePreviewChange(idx: number, field: RowField, value: string) {
    setPreviewRows((prev) => prev ? prev.map((r, i) => i === idx ? { ...r, [field]: value } : r) : prev)
  }
  function handlePreviewDeleteRow(idx: number) {
    setPreviewRows((prev) => prev ? prev.filter((_, i) => i !== idx) : prev)
  }

  async function handleImportConfirm() {
    if (!previewRows?.length) return
    setImporting(true)
    try {
      const res  = await fetch("/api/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewRows),
      })
      const json = await res.json()
      if (!res.ok) { setParseError(json.error ?? "Import failed"); setPreviewRows(null); return }
      setPreviewRows(null)
      const parts = [`${json.inserted} contact${json.inserted !== 1 ? "s" : ""} imported`]
      if (json.skipped > 0) parts.push(`${json.skipped} skipped (already exist)`)
      setImportMsg(parts.join(" · ") + ".")
      fetchContacts()
    } finally { setImporting(false) }
  }

  async function handleToggleDeadLead(contact: Contact) {
    const newVal = !contact.is_dead_lead
    // Optimistically update local state
    setContacts((prev) =>
      prev.map((c) => c.id === contact.id ? { ...c, is_dead_lead: newVal } : c)
    )
    try {
      await fetch("/api/contacts/dead-lead", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ client_name: contact.shipper_name || contact.consignee_name, is_dead_lead: newVal }),
      })
    } catch {
      // Revert on failure
      setContacts((prev) =>
        prev.map((c) => c.id === contact.id ? { ...c, is_dead_lead: !newVal } : c)
      )
    }
  }

  async function handleDelete(id: string) {
    if (!id.startsWith("c_")) return
    if (!confirm("Delete this contact?")) return
    await fetch(`/api/contacts/${id.slice(2)}`, { method: "DELETE" })
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  function downloadTemplate() {
    const headers = ["SHIPPER NAME","CONSIGNEE NAME","SEA/AIR","POL","POD","CONTACT PERSON","CONTACT","EMAIL ID"]
    const examples = [
      { "SHIPPER NAME": "ABC Textiles Pvt Ltd", "CONSIGNEE NAME": "Global Traders GmbH", "SEA/AIR": "SEA", "POL": "JNPT", "POD": "HAMBURG", "CONTACT PERSON": "Ramesh Kumar", "CONTACT": "91-9876543210", "EMAIL ID": "ramesh@abctextiles.com" },
      { "SHIPPER NAME": "Sunshine Garments", "CONSIGNEE NAME": "Fashion House Inc", "SEA/AIR": "AIR", "POL": "DELHI", "POD": "NEW YORK", "CONTACT PERSON": "Priya Singh", "CONTACT": "91-9123456789", "EMAIL ID": "priya@sunshinegarments.com" },
    ]
    const ws = XLSX.utils.json_to_sheet(examples, { header: headers })
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Contacts")
    XLSX.writeFile(wb, "contacts_template.xlsx")
  }

  const isAdmin       = userInfo?.role === "admin"
  const importedCount = contacts.filter((c) => c.source === "contact").length
  const activityCount = contacts.filter((c) => c.source === "activity").length

  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {!loading && contacts.length > 0
              ? [importedCount > 0 && `${importedCount} imported`, activityCount > 0 && `${activityCount} from Activity Tracker`].filter(Boolean).join(" · ")
              : "Import from Excel · click any card to see call timeline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={downloadTemplate}>
            <FileDown className="h-4 w-4" />Template
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setParseError(null); fileRef.current?.click() }} disabled={parsing}>
            <Upload className="h-4 w-4" />{parsing ? "Reading…" : "Upload Excel"}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {parseError && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Import failed</p>
            <p className="text-xs mt-0.5 opacity-80">{parseError}</p>
            <p className="text-[11px] mt-1.5 opacity-60">Expected headers: Shipper Name · Consignee Name · SEA/AIR · POL · POD · Contact · Email ID</p>
          </div>
          <button type="button" onClick={() => setParseError(null)} className="shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {importMsg && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{importMsg}</span>
          <button type="button" onClick={() => setImportMsg(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Search + dead lead filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search by name, port, email, phone…" value={query} onChange={(e) => handleQueryChange(e.target.value)} className="pl-9" />
          {query && (
            <button type="button" onClick={() => handleQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs">
          {(["active", "dead", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setDeadFilter(f); setPage(1) }}
              className={cn(
                "px-3 py-1.5 capitalize transition-colors",
                deadFilter === f
                  ? f === "dead"
                    ? "bg-red-500 text-white font-medium"
                    : "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {f === "active" ? "Active" : f === "dead" ? "Dead Leads" : "All"}
            </button>
          ))}
        </div>

        {!loading && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filtered.length === contacts.length
              ? `${contacts.length} contact${contacts.length !== 1 ? "s" : ""}`
              : `${filtered.length} of ${contacts.length}`}
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading contacts…</div>
      ) : pageContacts.length === 0 ? (
        query ? (
          <div className="py-20 text-center space-y-2">
            <Search className="h-7 w-7 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-medium">No contacts match your search</p>
          </div>
        ) : (
          <ExcelFormatHint onUpload={() => { setParseError(null); fileRef.current?.click() }} />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pageContacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              query={query}
              onClick={setDetailContact}
              onDelete={handleDelete}
              onToggleDeadLead={handleToggleDeadLead}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {previewRows && (
        <PreviewModal
          rows={previewRows}
          onChange={handlePreviewChange}
          onDeleteRow={handlePreviewDeleteRow}
          onConfirm={handleImportConfirm}
          onCancel={() => setPreviewRows(null)}
          saving={importing}
        />
      )}

      {/* Client detail + timeline modal */}
      {detailContact && (
        <ClientDetailModal
          contact={detailContact}
          defaultSalesPerson={userInfo?.salesperson ?? undefined}
          onClose={() => setDetailContact(null)}
        />
      )}
    </div>
  )
}
