"use client"

import { useEffect, useState } from "react"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LEAD_STATUS_MAP } from "@/lib/constants/sales-leads"

const tooltipStyle = {
  fontSize: 12,
  border: "1px solid hsl(var(--border))",
  borderRadius: 6,
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
}

// ─── Monthly volume ───────────────────────────────────────────

interface MonthRow { month: string; total: number }

export function MonthlyLeadsChart() {
  const [data, setData]       = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sales-leads/dashboard?type=monthly")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatted = data.map((r) => ({
    name: new Date(r.month + "-01T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
    total: r.total,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Leads Sent per Month</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : formatted.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={formatted} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Status breakdown ─────────────────────────────────────────

interface StatusRow { status: string; count: number }

export function LeadStatusChart() {
  const [data, setData]       = useState<StatusRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sales-leads/dashboard?type=status")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatted = data.map((r) => ({
    name:  r.status === "NONE" ? "No Status" : (LEAD_STATUS_MAP[r.status]?.label ?? r.status),
    value: r.count,
    color: r.status === "NONE" ? "#cbd5e1" : (LEAD_STATUS_MAP[r.status]?.chart ?? "#94a3b8"),
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
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
                {formatted.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined, name: string | undefined) => [v ?? 0, name ?? ""]} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Top destination countries ────────────────────────────────

interface CountryRow { country: string; total: number }

export function TopCountriesChart() {
  const [data, setData]       = useState<CountryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sales-leads/dashboard?type=country")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top Destination Countries</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(210, data.length * 24)}>
            <BarChart data={data} layout="vertical" barSize={10} margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" name="Leads" fill="#6366f1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Per-person table ─────────────────────────────────────────

interface PersonRow {
  sent_by:        string
  total:          number
  responses:      number
  meetings:       number
  quoted:         number
  won:            number
  last_lead_date: string | null
}

export function PersonBreakdown() {
  const [data, setData]       = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sales-leads/dashboard?type=person")
      .then((r) => r.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Leads by Sales Person</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : data.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Sales Person</th>
                  <th className="px-3 py-2 font-medium text-right">Leads</th>
                  <th className="px-3 py-2 font-medium text-right">Responses</th>
                  <th className="px-3 py-2 font-medium text-right">Meetings</th>
                  <th className="px-3 py-2 font-medium text-right">Quoted</th>
                  <th className="px-3 py-2 font-medium text-right">Won</th>
                  <th className="px-4 py-2 font-medium text-right">Last Lead</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.sent_by} className="border-b border-border/50 last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-2 font-medium text-foreground">{p.sent_by}</td>
                    <td className="px-3 py-2 text-right font-semibold">{p.total}</td>
                    <td className="px-3 py-2 text-right">{p.responses}</td>
                    <td className="px-3 py-2 text-right">{p.meetings}</td>
                    <td className="px-3 py-2 text-right">{p.quoted}</td>
                    <td className="px-3 py-2 text-right text-green-600 dark:text-green-400 font-semibold">{p.won}</td>
                    <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                      {p.last_lead_date
                        ? new Date(p.last_lead_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
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
