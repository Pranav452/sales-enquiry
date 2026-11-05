"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Bomb, Flag } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

export const SIZE = 9
export const MINES = 10
const nowMs = (): number => Date.now()
const TOTAL = SIZE * SIZE
const LONG_PRESS_MS = 420

export interface Cell { mine: boolean; adj: number; revealed: boolean; flagged: boolean }

const C = { panel: "#111c33", border: "#1e2d4d", text: "#e2e8f0", muted: "#94a3b8", gold: "#fbbf24" }
const NUM_COLORS = ["", "#38bdf8", "#4ade80", "#f87171", "#a78bfa", "#fb923c", "#2dd4bf", "#e2e8f0", "#94a3b8"]

export function neighbors(i: number): number[] {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push(nr * SIZE + nc)
    }
  }
  return out
}

export function emptyBoard(): Cell[] {
  return Array.from({ length: TOTAL }, () => ({ mine: false, adj: 0, revealed: false, flagged: false }))
}

/** Places mines avoiding the clicked cell and all its neighbours, so the first click opens an area. */
export function placeMines(board: Cell[], safe: number, rng: () => number = Math.random): Cell[] {
  const banned = new Set([safe, ...neighbors(safe)])
  const pool: number[] = []
  for (let i = 0; i < TOTAL; i++) if (!banned.has(i)) pool.push(i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const mineSet = new Set(pool.slice(0, MINES))
  const next = board.map((c, i) => ({ ...c, mine: mineSet.has(i) }))
  return next.map((c, i) => ({ ...c, adj: neighbors(i).filter((n) => next[n].mine).length }))
}

export function revealCell(board: Cell[], idx: number): { board: Cell[]; hitMine: boolean } {
  const start = board[idx]
  if (start.revealed || start.flagged) return { board, hitMine: false }
  const next = board.map((c) => ({ ...c }))
  if (start.mine) {
    next[idx].revealed = true
    return { board: next, hitMine: true }
  }
  const stack = [idx]
  while (stack.length) {
    const i = stack.pop() as number
    const cell = next[i]
    if (cell.revealed || cell.flagged || cell.mine) continue
    cell.revealed = true
    if (cell.adj === 0) neighbors(i).forEach((n) => { if (!next[n].revealed && !next[n].flagged) stack.push(n) })
  }
  return { board: next, hitMine: false }
}

type Status = "ready" | "playing" | "won" | "lost"

export default function StraitSweeper({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [cells, setCells] = useState<Cell[]>(emptyBoard)
  const [status, setStatus] = useState<Status>("ready")
  const [seconds, setSeconds] = useState(0)
  const [flagMode, setFlagMode] = useState(false)
  const [boom, setBoom] = useState<number | null>(null)

  const startRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishedRef = useRef(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const lastPointer = useRef("mouse")
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])
  const cbRef = useRef(onGameOver)
  useEffect(() => { cbRef.current = onGameOver }, [onGameOver])

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (endTimerRef.current) clearTimeout(endTimerRef.current)
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  const over = status === "won" || status === "lost"

  const finish = (won: boolean, board: Cell[]) => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    const secs = startRef.current ? Math.floor((nowMs() - startRef.current) / 1000) : 0
    setSeconds(secs)
    setStatus(won ? "won" : "lost")
    const safeRevealed = board.filter((c) => c.revealed && !c.mine).length
    const score = won ? Math.max(100, 1000 - secs * 5) : safeRevealed
    endTimerRef.current = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      cbRef.current({
        score,
        won,
        summary: won ? `Channel cleared in ${secs}s` : `Hit a mine after clearing ${safeRevealed} safe cells`,
      })
    }, 800)
  }

  const toggleFlag = (idx: number) => {
    if (over) return
    setCells((prev) => {
      if (prev[idx].revealed) return prev
      const next = prev.slice()
      next[idx] = { ...prev[idx], flagged: !prev[idx].flagged }
      return next
    })
  }

  const reveal = (idx: number) => {
    if (over || cells[idx].flagged || cells[idx].revealed) return
    let board = cells
    if (status === "ready") {
      board = placeMines(cells, idx)
      startRef.current = nowMs()
      setStatus("playing")
      intervalRef.current = setInterval(() => {
        if (startRef.current) setSeconds(Math.floor((nowMs() - startRef.current) / 1000))
      }, 250)
    }
    const res = revealCell(board, idx)
    setCells(res.board)
    if (res.hitMine) {
      setBoom(idx)
      finish(false, res.board)
      return
    }
    const safeRevealed = res.board.filter((c) => c.revealed && !c.mine).length
    if (safeRevealed === TOTAL - MINES) finish(true, res.board)
  }

  const onCellClick = (idx: number) => {
    if (longPressed.current) { longPressed.current = false; return }
    if (flagMode) toggleFlag(idx)
    else reveal(idx)
  }

  const onPointerDown = (idx: number, e: React.PointerEvent) => {
    lastPointer.current = e.pointerType
    longPressed.current = false
    if (e.pointerType === "mouse" || over) return
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      toggleFlag(idx)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) { try { navigator.vibrate(20) } catch { /* ignore */ } }
    }, LONG_PRESS_MS)
  }
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null } }

  const onContextMenu = (idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    if (lastPointer.current === "mouse") { toggleFlag(idx); return }
    cancelPress()
    if (!longPressed.current) { longPressed.current = true; toggleFlag(idx) }
  }

  const onKeyDown = (idx: number, e: React.KeyboardEvent) => {
    const r = Math.floor(idx / SIZE)
    const c = idx % SIZE
    let target = -1
    if (e.key === "ArrowLeft" && c > 0) target = idx - 1
    else if (e.key === "ArrowRight" && c < SIZE - 1) target = idx + 1
    else if (e.key === "ArrowUp" && r > 0) target = idx - SIZE
    else if (e.key === "ArrowDown" && r < SIZE - 1) target = idx + SIZE
    if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault()
    if (target >= 0) cellRefs.current[target]?.focus()
    else if (e.key === "f" || e.key === "F") toggleFlag(idx)
    else if (e.key === " " || e.key === "Enter") onCellClick(idx)
  }

  const flags = cells.filter((c) => c.flagged).length
  const minesLeft = status === "won" ? 0 : MINES - flags

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 select-none" style={{ color: C.text }}>
      <div className="grid w-full max-w-[396px] grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Mines left</div>
          <div className="text-base font-bold tabular-nums" style={{ color: "#f87171" }}>{minesLeft}</div>
        </div>
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          aria-pressed={flagMode}
          className="flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: flagMode ? C.gold : C.panel, color: flagMode ? "#1c1917" : C.text, border: `1px solid ${flagMode ? C.gold : C.border}` }}
        >
          <Flag className="h-3.5 w-3.5" /> Flag {flagMode ? "on" : "off"}
        </button>
        <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Time</div>
          <div className="text-base font-bold tabular-nums">{seconds}s</div>
        </div>
      </div>

      <div
        className="grid w-full max-w-[396px] grid-cols-9 gap-[3px] rounded-xl p-2"
        style={{ background: C.panel, border: `1px solid ${C.border}`, touchAction: "manipulation", WebkitTouchCallout: "none" }}
        role="grid"
        aria-label="Minefield"
      >
        {cells.map((cell, i) => {
          const lostMine = status === "lost" && cell.mine && !cell.flagged
          const wonFlag = status === "won" && cell.mine
          const wrongFlag = status === "lost" && cell.flagged && !cell.mine
          const open = cell.revealed || lostMine
          const showFlag = (cell.flagged && !wrongFlag) || wonFlag
          const isBoom = boom === i
          return (
            <button
              key={i}
              ref={(el) => { cellRefs.current[i] = el }}
              type="button"
              role="gridcell"
              aria-label={`Row ${Math.floor(i / SIZE) + 1} column ${(i % SIZE) + 1}${cell.flagged ? ", flagged" : open ? (cell.mine ? ", mine" : `, ${cell.adj} adjacent`) : ", hidden"}`}
              onClick={() => onCellClick(i)}
              onPointerDown={(e) => onPointerDown(i, e)}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onPointerCancel={cancelPress}
              onContextMenu={(e) => onContextMenu(i, e)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="flex aspect-square items-center justify-center rounded-[5px] text-[clamp(12px,4.4vw,18px)] font-extrabold outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              style={{
                background: isBoom ? "#b91c1c" : open ? "#0b1424" : "linear-gradient(180deg,#3b82f6 0%,#1d4ed8 100%)",
                border: open ? "1px solid #1e2d4d" : "1px solid #60a5fa66",
                boxShadow: open ? "none" : "inset 0 -3px 0 rgba(0,0,0,0.3)",
                cursor: over ? "default" : "pointer",
                color: NUM_COLORS[cell.adj] || C.text,
              }}
            >
              {open && !cell.mine && cell.adj > 0 && (
                <motion.span initial={reduced ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.15 }}>{cell.adj}</motion.span>
              )}
              {lostMine && (
                <motion.span
                  className="flex h-[62%] w-[62%] items-center justify-center"
                  initial={reduced ? false : { scale: isBoom ? 0.3 : 0.6 }}
                  animate={{ scale: isBoom && !reduced ? [1.5, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Bomb className="h-full w-full" color={isBoom ? "#fff" : "#f87171"} />
                </motion.span>
              )}
              {!open && showFlag && (
                <motion.span className="flex h-[58%] w-[58%] items-center justify-center" initial={reduced ? false : { scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                  <Flag className="h-full w-full" color={wonFlag ? "#4ade80" : "#fbbf24"} fill={wonFlag ? "#4ade80" : "#fbbf24"} />
                </motion.span>
              )}
              {!open && wrongFlag && <Flag className="h-[58%] w-[58%]" color="#f87171" />}
            </button>
          )
        })}
      </div>

      <p className="min-h-5 text-center text-sm font-medium" style={{ color: status === "won" ? "#4ade80" : status === "lost" ? "#f87171" : C.text }} aria-live="polite">
        {status === "won" ? "Channel cleared! Safe passage." : status === "lost" ? "Boom! Struck a sea mine." : "Reveal every safe cell. The first tap is always safe."}
      </p>
      <p className="text-center text-xs" style={{ color: C.muted }}>Right-click, long-press, or use Flag mode to flag a mine. Focused cell: F flags.</p>
    </div>
  )
}
