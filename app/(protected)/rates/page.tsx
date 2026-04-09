"use client"

import { useState } from "react"
import { RateSearchForm } from "@/components/rates/RateSearchForm"
import { RateResultsGrid } from "@/components/rates/RateResultsGrid"
import { RateChatWidget } from "@/components/rates/RateChatWidget"

export default function RatesPage() {
  const [search, setSearch] = useState<{ origin: string; dest: string; originPort: string; destPort: string } | null>(null)

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
          onSearch={(origin, dest, originPort, destPort) => setSearch({ origin, dest, originPort, destPort })}
          initialOrigin={search?.origin ?? ""}
          initialDest={search?.dest ?? ""}
          initialOriginPort={search?.originPort ?? ""}
          initialDestPort={search?.destPort ?? ""}
        />
      </div>

      {search && (
        <RateResultsGrid
          origin={search.origin}
          dest={search.dest}
          originPort={search.originPort}
          destPort={search.destPort}
        />
      )}

      {/* Floating Rate Analyst Chat */}
      <RateChatWidget origin={search?.origin} dest={search?.dest} />
    </div>
  )
}
