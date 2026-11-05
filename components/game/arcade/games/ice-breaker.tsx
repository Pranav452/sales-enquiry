"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Snowflake } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

// LOGIC-START
const SIZE = 4
const CELLS = SIZE * SIZE

function solvedBoard(): number[] {
  return Array.from({ length: CELLS }, (_, i) => (i + 1) % CELLS)
}

function isSolved(b: number[]): boolean {
  for (let i = 0; i < CELLS - 1; i++) if (b[i] !== i + 1) return false
  return b[CELLS - 1] === 0
}

function isAdjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / SIZE)
  const ac = a % SIZE
  const br = Math.floor(b / SIZE)
  const bc = b % SIZE
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1
}

function neighbours(i: number): number[] {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  const out: number[] = []
  if (r > 0) out.push(i - SIZE)
  if (r < SIZE - 1) out.push(i + SIZE)
  if (c > 0) out.push(i - 1)
  if (c < SIZE - 1) out.push(i + 1)
  return out
}

/** Shuffles by random legal moves from the solved state, so it is always solvable. */
function shuffledBoard(moves = 200): number[] {
  for (;;) {
    const b = solvedBoard()
    let gap = CELLS - 1
    let prev = -1
    for (let i = 0; i < moves; i++) {
      const opts = neighbours(gap).filter((n) => n !== prev)
      const n = opts[Math.floor(Math.random() * opts.length)]
      b[gap] = b[n]
      b[n] = 0
      prev = gap
      gap = n
    }
    if (!isSolved(b)) return b
  }
}
// LOGIC-END

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
}

export default function IceBreaker({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [board, setBoard] = useState<number[]>(() => shuffledBoard())
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [won, setWon] = useState(false)

  const startRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  const overCbRef = useRef(onGameOver)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    overCbRef.current = onGameOver
  }, [onGameOver])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  // clock
  const running = moves > 0 && !won
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (startRef.current !== null) setSeconds(Math.floor((Date.now() - startRef.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const move = useCallback(
    (idx: number) => {
      if (won) return
      const gap = board.indexOf(0)
      if (!isAdjacent(idx, gap)) return
      if (startRef.current === null) startRef.current = Date.now()
      const nb = board.slice()
      nb[gap] = nb[idx]
      nb[idx] = 0
      const nm = moves + 1
      setBoard(nb)
      setMoves(nm)
      if (isSolved(nb)) {
        const secs = Math.floor((Date.now() - startRef.current) / 1000)
        setSeconds(secs)
        setWon(true)
        timers.current.push(
          setTimeout(() => {
            if (doneRef.current) return
            doneRef.current = true
            overCbRef.current({
              score: Math.max(50, 2000 - nm * 5 - secs * 2),
              won: true,
              summary: `Floes cleared in ${nm} moves, ${fmt(secs)}`,
            })
          }, 900),
        )
      }
    },
    [board, moves, won],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.key.startsWith("Arrow") && e.key !== " ") return
      e.preventDefault()
      const gap = board.indexOf(0)
      const r = Math.floor(gap / SIZE)
      const c = gap % SIZE
      // the arrow names the direction the tile slides
      if (e.key === "ArrowLeft" && c < SIZE - 1) move(gap + 1)
      else if (e.key === "ArrowRight" && c > 0) move(gap - 1)
      else if (e.key === "ArrowUp" && r < SIZE - 1) move(gap + SIZE)
      else if (e.key === "ArrowDown" && r > 0) move(gap - SIZE)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [board, move])

  const tiles = Array.from({ length: CELLS - 1 }, (_, i) => i + 1)

  return (
    <div className="mx-auto flex w-full max-w-[560px] select-none flex-col items-center gap-2 text-slate-100">
      <div className="flex w-full items-center justify-between px-1 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-sky-300">
          <Snowflake size={14} aria-hidden /> ICE BREAKER
        </span>
        <span className="text-slate-300">
          MOVES <b className="text-amber-400">{moves}</b>
        </span>
        <span className="text-slate-300">
          TIME <b className="text-sky-300">{fmt(seconds)}</b>
        </span>
      </div>

      <div
        className="relative aspect-square w-full max-w-[380px] overflow-hidden rounded-xl border-2 border-slate-600"
        style={{ background: "linear-gradient(160deg, #0c2a45, #08203a)", touchAction: "manipulation" }}
      >
        {tiles.map((n) => {
          const pos = board.indexOf(n)
          const row = Math.floor(pos / SIZE)
          const col = pos % SIZE
          const home = pos === n - 1
          const movable = !won && isAdjacent(pos, board.indexOf(0))
          return (
            <motion.button
              key={n}
              type="button"
              tabIndex={-1}
              aria-label={`Ice floe ${n}`}
              initial={false}
              animate={{ x: `${col * 100}%`, y: `${row * 100}%` }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
              onPointerDown={(e) => {
                e.preventDefault()
                move(pos)
              }}
              className="absolute left-0 top-0 h-1/4 w-1/4 p-[3px] outline-none"
              style={{ cursor: movable ? "pointer" : "default" }}
            >
              <span
                className="relative flex h-full w-full items-center justify-center rounded-xl text-2xl font-extrabold"
                style={{
                  color: "#0c4a6e",
                  background: home
                    ? "linear-gradient(145deg, #ecfeff 0%, #a5f3fc 55%, #67e8f9 100%)"
                    : "linear-gradient(145deg, #f0f9ff 0%, #bae6fd 55%, #7dd3fc 100%)",
                  boxShadow: home
                    ? "inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -4px 8px rgba(8,145,178,0.4), 0 0 0 2px rgba(34,211,238,0.7)"
                    : "inset 0 2px 4px rgba(255,255,255,0.85), inset 0 -4px 8px rgba(14,116,144,0.35), 0 2px 5px rgba(0,0,0,0.45)",
                }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-2 top-1.5 h-2 w-5 rotate-[-18deg] rounded-full bg-white/60"
                />
                {n}
              </span>
            </motion.button>
          )
        })}
        {won && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-sky-950/60 text-lg font-bold tracking-wide text-cyan-200"
          >
            Channel clear!
          </motion.div>
        )}
      </div>

      <p className="text-center text-xs text-slate-400">
        Tap a floe beside the gap or use arrow keys. Order 1 to 15.
      </p>
    </div>
  )
}
