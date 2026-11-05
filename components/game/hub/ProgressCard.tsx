"use client"

// "Your progress" card at the top of the Activity Tracker:
// level, rank, arena, XP to the next level, four KPI tiles and the
// requirements for the next arena.

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import {
  AlertTriangle, CalendarDays, ChevronDown, Flame, Lock, Sparkles, Sun, TrendingUp,
} from "lucide-react"
import type { GameProfile } from "@/lib/game/types"
import { ARENAS, PRESTIGE_STEP, xpForLevel } from "@/lib/game/levels"
import { cn } from "@/lib/utils"
import {
  ArenaDot, MeterRow, ProgressBar, SectionCard, StatTile, fmt,
} from "@/components/game/ui/primitives"
import { arenaAt } from "./theme"

// ─── Small local helpers ──────────────────────────────────────

function plural(n: number, one: string, many = `${one}s`): string {
  return `${fmt(n)} ${n === 1 ? one : many}`
}

/** One-line amber note (streak at risk, level held). */
export function AmberNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-foreground",
        className,
      )}
    >
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/** Level number in a small muted square. */
export function LevelBox({ level, className }: { level: number; className?: string }) {
  return (
    <div
      className={cn("flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted", className)}
      aria-label={`Level ${level}`}
    >
      <span className="text-[10px] leading-none text-muted-foreground">Level</span>
      <span className="mt-0.5 text-lg font-semibold leading-none tabular-nums text-foreground">{level}</span>
    </div>
  )
}

/** XP progress toward the next level (or the next prestige star at max level). */
export function XpProgress({ me, size = "md" }: { me: GameProfile; size?: "sm" | "md" }) {
  if (me.nextLevelXp == null) {
    const base = xpForLevel(me.maxLevel)
    const intoStar = Math.max(0, me.totalXp - base - me.prestigeStars * PRESTIGE_STEP)
    return (
      <div className="space-y-1.5">
        <ProgressBar value={intoStar / PRESTIGE_STEP} size={size} label="Progress to next prestige star" />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">{fmt(intoStar)} / {fmt(PRESTIGE_STEP)} XP</span>
          <span className="tabular-nums">{fmt(PRESTIGE_STEP - intoStar)} XP to next prestige star</span>
        </div>
      </div>
    )
  }

  const span = me.nextLevelXp - me.levelFloorXp
  const into = Math.max(0, Math.min(span, me.totalXp - me.levelFloorXp))
  return (
    <div className="space-y-1.5">
      <ProgressBar
        value={me.gateBlocked ? 1 : me.progress}
        size={size}
        tone={me.gateBlocked ? "muted" : "primary"}
        label={`Progress to level ${me.level + 1}`}
      />
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{fmt(into)} / {fmt(span)} XP</span>
        {me.gateBlocked ? (
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" aria-hidden /> Level {me.level + 1} needs arena requirements
          </span>
        ) : (
          <span className="tabular-nums">{fmt(me.nextLevelXp - me.totalXp)} XP to level {me.level + 1}</span>
        )}
      </div>
    </div>
  )
}

// ─── Bonus XP tile with breakdown popover ─────────────────────

