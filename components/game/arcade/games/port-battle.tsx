"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Swords } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

// LOGIC-START
const ROWS = 6
const COLS = 7
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6]
const DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

/** Lowest empty row in a column, or -1 when full. Row 0 is the top. */
function dropRow(b: number[], c: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + c] === 0) return r
  return -1
}

/** Returns the four winning cell indexes for player p, or null. */
function findWin(b: number[], p: number): number[] | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (b[r * COLS + c] !== p) continue
      for (const [dr, dc] of DIRS) {
        const cells: number[] = []
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr * COLS + cc] !== p) break
          cells.push(rr * COLS + cc)
        }
        if (cells.length === 4) return cells
      }
    }
  }
  return null
}

function isFull(b: number[]): boolean {
  for (let c = 0; c < COLS; c++) if (b[c] === 0) return false
  return true
}

function scoreWindow(b: number[], r: number, c: number, dr: number, dc: number): number {
  let bot = 0
  let human = 0
  let empty = 0
  for (let k = 0; k < 4; k++) {
    const v = b[(r + dr * k) * COLS + (c + dc * k)]
    if (v === 2) bot++
    else if (v === 1) human++
    else empty++
  }
  if (bot > 0 && human > 0) return 0
  if (bot === 3 && empty === 1) return 5
  if (bot === 2 && empty === 2) return 2
  if (human === 3 && empty === 1) return -4
  if (human === 2 && empty === 2) return -1
  return 0
}

/** Static evaluation from the bot's (player 2) point of view. */
function evaluate(b: number[]): number {
  let s = 0
  for (let r = 0; r < ROWS; r++) {
    const v = b[r * COLS + 3]
    if (v === 2) s += 3
    else if (v === 1) s -= 3
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const er = r + dr * 3
        const ec = c + dc * 3
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue
        s += scoreWindow(b, r, c, dr, dc)
      }
    }
  }
  return s
}

function minimax(b: number[], depth: number, alpha: number, beta: number, maxing: boolean): number {
  if (findWin(b, 2)) return 1_000_000 + depth
  if (findWin(b, 1)) return -1_000_000 - depth
  if (depth === 0 || isFull(b)) return evaluate(b)
  if (maxing) {
    let best = -Infinity
    for (const c of COL_ORDER) {
      const r = dropRow(b, c)
      if (r < 0) continue
      b[r * COLS + c] = 2
      const v = minimax(b, depth - 1, alpha, beta, false)
      b[r * COLS + c] = 0
      if (v > best) best = v
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  }
  let best = Infinity
  for (const c of COL_ORDER) {
    const r = dropRow(b, c)
    if (r < 0) continue
    b[r * COLS + c] = 1
    const v = minimax(b, depth - 1, alpha, beta, true)
    b[r * COLS + c] = 0
    if (v < best) best = v
    if (best < beta) beta = best
    if (alpha >= beta) break
  }
  return best
}

/** Picks the bot's column: take a win, block a loss, otherwise minimax depth 5. */
function chooseBotMove(board: number[], depth = 5): number {
  const b = board.slice()
  const cols = COL_ORDER.filter((c) => dropRow(b, c) >= 0)
  for (const p of [2, 1]) {
    for (const c of cols) {
      const r = dropRow(b, c)
      b[r * COLS + c] = p
      const w = findWin(b, p)
      b[r * COLS + c] = 0
      if (w) return c
    }
  }
  let bestScore = -Infinity
  let bestCols: number[] = []
  for (const c of cols) {
    const r = dropRow(b, c)
    b[r * COLS + c] = 2
    const v = minimax(b, depth - 1, -Infinity, Infinity, false)
    b[r * COLS + c] = 0
    if (v > bestScore) {
      bestScore = v
      bestCols = [c]
    } else if (v === bestScore) bestCols.push(c)
  }
  return bestCols[Math.floor(Math.random() * bestCols.length)]
}
// LOGIC-END

const PLAYER = "#f97316"
const RIVAL = "#38bdf8"

function Disc({ who, glow }: { who: 1 | 2; glow?: boolean }) {
  const base = who === 1 ? PLAYER : RIVAL
  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{
        background: `repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 7px), ${base}`,
        boxShadow: glow
          ? `0 0 0 3px #fff, 0 0 14px 4px ${base}`
          : "inset 0 -3px 5px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.35)",
      }}
    >
      <div className="absolute inset-[24%] rounded-[3px] border-2 border-white/55">
        <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white/55" />
      </div>
    </div>
  )
}

