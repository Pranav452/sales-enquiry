"use client"

// "Quests" card: today's three daily quests, the clean-sweep bonus and
// the two weekly quests, with reset times in the header.

import { Check, ListChecks } from "lucide-react"
import type { GameProfile, QuestProgress, QuestTier } from "@/lib/game/types"
import { CLEAN_SWEEP_BONUS } from "@/lib/game/quests"
import { cn } from "@/lib/utils"
import { IconBox, ProgressBar, SectionCard, fmt } from "@/components/game/ui/primitives"
import { iconFor } from "./GameIcon"
import { formatCountdown, msUntilDailyReset, msUntilWeeklyReset } from "./theme"
import { useClock } from "./useClock"

const DIFFICULTY: Record<QuestTier, string | null> = {
  easy: "Easy", medium: "Medium", hard: "Hard", weekly: null,
}

function QuestRow({ q }: { q: QuestProgress }) {
  const difficulty = DIFFICULTY[q.tier]
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {q.done ? (
        <IconBox icon={Check} className="bg-green-500/15 text-green-600" />
      ) : (
        <IconBox icon={iconFor(q.icon)} muted />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{q.name}</p>
          <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
            +{q.reward} XP
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {q.description}
          {difficulty && <> · {difficulty}</>}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar
            value={q.target > 0 ? q.current / q.target : 0}
            tone={q.done ? "success" : "primary"}
            label={`${q.name} progress`}
            className="flex-1"
          />
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {fmt(q.current)} / {fmt(q.target)}
          </span>
        </div>
      </div>
    </li>
  )
}

function GroupHeading({ title, done, total }: { title: string; done: number; total: number }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      <span className="text-xs tabular-nums text-muted-foreground">{done} of {total} done</span>
    </div>
  )
}

export function QuestBoard({ me, className }: { me: GameProfile; className?: string }) {
  const now = useClock(30_000)
  const daily = now == null ? "--" : formatCountdown(msUntilDailyReset(now))
  const weekly = now == null ? "--" : formatCountdown(msUntilWeeklyReset(now))
  const dailyDone = me.dailyQuests.filter((q) => q.done).length
  const weeklyDone = me.weeklyQuests.filter((q) => q.done).length

  return (
    <SectionCard
      title="Quests"
      icon={ListChecks}
      description={`Daily resets in ${daily} · weekly in ${weekly}`}
      className={className}
      bodyClassName="space-y-5"
    >
      <div>
        <GroupHeading title="Daily" done={dailyDone} total={me.dailyQuests.length} />
        <ul className="divide-y divide-border">
          {me.dailyQuests.map((q) => <QuestRow key={q.id} q={q} />)}
        </ul>
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-md bg-muted/60 px-3 py-2 text-xs",
            me.cleanSweepToday ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {me.cleanSweepToday && <Check className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />}
          {me.cleanSweepToday
            ? `Clean sweep complete · +${CLEAN_SWEEP_BONUS} XP and 3 arcade tokens`
            : `Complete all ${me.dailyQuests.length} for a clean sweep: +${CLEAN_SWEEP_BONUS} XP and 3 arcade tokens`}
        </p>
      </div>

      <div className="border-t border-border pt-4">
        <GroupHeading title="Weekly" done={weeklyDone} total={me.weeklyQuests.length} />
        <ul className="divide-y divide-border">
          {me.weeklyQuests.map((q) => <QuestRow key={q.id} q={q} />)}
        </ul>
      </div>
    </SectionCard>
  )
}
