"use client"

// Progression: the ten arenas as a table — level range, rank title,
// status, entry requirements and what each arena unlocks.

import { Check, Gamepad2, Layers, PawPrint } from "lucide-react"
import type { GameProfile } from "@/lib/game/types"
import { ARENAS, gateProgress, petStageForArena, xpForLevel, type ArenaDef } from "@/lib/game/levels"
import { ARCADE_GAMES } from "@/lib/game/arcade"
import { cn } from "@/lib/utils"
import {
  ArenaDot, MeterRow, SectionCard, StatusPill, fmt, type Status,
} from "@/components/game/ui/primitives"

type RowState = "completed" | "current" | "next" | "locked" | "unknown"

function rowState(arena: ArenaDef, me: GameProfile | null): RowState {
  if (!me) return "unknown"
  if (arena.index < me.arenaIndex) return "completed"
  if (arena.index === me.arenaIndex) return "current"
  if (arena.index === me.arenaIndex + 1) return "next"
  return "locked"
}

const PILL: Record<RowState, { status: Status; label: string } | null> = {
  completed: { status: "done",    label: "Completed" },
  current:   { status: "current", label: "Current" },
  next:      { status: "locked",  label: "Locked" },
  locked:    { status: "locked",  label: "Locked" },
  unknown:   null,
}

function Requirements({ arena, state, me }: { arena: ArenaDef; state: RowState; me: GameProfile | null }) {
  if (!arena.gate) return <span className="text-xs text-muted-foreground">None</span>

  // Live progress for the arena you are in and the one after it.
  if (me && (state === "current" || state === "next")) {
    const gate = gateProgress(arena.index, me.lifetime)
    if (gate) {
      return (
        <div className="space-y-2.5">
          {gate.requirements.map((r) => (
            <MeterRow key={r.stat} label={r.label} current={r.current} target={r.target} />
          ))}
        </div>
      )
    }
  }

  return (
    <ul className="space-y-1 text-xs">
      {arena.gate.requirements.map((r) => (
        <li key={r.stat} className="flex items-center gap-1.5 text-muted-foreground">
          {state === "completed" && <Check className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden />}
          <span>
            {r.label}: <span className="tabular-nums text-foreground">{fmt(r.target)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Unlocks({ arena }: { arena: ArenaDef }) {
  const games = ARCADE_GAMES.filter((g) => g.unlockLevel >= arena.minLevel && g.unlockLevel <= arena.maxLevel)
  const evolves = arena.index > 0 && petStageForArena(arena.index) > petStageForArena(arena.index - 1)
  if (games.length === 0 && !evolves) return <span className="text-xs text-muted-foreground">–</span>
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {games.map((g) => (
        <li key={g.id} className="flex items-center gap-1.5">
          <Gamepad2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="text-foreground">{g.name}</span> · level {g.unlockLevel}
          </span>
        </li>
      ))}
      {evolves && (
        <li className="flex items-center gap-1.5">
          <PawPrint className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Companion <span className="text-foreground">stage {petStageForArena(arena.index)}</span>
          </span>
        </li>
      )}
    </ul>
  )
}

export function Progression({ me }: { me: GameProfile | null }) {
  const description = me
    ? `Arena ${me.arenaIndex + 1} of ${ARENAS.length} · level ${me.level}. Entering a new arena requires the listed milestones as well as XP.`
    : `${ARENAS.length} arenas of 10 levels. Entering a new arena requires the listed milestones as well as XP.`

  return (
    <SectionCard title="Progression" icon={Layers} description={description} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs text-muted-foreground">
              <th scope="col" className="w-10 px-3 py-2 text-right font-medium">#</th>
              <th scope="col" className="px-3 py-2 font-medium">Arena</th>
              <th scope="col" className="px-3 py-2 font-medium">Levels</th>
              <th scope="col" className="px-3 py-2 font-medium">Rank title</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="w-[300px] px-3 py-2 font-medium">Entry requirements</th>
              <th scope="col" className="px-3 py-2 font-medium">Unlocks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ARENAS.map((a) => {
              const state = rowState(a, me)
              const pill = PILL[state]
              return (
                <tr
                  key={a.key}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn("align-top", state === "current" && "bg-muted/40")}
                >
                  <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">{a.index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground">
                      <ArenaDot color={a.palette.accent} />
                      {a.name}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <p className="tabular-nums text-foreground">{a.minLevel}–{a.maxLevel}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">from {fmt(xpForLevel(a.minLevel))} XP</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{a.title}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {pill ? <StatusPill status={pill.status}>{pill.label}</StatusPill> : <span className="text-xs text-muted-foreground">–</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Requirements arena={a} state={state} me={me} />
                  </td>
                  <td className="px-3 py-3">
                    <Unlocks arena={a} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
