"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BRANCHES } from "@/lib/constants/dropdowns"

const PERIOD_OPTIONS = [
  { value: "allTime", label: "All Time" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last3Months", label: "Last 3 Months" },
  { value: "last6Months", label: "Last 6 Months" },
  { value: "thisYear", label: "This Year" },
]

export interface Filters {
  mode: string
  branch: string
  enq_type: string
  period: string
}

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

export function DashboardFilters({ filters, onChange }: Props) {
  function set(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value === "all" ? "" : value })
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Period */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Period</span>
        <Select
          value={filters.period || "allTime"}
          onValueChange={(v) => onChange({ ...filters, period: v })}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mode */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Mode</span>
        <Select
          value={filters.mode || "all"}
          onValueChange={(v) => set("mode", v)}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Air">Air</SelectItem>
            <SelectItem value="Sea">Sea</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Branch */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Branch</span>
        <Select
          value={filters.branch || "all"}
          onValueChange={(v) => set("branch", v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Type</span>
        <Select
          value={filters.enq_type || "all"}
          onValueChange={(v) => set("enq_type", v)}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Local">Local</SelectItem>
            <SelectItem value="Overseas">Overseas</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ============================================================
// Utility: compute date ranges from a period string
// ============================================================

export interface DateRange {
  from: string
  to: string
  prevFrom: string
  prevTo: string
}

export function getPeriodRange(period: string): DateRange | null {
  if (!period || period === "allTime") return null

  const now = new Date()

  let from: Date, to: Date, prevFrom: Date, prevTo: Date

  if (period === "thisMonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = now
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    prevTo = new Date(now.getFullYear(), now.getMonth(), 0)
  } else if (period === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    to = new Date(now.getFullYear(), now.getMonth(), 0)
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    prevTo = new Date(now.getFullYear(), now.getMonth() - 1, 0)
  } else if (period === "last3Months") {
    from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    to = now
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    prevTo = new Date(from.getTime() - 86400000)
  } else if (period === "last6Months") {
    from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    to = now
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate())
    prevTo = new Date(from.getTime() - 86400000)
  } else if (period === "thisYear") {
    from = new Date(now.getFullYear(), 0, 1)
    to = now
    prevFrom = new Date(now.getFullYear() - 1, 0, 1)
    prevTo = new Date(now.getFullYear() - 1, 11, 31)
  } else {
    return null
  }

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
    prevFrom: prevFrom.toISOString().split("T")[0],
    prevTo: prevTo.toISOString().split("T")[0],
  }
}
