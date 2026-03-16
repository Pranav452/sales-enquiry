"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"

interface OverdueItem {
  id: string
  enq_ref_no: string | null
  assigned_user: string | null
  assigned_date: string | null
  status: string | null
  branch: string | null
  pol: string | null
  pod: string | null
  sales_person: string | null
  daysPending: number
}

function urgency(days: number) {
  if (days >= 8)
    return {
      row: "bg-red-50/60 dark:bg-red-950/20",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-1 ring-red-400/30",
      label: "Critical",
    }
  if (days >= 4)
    return {
      row: "bg-amber-50/60 dark:bg-amber-950/20",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-400/30",
      label: "Warning",
    }
  return {
    row: "",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 ring-1 ring-yellow-400/30",
    label: "New",
  }
}

export function SlackingReport() {
  const [items, setItems] = useState<OverdueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [threshold, setThreshold] = useState(3)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const params = new URLSearchParams({ type: "slacking", threshold: String(threshold) })
      const res = await fetch(`/api/dashboard?${params}`)
      if (!res.ok) { setLoading(false); return }

      const data: Omit<OverdueItem, "daysPending">[] = await res.json()
      const now = new Date()
      const result: OverdueItem[] = data
        .filter((r) => !["WIN", "LOSE"].includes((r.status ?? "").toUpperCase()))
        .map((r) => ({
          ...r,
          daysPending: r.assigned_date
            ? Math.floor((now.getTime() - new Date(r.assigned_date).getTime()) / 86_400_000)
            : 0,
        }))
        .filter((r) => r.daysPending >= threshold)
        .sort((a, b) => b.daysPending - a.daysPending)

      setItems(result)
      setLoading(false)
    }
    load()
  }, [threshold])

  function exportToExcel() {
    const rows = items.map((item) => ({
      "Days Overdue": item.daysPending,
      "Urgency": item.daysPending >= 8 ? "Critical" : item.daysPending >= 4 ? "Warning" : "New",
      "Enquiry No": item.enq_ref_no ?? "",
      "Assigned To": item.assigned_user ?? "",
      "Sales Person": item.sales_person ?? "",
      "POL": item.pol ?? "",
      "POD": item.pod ?? "",
      "Route": item.pol && item.pod ? `${item.pol} → ${item.pod}` : (item.pol ?? item.pod ?? ""),
      "Status": item.status ?? "",
      "Branch": item.branch ?? "",
      "Assigned Date": item.assigned_date ?? "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Overdue Follow-ups")
    const date = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `Overdue_Followups_${date}.xlsx`)
  }

  const critical = items.filter((i) => i.daysPending >= 8).length
  const warning  = items.filter((i) => i.daysPending >= 4 && i.daysPending < 8).length
  const fresh    = items.length - critical - warning

  const byAssignee = items.reduce<Record<string, number>>((acc, item) => {
    const name = item.assigned_user ?? "Unknown"
    acc[name] = (acc[name] ?? 0) + 1
    return acc
  }, {})

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              Assignment Watch — Overdue Follow-ups
            </CardTitle>
            <CardDescription className="mt-0.5">
              {items.length === 0
                ? "All assignments are on track"
                : <>
                    {items.length} open &nbsp;·&nbsp;
                    <span className="text-red-500 font-medium">{critical} critical</span>
                    &nbsp;·&nbsp;
                    <span className="text-amber-600 font-medium">{warning} warning</span>
                    &nbsp;·&nbsp;{fresh} recent
                  </>
              }
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Show overdue</span>
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="h-7 rounded-md border border-input bg-[hsl(var(--input-bg))] px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={1}>1+ days</option>
                <option value={3}>3+ days</option>
                <option value={7}>7+ days</option>
                <option value={14}>14+ days</option>
              </select>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={exportToExcel}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-input bg-[hsl(var(--input-bg))] text-xs font-medium text-foreground hover:bg-accent transition-colors"
                aria-label="Export overdue follow-ups to Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel
              </button>
            )}
          </div>
        </div>

        {Object.keys(byAssignee).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(byAssignee)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 text-[11px] bg-muted px-2.5 py-0.5 rounded-full"
                >
                  <span className="font-medium text-foreground">{name}</span>
                  <span className="text-muted-foreground bg-background rounded-full px-1">{count}</span>
                </span>
              ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              All clear — no overdue assignments
            </p>
            <p className="text-xs text-muted-foreground">
              All assigned enquiries have been followed up within {threshold} day{threshold !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    "Days", "Enquiry No", "Assigned To", "Sales Person",
                    "Route", "Status", "Branch",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const u = urgency(item.daysPending)
                  return (
                    <tr
                      key={item.id}
                      className={cn("border-b border-border/40 transition-colors", u.row)}
                    >
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-flex items-center justify-center min-w-[38px] rounded px-1.5 py-0.5 text-[11px] font-bold", u.badge)}>
                          {item.daysPending}d
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {item.enq_ref_no ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                        {item.assigned_user ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {item.sales_person ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {item.pol && item.pod
                          ? `${item.pol} → ${item.pod}`
                          : (item.pol ?? item.pod ?? "—")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground whitespace-nowrap">
                          {item.status ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {item.branch ?? "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
