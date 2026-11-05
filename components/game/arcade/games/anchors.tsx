"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { ArcadeGameProps } from "@/lib/game/arcade"

type Who = "P" | "B"
type Mark = Who | null
type Board = Mark[]

const ROUNDS = 5
const RANDOM_MOVE_CHANCE = 0.25
const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

const C = { bg: "#0b1220", panel: "#111c33", border: "#1e2d4d", text: "#e2e8f0", muted: "#94a3b8", anchor: "#38bdf8", wheel: "#f59e0b", win: "#fbbf24" }

export function findWinner(b: Board): { who: Who; line: number[] } | null {
  for (const line of LINES) {
    const [a, c, d] = line
    const m = b[a]
    if (m && m === b[c] && m === b[d]) return { who: m, line }
  }
  return null
}

function minimax(b: Board, turn: Who, depth: number): number {
  const w = findWinner(b)
  if (w) return w.who === "B" ? 10 - depth : depth - 10
  if (b.every((m) => m !== null)) return 0
  let best = turn === "B" ? -Infinity : Infinity
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    const next = b.slice()
    next[i] = turn
    const v = minimax(next, turn === "B" ? "P" : "B", depth + 1)
    best = turn === "B" ? Math.max(best, v) : Math.min(best, v)
  }
  return best
}

export function chooseBotMove(b: Board, rng: () => number = Math.random): number {
  const empties: number[] = []
  b.forEach((m, i) => { if (!m) empties.push(i) })
  if (empties.length === 0) return -1
  if (rng() < RANDOM_MOVE_CHANCE) return empties[Math.floor(rng() * empties.length)]
  let bestScore = -Infinity
  let bestMoves: number[] = []
  for (const i of empties) {
    const next = b.slice()
    next[i] = "B"
    const v = minimax(next, "P", 1)
    if (v > bestScore) { bestScore = v; bestMoves = [i] } else if (v === bestScore) bestMoves.push(i)
  }
  return bestMoves[Math.floor(rng() * bestMoves.length)]
}

interface State {
  board: Board
  turn: Who
  round: number
  wins: number
  losses: number
  draws: number
  result: "P" | "B" | "D" | null
  line: number[] | null
  done: boolean
}

function freshRound(round: number): Pick<State, "board" | "turn" | "result" | "line"> {
  return { board: Array<Mark>(9).fill(null), turn: round % 2 === 0 ? "P" : "B", result: null, line: null }
}

function applyMove(s: State, idx: number): State {
  if (s.result || s.done || s.board[idx]) return s
  const board = s.board.slice()
  board[idx] = s.turn
  const w = findWinner(board)
  if (w) {
    return { ...s, board, result: w.who, line: w.line, wins: s.wins + (w.who === "P" ? 1 : 0), losses: s.losses + (w.who === "B" ? 1 : 0) }
  }
  if (board.every((m) => m !== null)) return { ...s, board, result: "D", draws: s.draws + 1 }
  return { ...s, board, turn: s.turn === "P" ? "B" : "P" }
}

function advance(s: State): State {
  const played = s.round + 1
  const remaining = ROUNDS - played
  const decided = played >= ROUNDS || Math.abs(s.wins - s.losses) > remaining
  if (decided) return { ...s, done: true }
  return { ...s, round: s.round + 1, ...freshRound(s.round + 1) }
}

function center(i: number): [number, number] {
  return [(i % 3) * 100 + 50, Math.floor(i / 3) * 100 + 50]
}

