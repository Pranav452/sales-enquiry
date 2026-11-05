"use client"

// Trophies: lifetime achievements, each with a one-time XP reward.
// Secret trophies stay hidden until earned.

import { Award, EyeOff } from "lucide-react"
import type { GameProfile, TrophyProgress } from "@/lib/game/types"
import { TROPHIES, type TrophyDef, type TrophyTier } from "@/lib/game/trophies"
import { Badge } from "@/components/ui/badge"
import { IconBox, MeterRow, SectionCard, StatusPill, fmt } from "@/components/game/ui/primitives"
import { iconFor } from "./GameIcon"

const TIER_ORDER: TrophyTier[] = ["bronze", "silver", "gold", "mythic"]
const TIER_LABEL: Record<TrophyTier, string> = {
  bronze: "Bronze", silver: "Silver", gold: "Gold", mythic: "Mythic",
}

const ORDERED = [...TROPHIES].sort(
  (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || TROPHIES.indexOf(a) - TROPHIES.indexOf(b),
)

function TrophyCard({ def, p }: { def: TrophyDef; p: TrophyProgress | undefined }) {
  const earned = p?.earned ?? false
  const hidden = !!def.secret && !earned

  if (hidden) {
    return (
      <li className="flex gap-3 rounded-lg border border-border bg-background p-3">
        <IconBox icon={EyeOff} muted />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">Hidden trophy</p>
            <p className="text-xs text-muted-foreground">Revealed when earned.</p>
          </div>
          <StatusPill status="locked">Locked</StatusPill>
        </div>
      </li>
    )
  }

  return (
    <li className="flex gap-3 rounded-lg border border-border bg-background p-3">
      <IconBox icon={iconFor(def.icon)} muted={!earned} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
              {def.name}
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                {TIER_LABEL[def.tier]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{def.description}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">+{def.reward} XP</span>
        </div>
        {earned ? (
          <StatusPill status="done">Earned</StatusPill>
        ) : (
          <MeterRow
            label={`${fmt(Math.max(0, def.target - (p?.current ?? 0)))} to go`}
            current={p?.current ?? 0}
            target={def.target}
          />
        )}
      </div>
    </li>
  )
}

export function TrophyCabinet({ me }: { me: GameProfile | null }) {
  const progress = new Map((me?.trophies ?? []).map((t) => [t.id, t]))
  const earned = TROPHIES.filter((t) => progress.get(t.id)?.earned)
  const earnedXp = earned.reduce((s, t) => s + t.reward, 0)

  return (
    <SectionCard
      title="Trophies"
      icon={Award}
      description={`${earned.length} of ${TROPHIES.length} earned · +${fmt(earnedXp)} XP`}
    >
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ORDERED.map((d) => (
          <TrophyCard key={d.id} def={d} p={progress.get(d.id)} />
        ))}
      </ul>
    </SectionCard>
  )
}
