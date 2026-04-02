"use client"

import { useState } from "react"
import { RateSearchForm } from "@/components/rates/RateSearchForm"
import { RateResultsGrid } from "@/components/rates/RateResultsGrid"

export default function RatesPage() {
  const [search, setSearch] = useState<{ origin: string; dest: string } | null>(null)

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Rate Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find shipping lines and freight rates by origin and destination country.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <RateSearchForm
          onSearch={(origin, dest) => setSearch({ origin, dest })}
          initialOrigin={search?.origin ?? ""}
          initialDest={search?.dest ?? ""}
        />
      </div>

      {search && (
        <RateResultsGrid origin={search.origin} dest={search.dest} />
      )}
    </div>
  )
}
