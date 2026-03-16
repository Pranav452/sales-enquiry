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

interface Row {
  month: string
  Air: number
  Sea: number
  total: number
}

export function MonthlyChart({ filters }: { filters: Filters }) {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getPeriodRange(filters.period)

      const params = new URLSearchParams({ type: "monthly", period: filters.period })
      if (filters.branch)   params.set("branch", filters.branch)
      if (filters.enq_type) params.set("enq_type", filters.enq_type)
      if (filters.mode)     params.set("mode", filters.mode)

      const res = await fetch(`/api/dashboard?${params}`)
      if (!res.ok) { setLoading(false); return }
      const rows: { enq_receipt_date: string | null; mode: string | null }[] = await res.json()

      const map: Record<string, Row> = {}
      for (const r of rows) {
        if (!r.enq_receipt_date) continue
        const d = new Date(r.enq_receipt_date)
        const key = d.toLocaleString("default", { month: "short", year: "2-digit" })
        if (!map[key]) map[key] = { month: key, Air: 0, Sea: 0, total: 0 }
        map[key].total++
        if (r.mode === "Air") map[key].Air++
        else if (r.mode === "Sea") map[key].Sea++
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
        <CardTitle className="text-sm font-semibold">Monthly Enquiries</CardTitle>
        <CardDescription>Air vs Sea — by month</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Air" fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Sea" fill="hsl(160,60%,45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
