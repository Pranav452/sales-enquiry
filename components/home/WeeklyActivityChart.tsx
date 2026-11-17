"use client"

// Split out of app/(protected)/home/page.tsx so recharts loads lazily
// (next/dynamic) instead of in the home page's initial bundle.

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"

export interface WeeklyActivityPoint {
  date: string
  calls: number
  visits: number
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const date = label
    ? new Date(label + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : label
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{date}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function WeeklyActivityChart({ data }: { data: WeeklyActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={14} barGap={3}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="calls"  name="Calls"  fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="visits" name="Visits" fill="hsl(160,60%,45%)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
