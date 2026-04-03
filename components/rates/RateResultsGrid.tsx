"use client"

import { useEffect, useState } from "react"
import type { FreightRate } from "@/lib/types/rates"
import { RateCard } from "./RateCard"
import { ClausesPanel } from "./ClausesPanel"

interface Props {
  origin: string
  dest: string
}

export function RateResultsGrid({ origin, dest }: Props) {
  const [rates, setRates]     = useState<FreightRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!origin || !dest) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ origin_country: origin, dest_country: dest })
    fetch(`/api/rates?${params}`)
      .then((r) => r.json())
      .then((data: FreightRate[] | { error: string }) => {
        if (!Array.isArray(data)) {
          setError((data as { error: string }).error ?? "Failed to load rates")
          setRates([])
        } else {
          setRates(data)
        }
      })
      .catch(() => setError("Failed to load rates"))
      .finally(() => setLoading(false))
  }, [origin, dest])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-48 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!rates.length) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground text-sm">
          No rates found for <span className="font-medium text-foreground">{origin}</span> → <span className="font-medium text-foreground">{dest}</span>.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Ask your admin to add rate records for this route.
        </p>
      </div>
    )
  }

  // Group by shipping line
  const grouped = new Map<string, FreightRate[]>()
  for (const r of rates) {
    const existing = grouped.get(r.shipping_line) ?? []
    grouped.set(r.shipping_line, [...existing, r])
  }

  // Build clauses panel data: one entry per line, use the first rate that has clauses
  const clauseItems = Array.from(grouped.entries())
    .map(([line, lineRates]) => {
      const withClauses = lineRates.find((r) => r.clauses)
      if (!withClauses?.clauses) return null
      const withPdf = lineRates.find((r) => r.pdf_url)
      return {
        line,
        clauses: withClauses.clauses,
        pdf_url: withPdf?.pdf_url ?? null,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground mb-4">
        {grouped.size} shipping {grouped.size === 1 ? "line" : "lines"} found for{" "}
        <span className="font-medium text-foreground">{origin}</span> →{" "}
        <span className="font-medium text-foreground">{dest}</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from(grouped.entries()).map(([line, lineRates]) => (
          <RateCard key={line} line={line} rates={lineRates} />
        ))}
      </div>

      <ClausesPanel items={clauseItems} />
    </div>
  )
}
