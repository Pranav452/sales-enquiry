"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface Stats {
  total:            number
  total_calls:      number
  total_visits:     number
  total_secured:    number
  total_interested: number
  total_xp:         number
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function ActivityStatsCards() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activities/dashboard?type=stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}><CardContent className="pt-5 pb-4 h-20 animate-pulse bg-muted/40 rounded-lg" /></Card>
      ))}
    </div>
  )

  const winRate = stats && stats.total > 0
    ? `${Math.round((stats.total_secured / stats.total) * 100)}% conversion`
    : undefined

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Total Activities"  value={stats?.total ?? 0} />
      <StatCard label="Calls Made"        value={stats?.total_calls ?? 0} sub="cold + warm" />
      <StatCard label="Client Visits"     value={stats?.total_visits ?? 0} />
      <StatCard label="Secured"           value={stats?.total_secured ?? 0} sub={winRate} />
      <StatCard label="Interested"        value={stats?.total_interested ?? 0} />
      <StatCard label="Total XP Earned"   value={stats?.total_xp ?? 0} sub="across all reps" />
    </div>
  )
}
