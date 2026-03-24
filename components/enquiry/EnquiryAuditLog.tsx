"use client"

import { useEffect, useState } from "react"

interface AuditEntry {
  id: number
  enquiry_id: number
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: string
  changed_at: string
}

// Map DB column names to readable labels
const FIELD_LABELS: Record<string, string> = {
  ENQRECPTDT:   "Receipt Date",
  MODE:         "Mode",
  ENQTYPE:      "Enquiry Type",
  EXIM:         "Export / Import",
  FN:           "FN",
  SALESPERSON:  "Sales Person",
  AGENT_NAME:   "Agent Name",
  COUNTRY_CODE: "Country",
  BRANCH:       "Branch",
  NETWORK:      "Network",
  POL:          "Port of Loading",
  POD:          "Port of Discharge",
  INCOTERM:     "Incoterms",
  DIMENSION:    "Container Type",
  STATUS:       "Status",
  EMAIL_SUBJECT:"Shipment Awarded To",
  SHIPPER:      "Shipper",
  CONSIGNEE:    "Consignee",
  REMARK:       "Remarks",
  MBL_AWB_NO:   "MBL / AWB No.",
  JOB_INVOICE_NO:"Job / Invoice No.",
  GOP:          "GOP",
  ASSIGNED_USER:"Assigned User",
  ASSIGNED_DATE:"Quotation Date",
  BUY_RATE_FILE:"Buy Rate Notes",
  SELL_RATE_FILE:"Sell Rate Notes",
}

function groupBySession(entries: AuditEntry[]) {
  // Group entries that happened within 5 seconds of each other by the same user as one "edit session"
  const groups: AuditEntry[][] = []
  let currentGroup: AuditEntry[] = []
  let lastTime: Date | null = null
  let lastUser: string | null = null

  for (const entry of entries) {
    const entryTime = new Date(entry.changed_at)
    const isNewSession =
      !lastTime ||
      lastUser !== entry.changed_by ||
      entryTime.getTime() - lastTime.getTime() > 5000

    if (isNewSession) {
      if (currentGroup.length > 0) groups.push(currentGroup)
      currentGroup = [entry]
    } else {
      currentGroup.push(entry)
    }
    lastTime = entryTime
    lastUser = entry.changed_by
  }
  if (currentGroup.length > 0) groups.push(currentGroup)
  return groups
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

interface Props {
  enquiryId: string
}

export function EnquiryAuditLog({ enquiryId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/enquiries/${enquiryId}/audit`)
      .then(async (res) => {
        if (res.status === 403) throw new Error("Admin access required to view audit log")
        if (!res.ok) throw new Error("Failed to load audit log")
        return res.json()
      })
      .then((data) => { setEntries(data); setLoading(false) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error")
        setLoading(false)
      })
  }, [enquiryId])

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Loading audit log...
      </div>
    )
  }

  if (error) return null // Non-admins silently see nothing

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-1">Audit Log</h2>
        <p className="text-xs text-muted-foreground">No changes recorded yet for this enquiry.</p>
      </div>
    )
  }

  const groups = groupBySession(entries)

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Audit Log</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Full change history — who changed what and when</p>
      </div>

      <div className="divide-y divide-border">
        {groups.map((group, gi) => {
          const first = group[0]
          return (
            <div key={gi} className="px-5 py-4">
              {/* Session header */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-foreground">
                  Edit by{" "}
                  <span className="font-mono text-primary">
                    {first.changed_by.length > 20
                      ? `${first.changed_by.substring(0, 8)}...${first.changed_by.slice(-4)}`
                      : first.changed_by}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(first.changed_at)}</div>
              </div>

              {/* Changed fields diff */}
              <div className="space-y-2">
                {group.map((entry) => (
                  <div key={entry.id} className="rounded-md border border-border overflow-hidden text-xs">
                    <div className="px-3 py-1.5 bg-muted text-muted-foreground font-medium border-b border-border">
                      {FIELD_LABELS[entry.field_name] ?? entry.field_name}
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-border">
                      <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 pink:bg-red-50">
                        <div className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Before</div>
                        <div className="text-red-700 dark:text-red-400 break-words whitespace-pre-wrap">
                          {entry.old_value || <span className="italic text-red-400">empty</span>}
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-green-50 dark:bg-green-950/30">
                        <div className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-1">After</div>
                        <div className="text-green-700 dark:text-green-400 break-words whitespace-pre-wrap">
                          {entry.new_value || <span className="italic text-green-500">empty</span>}
                        </div>
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
  )
}
