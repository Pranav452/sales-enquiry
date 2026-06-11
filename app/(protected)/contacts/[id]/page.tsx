"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, User, Phone, Mail, MapPin, Send,
  FileText, IndianRupee, PhoneCall, Target,
} from "lucide-react"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"

interface Contact360 {
  contact: {
    id: string
    shipper_name: string
    consignee_name: string
    mode: string
    pol: string
    pod: string
    contact_person: string
    contact_number: string
    email: string
    stage: string
    created_at: string
  }
  leads: {
    id: string; ref_code: string; sent_by: string | null; date_sent: string | null
    shipper: string | null; dest_country: string | null; status: string | null
  }[]
  enquiries: {
    id: string; enq_ref_no: string | null; enq_receipt_date: string | null
    mode: string | null; pol: string | null; pod: string | null
    status: string | null; shipper: string | null
  }[]
  quotations: {
    id: string; quot_ref_no: string; quot_date: string | null
    total_inr: number | null; status: string; enq_id: string | null
  }[]
  activities: {
    id: string; activity_date: string | null; activity_type: string | null
    sales_person: string | null; status: string | null; notes: string | null; points: number
  }[]
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—"
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + "T00:00:00" : d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function StageBadge({ stage }: { stage: string }) {
  const isClient = stage === "CLIENT"
  return (
    <span className={cn(
      "text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full",
      isClient
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
    )}>
      {isClient ? "Client" : "Contact"}
    </span>
  )
}

function SectionCard({
  title, icon, count, children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
          <span className="text-xs font-normal text-muted-foreground">({count})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {count === 0
          ? <p className="text-xs text-muted-foreground py-2">None yet.</p>
          : children}
      </CardContent>
    </Card>
  )
}

export default function Contact360Page() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Contact360 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    setLoading(true)
    fetch(`/api/contacts/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => null)
          throw new Error(d?.error ?? `Failed to load contact (${res.status})`)
        }
        return res.json()
      })
      .then((d: Contact360) => setData(d))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load contact"))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading client 360…</div>
  }
  if (error || !data) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">{error ?? "Contact not found."}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Contacts
        </Button>
      </div>
    )
  }

  const { contact, leads, enquiries, quotations, activities } = data

  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-5">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <Link href="/contacts" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Contacts
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-foreground truncate">
              {contact.shipper_name || contact.consignee_name || "Contact"}
            </h1>
            <StageBadge stage={contact.stage} />
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
            {contact.contact_person && <span className="flex items-center gap-1"><User className="h-3 w-3" />{contact.contact_person}</span>}
            {contact.contact_number && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.contact_number}</span>}
            {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
            {(contact.pol || contact.pod) && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{contact.pol || "—"} → {contact.pod || "—"}</span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => router.push(`/enquiry?contact=${contact.id}`)}>
          New Enquiry
        </Button>
      </div>

      {/* ── Funnel sections ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="Sales Leads" icon={<Target className="h-4 w-4 text-muted-foreground" />} count={leads.length}>
          <div className="divide-y divide-border/50">
            {leads.map((l) => {
              const def = l.status ? LEAD_STATUS_MAP[l.status] : null
              return (
                <div key={l.id} className="py-2 flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-primary">{l.ref_code}</span>
                  <span className="text-muted-foreground truncate">{l.dest_country || ""}</span>
                  {def && (
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", def.color, def.textColor)}>
                      {def.label}
                    </span>
                  )}
                  <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(l.date_sent)}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Enquiries" icon={<Send className="h-4 w-4 text-muted-foreground" />} count={enquiries.length}>
          <div className="divide-y divide-border/50">
            {enquiries.map((e) => (
              <div key={e.id} className="py-2 flex items-center gap-2 text-xs">
                <Link href={`/enquiry?edit=${e.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                  {e.enq_ref_no || `#${e.id}`}
                </Link>
                {e.mode && <Badge variant="outline" className="text-[10px]">{e.mode}</Badge>}
                <span className="text-muted-foreground truncate">{e.pol || "—"} → {e.pod || "—"}</span>
                {e.status && <span className="text-muted-foreground">{e.status}</span>}
                <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(e.enq_receipt_date)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quotations" icon={<FileText className="h-4 w-4 text-muted-foreground" />} count={quotations.length}>
          <div className="divide-y divide-border/50">
            {quotations.map((q) => (
              <div key={q.id} className="py-2 flex items-center gap-2 text-xs">
                <Link href={`/quotation?edit=${q.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                  {q.quot_ref_no}
                </Link>
                {q.status === "APPROVED" ? (
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Approved
                  </span>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Draft</Badge>
                )}
                {q.total_inr != null && (
                  <span className="flex items-center text-muted-foreground">
                    <IndianRupee className="h-3 w-3" />
                    {q.total_inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </span>
                )}
                <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(q.quot_date)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Activities" icon={<PhoneCall className="h-4 w-4 text-muted-foreground" />} count={activities.length}>
          <div className="divide-y divide-border/50">
            {activities.map((a) => (
              <div key={a.id} className="py-2 text-xs space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{(a.activity_type || "").replace(/_/g, " ")}</span>
                  {a.status && <span className="text-muted-foreground">{a.status.replace(/_/g, " ")}</span>}
                  <span className="ml-auto text-muted-foreground shrink-0">{fmtDate(a.activity_date)}</span>
                </div>
                {a.notes && <p className="text-muted-foreground line-clamp-2">{a.notes}</p>}
              </div>
            ))}
          </div>
        </SectionCard>

      </div>
    </div>
  )
}
