"use client"

// ============================================================
// Minesweeper — classic Beginner / Intermediate / Expert.
// Logic: ./classics/minesweeper.ts  Board pieces: ./classics/minesweeper-board.tsx
// Mouse: left reveal, right flag, left+right or middle chord, click a
// satisfied number to chord. Touch: tap = current mode, long-press =
// the other action. Keyboard: arrows move, Space/Enter act, F flag.
// No "New game" mid-run (each run costs a token): Give up forfeits, and
// the level can only be changed before the first square is opened.
// ============================================================

import {
  useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore,
  type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode,
} from "react"
import { motion, useReducedMotion } from "framer-motion"
import { CircleX, Flag, Pickaxe, SlidersHorizontal } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { cn } from "@/lib/utils"
import { GameToolbar, SetupScreen, ToolButton } from "../kit/GameShell"
import { formatClock, useDelayedGameOver, useElementSize, useStopwatch } from "./classics/shared"
import * as MS from "./classics/minesweeper"
import { BOARD_PALETTE, Cell, FRAME_PX, RAISED_FRAME, SUNKEN_FRAME } from "./classics/minesweeper-board"

// ─── Sizing ───────────────────────────────────────────────────

const MIN_CELL = 22
const MAX_CELL = 40
/** Dialog chrome that is not board: header, paddings, toolbar, hint, frame. */
const VERTICAL_CHROME = 200
const LONG_PRESS_MS = 350
/** "!" on the border: an unlayered global border-color rule overrides plain utilities. */
const ACTIVE_TOGGLE = "relative z-10 border-primary! bg-primary/10 text-foreground hover:bg-primary/15"

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}

const COARSE_QUERY = "(pointer: coarse)"
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia(COARSE_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}
/** Touch-first device (phones, tablets) — only used to word the help line. */
function useCoarsePointer() {
  return useSyncExternalStore(subscribeCoarse, () => window.matchMedia(COARSE_QUERY).matches, () => false)
}

function cellIndex(target: EventTarget | null): number {
  const el = target instanceof Element ? target.closest<HTMLElement>("[data-cell]") : null
  return el ? Number(el.dataset.cell) : -1
}

// ─── Clock (own component so ticks don't re-render the board) ─

function Clock({ running, resetKey, frozen }: { running: boolean; resetKey: number; frozen: number | null }) {
  const s = useStopwatch(running, resetKey)
  return <>{formatClock(frozen ?? s)}</>
}

// ─── Gesture bookkeeping (refs only, never read in render) ────

type GestureMode = "left" | "right" | "chord" | "done"
interface Gesture {
  pointerId: number
  mouse:     boolean
  down:      number
  hover:     number
  mode:      GestureMode
  x:         number
  y:         number
  timer:     number | null
}

type How = "primary" | "secondary" | "chord" | "flag"

