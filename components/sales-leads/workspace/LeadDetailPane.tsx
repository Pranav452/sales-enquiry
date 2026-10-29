"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, ChevronDown, ChevronUp, CircleDot, FileDown, Globe, Inbox, Loader2, Mail, MapPin,
  MoreVertical, MousePointerClick, Pencil, Phone, Plus, UserCheck, UserPlus, UserRound,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"
import { ListMessage, toolbarBtn } from "./LeadListPane"
import {
  TEXT_DIM, TEXT_SUBTLE, TERMINAL_STATUSES, advanceAction, agentMailto, consigneeContactKnown,
  displayUrl, fmtDate, fmtRate, hrefFor, isAirMode, leadSummary, ModeIcon, modeLabel, routeSides, str,
  useDismiss,
} from "./lead-utils"

// Figma status fills for the Deny / Approve bar (Staus/Red, Staus/Green, Staus/Blue)
const DENY_CLS = "bg-[#ebacb2] text-[#cf0000] hover:bg-[#e59ea5] dark:bg-[#310e12] dark:text-[#f0616f] dark:hover:bg-[#3d1117]"
const APPROVE_CLS = "bg-[#b5e2c7] text-[#008412] hover:bg-[#a5dbbb] dark:bg-[#0d2115] dark:text-[#089e2b] dark:hover:bg-[#11291a]"
const REOPEN_CLS = "bg-[#87bfea] text-[#003bbb] hover:bg-[#78b5e5] dark:bg-[#051f30] dark:text-[#0186f2] dark:hover:bg-[#08283d]"

const container = "mx-auto w-full max-w-3xl px-4 sm:px-10"

interface DetailPaneProps {
  lead: SalesLead | null
  loading: boolean
  hasRows: boolean
  position: number
  total: number
  onPrev: () => void
  onNext: () => void
  onBack: () => void
  onNew: () => void
  onEdit: (lead: SalesLead) => void
  onConvert: (lead: SalesLead) => void
  converting: boolean
  onStatusChange: (lead: SalesLead, status: string) => void
  updating: boolean
  onDownloadPdf: (lead: SalesLead) => void
  downloading: boolean
  /** Rendered under the tab content below the xl breakpoint (details panel moves inline). */
  inlineDetails?: React.ReactNode
  className?: string
}

// ── Top bar (center) ──────────────────────────────────────────────────────────

function IconBtn({ label, onClick, disabled, children }: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(toolbarBtn, "w-[30px] px-0")}
    >
      {children}
    </button>
  )
}

function TopBar({ lead, position, total, onPrev, onNext, onBack, onEdit, onDownloadPdf, downloading }: Pick<
  DetailPaneProps, "lead" | "position" | "total" | "onPrev" | "onNext" | "onBack" | "onEdit" | "onDownloadPdf" | "downloading"
>) {
  const mailto = lead ? agentMailto(lead) : null
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-4">
        <button type="button" onClick={onBack} className={cn(toolbarBtn, "lg:hidden")}>
          <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
          Back
        </button>
        {total > 0 && position >= 0 && (
          <p className="whitespace-nowrap py-1.5 leading-none" aria-label={`Lead ${position + 1} of ${total}`}>
            <span className="text-sm font-medium text-foreground">{position + 1}</span>
            <span className={cn("text-xs", TEXT_DIM)}>/{total}</span>
          </p>
        )}
        <div className="flex items-center gap-3">
          <IconBtn label="Previous lead" onClick={onPrev} disabled={position <= 0}>
            <ChevronUp className="h-3 w-3" strokeWidth={1.75} />
          </IconBtn>
          <IconBtn label="Next lead" onClick={onNext} disabled={position < 0 || position >= total - 1}>
            <ChevronDown className="h-3 w-3" strokeWidth={1.75} />
          </IconBtn>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!lead}
          onClick={() => lead && onEdit(lead)}
          className={cn(toolbarBtn, "border-primary/60! text-primary hover:bg-primary/10 hover:text-primary")}
          title="Edit this lead"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.75} />
          <span className="hidden sm:inline">Edit lead</span>
        </button>
        {mailto ? (
          <a href={mailto} className={toolbarBtn} title={`Email ${lead?.agent_email ?? "agent"}`}>
            <Mail className="h-3 w-3" strokeWidth={1.75} />
            <span className="hidden sm:inline">Email agent</span>
          </a>
        ) : (
          <button type="button" disabled className={toolbarBtn} title="No agent email on this lead">
            <Mail className="h-3 w-3" strokeWidth={1.75} />
            <span className="hidden sm:inline">Email agent</span>
          </button>
        )}
        <button
          type="button"
          disabled={!lead || downloading}
          onClick={() => lead && onDownloadPdf(lead)}
          className={toolbarBtn}
          title="Download sales lead PDF"
        >
          {downloading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <FileDown className="h-3 w-3" strokeWidth={1.75} />}
          <span className="hidden sm:inline">Download PDF</span>
        </button>
      </div>
    </div>
  )
}

