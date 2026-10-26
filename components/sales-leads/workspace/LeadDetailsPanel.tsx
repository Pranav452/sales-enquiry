"use client"

import {
  Barcode, Briefcase, Building2, Calendar, CalendarCheck, CircleDot, CircleUserRound,
  ClipboardList, Download, File, Hash, Loader2, Mail, MapPin, Navigation, Package, Phone, UserRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import { ModeIcon, TEXT_DIM, TEXT_SUBTLE, fmtDate, portWithCode, splitEmails, str } from "./lead-utils"

const linkCls = "underline decoration-from-font underline-offset-2 hover:text-primary break-all"

function Section({ title, action, className, children }: {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex flex-col gap-3 border-b border-border px-4 pb-2 pt-4", className)}>
      <div className="flex items-center justify-between py-1.5">
        <h3 className="text-sm font-medium leading-none text-foreground">{title}</h3>
        {action}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function Row({ label, icon: Icon, glyph, iconClass, children }: {
  label: string
  icon?: LucideIcon
  /** Pre-rendered icon, for glyphs that depend on the lead (transport mode). */
  glyph?: React.ReactNode
  iconClass?: string
  children: React.ReactNode
}) {
  const empty = children === null || children === undefined || children === "" || children === false
  return (
    <div className="flex items-start gap-10">
      <div className={cn("w-[103px] shrink-0 py-1.5 text-sm leading-[1.2]", TEXT_DIM)}>{label}</div>
      <div className="flex min-w-0 flex-1 items-start gap-3 py-1">
        <span className="flex h-[21px] shrink-0 items-center">
          {glyph ?? (Icon && <Icon className={cn("h-3 w-3 text-muted-foreground", iconClass)} strokeWidth={1.75} />)}
        </span>
        <div className="min-w-0 flex-1 break-words text-sm leading-normal text-foreground">
          {empty ? <span className="text-muted-foreground">—</span> : children}
        </div>
      </div>
    </div>
  )
}

function Mailto({ value }: { value: string | null | undefined }) {
  const v = str(value)
  if (!v) return null
  const emails = splitEmails(v)
  if (!emails.length) return <>{v}</>
  return (
    <span className="flex flex-col gap-0.5">
      {emails.map((e) => <a key={e} href={`mailto:${e}`} className={linkCls}>{e}</a>)}
    </span>
  )
}

interface DetailsPanelProps {
  lead: SalesLead | null
  loading?: boolean
  downloading?: boolean
  onDownloadPdf?: (lead: SalesLead) => void
  className?: string
}

export function LeadDetailsPanel({ lead, loading, downloading, onDownloadPdf, className }: DetailsPanelProps) {
  if (loading) {
    return (
      <div className={cn("space-y-6 px-4 py-4", className)}>
        {Array.from({ length: 3 }, (_, s) => (
          <div key={s} className="space-y-3">
            <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-10">
                <div className="h-3.5 w-[103px] animate-pulse rounded bg-muted" />
                <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (!lead) {
    return (
      <div className={cn("px-4 py-10 text-center text-xs", TEXT_DIM, className)}>
        Select a lead to see its details.
      </div>
    )
  }

  const status = lead.status ? LEAD_STATUS_MAP[lead.status] : null
  const origin = [portWithCode(lead.origin_port, lead.origin_port_code), str(lead.origin_country)].filter(Boolean).join(", ")
  const dest = [portWithCode(lead.dest_port, lead.dest_port_code), str(lead.dest_country)].filter(Boolean).join(", ")
  const pdfName = `${lead.ref_code || "Draft"}.pdf`

  return (
    <div className={className}>
      <Section title="Overview">
        <Row label="Ref no" icon={Hash}><span className="font-mono text-[13px]">{lead.ref_code}</span></Row>
        <Row label="Date sent" icon={Calendar}>{fmtDate(lead.date_sent)}</Row>
        <Row label="Sent by" icon={UserRound}>
          {str(lead.sent_by) && (
            <>
              {lead.sent_by}
              {str(lead.sender_designation) && (
                <span className={cn("block text-xs", TEXT_DIM)}>{lead.sender_designation}</span>
              )}
            </>
          )}
        </Row>
        <Row label="Status" icon={CircleDot} iconClass={status?.textColor}>
          {status ? <span className={status.textColor}>{status.label}</span> : str(lead.status)}
        </Row>
        <Row label="Last follow-up" icon={CalendarCheck}>{fmtDate(lead.last_follow_up)}</Row>
      </Section>

      <Section title="Agent">
        <Row label="Agent name" icon={UserRound}>{str(lead.agent_name)}</Row>
        <Row label="Company" icon={Building2}>{str(lead.agent_company)}</Row>
        <Row label="Email" icon={Mail}>{str(lead.agent_email) && <Mailto value={lead.agent_email} />}</Row>
      </Section>

      <Section title="Shipment">
        <Row label="Mode" glyph={<ModeIcon transport={lead.mode_of_transport} className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />}>{str(lead.mode_of_transport)}</Row>
        <Row label="Origin" icon={MapPin}>{origin}</Row>
        <Row label="Destination" icon={Navigation}>{dest}</Row>
        <Row label="Commodity" icon={Package}>{str(lead.commodity)}</Row>
        <Row label="HS code" icon={Barcode}>{str(lead.hs_code)}</Row>
        <Row label="Special requirements" icon={ClipboardList}>
          {str(lead.special_requirements) && <span className="whitespace-pre-line">{lead.special_requirements}</span>}
        </Row>
      </Section>

      <Section
        title="Documents"
        className="pb-4 pt-2"
        action={
          <button
            type="button"
            onClick={() => onDownloadPdf?.(lead)}
            disabled={downloading}
            aria-label="Download sales lead PDF"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {downloading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Download className="h-3 w-3" strokeWidth={1.75} />}
          </button>
        }
      >
        <button
          type="button"
          onClick={() => onDownloadPdf?.(lead)}
          disabled={downloading}
          className="group flex w-full items-start gap-3 text-left disabled:opacity-60"
        >
          <span className="flex h-[21px] shrink-0 items-center">
            <File className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <span className={cn("min-w-0 flex-1 break-words text-sm leading-normal group-hover:text-foreground group-hover:underline", TEXT_SUBTLE)}>
            {downloading ? "Preparing PDF…" : `Sales lead PDF — ${pdfName}`}
          </span>
        </button>
      </Section>

      <Section title="Sender">
        <Row label="Full name" icon={CircleUserRound}>{str(lead.sent_by)}</Row>
        <Row label="Designation" icon={Briefcase}>{str(lead.sender_designation)}</Row>
        <Row label="Email" icon={Mail}>{str(lead.sender_email) && <Mailto value={lead.sender_email} />}</Row>
        <Row label="Phone" icon={Phone}>
          {str(lead.sender_phone) && <a href={`tel:${str(lead.sender_phone).replace(/[^\d+]/g, "")}`} className={linkCls}>{lead.sender_phone}</a>}
        </Row>
      </Section>
    </div>
  )
}
