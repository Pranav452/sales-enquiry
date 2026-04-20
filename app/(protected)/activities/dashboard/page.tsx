"use client"

import { ActivityStatsCards } from "@/components/activities/dashboard/ActivityStatsCards"
import { DailyActivityChart } from "@/components/activities/dashboard/DailyActivityChart"
import {
  StatusBreakdownChart,
  TypeBreakdownChart,
  BranchPerformanceChart,
} from "@/components/activities/dashboard/ActivityBreakdownCharts"
import { TeamLeaderboard } from "@/components/activities/TeamLeaderboard"
import { Trophy } from "lucide-react"

export default function ActivityDashboardPage() {
  return (
    <div className="p-4 max-w-screen-xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Team-wide calls, visits, and XP performance
        </p>
      </div>

      {/* ── KPI cards ────────────────────────────────────── */}
      <ActivityStatsCards />

      {/* ── Daily chart ──────────────────────────────────── */}
      <DailyActivityChart />

      {/* ── Breakdown charts (3-col) ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusBreakdownChart />
        <TypeBreakdownChart />
        <BranchPerformanceChart />
      </div>

      {/* ── Full leaderboard ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold">XP Leaderboard — Full Breakdown</span>
        </div>
        <TeamLeaderboard isAdmin={true} />
      </div>
    </div>
  )
}
