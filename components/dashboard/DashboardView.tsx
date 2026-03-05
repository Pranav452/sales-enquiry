"use client"

import { useState } from "react"
import { StatsCards } from "./StatsCards"
import { MonthlyChart } from "./MonthlyChart"
import { TypeBreakdown } from "./TypeBreakdown"
import { EximBreakdown } from "./EximBreakdown"
import { SalesPersonChart } from "./SalesPersonChart"
import { DashboardFilters, type Filters } from "./DashboardFilters"

const defaultFilters: Filters = {
  mode: "",
  branch: "",
  enq_type: "",
  period: "allTime",
}

export function DashboardView() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-foreground">Analytics Overview</h2>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      {/* KPI cards */}
      <StatsCards filters={filters} />

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyChart filters={filters} />
        <SalesPersonChart filters={filters} />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TypeBreakdown filters={filters} />
        <EximBreakdown filters={filters} />
      </div>
    </div>
  )
}
