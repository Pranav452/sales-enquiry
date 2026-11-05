"use client"

// ============================================================
// Sudoku — classic 9x9 puzzle. Setup (difficulty, mistake limit)
// -> generated puzzle with a unique solution graded by technique
// -> play with notes, undo/redo, hints, conflict highlighting.
// Engine: ./classics/sudoku.ts, play state: ./classics/sudoku-game.ts,
// board + number pad: ./classics/sudoku-board.tsx.
// ============================================================

import { useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useReducedMotion } from "framer-motion"
import { Flag, Lightbulb, Loader2, Redo2, Undo2 } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { cn } from "@/lib/utils"
import { GameToolbar, SetupScreen, ToolButton } from "../kit/GameShell"
import { formatClock, useDelayedGameOver, useElementSize, useStopwatch } from "./classics/shared"
import {
  DIFFICULTIES, DIFFICULTY_SPECS, SudokuGenerator, UNITS, findConflicts, scorePartial, scoreWin,
  type Difficulty,
} from "./classics/sudoku"
import {
  correctFraction, describe, erase, giveUp, hint, inputDigit, newGame, redo, remainingCounts, undo,
  type GameState,
} from "./classics/sudoku-game"
import { NumberPad, SudokuBoard, boardMetrics, type BoardEffects } from "./classics/sudoku-board"

type Screen = "setup" | "generating" | "game"

// ─── Environment hooks ────────────────────────────────────────

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
function useViewportHeight(): number {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb)
  return () => document.removeEventListener("visibilitychange", cb)
}
/** The clock pauses while the tab is hidden. */
function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true)
}

// ─── Helpers ──────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function effectsFor(s: GameState): BoardEffects | null {
  const e = s.event
  if (!e || (e.kind !== "placed" && e.kind !== "hint")) return null
  const won = s.phase === "won"
  const flash = won ? Array.from({ length: 81 }, (_, i) => i) : e.completed.flatMap((u) => UNITS[u])
  return {
    id:     s.eventId,
    pop:    e.cell,
    shake:  e.kind === "placed" && !e.correct ? e.cell : -1,
    flash,
    origin: e.cell,
  }
}

const SETUP_OPTIONS = [
  {
    id: "difficulty",
    label: "Difficulty",
    choices: DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_SPECS[d].label, hint: DIFFICULTY_SPECS[d].techniques })),
  },
  {
    id: "mistakes",
    label: "Mistake limit",
    choices: [
      { value: "on", label: "3 mistakes", hint: "The third mistake ends the game" },
      { value: "off", label: "Off", hint: "Unlimited, each one costs points" },
    ],
  },
]

// ─── Component ────────────────────────────────────────────────

