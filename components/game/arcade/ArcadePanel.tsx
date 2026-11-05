"use client"

// Arcade: mini games unlocked by level, paid for with tokens earned by
// logging activities.

import { useCallback, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence } from "framer-motion"
import { Gamepad2, Info, Play } from "lucide-react"
import type { GameProfile } from "@/lib/game/types"
import {
  ARCADE_GAMES, personalBest, recordScore, type ArcadeGameDef, type ArcadeGameResult,
} from "@/lib/game/arcade"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconBox, SectionCard, StatusPill, fmt } from "@/components/game/ui/primitives"
import { ArcadeCabinet, type RunResult } from "./ArcadeCabinet"
import { arcadeIcon } from "./gameIcons"
import { useArcadeTokens } from "./useArcadeTokens"

// Personal bests live in localStorage; re-read whenever a score is recorded.
const BEST_EVENT = "voyage:arcade-best"
function subscribeBest(cb: () => void) {
  window.addEventListener(BEST_EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(BEST_EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}
function usePersonalBest(id: string): number | null {
  return useSyncExternalStore(subscribeBest, () => personalBest(id), () => null)
}

const SORTED_GAMES = [...ARCADE_GAMES].sort((a, b) => a.unlockLevel - b.unlockLevel)

function GameCard({
  game, level, available, onPlay, gateName,
}: {
  game:      ArcadeGameDef
  level:     number
  available: number
  onPlay:    (g: ArcadeGameDef) => void
  /** Name of the uncleared gate holding the player back (null when not gate-blocked) */
  gateName:  string | null
}) {
  const unlocked = level >= game.unlockLevel
  const best = usePersonalBest(game.id)
  const Icon = arcadeIcon(game.icon)

  return (
    <li
      className="flex flex-col rounded-lg border border-border bg-background p-3"
    >
      <div className="flex flex-1 items-start gap-3">
        <IconBox icon={Icon} muted={!unlocked} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>
            {game.name}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground" title={game.howTo}>{game.howTo}</p>
        </div>
      </div>

      <div className="mt-3 flex h-8 items-center justify-between gap-2 border-t border-border pt-3 box-content">
        {unlocked ? (
          <>
            <span className="text-xs text-muted-foreground">
              {best != null
                ? <>Best <span className="font-medium tabular-nums text-foreground">{fmt(best)}</span></>
                : "No score yet"}
            </span>
            <Button
              size="sm"
              onClick={() => onPlay(game)}
              disabled={available <= 0}
              aria-label={`Play ${game.name} for 1 token`}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Play
              <span className="font-normal opacity-80">· 1 token</span>
            </Button>
          </>
        ) : (
          <>
            <StatusPill status="locked">
              {gateName ? `Requires ${gateName}` : `Unlocks at level ${game.unlockLevel}`}
            </StatusPill>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {gateName ? `Level ${game.unlockLevel}` : `${game.unlockLevel - level} to go`}
            </span>
          </>
        )}
      </div>
    </li>
  )
}

interface ActiveRun {
  game:   ArcadeGameDef
  runId:  number
  result: RunResult | null
}

export function ArcadePanel({ me }: { me: GameProfile }) {
  const { available, spend } = useArcadeTokens(me.today, me.arcadeTokensEarned)
  const [run, setRun] = useState<ActiveRun | null>(null)
  const unlockedCount = ARCADE_GAMES.filter((g) => me.level >= g.unlockLevel).length
  const gateName = me.gateBlocked ? me.nextGate?.name ?? null : null

  // Every run gets a fresh id (also the game's React key, so replays remount).
  const runCounter = useRef(0)
  const endedRun = useRef<number | null>(null)

  const play = useCallback((game: ArcadeGameDef) => {
    if (!spend()) return
    runCounter.current += 1
    setRun({ game, runId: runCounter.current, result: null })
  }, [spend])

  const playAgain = useCallback(() => {
    if (!spend()) return
    runCounter.current += 1
    const runId = runCounter.current
    setRun((r) => (r ? { ...r, runId, result: null } : r))
  }, [spend])

  const close = useCallback(() => setRun(null), [])

  const handleGameOver = useCallback((res: ArcadeGameResult) => {
    if (!run || endedRun.current === run.runId) return // only the first onGameOver per run counts
    endedRun.current = run.runId
    const prevBest = personalBest(run.game.id)
    const newBest = recordScore(run.game.id, res.score)
    window.dispatchEvent(new Event(BEST_EVENT))
    const runId = run.runId
    setRun((r) => (r && r.runId === runId ? { ...r, result: { ...res, newBest, prevBest } } : r))
  }, [run])

  return (
    <SectionCard
      title="Arcade"
      icon={Gamepad2}
      description={
        <>
          <span className="font-medium tabular-nums text-foreground" aria-live="polite">
            {available} token{available === 1 ? "" : "s"} available
          </span>
          {" · "}1 free daily, +1 per 3 activities today, +3 for clearing all daily quests
        </>
      }
      actions={
        <span className="text-xs tabular-nums text-muted-foreground">
          {unlockedCount} of {ARCADE_GAMES.length} unlocked
        </span>
      }
    >
      {available <= 0 && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          No tokens left today. Log 3 more activities for another play, or clear all daily quests for 3 more. Tokens reset at midnight.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SORTED_GAMES.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            level={me.level}
            available={available}
            onPlay={play}
            gateName={gateName}
          />
        ))}
      </ul>

      <AnimatePresence>
        {run && (
          <ArcadeCabinet
            key="cabinet"
            game={run.game}
            runId={run.runId}
            result={run.result}
            available={available}
            onGameOver={handleGameOver}
            onPlayAgain={playAgain}
            onClose={close}
          />
        )}
      </AnimatePresence>
    </SectionCard>
  )
}
