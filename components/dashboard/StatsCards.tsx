"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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

async function fetchStats(
  supabase: ReturnType<typeof import("@/lib/supabase/client").createClient>,
  filters: Filters,
  from?: string,
  to?: string
): Promise<Stats> {
  let query = supabase.from("enquiries").select("status")

  if (filters.mode) query = query.eq("mode", filters.mode)
  if (filters.branch) query = query.eq("branch", filters.branch)
  if (filters.enq_type) query = query.eq("enq_type", filters.enq_type)
  if (from) query = query.gte("enq_receipt_date", from)
  if (to) query = query.lte("enq_receipt_date", to)

  const { data } = await query
  if (!data) return emptyStats()

  const s = emptyStats()
  s.total = data.length
  for (const row of data) {
    const st = (row.status ?? "").toUpperCase()
    if (st === "WIN") s.win++
    else if (st === "LOSE") s.lose++
    else s.inProgress++
  }
  return s
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
        d.positive ? "text-green-600" : "text-red-500"
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
  const supabase = createClient()
  const [curr, setCurr] = useState<Stats>(emptyStats())
  const [prev, setPrev] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getPeriodRange(filters.period)

      const [currStats, prevStats] = await Promise.all([
        fetchStats(supabase, filters, range?.from, range?.to),
        range
          ? fetchStats(supabase, filters, range.prevFrom, range.prevTo)
          : Promise.resolve(null),
      ])

      setCurr(currStats)
      setPrev(prevStats)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Won",
      value: curr.win,
      prevValue: prev?.win,
      sub: `${pct(curr.win)}% win rate`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Lost",
      value: curr.lose,
      prevValue: prev?.lose,
      sub: `${pct(curr.lose)}% lose rate`,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "In Progress",
      value: curr.inProgress,
      prevValue: prev?.inProgress,
      sub: "Follow up + pending",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50",
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