function BonusTile({ me }: { me: GameProfile }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const b = me.bonusBreakdown
  const rows = [
    { label: "Daily quests",  value: b.dailies },
    { label: "Weekly quests", value: b.weeklies },
    { label: "Clean sweeps",  value: b.sweeps },
    { label: "Streak bonus",  value: b.streak },
    { label: "Trophies",      value: b.trophies },
  ]

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="group relative">
      <StatTile
        label="Bonus XP"
        icon={Sparkles}
        value={fmt(me.bonusXp)}
        sub={
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Breakdown
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        }
      />
      <div
        id={panelId}
        className={cn(
          "absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md",
          open ? "block" : "hidden group-hover:block",
        )}
      >
        <p className="mb-2 text-xs font-medium text-foreground">XP breakdown</p>
        <dl className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-1">
            <dt className="text-muted-foreground">Activity XP</dt>
            <dd className="tabular-nums text-foreground">{fmt(me.activityXp)}</dd>
          </div>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="tabular-nums text-foreground">+{fmt(r.value)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-1 font-medium">
            <dt className="text-foreground">Total XP</dt>
            <dd className="tabular-nums text-foreground">{fmt(me.totalXp)}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// ─── Next arena requirements ──────────────────────────────────

function NextArena({ me }: { me: GameProfile }) {
  const gate = me.nextGate

  if (!gate) {
    return (
      <p className="text-xs text-muted-foreground">
        Final arena reached. There are no further arena requirements.
      </p>
    )
  }

  const target = arenaAt(gate.arenaIndex)
  const met = gate.requirements.filter((r) => r.done).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ArenaDot color={target.palette.accent} />
          Requirements for {target.name} (level {target.minLevel})
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {met} of {gate.requirements.length} met
        </span>
      </div>
      <div className="space-y-3">
        {gate.requirements.map((r) => (
          <MeterRow key={r.stat} label={r.label} current={r.current} target={r.target} />
        ))}
      </div>
      {me.gateBlocked && (
        <AmberNote>
          Level held at {me.level} until requirements are met · {fmt(me.bankedXp)} XP carried over
        </AmberNote>
      )}
    </div>
  )
}

// ─── Lifetime totals ──────────────────────────────────────────

function Lifetime({ me }: { me: GameProfile }) {
  const l = me.lifetime
  const items = [
    { label: "Activities",    value: l.activities },
    { label: "Calls",         value: l.calls },
    { label: "Field visits",  value: l.fieldVisits },
    { label: "Interested",    value: l.interested },
    { label: "Deals secured", value: l.secured },
    { label: "Active days",   value: l.activeDays },
  ]
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground">Lifetime</h3>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{i.label}</dt>
            <dd className="text-sm font-semibold tabular-nums text-foreground">{fmt(i.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────

export function ProgressCard({ me, className }: { me: GameProfile; className?: string }) {
  const arena = arenaAt(me.arenaIndex)
  const t = me.todayStats
  const w = me.weekStats
  const s = me.streak
  const fresh = me.lifetime.activities === 0

  return (
    <SectionCard title="Your progress" icon={TrendingUp} className={className} bodyClassName="space-y-5">
      {/* Level, title, arena, total XP */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LevelBox level={me.level} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">{me.title}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <ArenaDot color={arena.palette.accent} />
              Arena {arena.index + 1} of {ARENAS.length} · {arena.name}
              {me.prestigeStars > 0 && <> · {plural(me.prestigeStars, "prestige star")}</>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold leading-tight tabular-nums text-foreground">{fmt(me.totalXp)}</p>
          <p className="text-xs text-muted-foreground">Total XP</p>
        </div>
      </div>

      <XpProgress me={me} />

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Streak"
          icon={Flame}
          value={plural(s.current, "day")}
          sub={s.best > 0 ? `Best ${plural(s.best, "day")}` : "No streak yet"}
        />
        <StatTile
          label="This week"
          icon={CalendarDays}
          value={`${fmt(w.xp)} XP`}
          sub={plural(w.n, "activity", "activities")}
        />
        <StatTile
          label="Today"
          icon={Sun}
          value={plural(t.n, "activity", "activities")}
          sub={`${fmt(t.xp)} XP`}
        />
        <BonusTile me={me} />
      </div>

      {s.atRisk && (
        <AmberNote>
          Streak at risk: log one activity today to keep your {fmt(s.current)}-day streak.
        </AmberNote>
      )}
      {fresh && (
        <p className="text-xs text-muted-foreground">
          Log your first call or visit to start earning XP and a daily streak.
        </p>
      )}

      <div className="border-t border-border pt-4">
        <NextArena me={me} />
      </div>

      <div className="border-t border-border pt-4">
        <Lifetime me={me} />
      </div>
    </SectionCard>
  )
}
