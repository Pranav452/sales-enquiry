"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Anchor, Crosshair, Dices, Play } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

// LOGIC-START
const N = 8
const CELLS = N * N
const FLEET = [
  { name: "Container ship", len: 4 },
  { name: "Tanker", len: 3 },
  { name: "Bulker", len: 3 },
  { name: "Tug", len: 2 },
]

interface Ship {
  name: string
  len: number
  cells: number[]
}

/** Random non-overlapping fleet fully inside the grid. */
function placeFleet(): Ship[] {
  for (;;) {
    const taken = new Set<number>()
    const ships: Ship[] = []
    let ok = true
    for (const f of FLEET) {
      let placed = false
      for (let attempt = 0; attempt < 200 && !placed; attempt++) {
        const horiz = Math.random() < 0.5
        const r = Math.floor(Math.random() * (horiz ? N : N - f.len + 1))
        const c = Math.floor(Math.random() * (horiz ? N - f.len + 1 : N))
        const cells = Array.from({ length: f.len }, (_, k) => (horiz ? r * N + c + k : (r + k) * N + c))
        if (cells.some((x) => taken.has(x))) continue
        cells.forEach((x) => taken.add(x))
        ships.push({ name: f.name, len: f.len, cells })
        placed = true
      }
      if (!placed) {
        ok = false
        break
      }
    }
    if (ok) return ships
  }
}

/** shots: 0 untouched, 1 miss, 2 hit */
function isSunk(ship: Ship, shots: number[]): boolean {
  return ship.cells.every((c) => shots[c] === 2)
}

function sunkCells(ships: Ship[], shots: number[]): Set<number> {
  const s = new Set<number>()
  for (const sh of ships) if (isSunk(sh, shots)) sh.cells.forEach((c) => s.add(c))
  return s
}

function pick(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Bot targeting: finish lines, probe neighbours of hits, else checkerboard hunt. Never repeats a cell. */
function botChoose(shots: number[], sunk: Set<number>): number {
  const open = (i: number) => shots[i] === 0
  const live = (i: number) => shots[i] === 2 && !sunk.has(i)
  const hits: number[] = []
  for (let i = 0; i < CELLS; i++) if (live(i)) hits.push(i)

  if (hits.length > 0) {
    const lineC = new Set<number>()
    const dirs: [number, number][] = [
      [0, 1],
      [1, 0],
    ]
    for (const h of hits) {
      const hr = Math.floor(h / N)
      const hc = h % N
      for (const [dr, dc] of dirs) {
        const pr = hr + dr
        const pc = hc + dc
        if (pr >= N || pc >= N || !live(pr * N + pc)) continue
        // line of at least two live hits along this axis: extend both ends
        for (const sign of [1, -1]) {
          let r = hr
          let c = hc
          while (r >= 0 && r < N && c >= 0 && c < N && live(r * N + c)) {
            r += dr * sign
            c += dc * sign
          }
          if (r >= 0 && r < N && c >= 0 && c < N && open(r * N + c)) lineC.add(r * N + c)
        }
      }
    }
    if (lineC.size > 0) return pick([...lineC])

    const probe = new Set<number>()
    for (const h of hits) {
      const hr = Math.floor(h / N)
      const hc = h % N
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const r = hr + dr
        const c = hc + dc
        if (r >= 0 && r < N && c >= 0 && c < N && open(r * N + c)) probe.add(r * N + c)
      }
    }
    if (probe.size > 0) return pick([...probe])
  }

  const all: number[] = []
  const parity: number[] = []
  for (let i = 0; i < CELLS; i++) {
    if (!open(i)) continue
    all.push(i)
    if ((Math.floor(i / N) + (i % N)) % 2 === 0) parity.push(i)
  }
  return pick(parity.length > 0 ? parity : all)
}
// LOGIC-END

interface G {
  phase: "place" | "battle" | "over"
  turn: "player" | "bot"
  pShips: Ship[]
  eShips: Ship[]
  pShots: number[] // shots the bot has fired at the player's board
  eShots: number[] // shots the player has fired at the enemy board
  msg: string
  winner: "player" | "bot" | null
}

