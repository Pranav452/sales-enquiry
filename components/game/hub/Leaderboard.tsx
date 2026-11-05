"use client"

// Leaderboard: one table, four rankings (career XP, this week, streak,
// trophies). Admins also see each person's activity breakdown.

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, Lock, Users } from "lucide-react"
import type { BoardEntry } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { ArenaDot, EmptyState, ProgressBar, SectionCard, fmt } from "@/components/game/ui/primitives"
import { arenaAt } from "./theme"

type BoardKey = "career" | "week" | "streak" | "trophies"
type ColKey = "xp" | "week" | "streak" | "trophies"

interface BoardDef {
  key:    BoardKey
  label:  string
  sortBy: string
  col:    ColKey
  value:  (e: BoardEntry) => number
  /** tie-breaker */
  second: (e: BoardEntry) => number
}

const BOARDS: BoardDef[] = [
  { key: "career",   label: "Career",    sortBy: "career XP",     col: "xp",       value: (e) => e.totalXp,  second: (e) => e.level },
  { key: "week",     label: "This week", sortBy: "XP this week",  col: "week",     value: (e) => e.weekXp,   second: (e) => e.questsThisWeek },
  { key: "streak",   label: "Streak",    sortBy: "current streak", col: "streak",  value: (e) => e.streak,   second: (e) => e.bestStreak },
  { key: "trophies", label: "Trophies",  sortBy: "trophies earned", col: "trophies", value: (e) => e.trophies, second: (e) => e.totalXp },
]

const HELD_HINT = "Level held until the next arena's requirements are met"

function Th({
  children, align = "left", sorted, className,
}: {
  children: ReactNode
  align?: "left" | "right"
  sorted?: boolean
  className?: string
}) {
  return (
    <th
      scope="col"
      aria-sort={sorted ? "descending" : undefined}
      className={cn(
        "whitespace-nowrap px-3 py-2 text-xs font-medium",
        align === "right" ? "text-right" : "text-left",
        sorted ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {children}
        {sorted && <ArrowDown className="h-3 w-3" aria-hidden />}
      </span>
    </th>
  )
}

function Segmented({ value, onChange }: { value: BoardKey; onChange: (k: BoardKey) => void }) {
  return (
    <div role="group" aria-label="Rank by" className="inline-flex rounded-lg bg-muted p-1">
      {BOARDS.map((b) => {
        const active = b.key === value
        return (
          <button
            key={b.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(b.key)}
            className={cn(
              "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        )
      })}
    </div>
  )
}

export function Leaderboard({ board, isAdmin }: { board: BoardEntry[]; isAdmin: boolean }) {
  const [key, setKey] = useState<BoardKey>("career")
  const def = BOARDS.find((b) => b.key === key) ?? BOARDS[0]

  const ranked = useMemo(
    () => [...board].sort(
      (a, b) => def.value(b) - def.value(a) || def.second(b) - def.second(a) || a.person.localeCompare(b.person),
    ),
    [board, def],
  )
  const maxXp = Math.max(1, ...board.map((e) => e.totalXp))

  return (
    <SectionCard
      title="Leaderboard"
      icon={Users}
      description={`${board.length} ${board.length === 1 ? "person" : "people"} · ranked by ${def.sortBy}`}
      actions={<Segmented value={key} onChange={setKey} />}
      bodyClassName="p-0"
    >
      {ranked.length === 0 ? (
        <EmptyState title="No activity yet" body="The leaderboard fills in as people log calls and visits." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <Th align="right" className="w-12">#</Th>
                <Th>Name</Th>
                <Th align="right">Level</Th>
                <Th>Title</Th>
                <Th>Arena</Th>
                <Th align="right" sorted={def.col === "xp"}>XP</Th>
                <Th align="right" sorted={def.col === "week"}>This week</Th>
                <Th align="right" sorted={def.col === "streak"}>Streak</Th>
                <Th align="right" sorted={def.col === "trophies"}>Trophies</Th>
                {isAdmin && (
                  <>
                    <Th align="right">Calls</Th>
                    <Th align="right">Visits</Th>
                    <Th align="right">Line visits</Th>
                    <Th align="right">Secured</Th>
                    <Th align="right">Interested</Th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranked.map((e, i) => {
                const arena = arenaAt(e.arenaIndex)
                const d = e.detail
                return (
                  <tr key={e.person} className={cn(e.isMe ? "bg-muted/40" : "hover:bg-muted/30")}>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="max-w-[220px] px-3 py-2.5">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-foreground">{e.person}</span>
                        {e.isMe && <span className="shrink-0 text-xs text-muted-foreground">(you)</span>}
                        {e.gateBlocked && (
                          <span
                            tabIndex={0}
                            title={HELD_HINT}
                            aria-label={HELD_HINT}
                            className="inline-flex shrink-0 rounded text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                      {e.level}
                      {e.prestigeStars > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground" title={`${e.prestigeStars} prestige stars`}>
                          +{e.prestigeStars}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{e.title}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ArenaDot color={arena.palette.accent} />
                        {arena.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <ProgressBar value={e.totalXp / maxXp} className="h-1 w-16" label={`${e.person} XP`} />
                        <span className="w-12 tabular-nums text-foreground">{fmt(e.totalXp)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(e.weekXp)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(e.streak)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">{fmt(e.trophies)}</td>
                    {isAdmin && (
                      <>
                        {[d?.calls, d?.visits, d?.lineVisits, d?.secured, d?.interested].map((n, j) => (
                          <td key={j} className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                            {n == null ? "–" : fmt(n)}
                          </td>
                        ))}
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
