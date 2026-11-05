"use client"

// Arcade: classic board, card and puzzle games unlocked by level, paid for
// with tokens earned by logging activities. Admins can preview everything.

import { useCallback, useRef, useState, useSyncExternalStore } from "react"
import { AnimatePresence } from "framer-motion"
import { BookOpen, Gamepad2, Info, Play } from "lucide-react"
import type { GameProfile } from "@/lib/game/types"
import { useGameStore } from "@/lib/game/store"
import {
  ARCADE_CATEGORIES, ARCADE_GAMES, personalBest, recordScore,
  type ArcadeGameDef, type ArcadeGameResult,
} from "@/lib/game/arcade"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconBox, SectionCard, StatusPill, fmt } from "@/components/game/ui/primitives"
import { ArcadeCabinet, type RunResult } from "./ArcadeCabinet"
import { HowToPlayDialog } from "./HowToPlay"
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

function GameCard({
  game, unlocked, level, canPlay, unlimited, onPlay, onRules, gateName,
}: {
  game:      ArcadeGameDef
  unlocked:  boolean
  level:     number
  canPlay:   boolean
  unlimited: boolean
  onPlay:    (g: ArcadeGameDef) => void
  onRules:   (g: ArcadeGameDef) => void
  /** Name of the uncleared gate holding the player back (null when not gate-blocked) */
  gateName:  string | null
}) {
  const best = usePersonalBest(game.id)
  const Icon = arcadeIcon(game.icon)

  return (
    <li className="flex flex-col rounded-lg border border-border bg-background p-3">
      <div className="flex flex-1 items-start gap-3">
        <IconBox icon={Icon} muted={!unlocked} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>
            {game.name}
          </p>
          <p className="text-[11px] text-muted-foreground">{game.players}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{game.description}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        {unlocked ? (
          <>
            <span className="text-xs text-muted-foreground">
              {best != null
                ? <>Best <span className="font-medium tabular-nums text-foreground">{fmt(best)}</span></>
                : "No score yet"}
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onRules(game)} aria-label={`How to play ${game.name}`}>
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                How to play
              </Button>
              <Button size="sm" className="h-8" onClick={() => onPlay(game)} disabled={!canPlay} aria-label={`Play ${game.name}`}>
                <Play className="h-3.5 w-3.5" aria-hidden />
                Play
                {!unlimited && <span className="font-normal opacity-80">· 1 token</span>}
              </Button>
            </div>
          </>
        ) : (
          <>
            <StatusPill status="locked">
              {gateName ? `Requires ${gateName}` : `Unlocks at level ${game.unlockLevel}`}
            </StatusPill>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-muted-foreground">
                {gateName ? `Level ${game.unlockLevel}` : `${game.unlockLevel - level} to go`}
              </span>
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onRules(game)} aria-label={`How to play ${game.name}`}>
                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                Rules
              </Button>
            </div>
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
  const isAdmin = useGameStore((s) => s.data?.isAdmin ?? false)
  const { available, bonus, unlimited, spend, granted } = useArcadeTokens(me.today, me.arcadeTokensEarned, {
    person: me.person, unlimited: isAdmin,
  })
  const [run, setRun] = useState<ActiveRun | null>(null)
  const [rulesFor, setRulesFor] = useState<ArcadeGameDef | null>(null)
  const isUnlocked = (g: ArcadeGameDef) => isAdmin || me.level >= g.unlockLevel
  const unlockedCount = ARCADE_GAMES.filter(isUnlocked).length
  const gateName = me.gateBlocked ? me.nextGate?.name ?? null : null
  const canPlay = unlimited || available > 0

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
  const closeRules = useCallback(() => setRulesFor(null), [])

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
        unlimited ? (
          <>Admin preview: every game is unlocked and plays are free.</>
        ) : (
          <>
            <span className="font-medium tabular-nums text-foreground" aria-live="polite">
              {available} token{available === 1 ? "" : "s"} available
            </span>
            {bonus > 0 && <> (includes {bonus} bonus)</>}
            {" · "}1 free daily, +1 per 3 activities today, +3 for clearing all daily quests
          </>
        )
      }
      actions={
        <span className="text-xs tabular-nums text-muted-foreground">
          {unlockedCount} of {ARCADE_GAMES.length} unlocked
        </span>
      }
    >
      {!canPlay && (
        <p
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          No tokens left today. Log 3 more activities for another play, or clear all daily quests for 3 more. Daily tokens reset at midnight.
        </p>
      )}
      {granted > 0 && !unlimited && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          You received {granted} bonus token{granted === 1 ? "" : "s"}. Bonus tokens do not expire and are used after your daily tokens.
        </p>
      )}

      <div className="space-y-6">
        {ARCADE_CATEGORIES.map((cat) => {
          const games = ARCADE_GAMES
            .filter((g) => g.category === cat.id)
            .sort((a, b) => a.unlockLevel - b.unlockLevel || a.name.localeCompare(b.name))
          if (!games.length) return null
          return (
            <section key={cat.id} aria-labelledby={`arcade-cat-${cat.id}`}>
              <h3 id={`arcade-cat-${cat.id}`} className="mb-2 text-xs font-semibold text-muted-foreground">
                {cat.label} <span className="font-normal">· {games.length}</span>
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {games.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                    unlocked={isUnlocked(g)}
                    level={me.level}
                    canPlay={canPlay}
                    unlimited={unlimited}
                    onPlay={play}
                    onRules={setRulesFor}
                    gateName={gateName}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <AnimatePresence>
        {run && (
          <ArcadeCabinet
            key="cabinet"
            game={run.game}
            runId={run.runId}
            result={run.result}
            available={available}
            unlimited={unlimited}
            onGameOver={handleGameOver}
            onPlayAgain={playAgain}
            onClose={close}
          />
        )}
      </AnimatePresence>
      {rulesFor && <HowToPlayDialog game={rulesFor} onClose={closeRules} />}
    </SectionCard>
  )
}