// ── Kebab menu ────────────────────────────────────────────────────────────────

const menuItem = "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground hover:bg-accent disabled:opacity-50"

function LeadMenu({ lead, onEdit, onConvert, converting, onDownloadPdf, downloading }: {
  lead: SalesLead
  onEdit: (l: SalesLead) => void
  onConvert: (l: SalesLead) => void
  converting: boolean
  onDownloadPdf: (l: SalesLead) => void
  downloading: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useDismiss<HTMLDivElement>(open, close)
  const run = (fn: () => void) => () => { setOpen(false); fn() }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Lead actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          open && "bg-accent text-foreground",
        )}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-lg">
          <button type="button" role="menuitem" className={menuItem} onClick={run(() => onEdit(lead))}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} /> Edit
          </button>
          {lead.contact_id ? (
            <Link href={`/contacts/${lead.contact_id}`} role="menuitem" className={menuItem} onClick={close}>
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} /> View contact
            </Link>
          ) : (
            <button type="button" role="menuitem" className={menuItem} disabled={converting} onClick={run(() => onConvert(lead))}>
              {converting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                : <UserPlus className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />}
              Convert to contact
            </button>
          )}
          <button type="button" role="menuitem" className={menuItem} disabled={downloading} onClick={run(() => onDownloadPdf(lead))}>
            <FileDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} /> Download PDF
          </button>
        </div>
      )}
    </div>
  )
}

// ── Overview tab blocks ───────────────────────────────────────────────────────

const cardCls = "rounded-lg border border-border bg-card"
const eyebrow = "text-[11px] font-medium uppercase leading-none tracking-wider"

function RouteCard({ lead }: { lead: SalesLead }) {
  const [from, to] = routeSides(lead)
  const mode = modeLabel(lead.mode_of_transport)
  const long = Math.max(from.big.length, to.big.length) > 6
  const bigCls = cn(
    "font-semibold leading-tight tracking-tight text-foreground break-words",
    long ? "text-lg sm:text-2xl" : "whitespace-nowrap text-[22px] sm:text-[32px]",
  )

  return (
    <div className={cn(cardCls, "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 p-4 sm:gap-5 sm:p-5")}>
      <div className="min-w-0 space-y-2">
        <p className={cn(eyebrow, TEXT_DIM)}>{from.label}</p>
        <p className={cn(bigCls, from.empty && "text-muted-foreground")}>{from.big}</p>
        {from.sub && <p className={cn("truncate text-xs", TEXT_SUBTLE)} title={from.sub}>{from.sub}</p>}
      </div>
      <div className="flex w-12 flex-col items-center gap-2 sm:w-28">
        <div className="flex w-full items-center gap-2">
          <span className="h-px flex-1 border-t border-dashed border-muted-foreground/50!" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
            <ModeIcon transport={lead.mode_of_transport} className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
          </span>
          <span className="h-px flex-1 border-t border-dashed border-muted-foreground/50!" />
        </div>
        {mode && <p className={cn(eyebrow, "text-center text-[10px] sm:text-[11px]", TEXT_DIM)}>{mode}</p>}
      </div>
      <div className="min-w-0 space-y-2 text-right">
        <p className={cn(eyebrow, TEXT_DIM)}>{to.label}</p>
        <p className={cn(bigCls, to.empty && "text-muted-foreground")}>{to.big}</p>
        {to.sub && <p className={cn("truncate text-xs", TEXT_SUBTLE)} title={to.sub}>{to.sub}</p>}
      </div>
    </div>
  )
}

