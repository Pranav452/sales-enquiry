"use client"

// Progress card for the Home page, styled like the other home cards.

import { useEffect } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight, TrendingUp } from "lucide-react"
import { useGameStore } from "@/lib/game/store"
import { ARENAS } from "@/lib/game/levels"
import { ArenaDot, fmt } from "@/components/game/ui/primitives"
import { AmberNote, LevelBox, XpProgress } from "./ProgressCard"
import { arenaAt } from "./theme"

function Header() {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-semibold">Your progress</span>
      </div>
      <Link
        href="/activities"
        className="flex items-center gap-0.5 rounded text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Activity Tracker <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

export function VoyageHomeCard() {
  const data = useGameStore((s) => s.data)
  const loading = useGameStore((s) => s.loading)
  const ensure = useGameStore((s) => s.ensure)

  useEffect(() => { void ensure() }, [ensure])

  const me = data?.me ?? null

  if (!me) {
    if (loading || !data) {
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-card" aria-busy="true" aria-label="Loading progress">
          <Header />
          <div className="space-y-3 p-4">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-2 w-full rounded-full bg-muted" />
          </div>
        </div>
      )
    }
    return (
      <Link
        href="/activities"
        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Activity Tracker</p>
          <p className="text-xs text-muted-foreground">Log calls and visits to earn XP and progress through levels.</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" aria-hidden />
      </Link>
    )
  }

  const arena = arenaAt(me.arenaIndex)
  const dailyDone = me.dailyQuests.filter((q) => q.done).length
  const streak = me.streak.current

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Header />
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <LevelBox level={me.level} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{me.title}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                <ArenaDot color={arena.palette.accent} />
                Arena {arena.index + 1} of {ARENAS.length} · {arena.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-semibold leading-tight tabular-nums text-foreground">{fmt(me.totalXp)}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
          <XpProgress me={me} size="sm" />
        </div>

        <div className="grid grid-cols-3 gap-6 md:border-l md:border-border md:pl-8">
          <MiniStat label="Streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
          <MiniStat label="Daily quests" value={`${dailyDone} of ${me.dailyQuests.length}`} />
          <MiniStat label="This week" value={`${fmt(me.weekStats.xp)} XP`} />
        </div>
      </div>

      {(me.streak.atRisk || (me.gateBlocked && me.nextGate)) && (
        <div className="space-y-2 px-4 pb-4">
          {me.streak.atRisk && (
            <AmberNote>Streak at risk: log one activity today to keep your {streak}-day streak.</AmberNote>
          )}
          {me.gateBlocked && me.nextGate && (
            <AmberNote>
              Level held at {me.level} until {arenaAt(me.nextGate.arenaIndex).name} requirements are met · {fmt(me.bankedXp)} XP carried over
            </AmberNote>
          )}
        </div>
      )}
    </div>
  )
}