function AnchorMark({ i, animate }: { i: number; animate: boolean }) {
  const [cx, cy] = center(i)
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <motion.g
        initial={animate ? { scale: 0, rotate: -25, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        stroke={C.anchor} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none"
      >
        <circle cx={0} cy={-26} r={6} />
        <line x1={0} y1={-20} x2={0} y2={26} />
        <line x1={-13} y1={-10} x2={13} y2={-10} />
        <path d="M -26 6 C -24 30 24 30 26 6" />
        <path d="M -26 6 L -32 13 M -26 6 L -18 11 M 26 6 L 32 13 M 26 6 L 18 11" />
      </motion.g>
    </g>
  )
}

function WheelMark({ i, animate }: { i: number; animate: boolean }) {
  const [cx, cy] = center(i)
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <motion.g
        initial={animate ? { scale: 0, rotate: -90, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        stroke={C.wheel} strokeWidth={4.5} strokeLinecap="round" fill="none"
      >
        <circle cx={0} cy={0} r={22} />
        <circle cx={0} cy={0} r={6} />
        {Array.from({ length: 8 }).map((_, k) => {
          const a = (k * Math.PI) / 4
          return (
            <g key={k}>
              <line x1={Math.cos(a) * 6} y1={Math.sin(a) * 6} x2={Math.cos(a) * 22} y2={Math.sin(a) * 22} />
              <line x1={Math.cos(a) * 22} y1={Math.sin(a) * 22} x2={Math.cos(a) * 32} y2={Math.sin(a) * 32} strokeWidth={6} />
            </g>
          )
        })}
      </motion.g>
    </g>
  )
}

export default function Anchors({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [s, setS] = useState<State>(() => ({
    ...freshRound(0), round: 0, wins: 0, losses: 0, draws: 0, done: false,
  }))
  const finishedRef = useRef(false)
  const cbRef = useRef(onGameOver)
  useEffect(() => { cbRef.current = onGameOver }, [onGameOver])

  // Bot turn
  useEffect(() => {
    if (s.turn !== "B" || s.result || s.done) return
    const board = s.board
    const t = setTimeout(() => {
      const move = chooseBotMove(board)
      if (move < 0) return
      setS((prev) => (prev.turn === "B" ? applyMove(prev, move) : prev))
    }, 550)
    return () => clearTimeout(t)
  }, [s.turn, s.result, s.done, s.board])

  // Round result -> next round / series end
  useEffect(() => {
    if (!s.result || s.done) return
    const t = setTimeout(() => setS((prev) => (prev.result ? advance(prev) : prev)), 1100)
    return () => clearTimeout(t)
  }, [s.result, s.done])

  // Series over -> report once
  useEffect(() => {
    if (!s.done) return
    const t = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      cbRef.current({
        score: s.wins * 3 + s.draws,
        won: s.wins > s.losses,
        summary: `${s.wins} won, ${s.draws} drawn, ${s.losses} lost`,
      })
    }, 800)
    return () => clearTimeout(t)
  }, [s.done, s.wins, s.draws, s.losses])

  const place = useCallback((idx: number) => {
    setS((prev) => (prev.turn === "P" ? applyMove(prev, idx) : prev))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        place(Number(e.key) - 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [place])

  const score = s.wins * 3 + s.draws
  const canPlay = s.turn === "P" && !s.result && !s.done
  let status = "Your turn: drop an anchor"
  if (s.done) status = s.wins > s.losses ? "Series won. Fair winds!" : s.wins < s.losses ? "Series lost. The harbour master wins." : "Series tied."
  else if (s.result === "P") status = "Round won!"
  else if (s.result === "B") status = "The wheel takes this round."
  else if (s.result === "D") status = "Dead calm: a draw."
  else if (s.turn === "B") status = "Harbour master is thinking..."

  const chips: [string, string, string][] = [
    ["Round", `${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}`, C.text],
    ["You", String(s.wins), C.anchor],
    ["Draw", String(s.draws), C.muted],
    ["Bot", String(s.losses), C.wheel],
    ["Score", String(score), C.win],
  ]

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 select-none" style={{ color: C.text }}>
      <div className="grid w-full max-w-[400px] grid-cols-5 gap-2">
        {chips.map(([label, val, color]) => (
          <div key={label} className="rounded-lg px-1 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</div>
            <div className="text-base font-bold tabular-nums" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-[360px] rounded-xl p-2" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
        <svg viewBox="0 0 300 300" className="block h-auto w-full" role="group" aria-label="Tic-tac-toe board">
          <g stroke="#334155" strokeWidth={5} strokeLinecap="round">
            <line x1={100} y1={12} x2={100} y2={288} />
            <line x1={200} y1={12} x2={200} y2={288} />
            <line x1={12} y1={100} x2={288} y2={100} />
            <line x1={12} y1={200} x2={288} y2={200} />
          </g>
          {s.board.map((m, i) => {
            const [cx, cy] = center(i)
            const clickable = canPlay && !m
            return (
              <g key={i}>
                <rect
                  x={cx - 48} y={cy - 48} width={96} height={96} rx={10}
                  className={clickable ? "cursor-pointer fill-transparent hover:fill-sky-400/10" : "fill-transparent"}
                  role="button" aria-label={`Cell ${i + 1}${m ? (m === "P" ? ", anchor" : ", wheel") : ", empty"}`}
                  onClick={() => place(i)}
                />
                {!m && (
                  <text x={cx} y={cy + 6} textAnchor="middle" fontSize={16} fill="#334155" pointerEvents="none">{i + 1}</text>
                )}
                {m === "P" && <AnchorMark i={i} animate={!reduced} />}
                {m === "B" && <WheelMark i={i} animate={!reduced} />}
              </g>
            )
          })}
          {s.line && (() => {
            const [x1, y1] = center(s.line[0])
            const [x2, y2] = center(s.line[2])
            return (
              <motion.line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={C.win} strokeWidth={7} strokeLinecap="round" opacity={0.9} pointerEvents="none"
                initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }}
              />
            )
          })()}
        </svg>
      </div>

      <p className="min-h-5 text-center text-sm font-medium" style={{ color: s.result === "B" ? C.wheel : s.result === "P" ? C.anchor : C.text }} aria-live="polite">{status}</p>
      <p className="text-center text-xs" style={{ color: C.muted }}>
        Tap a square or press 1-9. You are the anchor; the bot is the ship&apos;s wheel. Starts alternate each round.
      </p>
    </div>
  )
}
