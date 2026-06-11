"use client"

import { LeadStatsCards } from "@/components/sales-leads/dashboard/LeadStatsCards"
import {
  MonthlyLeadsChart,
  LeadStatusChart,
  TopCountriesChart,
  PersonBreakdown,
} from "@/components/sales-leads/dashboard/LeadCharts"

export default function SalesLeadsDashboardPage() {
  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sales Lead Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Team-wide lead volume, responses, and conversion
        </p>
      </div>

      {/* ── KPI cards ────────────────────────────────────── */}
      <LeadStatsCards />

      {/* ── Monthly volume ───────────────────────────────── */}
      <MonthlyLeadsChart />

      {/* ── Breakdown charts ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LeadStatusChart />
        <TopCountriesChart />
      </div>

      {/* ── Per-person table ─────────────────────────────── */}
      <PersonBreakdown />
    </div>
  )
}