function PartyLine({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; children: React.ReactNode }) {
  return (
    <p className={cn("flex min-w-0 items-start gap-2 text-xs leading-normal", TEXT_SUBTLE)}>
      <Icon className="mt-[3px] h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

function WebsiteLine({ url }: { url: string | null | undefined }) {
  const href = hrefFor(url)
  return (
    <PartyLine icon={Globe}>
      {href
        ? <a href={href} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-from-font underline-offset-2 hover:text-primary">{displayUrl(url)}</a>
        : <span className="text-muted-foreground">Website not available</span>}
    </PartyLine>
  )
}

function PartyCards({ lead }: { lead: SalesLead }) {
  const shipperWhere = [str(lead.shipper_address), str(lead.city)].filter(Boolean).join(", ")
  const consigneeWhere = [str(lead.consignee_address), str(lead.dest_country)].filter(Boolean).join(", ")
  const known = consigneeContactKnown(lead)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className={cn(cardCls, "flex min-w-0 flex-col gap-2 p-4")}>
        <p className={cn(eyebrow, TEXT_DIM)}>Shipper</p>
        <p className="text-sm font-semibold leading-snug text-foreground">{str(lead.shipper) || "—"}</p>
        <PartyLine icon={MapPin}>{shipperWhere || <span className="text-muted-foreground">Address not available</span>}</PartyLine>
        <WebsiteLine url={lead.shipper_website} />
      </div>
      <div className={cn(cardCls, "flex min-w-0 flex-col gap-2 p-4")}>
        <p className={cn(eyebrow, TEXT_DIM)}>Consignee</p>
        <p className="text-sm font-semibold leading-snug text-foreground">{str(lead.consignee) || "—"}</p>
        <PartyLine icon={MapPin}>{consigneeWhere || <span className="text-muted-foreground">Address not available</span>}</PartyLine>
        <WebsiteLine url={lead.consignee_website} />
        {known ? (
          <>
            {str(lead.consignee_contact) && <PartyLine icon={UserRound}>{lead.consignee_contact}</PartyLine>}
            {str(lead.consignee_email) && (
              <PartyLine icon={Mail}>
                <a href={`mailto:${str(lead.consignee_email)}`} className="break-all underline decoration-from-font underline-offset-2 hover:text-primary">{lead.consignee_email}</a>
              </PartyLine>
            )}
            {str(lead.consignee_phone) && <PartyLine icon={Phone}>{lead.consignee_phone}</PartyLine>}
          </>
        ) : (
          <span className="mt-1 inline-flex w-fit items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium leading-none text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            Contact details to be traced
          </span>
        )}
      </div>
    </div>
  )
}

function RatesCard({ lead }: { lead: SalesLead }) {
  const air = isAirMode(lead.mode_of_transport)
  const rates = [
    { label: "20' GP", value: fmtRate(lead.rate_20gp) },
    { label: "40' HC", value: fmtRate(lead.rate_40hc) },
    { label: air ? "Air freight" : "LCL per CBM", value: fmtRate(lead.rate_lcl) },
    { label: "Other", value: fmtRate(lead.rate_fcl) },
  ]
  const hasRates = rates.some((r) => r.value)
  const currency = str(lead.rate_currency).toUpperCase() || (hasRates ? "USD" : "")
  const cells = [
    ...rates,
    { label: "Currency", value: currency },
    { label: "Validity", value: fmtDate(lead.rate_validity) },
  ]

  return (
    <div className={cn(cardCls, "p-4")}>
      <p className={cn(eyebrow, "mb-3", TEXT_DIM)}>Rates</p>
      {hasRates ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0 space-y-1">
              <dt className={cn("text-xs leading-none", TEXT_DIM)}>{c.label}</dt>
              <dd className={cn("break-words text-base font-semibold leading-snug tabular-nums", c.value ? "text-foreground" : "font-normal text-muted-foreground")}>
                {c.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={cn("text-sm", TEXT_SUBTLE)}>
          Rates on request
          {str(lead.rate_validity) && <span className={TEXT_DIM}> · validity {fmtDate(lead.rate_validity)}</span>}
        </p>
      )}
    </div>
  )
}

function TextBlock({ title, value, empty }: { title?: string; value: string | null | undefined; empty: string }) {
  const v = str(value)
  return (
    <div className={cn(cardCls, "space-y-2 p-4")}>
      {title && <p className={cn(eyebrow, TEXT_DIM)}>{title}</p>}
      {v
        ? <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground">{v}</p>
        : <p className="text-sm text-muted-foreground">{empty}</p>}
    </div>
  )
}

// ── Pane ──────────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className={cn(container, "space-y-10 py-10")}>
      <div className="space-y-4">
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3.5">
        <div className="h-7 w-full animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-36 animate-pulse rounded-lg bg-muted" />
          <div className="h-36 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  )
}

const tabTrigger = cn(
  "rounded-none border-b-2 border-transparent! px-0 pb-1 pt-0 text-sm font-normal leading-normal shadow-none",
  "focus-visible:ring-offset-0 data-[state=active]:border-foreground/70! data-[state=active]:bg-transparent",
  "data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:border-muted-foreground!",
  TEXT_DIM,
)