export default function Minesweeper({ onGameOver }: ArcadeGameProps) {
  const finish = useDelayedGameOver(onGameOver)
  const reduceMotion = useReducedMotion() ?? false

  const [phase, setPhase]       = useState<"setup" | "play">("setup")
  const [level, setLevel]       = useState<MS.LevelId>("beginner")
  const [board, setBoard]       = useState<MS.Board>(() => MS.createLevelBoard("beginner"))
  const [gameKey, setGameKey]   = useState(0)
  const [flagMode, setFlagMode] = useState(false)
  const [gaveUp, setGaveUp]     = useState(false)
  const [finalSecs, setFinalSecs] = useState<number | null>(null)
  const [focusIndex, setFocusIndex] = useState(0)
  const [press, setPress]       = useState<{ index: number; chord: boolean } | null>(null)

  // Handlers read the live board from a ref so long-press timers never act on a stale one.
  const boardRef   = useRef<MS.Board>(board)
  const startedAt  = useRef<number | null>(null)
  const gesture    = useRef<Gesture | null>(null)
  const suppressClick = useRef(false)
  const gridRef    = useRef<HTMLDivElement | null>(null)

  const [measureRef, size] = useElementSize<HTMLDivElement>()
  const viewportH = useViewportHeight()
  const coarse = useCoarsePointer()
  const helpId = useId()

  const cfg = MS.LEVELS[level]
  const over = MS.isOver(board)
  const live = !over

  // Clear a pending long-press timer on unmount.
  useEffect(() => {
    const g = gesture
    return () => {
      const t = g.current?.timer
      if (t != null) window.clearTimeout(t)
    }
  }, [])

  // ── Game flow ──────────────────────────────────────────────

  const start = useCallback((id: MS.LevelId) => {
    const lc = MS.LEVELS[id]
    const fresh = MS.createLevelBoard(id)
    boardRef.current = fresh
    startedAt.current = null
    setLevel(id)
    setBoard(fresh)
    setGameKey((k) => k + 1)
    setFlagMode(false)
    setGaveUp(false)
    setFinalSecs(null)
    setPress(null)
    setFocusIndex(Math.floor(lc.rows / 2) * lc.cols + Math.floor(lc.cols / 2))
    setPhase("play")
  }, [])

  const commit = useCallback((prev: MS.Board, next: MS.Board) => {
    if (next === prev) return
    const now = performance.now()
    if (prev.status === "ready" && next.status !== "ready") startedAt.current = now
    boardRef.current = next
    setBoard(next)
    if (MS.isOver(prev) || !MS.isOver(next)) return

    const secs = startedAt.current == null ? 0 : (now - startedAt.current) / 1000
    setFinalSecs(Math.floor(secs))
    setPress(null)
    const label = MS.LEVELS[level].label
    if (next.status === "won") {
      finish({
        score: MS.winScore(level, secs),
        won: true,
        summary: `${label} cleared in ${formatClock(secs)}`,
      })
    } else {
      const pct = Math.floor(MS.progress(next) * 100)
      finish({
        score: MS.partialScore(level, next.revealed, MS.safeTotal(next)),
        won: false,
        summary: `${label}: hit a mine with ${pct}% cleared`,
      })
    }
  }, [finish, level])

  const apply = useCallback((i: number, how: How) => {
    const b = boardRef.current
    if (MS.isOver(b) || i < 0 || i >= b.state.length) return
    let next: MS.Board
    if (how === "chord") next = MS.chord(b, i)
    else if (how === "flag") next = MS.toggleFlag(b, i)
    else {
      const flagFirst = how === "primary" ? flagMode : !flagMode
      next = MS.act(b, i, flagFirst ? "flag" : "reveal", Math.random)
    }
    commit(b, next)
  }, [commit, flagMode])

  const giveUp = useCallback(() => {
    const b = boardRef.current
    if (MS.isOver(b)) return
    const next = MS.forfeit(b)
    const secs = startedAt.current == null ? 0 : (performance.now() - startedAt.current) / 1000
    boardRef.current = next
    setBoard(next)
    setGaveUp(true)
    setFinalSecs(Math.floor(secs))
    setPress(null)
    const pct = Math.floor(MS.progress(b) * 100)
    finish({
      score: MS.partialScore(level, b.revealed, MS.safeTotal(b)),
      won: false,
      summary: `${MS.LEVELS[level].label}: gave up with ${pct}% cleared`,
    }, 0)
  }, [finish, level])

  // ── Pointer handling (delegated on the grid) ───────────────

  const clearTimer = (g: Gesture | null) => {
    if (g?.timer != null) {
      window.clearTimeout(g.timer)
      g.timer = null
    }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const i = cellIndex(e.target)
    if (i < 0 || MS.isOver(boardRef.current)) return
    clearTimer(gesture.current)
    suppressClick.current = false
    const mouse = e.pointerType === "mouse"
    const g: Gesture = { pointerId: e.pointerId, mouse, down: i, hover: i, mode: "left", x: e.clientX, y: e.clientY, timer: null }
    gesture.current = g

    // Right button, or Ctrl+click (the macOS right-click), plants a flag on press.
    if (mouse && (e.button === 2 || (e.button === 0 && e.ctrlKey))) {
      g.mode = "right"
      if (e.button === 0) suppressClick.current = true
      apply(i, "flag")
      return
    }
    if (mouse && e.button === 1) {
      e.preventDefault()
      g.mode = "chord"
      setPress({ index: i, chord: true })
      return
    }
    if (e.button !== 0) { gesture.current = null; return }

    setPress({ index: i, chord: false })
    if (!mouse) {
      // Touch / pen: long-press does the secondary action (flag in reveal mode).
      g.timer = window.setTimeout(() => {
        g.timer = null
        if (gesture.current !== g) return
        g.mode = "done"
        suppressClick.current = true
        setPress(null)
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12)
        apply(g.down, "secondary")
      }, LONG_PRESS_MS)
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return

    if (!g.mouse) {
      // A finger that wanders is a scroll, not a long-press.
      if (g.timer != null && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) {
        clearTimer(g)
        setPress(null)
      }
      return
    }

    if (e.buttons === 0) {
      gesture.current = null
      setPress(null)
      return
    }

    const i = cellIndex(e.target)
    const both = (e.buttons & 3) === 3
    if (e.button !== -1) {
      // A second button went down or one came up (chorded pointermove).
      if (both && (g.mode === "left" || g.mode === "right")) {
        g.mode = "chord"
        g.hover = i
        setPress(i >= 0 ? { index: i, chord: true } : null)
        return
      }
      if (g.mode === "chord" && !both) {
        g.mode = "done"
        suppressClick.current = true
        setPress(null)
        if (i >= 0) apply(i, "chord")
        return
      }
    }
    if (i !== g.hover) {
      g.hover = i
      if (g.mode === "left" || g.mode === "chord") setPress(i >= 0 ? { index: i, chord: g.mode === "chord" } : null)
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    gesture.current = null
    clearTimer(g)
    setPress(null)
    const i = cellIndex(e.target)
    if (g.mode === "chord") {
      // Releasing the left button still produces a click; a middle-click does not.
      if (e.button === 0) suppressClick.current = true
      if (i >= 0) apply(i, "chord")
      return
    }
    // Classic drag-release: press on one square, let go on another.
    // (Same-square releases are handled by onClick, which also serves keyboards / AT.)
    if (g.mode === "left" && g.mouse && i >= 0 && i !== g.down) apply(i, "primary")
  }

  const onPointerCancel = () => {
    clearTimer(gesture.current)
    gesture.current = null
    setPress(null)
  }

  const onPointerLeave = () => {
    const g = gesture.current
    if (g?.mouse) {
      g.hover = -1
      setPress(null)
    }
  }

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const i = cellIndex(e.target)
    if (i >= 0) apply(i, "primary")
  }

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) e.preventDefault() // no autoscroll on middle-click
  }

  // ── Keyboard (roving focus) ────────────────────────────────

  const focusCell = (i: number) => {
    setFocusIndex(i)
    gridRef.current?.querySelector<HTMLElement>(`[data-cell="${i}"]`)?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = cellIndex(e.target)
    if (i < 0) return
    const { rows, cols } = board
    const r = Math.floor(i / cols)
    const c = i % cols
    let next = -1
    switch (e.key) {
      case "ArrowUp":    next = r > 0 ? i - cols : i; break
      case "ArrowDown":  next = r < rows - 1 ? i + cols : i; break
      case "ArrowLeft":  next = c > 0 ? i - 1 : i; break
      case "ArrowRight": next = c < cols - 1 ? i + 1 : i; break
      case "Home":       next = e.ctrlKey ? 0 : r * cols; break
      case "End":        next = e.ctrlKey ? rows * cols - 1 : r * cols + cols - 1; break
      case "PageUp":     next = c; break
      case "PageDown":   next = (rows - 1) * cols + c; break
      case "Enter":
      case " ":
        e.preventDefault()
        if (!e.repeat) apply(i, "primary")
        return
      case "f":
      case "F":
        e.preventDefault()
        if (!e.repeat) apply(i, "flag")
        return
      default:
        return
    }
    e.preventDefault()
    focusCell(next)
  }

  const onKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " ") e.preventDefault() // no synthetic click from Space
  }

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const i = cellIndex(e.target)
    if (i >= 0 && i !== focusIndex) setFocusIndex(i)
  }

  // ── Derived view ───────────────────────────────────────────

  const pressed = useMemo(() => {
    const s = new Set<number>()
    if (!press || over) return s
    const add = (j: number) => { if (board.state[j] === "hidden") s.add(j) }
    const onNumber = board.state[press.index] === "revealed" && board.counts[press.index] > 0
    if (press.chord || onNumber) {
      add(press.index)
      for (const j of MS.neighbors(board.rows, board.cols, press.index)) add(j)
    } else if (!flagMode) {
      add(press.index)
    }
    return s
  }, [press, over, board, flagMode])

  const cellPx = useMemo(() => {
    const byWidth = Math.floor((size.width - FRAME_PX) / cfg.cols)
    const byHeight = Math.floor((Math.floor(viewportH * 0.85) - VERTICAL_CHROME) / cfg.rows)
    return Math.max(MIN_CELL, Math.min(MAX_CELL, byWidth, byHeight))
  }, [size.width, viewportH, cfg.cols, cfg.rows])

  const boardStyle = {
    "--ms-cell": `${cellPx}px`,
    "--ms-font": `${Math.round(cellPx * 0.6)}px`,
  } as CSSProperties

  const exploded = board.status === "lost" && board.exploded.length > 0
  const pct = Math.floor(MS.progress(board) * 100)
  const left = MS.minesLeft(board)

  const tap = coarse ? "Tap" : "Click"
  const status =
    board.status === "won"    ? `Cleared in ${formatClock(finalSecs ?? 0)}`
    : gaveUp                  ? `Gave up at ${pct}% cleared`
    : board.status === "lost" ? `Mine hit at ${pct}% cleared`
    : flagMode                ? `Flag mode: ${tap.toLowerCase()} squares to mark mines`
    : board.status === "ready" ? "Open any square to start"
    : "Clear every safe square"

  const overflowing = cellPx * cfg.cols + FRAME_PX > size.width
  const help = [
    `${cfg.label} · ${cfg.cols}x${cfg.rows}, ${cfg.mines} mines.`,
    coarse ? "Long-press or use Flag mode to flag." : "Right-click to flag.",
    `${tap} a number whose mines are all flagged to open around it.`,
    coarse ? "" : "Keys: arrows, Space, F.",
    overflowing ? (coarse ? "Swipe the field sideways to see all of it." : "Scroll the field sideways to see all of it.") : "",
  ].filter(Boolean).join(" ")

  // ── Render ─────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <SetupScreen
        title="Minesweeper"
        description="Open every square that hides no mine. A number tells you how many mines touch that square."
        options={[{
          id: "level",
          label: "Level",
          choices: MS.LEVEL_ORDER.map((id) => {
            const l = MS.LEVELS[id]
            return { value: id, label: l.label, hint: `${l.cols}x${l.rows}, ${l.mines} mines` }
          }),
        }]}
        defaults={{ level }}
        onStart={(v) => start(MS.isLevelId(v.level) ? v.level : "beginner")}
      >
        <p className="text-center text-xs text-muted-foreground">
          Your first square is always safe. Right-click or long-press to plant a flag.
        </p>
      </SetupScreen>
    )
  }

  const rowsOut: ReactNode[] = []
  for (let r = 0; r < board.rows; r++) {
    const cells: ReactNode[] = []
    for (let c = 0; c < board.cols; c++) {
      const i = r * board.cols + c
      const v = MS.cellView(board, i)
      cells.push(
        <Cell
          key={i}
          index={i}
          row={r}
          col={c}
          kind={v.kind}
          count={v.kind === "open" ? v.count : 0}
          pressed={pressed.has(i)}
          tabbable={i === focusIndex}
          live={live}
          animate={!reduceMotion}
        />,
      )
    }
    rowsOut.push(<div key={r} role="row" className="flex">{cells}</div>)
  }

  return (
    <div className="flex flex-col">
      <GameToolbar
        status={status}
        stats={[
          { label: "Mines", value: left },
          { label: "Time", value: <Clock running={board.status === "playing"} resetKey={gameKey} frozen={over ? finalSecs : null} /> },
        ]}
        actions={
          <>
            <div role="group" aria-label="Click action" className="inline-flex">
              <ToolButton
                aria-pressed={!flagMode}
                onClick={() => setFlagMode(false)}
                disabled={over}
                className={cn("rounded-r-none", !flagMode && ACTIVE_TOGGLE)}
              >
                <Pickaxe className="h-3.5 w-3.5" aria-hidden />
                Reveal
              </ToolButton>
              <ToolButton
                aria-pressed={flagMode}
                onClick={() => setFlagMode(true)}
                disabled={over}
                className={cn("-ml-px rounded-l-none", flagMode && ACTIVE_TOGGLE)}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                Flag
              </ToolButton>
            </div>
            {board.status === "ready" && (
              <ToolButton onClick={() => setPhase("setup")}>
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Level
              </ToolButton>
            )}
            <ToolButton onClick={giveUp} disabled={over}>
              <CircleX className="h-3.5 w-3.5" aria-hidden />
              Give up
            </ToolButton>
          </>
        }
      />

      <div ref={measureRef} className="w-full">
        {size.width > 0 && (
          // The shake moves the whole scroller (inside the host padding) so it never adds a scrollbar.
          <motion.div
            className="overflow-x-auto overscroll-x-contain pb-1"
            animate={exploded && !reduceMotion ? { x: [0, -6, 6, -4, 4, -2, 0] } : { x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className={cn("mx-auto w-max p-[6px]", BOARD_PALETTE, RAISED_FRAME)} style={boardStyle}>
              <div className={SUNKEN_FRAME}>
                <div
                  ref={gridRef}
                  role="grid"
                  aria-label={`Minefield, ${board.rows} rows by ${board.cols} columns`}
                  aria-describedby={helpId}
                  className="touch-manipulation select-none [-webkit-touch-callout:none]"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  onPointerLeave={onPointerLeave}
                  onMouseDown={onMouseDown}
                  onClick={onClick}
                  onContextMenu={(e) => e.preventDefault()}
                  onKeyDown={onKeyDown}
                  onKeyUp={onKeyUp}
                  onFocus={onFocus}
                >
                  {rowsOut}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <p id={helpId} className="mt-2 text-center text-xs text-muted-foreground">
        {help}
      </p>
    </div>
  )
}
