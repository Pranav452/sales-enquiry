"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RateSearchForm } from "@/components/rates/RateSearchForm"
import { RateResultsGrid } from "@/components/rates/RateResultsGrid"
import { RateChatWidget } from "@/components/rates/RateChatWidget"
import { LiveQuoteForm } from "@/components/rates/LiveQuoteForm"
import { VesselDateGrid } from "@/components/rates/VesselDateGrid"
import type { OneQuoteResult } from "@/lib/carriers/one/types"

export default function RatesPage() {
  const [search, setSearch] = useState<{ origin: string; dest: string; originPort: string; destPort: string } | null>(null)
  const [liveResult, setLiveResult] = useState<OneQuoteResult | null>(null)

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Rate Explorer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find shipping lines and freight rates by origin and destination country.
        </p>
      </div>

      <Tabs defaultValue="country">
        <TabsList>
          <TabsTrigger value="country">Country Rates</TabsTrigger>
          <TabsTrigger value="live">Live Rates (ONE)</TabsTrigger>
        </TabsList>

        {/* ── Existing country-rate search (unchanged) ────────────── */}
        <TabsContent value="country">
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
        </TabsContent>

        {/* ── New live ONE quote ──────────────────────────────────── */}
        <TabsContent value="live">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-foreground">Live Rates — Ocean Network Express</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time vessel availability and spot prices pulled directly from ONE. Spot prices are valid ~20 minutes.
              </p>
            </div>
            <LiveQuoteForm onResult={setLiveResult} />
          </div>

          {liveResult && <VesselDateGrid result={liveResult} />}
        </TabsContent>
      </Tabs>

      {/* Floating Rate Analyst Chat */}
      <RateChatWidget origin={search?.origin} dest={search?.dest} />
    </div>
  )
}
