"use client"

import { useEffect, useState } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DayRow {
  date:   string
  calls:  number
  visits: number
  xp:     number
}

const PERIODS = [
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
]

export function DailyActivityChart() {
  const [data, setData]     = useState<DayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/activities/dashboard?type=daily&period=${period}`)
      .then((r) => r.json())
      .then((rows: DayRow[]) => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [period])

  const formatted = data.map((r) => ({
    ...r,
    date: new Date(r.date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold">Daily Activity</CardTitle>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  period === p.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : formatted.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={formatted} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="calls"  name="Calls"  fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="visits" name="Visits" fill="#7c3aed" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
