"use client"

// Side panel of the Hexagone tab: what has been built (counts) and the
// next builds with how close each one is.

import type { ReactNode } from "react"
import { Castle, Factory, House, Ship, TreePine, Warehouse, type LucideIcon } from "lucide-react"
import { HEX_RULES, type HexBuild, type HexCount, type HexCountKey } from "@/lib/game/hexagone"
import { cn } from "@/lib/utils"
import { ProgressBar, StatusPill, fmt } from "@/components/game/ui/primitives"
import { CATEGORY_ICON } from "./icons"

const COUNT_ICON: Record<HexCountKey, LucideIcon> = {
  houses: House, trees: TreePine, factories: Factory, residences: Warehouse, ships: Ship, landmarks: Castle,
}

export function PanelHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>
}

export function HexagoneCounts({ counts }: { counts: HexCount[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
      {counts.map((c) => {
        const Icon = COUNT_ICON[c.key]
        const full = c.built >= c.cap
        return (
          <li key={c.key} className="rounded-lg border border-border bg-background px-2.5 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{c.label}</span>
            </div>
            <p className="mt-1 text-base font-semibold leading-tight tabular-nums text-foreground">
              {c.built}<span className="text-xs font-normal text-muted-foreground"> / {c.cap}</span>
            </p>
            <ProgressBar
              value={c.cap ? c.built / c.cap : 0}
              tone={full ? "success" : "primary"}
              label={`${c.label} built`}
              className="mt-1.5"
            />
          </li>
        )
      })}
    </ul>
  )
}

export function ConstructionYard({ yard }: { yard: HexBuild[] }) {
  if (yard.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
        <p className="text-xs text-muted-foreground">Every building is complete.</p>
        <StatusPill status="done">Complete</StatusPill>
      </div>
    )
  }
  return (
    <ol className="divide-y divide-border rounded-lg border border-border bg-background">
      {yard.map((b) => {
        const Icon = CATEGORY_ICON[b.category]
        return (
          <li key={b.id} className="px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{b.name}</p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmt(b.current)} / {fmt(b.target)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{b.requirement}</p>
                <ProgressBar value={b.progress} label={`${b.name} progress`} className="mt-1.5" />
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function HexagoneRules({ className }: { className?: string }) {
  const rows: { icon: LucideIcon; text: string }[] = [
    { icon: House,     text: `A house for every ${HEX_RULES.activitiesPerHouse} activities logged (up to ${HEX_RULES.houseCap}, one per city)` },
    { icon: TreePine,  text: `A tree for every ${HEX_RULES.activeDaysPerTree} active days (up to ${HEX_RULES.treeCap})` },
    { icon: Factory,   text: `Port works and a container ship for every secured deal (up to ${HEX_RULES.factoryCap} and ${HEX_RULES.shipCap})` },
    { icon: Warehouse, text: `A residence block for every ${HEX_RULES.visitsPerResidence} field visits (up to ${HEX_RULES.residenceCap})` },
    { icon: Castle,    text: "Nine landmarks for streaks, quests, arenas, calls and visits (one is hidden)" },
  ]
  return (
    <ul className={cn("space-y-1.5", className)}>
      {rows.map((r) => (
        <li key={r.text} className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
          <r.icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {r.text}
        </li>
      ))}
    </ul>
  )
}

export function YardHeading() {
  return <PanelHeading>Next to build</PanelHeading>
}
