"use client"

import { useEffect, useState } from "react"
import { getRank } from "@/lib/constants/activities"
import { cn } from "@/lib/utils"

interface LeaderboardRow {
  sales_person:     string
  total_xp:         number
  total_activities: number
  // Null = blinded (non-admin viewing others)
  cold_calls:    number | null
  warm_calls:    number | null
  visits:        number | null
  secured:       number | null
  interested:    number | null
  status_secured:number | null
}

interface Props {
  isAdmin:      boolean
  mySalesPerson?: string   // to highlight own row
  refresh?: number
}

function RankBadge({ xp }: { xp: number }) {
  const r = getRank(xp)
  return (
    <span className={cn(
      "inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-black border-2",
      r.bg, r.text, r.color
    )}>
      {r.rank.slice(0, 2).toUpperCase()}
    </span>
  )
}

function PositionBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-sm font-black text-yellow-500">1st</span>
  if (pos === 2) return <span className="text-sm font-black text-slate-400">2nd</span>
  if (pos === 3) return <span className="text-sm font-black text-amber-600">3rd</span>
  return <span className="text-sm font-semibold text-muted-foreground">#{pos}</span>
}

export function TeamLeaderboard({ isAdmin, mySalesPerson, refresh = 0 }: Props) {
  const [rows, setRows]       = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch("/api/activities/dashboard?type=leaderboard")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [refresh])

  if (loading) return <div className="py-6 text-sm text-center text-muted-foreground">Loading leaderboard...</div>
  if (!rows.length) return <div className="py-6 text-sm text-center text-muted-foreground">No activity data yet.</div>

  const maxXp = Math.max(...rows.map((r) => r.total_xp), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-12">Rank</th>
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Name</th>
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Grade</th>
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground w-48">XP</th>
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Activities</th>
            {isAdmin && (
              <>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Cold</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Warm</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Visits</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Secured</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Interested</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const rank       = getRank(row.total_xp)
            const isMe       = row.sales_person === mySalesPerson
            const isBlinded  = !isAdmin && !isMe
            const barPct     = Math.round((row.total_xp / maxXp) * 100)

            return (
              <tr
                key={row.sales_person}
                className={cn(
                  "border-b border-border/50 transition-colors",
                  isMe
                    ? "bg-primary/8 dark:bg-primary/15"
                    : "hover:bg-accent"
                )}
              >
                {/* Position */}
                <td className="px-3 py-3">
                  <PositionBadge pos={idx + 1} />
                </td>

                {/* Name */}
                <td className="px-3 py-3 font-medium whitespace-nowrap">
                  {row.sales_person}
                  {isMe && (
                    <span className="ml-1.5 text-[10px] text-primary font-semibold">(you)</span>
                  )}
                </td>

                {/* Grade badge */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <RankBadge xp={row.total_xp} />
                    <span className={cn("font-semibold text-[11px]", rank.text)}>{rank.rank}</span>
                  </div>
                </td>

                {/* XP + progress bar */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground w-10 text-right shrink-0">{row.total_xp}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                      <div
                        className={cn("h-full rounded-full", rank.barColor)}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Total activities */}
                <td className="px-3 py-3 text-right text-muted-foreground">{row.total_activities}</td>

                {/* Admin-only breakdown OR own row */}
                {isAdmin && (
                  <>
                    <td className="px-3 py-3 text-right">{row.cold_calls ?? "—"}</td>
                    <td className="px-3 py-3 text-right">{row.warm_calls ?? "—"}</td>
                    <td className="px-3 py-3 text-right">{row.visits ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {row.secured ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-blue-600 dark:text-blue-400">
                      {row.interested ?? "—"}
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {!isAdmin && (
        <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border">
          Detailed breakdown visible to admins only.
        </p>
      )}
    </div>
  )
}
