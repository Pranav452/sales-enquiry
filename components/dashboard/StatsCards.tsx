"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Clock, FileText } from "lucide-react"
import { type Filters, getPeriodRange } from "./DashboardFilters"

interface Stats {
  total: number
  win: number
  lose: number
  inProgress: number
}

function emptyStats(): Stats {
  return { total: 0, win: 0, lose: 0, inProgress: 0 }
}

function rowsToStats(rows: { status: string | null }[]): Stats {
  const s = emptyStats()
  s.total = rows.length
  for (const row of rows) {
    const st = (row.status ?? "").toUpperCase()
    if (st === "WIN") s.win++
    else if (st === "LOSE") s.lose++
    else s.inProgress++
  }
  return s
}

async function fetchStats(filters: Filters, from?: string, to?: string): Promise<Stats> {
  const params = new URLSearchParams({ type: "stats" })
  if (filters.mode)     params.set("mode", filters.mode)
  if (filters.branch)   params.set("branch", filters.branch)
  if (filters.enq_type) params.set("enq_type", filters.enq_type)
  if (from) params.set("from_date", from)
  if (to)   params.set("to_date", to)
  // Pass period so server can compute range itself too
  if (filters.period)   params.set("period", filters.period)

  const res = await fetch(`/api/dashboard?${params}`)
  if (!res.ok) return emptyStats()
  const rows: { status: string | null }[] = await res.json()
  return rowsToStats(rows)
}

function delta(curr: number, prev: number): { value: number; positive: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((curr - prev) / prev) * 100)
  return { value: Math.abs(pct), positive: pct >= 0 }
}

interface DeltaBadgeProps {
  curr: number
  prev: number
}

function DeltaBadge({ curr, prev }: DeltaBadgeProps) {
  const d = delta(curr, prev)
  if (d === null) return null
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        d.positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
      }`}
    >
      {d.positive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {d.value}%
    </span>
  )
}

export function StatsCards({ filters }: { filters: Filters }) {
  const [curr, setCurr] = useState<Stats>(emptyStats())
  const [prev, setPrev] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getPeriodRange(filters.period)

      const [currStats, prevStats] = await Promise.all([
        fetchStats(filters, range?.from, range?.to),
        range
          ? fetchStats(filters, range.prevFrom, range.prevTo)
          : Promise.resolve(null),
      ])

      setCurr(currStats)
      setPrev(prevStats)
      setLoading(false)
    }
    load()
  }, [filters])

  const pct = (n: number) =>
    curr.total > 0 ? Math.round((n / curr.total) * 100) : 0

  const cards = [
    {
      label: "Total Enquiries",
      value: curr.total,
      prevValue: prev?.total,
      sub: filters.period === "allTime" ? "All time" : "Selected period",
      icon: FileText,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/20",
    },
    {
      label: "Won",
      value: curr.win,
      prevValue: prev?.win,
      sub: `${pct(curr.win)}% win rate`,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-500/20",
    },
    {
      label: "Lost",
      value: curr.lose,
      prevValue: prev?.lose,
      sub: `${pct(curr.lose)}% lose rate`,
      icon: TrendingDown,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/20",
    },
    {
      label: "In Progress",
      value: curr.inProgress,
      prevValue: prev?.inProgress,
      sub: "Follow up + pending",
      icon: Clock,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/20",
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card key={c.label} className="border border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    {c.label}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {loading ? "—" : c.value}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                    {!loading && prev !== null && c.prevValue !== undefined && (
                      <DeltaBadge curr={c.value} prev={c.prevValue} />
                    )}
                  </div>
                  {!loading && prev !== null && c.prevValue !== undefined && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      prev: {c.prevValue}
                    </p>
                  )}
                </div>
                <div className={`${c.bg} p-2 rounded-lg ml-2`}>
                  <Icon className={`h-5 w-5 ${c.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
