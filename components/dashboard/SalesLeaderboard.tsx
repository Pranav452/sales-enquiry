"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type Filters } from "./DashboardFilters"
import { cn } from "@/lib/utils"

interface PersonStats {
  name: string
  total: number
  won: number
  lost: number
  active: number
  winRate: number
}

export function SalesLeaderboard({ filters }: { filters: Filters }) {
  const [stats, setStats] = useState<PersonStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)

      const params = new URLSearchParams({ type: "leaderboard", period: filters.period })
      if (filters.mode)     params.set("mode", filters.mode)
      if (filters.branch)   params.set("branch", filters.branch)
      if (filters.enq_type) params.set("enq_type", filters.enq_type)

      const res = await fetch(`/api/dashboard?${params}`)
      if (!res.ok) { setLoading(false); return }
      const data: { sales_person: string | null; status: string | null }[] = await res.json()

      const map: Record<string, PersonStats> = {}
      data.forEach(({ sales_person, status }) => {
        const name = sales_person ?? "Unknown"
        if (!map[name]) map[name] = { name, total: 0, won: 0, lost: 0, active: 0, winRate: 0 }
        map[name].total++
        const s = (status ?? "").toUpperCase()
        if (s === "WIN")       map[name].won++
        else if (s === "LOSE") map[name].lost++
        else                   map[name].active++
      })

      const list = Object.values(map)
        .map((s) => ({
          ...s,
          winRate: s.won + s.lost > 0
            ? Math.round((s.won / (s.won + s.lost)) * 100)
            : 0,
        }))
        .sort((a, b) => b.winRate - a.winRate || b.won - a.won || b.total - a.total)

      setStats(list)
      setLoading(false)
    }
    load()
  }, [filters])

  function rankBadge(i: number) {
    if (i === 0) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold ring-1 ring-amber-400/40"
    if (i === 1) return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 font-semibold ring-1 ring-slate-400/30"
    if (i === 2) return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 font-semibold ring-1 ring-orange-400/30"
    return "bg-muted text-muted-foreground"
  }

  function rateColor(rate: number) {
    if (rate >= 60) return "text-green-600 dark:text-green-400"
    if (rate >= 35) return "text-amber-600 dark:text-amber-400"
    return "text-red-500 dark:text-red-400"
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Sales Leaderboard</CardTitle>
        <CardDescription>Ranked by win rate — based on closed enquiries</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground text-center">Loading...</div>
        ) : stats.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">No data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Rank", "Sales Person", "Total", "Won", "Lost", "Active", "Win Rate"].map((h) => (
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
                {stats.map((s, i) => (
                  <tr
                    key={s.name}
                    className={cn(
                      "border-b border-border/40 hover:bg-accent/40 transition-colors",
                      i === 0 && "bg-amber-50/30 dark:bg-amber-950/10",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 text-[11px]", rankBadge(i))}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-medium">{s.total}</td>
                    <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">{s.won}</td>
                    <td className="px-4 py-3 text-red-500 dark:text-red-400">{s.lost}</td>
                    <td className="px-4 py-3 text-amber-600 dark:text-amber-400">{s.active}</td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              s.winRate >= 60 ? "bg-green-500" : s.winRate >= 35 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${s.winRate}%` }}
                          />
                        </div>
                        <span className={cn("font-bold tabular-nums w-9 text-right", rateColor(s.winRate))}>
                          {s.winRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
