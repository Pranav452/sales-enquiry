"use client"

import { useEffect, useState } from "react"
import { getRank, getNextRank, getRankProgress, RANKS, type RankDef } from "@/lib/constants/activities"
import { cn } from "@/lib/utils"

const LS_KEY = "activities_last_rank"

interface PersonalStats {
  total_xp:          number
  total_activities:  number
  total_calls:       number
  total_visits:      number
  total_secured:     number
  total_interested:  number
  week_xp:           number
  week_calls:        number
  week_visits:       number
  month_xp:          number
  month_calls:       number
  month_visits:      number
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-background border border-border">
      <span className="text-base font-bold text-foreground leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
      {sub && <span className="text-[10px] text-primary font-medium leading-tight">{sub}</span>}
    </div>
  )
}

export function MyScorecard({ onLevelUp }: { onLevelUp?: (newRank: RankDef) => void }) {
  const [stats, setStats]     = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/activities/dashboard?type=personal")
      .then((r) => r.json())
      .then((d: PersonalStats | null) => {
        setStats(d ?? null)
        if (!d) return
        const currentRank = getRank(d.total_xp ?? 0)
        const prevRankName = localStorage.getItem(LS_KEY)
        if (prevRankName && prevRankName !== currentRank.rank) {
          const prevIdx = RANKS.findIndex((r) => r.rank === prevRankName)
          const currIdx = RANKS.findIndex((r) => r.rank === currentRank.rank)
          if (currIdx > prevIdx) onLevelUp?.(currentRank)
        }
        localStorage.setItem(LS_KEY, currentRank.rank)
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">Loading scorecard...</div>
  if (!stats)  return null

  const xp       = stats.total_xp ?? 0
  const rank     = getRank(xp)
  const nextRank = getNextRank(xp)
  const progress = getRankProgress(xp)

  return (
    <div className={cn("rounded-xl border-2 p-5 space-y-4", rank.color, rank.bg)}>

      {/* ── Rank header ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Your Rank</p>
          <h2 className={cn("text-2xl font-bold leading-tight", rank.text)}>{rank.rank}</h2>
          <p className={cn("text-sm font-semibold", rank.text)}>{xp} XP</p>
        </div>

        {/* Rank badge — large */}
        <div className={cn(
          "h-16 w-16 rounded-full border-4 flex items-center justify-center flex-shrink-0 font-black text-lg",
          rank.color, rank.text
        )}>
          {rank.rank.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn("font-medium", rank.text)}>{rank.rank}</span>
          {nextRank
            ? <span className="text-muted-foreground">{nextRank.rank} at {nextRank.minXp} XP</span>
            : <span className="text-muted-foreground font-medium">Max rank reached</span>
          }
        </div>
        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", rank.barColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextRank && (
          <p className="text-[11px] text-muted-foreground">
            {nextRank.minXp - xp} XP to unlock <strong>{nextRank.rank}</strong>
          </p>
        )}
      </div>

      {/* ── Stat pills ───────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">This Week</p>
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="XP Earned"  value={`+${stats.week_xp ?? 0}`} />
          <StatPill label="Calls"      value={stats.week_calls ?? 0} />
          <StatPill label="Visits"     value={stats.week_visits ?? 0} />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">This Month</p>
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="XP Earned"  value={`+${stats.month_xp ?? 0}`} />
          <StatPill label="Calls"      value={stats.month_calls ?? 0} />
          <StatPill label="Visits"     value={stats.month_visits ?? 0} />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">All Time</p>
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Total XP"       value={xp} />
          <StatPill label="Activities"     value={stats.total_activities ?? 0} />
          <StatPill label="Secured"        value={stats.total_secured ?? 0} />
          <StatPill label="Interested"     value={stats.total_interested ?? 0} />
        </div>
      </div>

      {/* ── Rank ladder ──────────────────────────────────── */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Rank Ladder</p>
        <div className="flex gap-1 flex-wrap">
          {RANKS.map((r) => (
            <span
              key={r.rank}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                r.rank === rank.rank
                  ? `${r.bg} ${r.text} ${r.color} ring-1 ring-current scale-105`
                  : xp >= r.minXp
                    ? `${r.bg} ${r.text} opacity-70`
                    : "bg-background text-muted-foreground border-border opacity-40"
              )}
            >
              {r.rank}
              {r.rank === rank.rank && " ◀"}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