export default function PortBattle({ onGameOver }: ArcadeGameProps) {
  const reduced = useReducedMotion()
  const [board, setBoard] = useState<number[]>(() => Array<number>(ROWS * COLS).fill(0))
  const [moves, setMoves] = useState(0)
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [winLine, setWinLine] = useState<number[] | null>(null)
  const [status, setStatus] = useState<"play" | "won" | "lost" | "draw">("play")

  const boardRef = useRef(board)
  const movesRef = useRef(0)
  const busyRef = useRef(false)
  const doneRef = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const overCbRef = useRef(onGameOver)

  useEffect(() => {
    overCbRef.current = onGameOver
  }, [onGameOver])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const finish = useCallback(
    (result: "won" | "lost" | "draw", line: number[] | null, playerMoves: number) => {
      busyRef.current = true
      setBusy(true)
      setStatus(result)
      setWinLine(line)
      const score = result === "won" ? 100 + (21 - playerMoves) * 5 : result === "draw" ? 30 : 0
      const summary =
        result === "won"
          ? `Connected four in ${playerMoves} moves`
          : result === "draw"
            ? "Stalemate at the quay"
            : "Rival forwarder won the berth"
      later(() => {
        if (doneRef.current) return
        doneRef.current = true
        overCbRef.current({ score, won: result === "won", summary })
      }, 1100)
    },
    [later],
  )

  const place = useCallback((b: number[], c: number, who: 1 | 2): number[] => {
    const r = dropRow(b, c)
    const nb = b.slice()
    nb[r * COLS + c] = who
    return nb
  }, [])

  const playerDrop = useCallback(
    (c: number) => {
      if (busyRef.current || doneRef.current) return
      if (dropRow(boardRef.current, c) < 0) return
      busyRef.current = true
      setBusy(true)
      const nb = place(boardRef.current, c, 1)
      boardRef.current = nb
      movesRef.current += 1
      setBoard(nb)
      setMoves(movesRef.current)
      const pm = movesRef.current
      const win = findWin(nb, 1)
      if (win) {
        later(() => finish("won", win, pm), 450)
        return
      }
      if (isFull(nb)) {
        later(() => finish("draw", null, pm), 450)
        return
      }
      later(() => {
        const bc = chooseBotMove(boardRef.current)
        const bb = place(boardRef.current, bc, 2)
        boardRef.current = bb
        setBoard(bb)
        const bw = findWin(bb, 2)
        if (bw) {
          later(() => finish("lost", bw, pm), 450)
          return
        }
        if (isFull(bb)) {
          later(() => finish("draw", null, pm), 450)
          return
        }
        later(() => {
          busyRef.current = false
          setBusy(false)
        }, 400)
      }, 650)
    },
    [finish, later, place],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "7") {
        e.preventDefault()
        playerDrop(Number(e.key) - 1)
      } else if (e.key === " " || e.key.startsWith("Arrow")) {
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [playerDrop])

  const winSet = new Set(winLine ?? [])
  const hint =
    status === "play"
      ? busy
        ? "Rival forwarder is bidding for the berth..."
        : "Pick a column (click or keys 1-7). Connect four boxes."
      : status === "won"
        ? "Berth secured. Four in a row!"
        : status === "lost"
          ? "The rival connected four."
          : "Board full. No clear winner."

  return (
    <div className="mx-auto flex w-full max-w-[560px] select-none flex-col items-center gap-2 text-slate-100">
      <div className="flex w-full items-center justify-between px-1 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-purple-400">
          <Swords size={14} aria-hidden /> PORT BATTLE
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PLAYER }} /> YOU
          <i className="ml-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: RIVAL }} /> RIVAL
        </span>
        <span className="text-slate-300">
          MOVES <b className="text-amber-400">{moves}</b>
        </span>
      </div>

      <div
        className="w-full max-w-[420px] rounded-xl border-2 border-slate-600 bg-gradient-to-b from-slate-700 to-slate-800 p-2"
        onPointerLeave={() => setHover(null)}
      >
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: COLS }, (_, c) => {
            const canDrop = status === "play" && !busy && dropRow(board, c) >= 0
            return (
              <button
                key={c}
                type="button"
                aria-label={`Drop in column ${c + 1}`}
                tabIndex={-1}
                disabled={!canDrop}
                onPointerEnter={() => setHover(c)}
                onClick={() => playerDrop(c)}
                className="flex flex-col gap-1.5 rounded-md outline-none disabled:cursor-default"
                style={{ background: hover === c && canDrop ? "rgba(255,255,255,0.08)" : "transparent" }}
              >
                <div className="relative aspect-square w-full">
                  {hover === c && canDrop && (
                    <div className="absolute inset-0 opacity-60">
                      <Disc who={1} />
                    </div>
                  )}
                </div>
                {Array.from({ length: ROWS }, (_, r) => {
                  const v = board[r * COLS + c]
                  const lit = winSet.has(r * COLS + c)
                  return (
                    <div
                      key={r}
                      className="relative aspect-square w-full rounded-full bg-[#0b1220]"
                      style={{ boxShadow: "inset 0 3px 6px rgba(0,0,0,0.7)" }}
                    >
                      {v !== 0 && (
                        <motion.div
                          key={`d${v}`}
                          className="absolute inset-0"
                          initial={
                            reduced ? false : { y: `${-(r + 1) * 108 - 108}%`, opacity: 1 }
                          }
                          animate={
                            lit && !reduced
                              ? { y: 0, scale: [1, 1.12, 1] }
                              : { y: 0, scale: 1 }
                          }
                          transition={
                            lit && !reduced
                              ? { scale: { repeat: Infinity, duration: 0.9 } }
                              : { type: "tween", ease: "easeIn", duration: 0.12 + r * 0.05 }
                          }
                        >
                          <Disc who={v as 1 | 2} glow={lit} />
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </button>
            )
          })}
        </div>
      </div>

      <p className="min-h-4 text-center text-xs text-slate-400" aria-live="polite">
        {hint}
      </p>
    </div>
  )
}
