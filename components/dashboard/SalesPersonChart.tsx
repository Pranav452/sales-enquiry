"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type Filters, getPeriodRange } from "./DashboardFilters"

export function SalesPersonChart({ filters }: { filters: Filters }) {
  const supabase = createClient()
  const [data, setData] = useState<{ name: string; total: number; win: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getPeriodRange(filters.period)

      let query = supabase
        .from("enquiries")
        .select("sales_person, status")

      if (filters.mode) query = query.eq("mode", filters.mode)
      if (filters.branch) query = query.eq("branch", filters.branch)
      if (filters.enq_type) query = query.eq("enq_type", filters.enq_type)
      if (range) {
        query = query.gte("enq_receipt_date", range.from).lte("enq_receipt_date", range.to)
      }

      const { data: rows } = await query
      if (!rows) { setLoading(false); return }

      const map: Record<string, { name: string; total: number; win: number }> = {}
      for (const r of rows) {
        const key = r.sales_person || "Unknown"
        if (!map[key]) map[key] = { name: key, total: 0, win: 0 }
        map[key].total++
        if ((r.status ?? "").toUpperCase() === "WIN") map[key].win++
      }

      const sorted = Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10)
      setData(sorted)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Enquiries by Sales Person</CardTitle>
        <CardDescription>Top 10 — total vs won</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={120}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="total" fill="hsl(217,91%,85%)" radius={[0, 3, 3, 0]} name="Total" />
              <Bar dataKey="win" fill="hsl(160,60%,45%)" radius={[0, 3, 3, 0]} name="Won" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