function newGame(): G {
  return {
    phase: "place",
    turn: "player",
    pShips: placeFleet(),
    eShips: placeFleet(),
    pShots: Array<number>(CELLS).fill(0),
    eShots: Array<number>(CELLS).fill(0),
    msg: "",
    winner: null,
  }
}

/** Applies one shot; side is who fires. */
function fire(g: G, side: "player" | "bot", idx: number): G {
  const targetShips = side === "player" ? g.eShips : g.pShips
  const shotsKey = side === "player" ? "eShots" : "pShots"
  const shots = g[shotsKey].slice()
  if (shots[idx] !== 0) return g
  const ship = targetShips.find((s) => s.cells.includes(idx))
  shots[idx] = ship ? 2 : 1
  let msg: string
  const who = side === "player" ? "You" : "Kraken fleet"
  if (!ship) msg = `${who} fired at ${coord(idx)}: miss.`
  else if (isSunk(ship, shots)) msg = `${who} sank ${side === "player" ? "the" : "your"} ${ship.name}!`
  else msg = `${who} hit at ${coord(idx)}!`
  const allSunk = targetShips.every((s) => isSunk(s, shots))
  return {
    ...g,
    [shotsKey]: shots,
    msg,
    phase: allSunk ? "over" : "battle",
    winner: allSunk ? side : null,
    turn: side === "player" ? "bot" : "player",
  }
}

function coord(i: number): string {
  return `${"ABCDEFGH"[i % N]}${Math.floor(i / N) + 1}`
}

const COLORS = {
  water: "#0b3b5e",
  waterAlt: "#0d4670",
  ship: "#64748b",
  shipSunk: "#7f1d1d",
  hit: "#ef4444",
}

