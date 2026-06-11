"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface Stats {
  total:             number
  lead_sent:         number
  response_received: number
  follow_up_sent:    number
  meeting_scheduled: number
  quoted:            number
  won:               number
  this_month:        number
  unique_shippers:   number
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

export function LeadStatsCards() {
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sales-leads/dashboard?type=stats")
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

  const responseRate = stats && stats.total > 0
    ? `${Math.round(((stats.response_received + stats.meeting_scheduled + stats.quoted + stats.won) / stats.total) * 100)}% of all leads`
    : undefined

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard label="Total Leads"       value={stats?.total ?? 0} />
      <StatCard label="This Month"        value={stats?.this_month ?? 0} />
      <StatCard label="Responses"         value={stats?.response_received ?? 0} sub={responseRate} />
      <StatCard label="Meetings"          value={stats?.meeting_scheduled ?? 0} />
      <StatCard label="Won"               value={stats?.won ?? 0} />
      <StatCard label="Unique Shippers"   value={stats?.unique_shippers ?? 0} />
    </div>
  )
}
