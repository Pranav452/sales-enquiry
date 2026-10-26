// Shared helpers for the Sales Lead workspace (list / detail / details panes).

import { useEffect, useRef } from "react"
import { Plane, Ship, TrainFront, Truck, MoveRight, type LucideProps } from "lucide-react"
import { LEAD_STATUSES, LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"

// ── Design text roles (Figma "Text/Subtle" and "Text/Disabled") ───────────────
// The template's light and dark palettes don't map 1:1 onto our tokens, so the
// two secondary text roles pair a token with a dark-mode adjustment.
export const TEXT_SUBTLE = "text-muted-foreground dark:text-foreground/85"
export const TEXT_DIM = "text-foreground/75 dark:text-muted-foreground"

// ── Formatting ────────────────────────────────────────────────────────────────

/** Trimmed string or "" — every lead field is nullable free text. */
export function str(v: string | null | undefined): string {
  return (v ?? "").trim()
}

function parseIsoDate(d: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return null
  const parsed = new Date(d.slice(0, 10) + "T00:00:00")
  return isNaN(parsed.getTime()) ? null : parsed
}

/** "12 Oct 2026"; non-ISO text is returned unchanged. */
export function fmtDate(d: string | null | undefined): string {
  const s = str(d)
  if (!s) return ""
  const parsed = parseIsoDate(s)
  if (!parsed) return s
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** "12 Oct" for the current year, "12 Oct 2025" otherwise — compact list chips. */
export function fmtShortDate(d: string | null | undefined, now: Date): string {
  const s = str(d)
  if (!s) return ""
  const parsed = parseIsoDate(s)
  if (!parsed) return s
  return parsed.getFullYear() === now.getFullYear()
    ? parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** Rate cell: thousands separators for bare numbers, free text untouched. */
export function fmtRate(v: string | null | undefined): string {
  const t = str(v)
  if (!/^\d+(\.\d+)?$/.test(t)) return t
  const [int, dec] = t.split(".")
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec ? `.${dec}` : "")
}

/** Up to two initials of the shipper name, for the list's leading square. */
export function initials(name: string | null | undefined): string {
  const words = str(name)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return "—"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function displayUrl(url: string | null | undefined): string {
  return str(url).replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")
}

export function hrefFor(url: string | null | undefined): string | null {
  const u = str(url)
  if (!u) return null
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

// ── Mode + route ──────────────────────────────────────────────────────────────

export function isAirMode(mode: string | null | undefined): boolean {
  return /\bair\b/i.test(str(mode))
}

/** Transport-mode glyph: Plane / Ship / Truck / Train, arrow when unknown. */
export function ModeIcon({ transport, ...props }: { transport: string | null | undefined } & LucideProps) {
  const m = str(transport).toLowerCase()
  if (/\bair\b/.test(m)) return <Plane {...props} />
  if (/\b(sea|ocean|fcl|lcl)\b/.test(m)) return <Ship {...props} />
  if (/\b(road|truck)\b/.test(m)) return <Truck {...props} />
  if (/\brail\b/.test(m)) return <TrainFront {...props} />
  return <MoveRight {...props} />
}

/** "Sea freight" / "Air freight"; other free text is shown as entered. */
export function modeLabel(mode: string | null | undefined): string {
  const m = str(mode)
  if (/^(sea|air|road|rail)$/i.test(m)) return `${m[0].toUpperCase()}${m.slice(1).toLowerCase()} freight`
  return m
}

/** Port code when known, else port name, else country. */
export function routeEnd(code?: string | null, port?: string | null, country?: string | null): string {
  return str(code).toUpperCase() || str(port) || str(country)
}

/** Joins two route ends; a lone end reads "From X" / "To Y" instead of "— → Y". */
function joinRoute(from: string, to: string): string {
  if (from && to) return `${from} → ${to}`
  if (to) return `To ${to}`
  if (from) return `From ${from}`
  return ""
}

/** "INNSA → NLRTM" (codes preferred, then port names; older leads fall back to shipper city / countries). */
export function routeLine(lead: SalesLead): string {
  const from = str(lead.origin_port_code).toUpperCase() || str(lead.origin_port) || str(lead.origin_country) || str(lead.city)
  const to = str(lead.dest_port_code).toUpperCase() || str(lead.dest_port) || str(lead.dest_country)
  return joinRoute(from, to)
}

/** "Nhava Sheva (INNSA)" — port name with its code when both are present. */
export function portWithCode(port?: string | null, code?: string | null): string {
  const p = str(port)
  const c = str(code).toUpperCase()
  if (p && c) return `${p} (${c})`
  return p || c
}

export interface RouteSide {
  label: string
  big: string
  sub: string
  empty: boolean
}

/** Same rules as the PDF ticket: code is the headline, port + country below it. */
export function routeSides(lead: SalesLead): [RouteSide, RouteSide] {
  const side = (label: string, code: string, port: string, country: string): RouteSide => {
    if (code) return { label, big: code.toUpperCase(), sub: [port, country].filter(Boolean).join(", "), empty: false }
    if (port) return { label, big: port, sub: country, empty: false }
    return { label, big: country || "—", sub: "", empty: !country }
  }
  return [
    side("From", str(lead.origin_port_code), str(lead.origin_port), str(lead.origin_country) || str(lead.city)),
    side("To", str(lead.dest_port_code), str(lead.dest_port), str(lead.dest_country)),
  ]
}

/** One-line summary under the title: commodity · mode · route. */
export function leadSummary(lead: SalesLead): string {
  const origin = portWithCode(lead.origin_port, lead.origin_port_code) || str(lead.origin_country) || str(lead.city)
  const dest = portWithCode(lead.dest_port, lead.dest_port_code) || str(lead.dest_country)
  return [str(lead.commodity), modeLabel(lead.mode_of_transport), joinRoute(origin, dest)].filter(Boolean).join(" · ")
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

export const PIPELINE = [
  "LEAD_SENT",
  "RESPONSE_RECEIVED",
  "FOLLOW_UP_SENT",
  "MEETING_SCHEDULED",
  "QUOTED",
  "WON",
] as const

export const TERMINAL_STATUSES = new Set(["WON", "NOT_INTERESTED", "DEAD", "NO_RESPONSE"])

export interface AdvanceAction {
  status: string
  /** "Move to Quoted" */
  label: string
  /** "Quoted" — narrow screens */
  short: string
  reopen: boolean
}

/** Approve-button target: next pipeline stage, or Reopen for terminal statuses. */
export function advanceAction(status: string | null | undefined): AdvanceAction {
  const s = str(status)
  if (TERMINAL_STATUSES.has(s)) return { status: "LEAD_SENT", label: "Reopen", short: "Reopen", reopen: true }
  const idx = PIPELINE.indexOf(s as (typeof PIPELINE)[number])
  const next = idx >= 0 ? PIPELINE[idx + 1] : PIPELINE[0]
  const name = LEAD_STATUS_MAP[next]?.label ?? next
  return { status: next, label: `Move to ${name}`, short: name, reopen: false }
}

export function statusLabel(status: string | null | undefined): string {
  const s = str(status)
  return s ? LEAD_STATUS_MAP[s]?.label ?? s : ""
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export interface LeadFilters {
  status: string
  person: string
  country: string
}

export const EMPTY_FILTERS: LeadFilters = { status: "", person: "", country: "" }

const SEARCH_FIELDS: (keyof SalesLead)[] = [
  "ref_code", "sent_by", "shipper", "shipper_website", "city", "consignee", "dest_country",
  "agent_name", "agent_email", "agent_company", "remarks", "remarks_2", "notes",
  "shipper_address", "consignee_address", "consignee_website", "mode_of_transport",
  "origin_port", "dest_port", "origin_country", "origin_port_code", "dest_port_code",
  "commodity", "hs_code", "special_requirements", "rate_fcl", "rate_lcl", "rate_20gp",
  "rate_40hc", "rate_currency", "rate_validity", "consignee_contact", "consignee_email",
  "consignee_phone", "sender_designation", "sender_email", "sender_phone",
]

export function filterLeads(rows: SalesLead[], filters: LeadFilters, search: string): SalesLead[] {
  let result = rows
  if (filters.status) result = result.filter((r) => r.status === filters.status)
  if (filters.person) result = result.filter((r) => r.sent_by === filters.person)
  if (filters.country) result = result.filter((r) => r.dest_country === filters.country)
  const q = search.trim().toLowerCase()
  if (q) {
    result = result.filter((r) =>
      SEARCH_FIELDS.some((k) => {
        const v = r[k]
        return typeof v === "string" && v.toLowerCase().includes(q)
      }) || statusLabel(r.status).toLowerCase().includes(q)
    )
  }
  return result
}

export function filterOptions(rows: SalesLead[]) {
  const uniq = (vals: (string | null | undefined)[]) =>
    [...new Set(vals.filter((v): v is string => !!v))].sort()
  return {
    statuses: LEAD_STATUSES.map((s) => ({ value: s.value, label: s.label })),
    persons: uniq(rows.map((r) => r.sent_by)).map((p) => ({ value: p, label: p })),
    countries: uniq(rows.map((r) => r.dest_country)).map((c) => ({ value: c, label: c })),
  }
}

// ── Contact helpers ───────────────────────────────────────────────────────────

/** Agent email fields often hold several addresses ("a@x.de/b@x.de", "a@x; b@y"). */
export function splitEmails(value: string | null | undefined): string[] {
  return str(value).split(/[;,/\s]+/).filter((e) => e.includes("@"))
}

export function agentMailto(lead: SalesLead): string | null {
  const to = splitEmails(lead.agent_email).join(",")
  if (!to) return null
  const subject = [lead.ref_code, str(lead.shipper)].filter(Boolean).join(" — ")
  return `mailto:${to}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`
}

export function consigneeContactKnown(lead: SalesLead): boolean {
  return Boolean(str(lead.consignee_contact) || str(lead.consignee_email) || str(lead.consignee_phone))
}

// ── Popover dismissal (click outside / Escape) ────────────────────────────────

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])
  return ref
}