function Board({
  title,
  ships,
  shots,
  reveal,
  interactive,
  onFire,
  reduced,
}: {
  title: string
  ships: Ship[]
  shots: number[]
  reveal: boolean
  interactive: boolean
  onFire?: (i: number) => void
  reduced: boolean
}) {
  const shipAt = new Map<number, Ship>()
  ships.forEach((s) => s.cells.forEach((c) => shipAt.set(c, s)))
  const sunk = sunkCells(ships, shots)
  const left = ships.filter((s) => !isSunk(s, shots)).length
  return (
    <div className="w-[min(100%,250px)]">
      <div className="mb-1 flex items-center justify-between px-0.5 font-mono text-[10px] text-slate-400">
        <span>{title}</span>
        <span>
          AFLOAT <b className="text-slate-200">{left}</b>/{ships.length}
        </span>
      </div>
      <div className="grid grid-cols-8 gap-px overflow-hidden rounded-lg border-2 border-slate-600 bg-slate-700">
        {Array.from({ length: CELLS }, (_, i) => {
          const sh = shots[i]
          const isShip = shipAt.has(i)
          const isSunkCell = sunk.has(i)
          const showShip = (reveal && isShip) || isSunkCell
          const canFire = interactive && sh === 0
          let bg = (Math.floor(i / N) + (i % N)) % 2 ? COLORS.waterAlt : COLORS.water
          if (showShip) bg = isSunkCell ? COLORS.shipSunk : COLORS.ship
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-label={`${title} ${coord(i)}`}
              disabled={!canFire}
              onClick={() => onFire?.(i)}
              className="relative flex aspect-square items-center justify-center outline-none"
              style={{
                background: bg,
                cursor: canFire ? "crosshair" : "default",
              }}
            >
              {canFire && (
                <span className="absolute inset-0 opacity-0 transition-opacity hover:opacity-100">
                  <span className="absolute inset-0 border border-rose-300/70 bg-rose-400/20" />
                </span>
              )}
              {sh === 1 && (
                <motion.span
                  initial={reduced ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-1.5 w-1.5 rounded-full bg-sky-200/80"
                />
              )}
              {sh === 2 && (
                <motion.svg
                  viewBox="0 0 10 10"
                  initial={reduced ? false : { scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="h-3/5 w-3/5"
                >
                  <path
                    d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
                    stroke={isSunkCell ? "#fecaca" : COLORS.hit}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </motion.svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function KrakenHunt({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [g, setG] = useState<G>(() => newGame())
  const doneRef = useRef(false)
  const overCbRef = useRef(onGameOver)

  useEffect(() => {
    overCbRef.current = onGameOver
  }, [onGameOver])

  // bot turn
  useEffect(() => {
    if (g.phase !== "battle" || g.turn !== "bot") return
    const t = setTimeout(() => {
      setG((cur) => {
        if (cur.phase !== "battle" || cur.turn !== "bot") return cur
        return fire(cur, "bot", botChoose(cur.pShots, sunkCells(cur.pShips, cur.pShots)))
      })
    }, reduced ? 400 : 750)
    return () => clearTimeout(t)
  }, [g.phase, g.turn, reduced, g.pShots])

  // end of run
  useEffect(() => {
    if (g.phase !== "over") return
    const t = setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      const hitsLanded = g.eShots.filter((s) => s === 2).length
      if (g.winner === "player") {
        const intact = g.pShips.reduce((n, s) => n + s.cells.filter((c) => g.pShots[c] !== 2).length, 0)
        overCbRef.current({
          score: 500 + intact * 20,
          won: true,
          summary: `Kraken fleet sunk with ${intact} hull cell${intact === 1 ? "" : "s"} intact`,
        })
      } else {
        overCbRef.current({
          score: hitsLanded * 10,
          won: false,
          summary: `Fleet lost after ${hitsLanded} hit${hitsLanded === 1 ? "" : "s"} landed`,
        })
      }
    }, 800)
    return () => clearTimeout(t)
  }, [g])

  // prevent page scroll on arrows/space only while the game is on screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const randomize = () =>
    setG((cur) => (cur.phase === "place" ? { ...cur, pShips: placeFleet() } : cur))
  const deploy = () =>
    setG((cur) =>
      cur.phase === "place" ? { ...cur, phase: "battle", turn: "player", msg: "Fleet deployed. Fire at will!" } : cur,
    )
  const playerFire = (i: number) =>
    setG((cur) => (cur.phase === "battle" && cur.turn === "player" ? fire(cur, "player", i) : cur))

  const playerHits = g.eShots.filter((s) => s === 2).length
  const enemyHits = g.pShots.filter((s) => s === 2).length

  const hint =
    g.phase === "place"
      ? "Shuffle until you like the formation, then deploy."
      : g.phase === "over"
        ? g.winner === "player"
          ? "The Kraken fleet is sunk."
          : "Your fleet is lost."
        : g.turn === "player"
          ? g.msg || "Your turn: pick a cell on the enemy waters."
          : g.msg
            ? `${g.msg} Enemy is aiming...`
            : "Enemy is aiming..."

  return (
    <div className="mx-auto flex w-full max-w-[560px] select-none flex-col items-center gap-2 text-slate-100">
      <div className="flex w-full items-center justify-between px-1 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-rose-400">
          <Crosshair size={14} aria-hidden /> KRAKEN HUNT
        </span>
        <span className="text-slate-300">
          HITS <b className="text-emerald-400">{playerHits}</b>
          <span className="text-slate-500"> / </span>
          <b className="text-rose-400">{enemyHits}</b>
        </span>
        <span className="text-slate-300">
          {g.phase === "place" ? "PLACEMENT" : g.phase === "over" ? "END" : g.turn === "player" ? "YOUR TURN" : "ENEMY"}
        </span>
      </div>

      <div className="flex w-full flex-wrap items-start justify-center gap-3">
        <Board
          title="ENEMY WATERS"
          ships={g.eShips}
          shots={g.eShots}
          reveal={g.phase === "over" && g.winner === "bot"}
          interactive={g.phase === "battle" && g.turn === "player"}
          onFire={playerFire}
          reduced={reduced}
        />
        <Board
          title="YOUR FLEET"
          ships={g.pShips}
          shots={g.pShots}
          reveal
          interactive={false}
          reduced={reduced}
        />
      </div>

      {g.phase === "place" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={randomize}
            className="flex items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
          >
            <Dices size={14} aria-hidden /> Randomize
          </button>
          <button
            type="button"
            onClick={deploy}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <Play size={14} aria-hidden /> Deploy fleet
          </button>
        </div>
      )}

      <p className="flex min-h-4 items-center gap-1.5 text-center text-xs text-slate-400" aria-live="polite">
        <Anchor size={12} aria-hidden className="shrink-0 text-slate-500" />
        {hint}
      </p>
    </div>
  )
}
