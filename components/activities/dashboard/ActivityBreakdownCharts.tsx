"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ACTIVITY_TYPE_MAP, ACTIVITY_STATUS_MAP } from "@/lib/constants/activities"

// ─── Status breakdown ─────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  INTERESTED:     "#3b82f6",
  FOLLOW_UP:      "#f59e0b",
  SECURED:        "#22c55e",
  CALLBACK:       "#f97316",
  NOT_INTERESTED: "#ef4444",
  NO_ANSWER:      "#94a3b8",
  INVALID_NUMBER: "#f87171",
  BUSY:           "#fbbf24",
}

interface StatusRow  { status: string; count: number }
interface TypeRow    { activity_type: string; count: number; xp: number }
interface BranchRow  { branch: string; total: number; xp: number; secured: number }

export function StatusBreakdownChart() {
  const [data, setData]   = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activities/dashboard?type=status")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatted = data.map((r) => ({
    name:  ACTIVITY_STATUS_MAP[r.status]?.label ?? r.status,
    value: r.count,
    color: STATUS_COLORS[r.status] ?? "#94a3b8",
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Outcome Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : formatted.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={formatted} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={false}>
                {formatted.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                formatter={(v: number, name: string) => [v, name]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Activity type breakdown ──────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  COLD_CALL:     "#3b82f6",
  WARM_CALL:     "#14b8a6",
  CLIENT_VISIT:  "#7c3aed",
  VISIT_SECURED: "#22c55e",
}

export function TypeBreakdownChart() {
  const [data, setData]   = useState<TypeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activities/dashboard?type=typechart")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatted = data.map((r) => ({
    name:  ACTIVITY_TYPE_MAP[r.activity_type]?.label ?? r.activity_type,
    count: r.count,
    xp:    r.xp,
    color: TYPE_COLORS[r.activity_type] ?? "#94a3b8",
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Activity Type Mix</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : formatted.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={formatted} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={false}>
                {formatted.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                formatter={(v: number, name: string) => [`${v} activities`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Branch performance ───────────────────────────────────────

export function BranchPerformanceChart() {
  const [data, setData]   = useState<BranchRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activities/dashboard?type=branch")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Branch Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} layout="vertical" barSize={10} margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="branch" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid hsl(var(--border))", borderRadius: 6, background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total"   name="Total"   fill="#3b82f6" radius={[0, 3, 3, 0]} />
              <Bar dataKey="secured" name="Secured" fill="#22c55e" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
