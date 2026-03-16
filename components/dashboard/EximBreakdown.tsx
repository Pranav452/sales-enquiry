"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type Filters, getPeriodRange } from "./DashboardFilters"

export function EximBreakdown({ filters }: { filters: Filters }) {
  const [data, setData] = useState<{ month: string; Export: number; Import: number; "Cross Trade": number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getPeriodRange(filters.period)

      const params = new URLSearchParams({ type: "exim", period: filters.period })
      if (filters.mode)     params.set("mode", filters.mode)
      if (filters.branch)   params.set("branch", filters.branch)
      if (filters.enq_type) params.set("enq_type", filters.enq_type)

      const res = await fetch(`/api/dashboard?${params}`)
      if (!res.ok) { setLoading(false); return }
      const rows: { enq_receipt_date: string | null; exim: string | null }[] = await res.json()

      const map: Record<string, { month: string; Export: number; Import: number; "Cross Trade": number }> = {}
      for (const r of rows) {
        if (!r.enq_receipt_date) continue
        const d = new Date(r.enq_receipt_date)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        if (!map[key]) map[key] = { month: key, Export: 0, Import: 0, "Cross Trade": 0 }
        if (r.exim === "Export") map[key].Export++
        else if (r.exim === "Import") map[key].Import++
        else if (r.exim === "Cross Trade") map[key]["Cross Trade"]++
      }

      const result = Object.values(map)
      setData(range ? result : result.slice(-12))
      setLoading(false)
    }
    load()
  }, [filters])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Export / Import / Cross Trade</CardTitle>
        <CardDescription>EXIM split per month</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Export" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Import" fill="hsl(340,75%,55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Cross Trade" fill="hsl(160,60%,45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
