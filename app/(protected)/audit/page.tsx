"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface AuditSummary {
  enquiry_id: number
  enq_ref_no: string | null
  shipper: string | null
  status: string | null
  change_count: number
  last_changed_at: string
  last_changed_by: string
}

interface AuditEntry {
  id: number
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
}

const FIELD_LABELS: Record<string, string> = {
  ENQRECPTDT:    "Receipt Date",
  MODE:          "Mode",
  ENQTYPE:       "Enquiry Type",
  EXIM:          "Export / Import",
  FN:            "FN",
  SALESPERSON:   "Sales Person",
  AGENT_NAME:    "Agent Name",
  COUNTRY_CODE:  "Country",
  BRANCH:        "Branch",
  NETWORK:       "Network",
  POL:           "Port of Loading",
  POD:           "Port of Discharge",
  INCOTERM:      "Incoterms",
  DIMENSION:     "Container Type",
  STATUS:        "Status",
  EMAIL_SUBJECT: "Shipment Awarded To",
  SHIPPER:       "Shipper",
  CONSIGNEE:     "Consignee",
  REMARK:        "Remarks",
  MBL_AWB_NO:    "MBL / AWB No.",
  JOB_INVOICE_NO:"Job / Invoice No.",
  GOP:           "GOP",
  ASSIGNED_USER: "Assigned User",
  ASSIGNED_DATE: "Quotation Date",
  BUY_RATE_FILE: "Buy Rate Notes",
  SELL_RATE_FILE:"Sell Rate Notes",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function statusVariant(s: string | null) {
  switch ((s ?? "").toUpperCase()) {
    case "WIN":        return "success"
    case "LOSE":       return "danger"
    case "FOLLOW UP":  return "warning"
    case "QUOTED":
    case "PENDING":
    case "NO FEEDBACK":return "info"
    default:           return "secondary"
  }
}

// Group audit entries into edit sessions (same user within 5s = one session)
function groupBySessions(entries: AuditEntry[]) {
  const groups: AuditEntry[][] = []
  let current: AuditEntry[] = []
  let lastTime: number | null = null
  let lastUser: string | null = null

  for (const e of entries) {
    const t = new Date(e.changed_at).getTime()
    const newSession = !lastTime || lastUser !== e.changed_by || t - lastTime > 5000
    if (newSession) {
      if (current.length) groups.push(current)
      current = [e]
    } else {
      current.push(e)
    }
    lastTime = t
    lastUser = e.changed_by
  }
  if (current.length) groups.push(current)
  return groups
}

export default function AuditPage() {
  const [list, setList]           = useState<AuditSummary[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [selected, setSelected]   = useState<AuditSummary | null>(null)
  const [detail, setDetail]       = useState<AuditEntry[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetch("/api/audit")
      .then(async (res) => {
        if (res.status === 403) throw new Error("Admin access required")
        if (!res.ok) throw new Error("Failed to load audit log")
        return res.json()
      })
      .then((data) => { setList(data); setLoading(false) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error")
        setLoading(false)
      })
  }, [])

  function handleSelect(row: AuditSummary) {
    setSelected(row)
    setDetail([])
    setDetailLoading(true)
    fetch(`/api/enquiries/${row.enquiry_id}/audit`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setDetailLoading(false) })
      .catch(() => setDetailLoading(false))
  }

  if (loading) return (
    <div className="p-8 text-sm text-muted-foreground">Loading audit log...</div>
  )

  if (error) return (
    <div className="p-8 text-sm text-destructive">{error}</div>
  )

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: Enquiry list ─────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-sm font-semibold text-foreground">Audit Log</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {list.length} enquir{list.length === 1 ? "y" : "ies"} with changes
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {list.length === 0 ? (
            <div className="px-4 py-8 text-xs text-muted-foreground text-center">
              No changes recorded yet.
            </div>
          ) : list.map((row) => (
            <button
              key={row.enquiry_id}
              type="button"
              onClick={() => handleSelect(row)}
              className={`w-full text-left px-4 py-3 transition-colors hover:bg-accent ${
                selected?.enquiry_id === row.enquiry_id ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-primary">
                  {row.enq_ref_no ?? `#${row.enquiry_id}`}
                </span>
                <Badge variant={statusVariant(row.status) as "success" | "danger" | "warning" | "info" | "secondary"} className="text-[10px] px-1.5 py-0">
                  {row.status ?? "—"}
                </Badge>
              </div>
              <div className="text-xs text-foreground truncate mb-1">
                {row.shipper || "No shipper"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {row.change_count} change{row.change_count !== 1 ? "s" : ""} · {formatDate(row.last_changed_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Detail pane ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Select an enquiry to view change history
          </div>
        ) : detailLoading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading changes...</div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-base font-semibold text-foreground">
                  {selected.enq_ref_no ?? `Enquiry #${selected.enquiry_id}`}
                </h2>
                <Badge variant={statusVariant(selected.status) as "success" | "danger" | "warning" | "info" | "secondary"}>
                  {selected.status ?? "—"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.shipper || "No shipper"} · {selected.change_count} total changes
              </p>
            </div>

            {/* Edit sessions */}
            <div className="space-y-6">
              {groupBySessions(detail).map((session, si) => {
                const first = session[0]
                return (
                  <div key={si} className="rounded-xl border border-border overflow-hidden">
                    {/* Session header */}
                    <div className="px-4 py-3 bg-muted border-b border-border flex items-center justify-between">
                      <div className="text-xs font-medium text-foreground">
                        Edit session #{groupBySessions(detail).length - si} ·{" "}
                        <span className="font-mono text-primary text-[11px]">
                          {first.changed_by.length > 24
                            ? `${first.changed_by.substring(0, 8)}…${first.changed_by.slice(-6)}`
                            : first.changed_by}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatDate(first.changed_at)}
                      </div>
                    </div>

                    {/* Field diffs */}
                    <div className="divide-y divide-border">
                      {session.map((entry) => (
                        <div key={entry.id}>
                          {/* Field label */}
                          <div className="px-4 py-1.5 bg-muted/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                            {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                          </div>
                          {/* Red / Green diff */}
                          <div className="grid grid-cols-2 divide-x divide-border font-mono text-xs">
                            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40">
                              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                                Before
                              </div>
                              <pre className="whitespace-pre-wrap break-all text-red-700 dark:text-red-400 leading-relaxed">
                                {entry.old_value
                                  ? JSON.stringify(entry.old_value, null, 2)
                                  : <span className="italic text-red-400/70 not-italic font-sans">null</span>
                                }
                              </pre>
                            </div>
                            <div className="px-4 py-3 bg-green-50 dark:bg-green-950/40">
                              <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                After
                              </div>
                              <pre className="whitespace-pre-wrap break-all text-green-700 dark:text-green-400 leading-relaxed">
                                {entry.new_value
                                  ? JSON.stringify(entry.new_value, null, 2)
                                  : <span className="italic text-green-500/70 not-italic font-sans">null</span>
                                }
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
