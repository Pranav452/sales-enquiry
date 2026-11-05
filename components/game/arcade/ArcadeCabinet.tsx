"use client"

// Game window: hosts one lazy-loaded game run, an in-game "How to play"
// panel, and the result card when the run ends.

import { Component, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, RotateCcw, X } from "lucide-react"
import type { ArcadeGameDef, ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { IconBox, StatusPill, fmt } from "@/components/game/ui/primitives"
import { arcadeIcon } from "./gameIcons"
import { GAME_COMPONENTS } from "./gameLoaders"
import { RulesContent } from "./HowToPlay"

const WIDTH: Record<ArcadeGameDef["size"], string> = {
  md: "max-w-[680px]",
  lg: "max-w-[940px]",
  xl: "max-w-[1180px]",
}

export interface RunResult extends ArcadeGameResult {
  newBest:  boolean
  prevBest: number | null
}

// ─── Error boundary so a broken game never takes the page down ─

class GameErrorBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-foreground">This game could not be loaded</p>
          <p className="text-xs text-muted-foreground">Please close the window and try again.</p>
          <button
            type="button"
            onClick={this.props.onClose}
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Close
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Result card ──────────────────────────────────────────────

function ResultCard({
  result, available, unlimited, onPlayAgain, onClose,
}: {
  result:      RunResult
  available:   number
  unlimited:   boolean
  onPlayAgain: () => void
  onClose:     () => void
}) {
  const canReplay = unlimited || available > 0
  const replayRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (canReplay) replayRef.current?.focus()
    else closeRef.current?.focus()
  }, [canReplay])

  const outcome = result.won === true ? "You won" : result.won === false ? "Game over" : "Run complete"

  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full max-w-xs rounded-lg border border-border bg-card p-5 text-center text-card-foreground shadow-md"
    >
      <p className="text-sm font-semibold text-foreground">{outcome}</p>
      <p className="mt-2 text-xs text-muted-foreground">Score</p>
      <p className="text-2xl font-semibold leading-tight tabular-nums text-foreground">{fmt(result.score)}</p>
      {result.summary && <p className="mt-1 text-xs text-muted-foreground">{result.summary}</p>}

      <div className="mt-3 flex justify-center">
        {result.newBest ? (
          <StatusPill status="done">
            New personal best
            {result.prevBest != null && <span className="font-normal opacity-80">(was {fmt(result.prevBest)})</span>}
          </StatusPill>
        ) : (
          result.prevBest != null && (
            <p className="text-xs text-muted-foreground">
              Personal best <span className="font-medium tabular-nums text-foreground">{fmt(result.prevBest)}</span>
            </p>
          )
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button ref={replayRef} size="sm" className="flex-1" onClick={onPlayAgain} disabled={!canReplay}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Play again
          {!unlimited && <span className="font-normal opacity-80">· 1 token</span>}
        </Button>
        <Button ref={closeRef} size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
      {!canReplay && (
        <p className="mt-2 text-xs text-muted-foreground">No tokens left. Log more activities to earn another play.</p>
      )}
    </motion.div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────

interface CabinetProps {
  game:        ArcadeGameDef
  runId:       number
  result:      RunResult | null
  available:   number
  unlimited:   boolean
  onGameOver:  (r: ArcadeGameResult) => void
  onPlayAgain: () => void
  onClose:     () => void
}

export function ArcadeCabinet({ game, runId, result, available, unlimited, onGameOver, onPlayAgain, onClose }: CabinetProps) {
  const Game = GAME_COMPONENTS[game.id]
  const closeRef = useRef<HTMLButtonElement>(null)
  const [showRules, setShowRules] = useState(false)
  const showRulesRef = useRef(false)
  useEffect(() => { showRulesRef.current = showRules }, [showRules])

  // Escape closes; lock page scroll; restore focus on close.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        // Escape closes the rules panel first, then the window.
        if (showRulesRef.current) setShowRules(false)
        else onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arcade-dialog-title"
        aria-describedby="arcade-dialog-desc"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className={`relative flex max-h-[calc(100vh-1rem)] w-full ${WIDTH[game.size]} flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg sm:max-h-[calc(100vh-2rem)]`}
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <IconBox icon={arcadeIcon(game.icon)} />
          <div className="min-w-0 flex-1">
            <h2 id="arcade-dialog-title" className="truncate text-sm font-semibold text-foreground">{game.name}</h2>
            <p id="arcade-dialog-desc" className="mt-0.5 truncate text-xs text-muted-foreground">{game.description}</p>
          </div>
          <span className="mt-1.5 hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
            {unlimited ? "Admin preview" : `${available} token${available === 1 ? "" : "s"} left`}
          </span>
          <Button
            variant={showRules ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowRules((v) => !v)}
            aria-pressed={showRules}
            aria-controls="arcade-rules-panel"
            className="h-8 shrink-0 gap-1.5 px-2.5 text-xs"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            How to play
          </Button>
          <Button
            ref={closeRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close game"
            className="-mr-1.5 h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="relative flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="relative min-h-[340px] rounded-lg border border-border bg-background p-3 text-foreground">
            <GameErrorBoundary key={`b-${runId}`} onClose={onClose}>
              {Game ? <Game key={runId} onGameOver={onGameOver} /> : (
                <p className="py-16 text-center text-sm text-muted-foreground">This game is not available yet.</p>
              )}
            </GameErrorBoundary>

            <AnimatePresence>
              {result && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ResultCard result={result} available={available} unlimited={unlimited} onPlayAgain={onPlayAgain} onClose={onClose} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* In-game rules: slides over the game without unmounting it */}
        <AnimatePresence>
          {showRules && (
            <motion.aside
              id="arcade-rules-panel"
              aria-label={`How to play ${game.name}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 right-0 top-[57px] z-10 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <p className="text-sm font-semibold text-foreground">How to play</p>
                <Button variant="ghost" size="icon" onClick={() => setShowRules(false)} aria-label="Close rules" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <div className="overflow-y-auto px-4 py-4">
                <RulesContent game={game} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