export function LeadDetailPane(props: DetailPaneProps) {
  const {
    lead, loading, hasRows, onNew, onEdit, onConvert, converting, onStatusChange, updating,
    onDownloadPdf, downloading, inlineDetails, className,
  } = props

  const status = lead?.status ? LEAD_STATUS_MAP[lead.status] : null
  const action = advanceAction(lead?.status)
  const terminal = TERMINAL_STATUSES.has(str(lead?.status))
  const summary = lead ? leadSummary(lead) : ""
  const followUp = fmtDate(lead?.last_follow_up)

  return (
    <section aria-label="Lead" className={cn("min-h-0 min-w-0 flex-col", className)}>
      <TopBar {...props} />

      {loading ? (
        <div className="min-h-0 flex-1 overflow-hidden"><DetailSkeleton /></div>
      ) : !lead ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
          {hasRows ? (
            <ListMessage icon={MousePointerClick} title="No lead selected" body="Pick a lead from the list, or adjust the search and filters." />
          ) : (
            <ListMessage
              icon={Inbox}
              title="No leads yet"
              body="Create your first sales lead to start tracking agent responses, follow-ups and outcomes."
              action={
                <button type="button" onClick={onNew} className={cn(toolbarBtn, "border-primary! bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground dark:text-primary-foreground")}>
                  <Plus className="h-3 w-3" strokeWidth={2} /> New Lead
                </button>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div key={lead.id} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-10 pt-10">
              {/* Header */}
              <header className={cn(container, "flex flex-col gap-4")}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="min-w-0 break-words text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[32px] sm:leading-[1.15]">
                    {str(lead.shipper) || "Unnamed shipper"}
                  </h2>
                  <LeadMenu
                    lead={lead}
                    onEdit={onEdit}
                    onConvert={onConvert}
                    converting={converting}
                    onDownloadPdf={onDownloadPdf}
                    downloading={downloading}
                  />
                </div>
                <p className={cn("text-sm leading-normal", TEXT_SUBTLE)}>
                  {summary || "No shipment details yet — edit the lead to add commodity, mode and route."}
                </p>
              </header>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="flex flex-col gap-7">
                <div className="border-b border-border">
                  <TabsList className={cn("flex h-auto justify-start gap-4 rounded-none bg-transparent p-0 text-inherit", container)}>
                    <TabsTrigger value="overview" className={tabTrigger}>Overview</TabsTrigger>
                    <TabsTrigger value="remarks" className={tabTrigger}>Remarks</TabsTrigger>
                    <TabsTrigger value="notes" className={tabTrigger}>Notes</TabsTrigger>
                  </TabsList>
                </div>

                <div className={cn(container, "flex flex-col gap-3.5")}>
                  {/* Status banner (design: AI score banner) */}
                  <div
                    className={cn(
                      "flex min-h-[29px] flex-wrap items-center gap-x-3 gap-y-0.5 rounded px-3 py-1",
                      status ? [status.color, status.textColor] : "bg-muted text-muted-foreground",
                    )}
                  >
                    <CircleDot className="h-3 w-3 shrink-0" strokeWidth={2} />
                    <span className="text-base font-semibold leading-normal">{status?.label ?? (str(lead.status) || "No status")}</span>
                    {followUp && <span className="text-sm leading-normal">Last follow-up {followUp}</span>}
                  </div>

                  <TabsContent value="overview" className="mt-0 flex flex-col gap-3">
                    <RouteCard lead={lead} />
                    <PartyCards lead={lead} />
                    <RatesCard lead={lead} />
                  </TabsContent>
                  <TabsContent value="remarks" className="mt-0 flex flex-col gap-3">
                    <TextBlock title="Remarks" value={lead.remarks} empty="No remarks yet." />
                    <TextBlock title="Remarks 2" value={lead.remarks_2} empty="No second remark." />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0">
                    <TextBlock value={lead.notes} empty="No notes yet." />
                  </TabsContent>
                </div>
              </Tabs>

              {inlineDetails ? (
                <div className="border-t border-border xl:hidden">
                  <div className="mx-auto w-full max-w-3xl">
                    <h3 className="border-b border-border px-4 py-3.5 text-sm font-medium leading-none text-foreground">Details</h3>
                    {inlineDetails}
                  </div>
                </div>
              ) : (
                <div className="pb-2" />
              )}
            </div>
          </div>

          {/* Deny / Approve */}
          <div className="flex shrink-0 items-center justify-center gap-4 border-t border-border px-4 py-4">
            <button
              type="button"
              disabled={updating || terminal}
              onClick={() => onStatusChange(lead, "NOT_INTERESTED")}
              className={cn(
                "flex h-11 min-w-0 max-w-[264px] flex-1 items-center justify-center rounded px-2 text-sm font-medium leading-none transition-colors sm:px-3 sm:text-base",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                DENY_CLS,
              )}
            >
              <span className="truncate">Not interested</span>
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => onStatusChange(lead, action.status)}
              className={cn(
                "flex h-11 min-w-0 max-w-[264px] flex-1 items-center justify-center gap-2 rounded px-2 text-sm font-medium leading-none transition-colors sm:px-3 sm:text-base",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                action.reopen ? REOPEN_CLS : APPROVE_CLS,
              )}
            >
              {updating && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
              <span className="truncate sm:hidden">{action.short}</span>
              <span className="hidden truncate sm:inline">{action.label}</span>
            </button>
          </div>
        </>
      )}
    </section>
  )
}
