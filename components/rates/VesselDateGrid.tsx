"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import type { OneQuoteResult, OneSailing } from "@/lib/carriers/one/types"

interface Props {
  result: OneQuoteResult
}

// Round a price like 6288.55 → "6.3K" to echo ONE's Vessel Available Date tiles.
function roundK(price: number): string {
  if (!price) return "—"
  if (price >= 1000) return `${(price / 1000).toFixed(1)}K`
  return String(Math.round(price))
}

function isSoldOut(s: OneSailing): boolean {
  return /sold\s*out/i.test(s.status)
}

// "2026-08-05" → { month:"Aug 2026", day:"05", weekday:"Wed" }
function parseDate(d: string) {
  const dt = new Date(d + "T00:00:00")
  return {
    month: dt.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    day: dt.toLocaleDateString("en-US", { day: "2-digit" }),
    weekday: dt.toLocaleDateString("en-US", { weekday: "short" }),
  }
}

function fmtMoney(n: number, currency = "USD") {
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export function VesselDateGrid({ result }: Props) {
  const [selected, setSelected] = useState<OneSailing | null>(result.sailings[0] ?? null)

  if (!result.sailings.length) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No sailings returned for {result.origin} → {result.destination}.
        </p>
      </div>
    )
  }

  // Group tiles by month for the "Vessel Available Date" layout.
  const byMonth = new Map<string, OneSailing[]>()
  for (const s of result.sailings) {
    const { month } = parseDate(s.date)
    byMonth.set(month, [...(byMonth.get(month) ?? []), s])
  }

  // Staleness note — spot prices are valid ~20 min.
  const validTo = selected?.validTo ?? result.sailings.find((s) => s.validTo)?.validTo ?? null
  const fetchedAt = new Date(result.fetchedAt)

  return (
    <div className="mt-6 space-y-6">
      {/* Validity / staleness banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Prices as of{" "}
          <span className="font-medium text-foreground">
            {fetchedAt.toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
          </span>
        </span>
        {validTo && (
          <span>
            Valid until{" "}
            <span className="font-medium text-foreground">
              {new Date(validTo).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>{" "}
            (spot rates ~20 min)
          </span>
        )}
      </div>

      {/* Vessel Available Date tile grid, grouped by month */}
      <div className="space-y-5">
        {Array.from(byMonth.entries()).map(([month, sailings]) => (
          <div key={month}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{month}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {sailings.map((s) => {
                const soldOut = isSoldOut(s)
                const active = selected?.date === s.date && selected?.serviceCode === s.serviceCode
                const { day, weekday } = parseDate(s.date)
                return (
                  <button
                    key={`${s.date}-${s.serviceCode}`}
                    type="button"
                    disabled={soldOut}
                    onClick={() => setSelected(s)}
                    className={[
                      "flex flex-col items-center rounded-lg border p-2 text-center transition-colors",
                      soldOut
                        ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground/60"
                        : active
                          ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 dark:bg-blue-950/30"
                          : "border-border bg-card hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                    ].join(" ")}
                  >
                    <span className="text-[10px] uppercase text-muted-foreground">{weekday}</span>
                    <span className="text-lg font-semibold leading-none">{day}</span>
                    <span className="mt-1 text-xs font-medium">
                      {soldOut ? "Sold out" : roundK(s.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail table for the selected sailing */}
      {selected && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {parseDate(selected.date).weekday}, {selected.date}
                {selected.arrival && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    → arrives {selected.arrival}
                  </span>
                )}
              </h3>
            </div>
            <Badge variant={isSoldOut(selected) ? "danger" : "success"}>
              {isSoldOut(selected) ? "Sold out" : "Available"}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">SVC</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 pr-4 font-medium">Total Price</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-4">
                    <span className="font-medium text-foreground">{selected.serviceCode || "—"}</span>
                    {selected.serviceName && (
                      <span className="block text-xs text-muted-foreground">{selected.serviceName}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {selected.transitDays != null ? `${selected.transitDays} days` : "—"}
                  </td>
                  <td className="py-2 pr-4 font-semibold text-foreground">
                    {fmtMoney(selected.price, selected.currency)}
                  </td>
                  <td className="py-2">
                    <span className={isSoldOut(selected) ? "text-destructive" : "text-green-700 dark:text-green-400"}>
                      {isSoldOut(selected) ? "Sold out" : "Available"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Vessel / voyage + cutoffs */}
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            {selected.vessel && (
              <span>Vessel: <span className="text-foreground">{selected.vessel}</span></span>
            )}
            {selected.voyage && (
              <span>Voyage: <span className="text-foreground">{selected.voyage}</span></span>
            )}
            {selected.routeType && (
              <span>Route: <span className="text-foreground">{selected.routeType}</span></span>
            )}
            {selected.cutoffs.vgm && (
              <span>VGM cutoff: <span className="text-foreground">{selected.cutoffs.vgm}</span></span>
            )}
          </div>

          {/* Charge breakdown */}
          {(selected.charges.ocean.length > 0 ||
            selected.charges.surcharges.length > 0 ||
            selected.charges.origin.length > 0 ||
            selected.charges.dest.length > 0) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
                Charge breakdown
              </summary>
              <div className="mt-2 space-y-3 text-xs">
                <ChargeBlock title="Ocean freight" charges={selected.charges.ocean} />
                <ChargeBlock title="Surcharges" charges={selected.charges.surcharges} />
                <ChargeBlock title="Origin charges" charges={selected.charges.origin} />
                <ChargeBlock title="Destination charges" charges={selected.charges.dest} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function ChargeBlock({ title, charges }: { title: string; charges: import("@/lib/carriers/one/types").OneCharge[] }) {
  if (!charges.length) return null
  return (
    <div>
      <p className="mb-1 font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">
        {charges.map((c, i) => (
          <div key={`${c.chargeCode}-${i}`} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{c.chargeName || c.chargeCode}</span>
            <span className="text-foreground">USD {c.amountUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