export default function Sudoku({ onGameOver }: ArcadeGameProps) {
  const finish = useDelayedGameOver(onGameOver)
  const reduceMotion = useReducedMotion() ?? false

  const [screen, setScreen] = useState<Screen>("setup")
  const [pending, setPending] = useState<Difficulty>("medium")
  const [game, setGame] = useState<GameState | null>(null)
  const [round, setRound] = useState(0)
  const [selected, setSelected] = useState(-1)
  const [notesMode, setNotesMode] = useState(false)
  const [confirmGiveUp, setConfirmGiveUp] = useState(false)

  const genTimer = useRef<number | null>(null)
  const confirmTimer = useRef<number | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const keysId = useId()

  const visible = usePageVisible()
  const viewportH = useViewportHeight()
  const [wrapRef, wrap] = useElementSize()
  const [barRef, bar] = useElementSize()

  const playing = screen === "game" && game?.phase === "playing"
  const seconds = useStopwatch(playing && visible, round)

  useEffect(() => {
    const gen = genTimer
    const conf = confirmTimer
    return () => {
      if (gen.current !== null) window.clearTimeout(gen.current)
      if (conf.current !== null) window.clearTimeout(conf.current)
    }
  }, [])

  // ── Setup / generation ──

  const start = (opts: Record<string, string>) => {
    const difficulty = (DIFFICULTIES as string[]).includes(opts.difficulty) ? (opts.difficulty as Difficulty) : "medium"
    const limitOn = opts.mistakes !== "off"
    setPending(difficulty)
    setScreen("generating")
    const generator = new SudokuGenerator(difficulty)
    const t0 = performance.now()
    // Work in short slices so the page stays responsive; hard cap ~1.4s, then
    // take the closest puzzle found. Keep the message up briefly to avoid a flash.
    const tick = () => {
      const done = generator.run(30) || performance.now() - t0 > 1400
      if (!done) {
        genTimer.current = window.setTimeout(tick, 0)
        return
      }
      const result = generator.result()
      genTimer.current = window.setTimeout(() => {
        genTimer.current = null
        setGame(newGame(result, limitOn))
        setRound((r) => r + 1)
        setSelected(-1)
        setNotesMode(false)
        setConfirmGiveUp(false)
        setScreen("game")
      }, Math.max(0, 350 - (performance.now() - t0)))
    }
    genTimer.current = window.setTimeout(tick, 20)
  }

  // ── Game actions ──

  const report = (s: GameState) => {
    const spec = DIFFICULTY_SPECS[s.difficulty]
    if (s.phase === "won") {
      const score = scoreWin(s.difficulty, seconds, s.hints, s.mistakes).total
      const parts = [s.hints ? plural(s.hints, "hint") : "no hints"]
      if (s.mistakes) parts.push(plural(s.mistakes, "mistake"))
      finish({ score, won: true, summary: `${spec.label} solved in ${formatClock(seconds)}, ${parts.join(", ")}` })
      return
    }
    const frac = correctFraction(s)
    const score = scorePartial(s.difficulty, frac)
    const pct = Math.round(frac * 100)
    if (s.phase === "lost") {
      finish({ score, won: false, summary: `Out of mistakes on ${spec.label}, ${pct}% filled` })
    } else {
      finish({ score, won: false, summary: `Gave up on ${spec.label} at ${formatClock(seconds)}, ${pct}% filled` }, 0)
    }
  }

  const commit = (next: GameState) => {
    if (!game || next === game) return
    setGame(next)
    if (game.phase === "playing" && next.phase !== "playing") {
      setSelected(-1)
      setConfirmGiveUp(false)
      report(next)
    }
  }

  const enterDigit = (d: number, asNote: boolean) => {
    if (game) commit(inputDigit(game, selected, d, asNote))
  }
  const doErase = () => {
    if (game) commit(erase(game, selected))
  }
  const doUndo = () => {
    if (!game) return
    const next = undo(game)
    if (next.event?.kind === "undo" && next !== game) setSelected(next.event.cell)
    commit(next)
  }
  const doRedo = () => {
    if (!game) return
    const next = redo(game)
    if (next.event?.kind === "redo" && next !== game) setSelected(next.event.cell)
    commit(next)
  }
  const doHint = () => {
    if (!game) return
    const next = hint(game, selected)
    if (next.event?.kind === "hint" && next !== game && next.phase === "playing") setSelected(next.event.cell)
    commit(next)
  }
  const doGiveUp = () => {
    if (!game) return
    if (confirmTimer.current !== null) window.clearTimeout(confirmTimer.current)
    if (!confirmGiveUp) {
      setConfirmGiveUp(true)
      confirmTimer.current = window.setTimeout(() => {
        confirmTimer.current = null
        setConfirmGiveUp(false)
      }, 3000)
      return
    }
    confirmTimer.current = null
    commit(giveUp(game))
  }
  const toggleNotes = () => setNotesMode((m) => !m)

  const focusCell = (i: number) => {
    gridRef.current?.querySelector<HTMLElement>(`[data-cell="${i}"]`)?.focus()
  }
  const move = (dr: number, dc: number) => {
    const next = selected < 0 ? 0 : clamp(Math.floor(selected / 9) + dr, 0, 8) * 9 + clamp((selected % 9) + dc, 0, 8)
    setSelected(next)
    focusCell(next)
  }

  const select = useCallback((i: number) => setSelected(i), [])

  // ── Keyboard ──

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!playing || e.defaultPrevented) return
    const target = e.target as HTMLElement | null
    if (target?.closest("input, textarea, select, [contenteditable='true']")) return
    const key = e.key
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = key.toLowerCase()
      if (k === "z") {
        e.preventDefault()
        if (e.shiftKey) doRedo()
        else doUndo()
      } else if (k === "y") {
        e.preventDefault()
        doRedo()
      }
      return
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const code = /^(?:Digit|Numpad)([0-9])$/.exec(e.code)
    const digit = code ? Number(code[1]) : /^[0-9]$/.test(key) ? Number(key) : -1
    if (digit >= 1) {
      e.preventDefault()
      enterDigit(digit, notesMode || e.shiftKey)
      return
    }
    if (digit === 0 || key === "Backspace" || key === "Delete") {
      e.preventDefault()
      doErase()
      return
    }
    if (key === "n" || key === "N") {
      e.preventDefault()
      toggleNotes()
      return
    }
    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    if (arrows[key]) {
      e.preventDefault()
      move(arrows[key][0], arrows[key][1])
    }
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Derived ──

  const values = game?.values
  const conflicts = useMemo(() => (values ? findConflicts(values) : []), [values])
  const remaining = useMemo(() => (values ? remainingCounts(values) : []), [values])
  const effects = useMemo(() => (game ? effectsFor(game) : null), [game])

  // ── Render ──

  if (screen === "setup") {
    return (
      <SetupScreen
        title="Sudoku"
        description="Fill the grid so every row, column and 3x3 box holds the digits 1 to 9 exactly once."
        options={SETUP_OPTIONS}
        defaults={{ difficulty: "medium", mistakes: "on" }}
        startLabel="New puzzle"
        onStart={start}
      >
        <p className="text-center text-xs text-muted-foreground">
          Every puzzle has a single solution and can be solved by logic alone, no guessing.
        </p>
      </SetupScreen>
    )
  }

  if (screen === "generating" || !game) {
    return (
      <div role="status" className="flex min-h-[340px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden />
        Generating {DIFFICULTY_SPECS[pending].label.toLowerCase()} puzzle...
      </div>
    )
  }

  // Layout: board + pad side by side when there is room, stacked otherwise.
  // Height budget keeps the side-by-side layout inside the dialog without scrolling.
  const width = wrap.width
  const side = width >= 500
  const padWidth = side ? clamp(Math.round(width * 0.29), 156, 196) : 0
  const heightBudget = Math.floor(viewportH * 0.85) - 140 - bar.height
  const target = side ? Math.max(270, Math.min(width - padWidth - 20, heightBudget)) : Math.min(width, 520)
  const metrics = boardMetrics(target)
  const digitHeight = side ? clamp(Math.round(metrics.cell * 1.75), 52, 80) : clamp(Math.round(metrics.total / 9 * 1.3), 44, 58)

  const ended = game.phase !== "playing"
  const limit = game.mistakeLimit
  const status = game.phase === "won"
    ? `Solved! ${DIFFICULTY_SPECS[game.difficulty].label} in ${formatClock(seconds)}`
    : describe(game, notesMode)

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={barRef} className="@container flex flex-col">
        <GameToolbar
          status={
            <span className={cn(game.phase === "won" && "text-primary", (game.phase === "lost" || game.event?.kind === "placed" && !game.event.correct && !ended) && "text-destructive")}>
              {status}
            </span>
          }
          stats={[
            { label: "Time", value: formatClock(seconds) },
            {
              label: "Mistakes",
              value: <span className={cn(game.mistakes > 0 && "text-destructive")}>{limit ? `${game.mistakes}/${limit}` : game.mistakes}</span>,
            },
            { label: "Hints", value: game.hints },
          ]}
          actions={
            <>
              <ToolButton onClick={doUndo} disabled={ended || !game.past.length} title="Undo (Ctrl+Z)">
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                <span className="@max-[400px]:sr-only">Undo</span>
              </ToolButton>
              <ToolButton onClick={doRedo} disabled={ended || !game.future.length} title="Redo (Ctrl+Y)">
                <Redo2 className="h-3.5 w-3.5" aria-hidden />
                <span className="@max-[400px]:sr-only">Redo</span>
              </ToolButton>
              <ToolButton onClick={doHint} disabled={ended} title={`Reveal a cell (-${DIFFICULTY_SPECS[game.difficulty].hintPenalty} points)`}>
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                Hint
              </ToolButton>
              <ToolButton
                onClick={doGiveUp}
                disabled={ended}
                aria-label={confirmGiveUp ? "Confirm give up" : "Give up"}
                className={cn(confirmGiveUp && "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive")}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {confirmGiveUp ? "Confirm" : "Give up"}
              </ToolButton>
            </>
          }
        />
      </div>

      <p id={keysId} className="sr-only">
        Arrow keys move. 1 to 9 enters a digit, Shift plus a digit toggles a note, N switches notes mode,
        Backspace erases, Control Z undoes and Control Y redoes.
      </p>
      {width > 0 && (
        <div className={cn("flex justify-center", side ? "flex-row items-center gap-5" : "flex-col items-center gap-3")}>
          <SudokuBoard
            size={target}
            puzzle={game.puzzle}
            solution={game.solution}
            values={game.values}
            notes={game.notes}
            hinted={game.hinted}
            conflicts={conflicts}
            selected={selected}
            revealed={ended && game.phase !== "won"}
            interactive={!ended}
            effects={effects}
            reduceMotion={reduceMotion}
            onSelect={select}
            gridRef={gridRef}
            describedBy={keysId}
          />
          <NumberPad
            layout={side ? "side" : "bottom"}
            width={side ? padWidth : metrics.total}
            digitHeight={digitHeight}
            remaining={remaining}
            notesMode={notesMode}
            disabled={ended}
            onDigit={(d) => enterDigit(d, notesMode)}
            onErase={doErase}
            onToggleNotes={toggleNotes}
          />
        </div>
      )}
    </div>
  )
}
