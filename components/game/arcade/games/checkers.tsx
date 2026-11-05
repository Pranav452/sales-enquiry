"use client"

// ============================================================
// Checkers (English draughts) vs the computer.
// Rules + AI live in ./classics/checkers.ts and ./classics/checkers-ai.ts.
// ============================================================

import {
  useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from "react"
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion"
import { Crown, Flag, Undo2 } from "lucide-react"
import type { ArcadeGameProps, ArcadeGameResult } from "@/lib/game/arcade"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, ToolButton } from "../kit/GameShell"
import { useDelayedGameOver, useElementSize } from "./classics/shared"
import * as R from "./classics/checkers"
import { chooseMove, type Level } from "./classics/checkers-ai"
import { cn } from "@/lib/utils"

// ─── Look ──────────────────────────────────────────────────────

const HOP = 0.2 // seconds per square/hop of piece movement
const COLORS = {
  light: "#f0d9b5",
  dark: "#b58863",
  frame: "#3b2716",
  frameEdge: "#5a3d24",
  coord: "#d9c3a0",
  last: "#aaa23a",
  selected: "#646e40",
  dot: "rgba(20, 85, 30, 0.55)",
  hover: "rgba(20, 85, 30, 0.32)",
  movable: "#c9a27a",
  forced: "#f0c24b",
  doom: "#e5484d",
}
const PIECE = {
  black: { fill: "#2a2725", rim: "#0e0d0c", groove: "rgba(255, 255, 255, 0.16)", crown: "#e9b949", shadow: "rgba(0, 0, 0, 0.45)" },
  white: { fill: "#f5eddc", rim: "#b3a07c", groove: "rgba(96, 72, 40, 0.24)", crown: "#a87612", shadow: "rgba(0, 0, 0, 0.32)" },
}
const LEVEL_NAME: Record<Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }

// ─── Small helpers ─────────────────────────────────────────────

interface Config { level: Level; human: R.Side }

/** Animation of the most recent move: the mover's path and when each captured piece vanishes. */
interface Anim {
  seq: number
  id: number
  /** squares the mover passes through, starting where it is drawn now */
  squares: number[]
  /** piece id -> exit delay (s) */
  capDelay: Record<number, number>
}

type Resolved = { kind: "commit"; move: R.Move; at: number } | { kind: "step"; sq: number }

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}

const displayRow = (s: number, flip: boolean) => (flip ? 7 - R.ROW[s] : R.ROW[s])
const displayCol = (s: number, flip: boolean) => (flip ? 7 - R.COL[s] : R.COL[s])
/** Display columns / rows the mover passes through. */
interface Frames { cols: number[]; rows: number[] }
const pieceName = (v: number) => `${R.pieceSide(v) === R.BLACK ? "black" : "white"} ${R.isKing(v) ? "king" : "man"}`
const startsWith = (path: number[], prefix: number[]) => prefix.every((p, i) => path[i] === p)
const capKey = (m: R.Move) => m.caps.slice().sort((a, b) => a - b).join(",")

// ─── Piece ─────────────────────────────────────────────────────

function Disc({ v, cell, ring, lifted, crownDelay = 0 }: {
  v: number
  cell: number
  ring?: string
  lifted?: boolean
  crownDelay?: number
}) {
  const p = R.pieceSide(v) === R.BLACK ? PIECE.black : PIECE.white
  const d = Math.round(cell * 0.78)
  const rim = Math.max(1.5, cell * 0.05)
  const drop = Math.max(1, Math.round(cell * (lifted ? 0.09 : 0.04)))
  const shadows = [`inset 0 0 0 ${rim}px ${p.rim}`, `0 ${drop}px ${lifted ? drop : 0}px ${p.shadow}`]
  if (ring) shadows.push(`0 0 0 ${Math.max(2, Math.round(cell * 0.06))}px ${ring}`)
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{ width: d, height: d, background: p.fill, boxShadow: shadows.join(", ") }}
    >
      <div className="absolute rounded-full" style={{ inset: "19%", border: `${Math.max(1, cell * 0.028)}px solid ${p.groove}` }} />
      {R.isKing(v) && (
        <motion.span
          className="relative flex"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: crownDelay, duration: lifted ? 0 : 0.2 }}
        >
          <Crown
            aria-hidden
            style={{ width: d * 0.46, height: d * 0.46, color: p.crown }}
            strokeWidth={2.4}
            fill={p.crown}
            fillOpacity={0.3}
          />
        </motion.span>
      )}
    </div>
  )
}

/** Tiny flat piece used in the toolbar's captured counter. */
function MiniDisc({ side, className }: { side: R.Side; className?: string }) {
  const p = side === R.BLACK ? PIECE.black : PIECE.white
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 rounded-full border border-foreground/40", className)}
      style={{ background: p.fill }}
    />
  )
}

/**
 * One piece on the board. Position lives in pixel motion values that are
 * animated imperatively (hop by hop for multi-jumps) and re-snapped when the
 * board is resized.
 */
function PieceSprite({ id, v, col, row, frames, duration, cell, opacity, ring, raised, crownDelay, reduce }: {
  id: number
  v: number
  col: number
  row: number
  frames: Frames | null
  duration: number
  cell: number
  opacity: number
  ring?: string
  raised: boolean
  crownDelay: number
  reduce: boolean
}) {
  // pixel offsets of the cell-sized element inside the board
  const mx = useMotionValue((frames ? frames.cols[0] : col) * cell)
  const my = useMotionValue((frames ? frames.rows[0] : row) * cell)
  const lastCell = useRef(cell)

  useEffect(() => {
    const resized = lastCell.current !== cell
    lastCell.current = cell
    const cols = (frames && frames.cols.length > 1 ? frames.cols : [col]).map((c) => c * cell)
    const rows = (frames && frames.rows.length > 1 ? frames.rows : [row]).map((r) => r * cell)
    if (duration <= 0 || resized) {
      mx.jump(cols[cols.length - 1])
      my.jump(rows[rows.length - 1])
      return
    }
    const opts = { duration, ease: "easeInOut" as const }
    const ax = animate(mx, cols.length > 1 ? cols : cols[0], opts)
    const ay = animate(my, rows.length > 1 ? rows : rows[0], opts)
    return () => {
      ax.stop()
      ay.stop()
    }
  }, [frames, col, row, duration, cell, mx, my])

  return (
    <motion.div
      className="absolute left-0 top-0 flex items-center justify-center"
      style={{ width: cell, height: cell, x: mx, y: my, zIndex: raised ? 3 : 1 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity, scale: 1 }}
      exit="exit"
      variants={{
        exit: (a: Anim | null) => ({
          opacity: 0,
          scale: 0.5,
          transition: { delay: reduce ? 0 : (a?.capDelay[id] ?? 0), duration: reduce ? 0 : 0.16 },
        }),
      }}
      transition={{ opacity: { duration: opacity < 1 && opacity > 0 ? 0.15 : 0 }, scale: { duration: reduce ? 0 : 0.15 } }}
    >
      <Disc v={v} cell={cell} ring={ring} crownDelay={reduce ? 0 : crownDelay} />
    </motion.div>
  )
}

// ─── Entry: setup, then the game ───────────────────────────────

export default function Checkers({ onGameOver }: ArcadeGameProps) {
  const [config, setConfig] = useState<Config | null>(null)
  if (!config) {
    return (
      <SetupScreen
        title="Checkers"
        description="English draughts on an 8x8 board against the computer."
        options={[
          {
            id: "level",
            label: "Difficulty",
            choices: [
              { value: "easy", label: "Easy", hint: "Relaxed, undo allowed" },
              { value: "medium", label: "Medium", hint: "Solid tactics, undo allowed" },
              { value: "hard", label: "Hard", hint: "Deep search, no undo" },
            ],
          },
          {
            id: "side",
            label: "Play as",
            choices: [
              { value: "black", label: "Black", hint: "You move first" },
              { value: "white", label: "White", hint: "Computer moves first" },
            ],
          },
        ]}
        defaults={{ level: "medium", side: "black" }}
        onStart={(v) => setConfig({ level: (v.level as Level) ?? "medium", human: v.side === "white" ? R.WHITE : R.BLACK })}
      >
        <p className="text-center text-xs text-muted-foreground">
          Captures are compulsory and a multi-jump must be finished. Reach the far row to crown a king.
        </p>
      </SetupScreen>
    )
  }
  return <CheckersGame config={config} onGameOver={onGameOver} />
}

function CheckersGame({ config, onGameOver }: { config: Config; onGameOver: ArcadeGameProps["onGameOver"] }) {
  const { level, human } = config
  const cpu = R.other(human)
  const flip = human === R.WHITE
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const canUndo = level !== "hard"
  const finish = useDelayedGameOver(onGameOver)
  const reduce = useReducedMotion() ?? false
  const hop = reduce ? 0 : HOP

  const [game, setGame] = useState<R.GameRecord>(R.newGame)
  const [anim, setAnim] = useState<Anim | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  /** landing squares chosen so far in a multi-jump */
  const [partial, setPartial] = useState<number[]>([])
  /** the last chain step was a drag drop: place the piece without sliding */
  const [instant, setInstant] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [history, setHistory] = useState<R.GameRecord[]>([])
  const [undos, setUndos] = useState(0)
  const [resigned, setResigned] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  const [focusSq, setFocusSq] = useState(human === R.BLACK ? 21 : 10)
  const [hoverSq, setHoverSq] = useState<number | null>(null)
  const [drag, setDrag] = useState<{ from: number; v: number } | null>(null)

  const boardRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const gesture = useRef<{
    pointerId: number; sq: number; x: number; y: number; dragging: boolean; draggable: boolean; selectedOnDown: boolean
  } | null>(null)
  const gx = useMotionValue(0)
  const gy = useMotionValue(0)

  // ── sizing: fit the width, and the dialog height on desktop ──
  const [wrapRef, wrapSize] = useElementSize<HTMLDivElement>()
  const [barRef, barSize] = useElementSize<HTMLDivElement>()
  const vh = useViewportHeight()
  const avail = Math.floor(Math.min(wrapSize.width, Math.max(260, vh * 0.85 - 140 - barSize.height - 28)))
  const frame = Math.max(12, Math.min(20, Math.round(avail * 0.036)))
  const cell = Math.max(24, Math.floor((avail - 2 * frame) / 8))
  const boardPx = cell * 8

  // ── derived game state ──
  const over = game.outcome != null || resigned
  const humanTurn = !over && game.pos.turn === human
  const cpuTurn = !over && game.pos.turn === cpu
  const moves = useMemo(() => (humanTurn ? R.legalMoves(game.pos) : []), [game.pos, humanTurn])
  const forced = moves.length > 0 && moves[0].caps.length > 0
  const movable = new Set(moves.map((m) => m.from))
  // a lone movable piece is selected automatically
  const sel = selected ?? (movable.size === 1 ? moves[0].from : null)
  const candidates = sel == null ? [] : moves.filter((m) => m.from === sel && startsWith(m.path, partial))
  const chainAt = sel != null && partial.length > 0 ? partial[partial.length - 1] : null

  function resolve(sq: number): Resolved | null {
    const p = partial.length
    const step = candidates.filter((m) => m.path[p] === sq)
    if (step.length === 1) return { kind: "commit", move: step[0], at: p }
    if (step.length > 1) return { kind: "step", sq }
    const fin = candidates.filter((m) => m.to === sq && m.path.length > p + 1)
    if (fin.length > 0 && fin.every((m) => capKey(m) === capKey(fin[0]))) {
      return { kind: "commit", move: fin[0], at: fin[0].path.length - 1 }
    }
    return null
  }

  const dests = new Map<number, "step" | "final">()
  for (const m of candidates) dests.set(m.path[partial.length], "step")
  for (const m of candidates) {
    if (m.path.length > partial.length + 1 && !dests.has(m.to) && resolve(m.to)) dests.set(m.to, "final")
  }
  const taken = new Set<number>(candidates.length > 0 && partial.length > 0 ? candidates[0].caps.slice(0, partial.length) : [])
  const doomed = new Set<number>()
  for (const m of candidates) if (m.caps.length > partial.length) doomed.add(m.caps[partial.length])
  if (hoverSq != null) {
    const r = resolve(hoverSq)
    if (r?.kind === "commit") for (const c of r.move.caps.slice(partial.length)) doomed.add(c)
  }

  // ── results ──
  function resultFor(g: R.GameRecord, kind: R.ResultKind): ArcadeGameResult {
    const humanMoves = human === R.BLACK ? Math.ceil(g.plies / 2) : Math.floor(g.plies / 2)
    const score = R.computeScore({
      kind, mult, undos,
      piecesLeft: R.countPieces(g.pos.board, human),
      humanMoves,
      captured: g.captured[human],
    })
    const name = LEVEL_NAME[level]
    const n = `${humanMoves} move${humanMoves === 1 ? "" : "s"}`
    const summary =
      kind === "win" ? `Beat ${name} in ${n}`
      : kind === "draw" ? `Draw with ${name} after ${n}`
      : kind === "loss" ? `Lost to ${name} after ${n}`
      : `Resigned vs ${name} after ${n}`
    return { score, won: kind === "win", summary }
  }

  function applyMove(m: R.Move, startIdx: number, byHuman: boolean) {
    const next = R.advanceGame(game, m)
    const capDelay: Record<number, number> = {}
    m.caps.forEach((c, i) => {
      capDelay[game.ids[c]] = i <= startIdx ? 0 : (i - startIdx - 0.5) * hop
    })
    setAnim({
      seq: next.plies,
      id: game.ids[m.from],
      squares: [startIdx < 0 ? m.from : m.path[startIdx], ...m.path.slice(startIdx + 1)],
      capDelay,
    })
    if (byHuman) setHistory((h) => [...h, game])
    setGame(next)
    setSelected(null)
    setPartial([])
    setInstant(false)
    setNotice(null)
    setHoverSq(null)
    setConfirmResign(false)
    if (next.outcome) {
      const w = next.outcome.winner
      finish(resultFor(next, w == null ? "draw" : w === human ? "win" : "loss"))
    }
  }

  function perform(res: Resolved, viaDrag: boolean) {
    if (res.kind === "commit") {
      applyMove(res.move, viaDrag ? res.at : partial.length - 1, true)
    } else {
      setPartial([...partial, res.sq])
      setInstant(viaDrag)
      setHoverSq(null)
      setNotice(null)
    }
  }

  /** Click / tap / Enter on a square. */
  function activate(sq: number) {
    if (!humanTurn) return
    setConfirmResign(false)
    if (sel != null) {
      const res = resolve(sq)
      if (res) {
        perform(res, false)
        return
      }
    }
    if (partial.length > 0) return // mid-jump: the chain must be finished
    if (movable.has(sq)) {
      setSelected(selected === sq ? null : sq)
      setNotice(null)
      return
    }
    const v = game.pos.board[sq]
    if (v !== R.EMPTY && R.isOwn(v, human)) {
      setSelected(null)
      setNotice(forced ? "You must capture: use a highlighted piece" : "That piece has no legal move")
      return
    }
    setSelected(null)
    setNotice(null)
  }

  function undo() {
    if (!canUndo || !humanTurn || partial.length > 0 || history.length === 0) return
    setGame(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setAnim(null)
    setUndos((u) => u + 1)
    setSelected(null)
    setPartial([])
    setNotice(null)
    setHoverSq(null)
    setConfirmResign(false)
  }

  function resign() {
    if (over) return
    if (!confirmResign) {
      setConfirmResign(true)
      return
    }
    setResigned(true)
    setConfirmResign(false)
    setSelected(null)
    setPartial([])
    setHoverSq(null)
    finish(resultFor(game, "resign"), 0)
  }

  // ── computer turn: think in a timeout after the status has painted ──
  const onCpuMove = useEffectEvent((m: R.Move) => applyMove(m, -1, false))
  const lastHops = game.last ? game.last.path.length : 0
  useEffect(() => {
    if (!cpuTurn) return
    const settle = lastHops * hop * 1000 // let the previous move finish sliding
    const t0 = performance.now()
    let reply = 0
    const think = window.setTimeout(() => {
      const res = chooseMove(game.pos, { level, history: game.rep.slice(0, -1) })
      const wait = Math.max(0, 420 + settle - (performance.now() - t0))
      reply = window.setTimeout(() => onCpuMove(res.move), wait)
    }, settle + 40)
    return () => {
      window.clearTimeout(think)
      window.clearTimeout(reply)
    }
  }, [cpuTurn, game, level, lastHops, hop])

  // ── pointer: click-to-move and drag-and-drop ──
  function squareFromPoint(clientX: number, clientY: number): number {
    const el = boardRef.current
    if (!el) return -1
    const r = el.getBoundingClientRect()
    const dc = Math.floor(((clientX - r.left) / r.width) * 8)
    const dr = Math.floor(((clientY - r.top) / r.height) * 8)
    if (dc < 0 || dc > 7 || dr < 0 || dr > 7) return -1
    return R.squareAt(flip ? 7 - dr : dr, flip ? 7 - dc : dc)
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || !humanTurn || drag) return
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (sq < 0) return
    const draggable = chainAt != null ? sq === chainAt : movable.has(sq)
    let selectedOnDown = false
    if (draggable && chainAt == null && sel !== sq) {
      setSelected(sq)
      setNotice(null)
      setConfirmResign(false)
      selectedOnDown = true
    }
    gesture.current = { pointerId: e.pointerId, sq, x: e.clientX, y: e.clientY, dragging: false, draggable, selectedOnDown }
    if (draggable) e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) {
      if (e.pointerType === "mouse" && !g) {
        const s = squareFromPoint(e.clientX, e.clientY)
        const h = s >= 0 && dests.has(s) ? s : null
        if (h !== hoverSq) setHoverSq(h)
      }
      return
    }
    if (!g.draggable) return
    if (!g.dragging) {
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 6) return
      g.dragging = true
      setDrag({ from: g.sq, v: game.pos.board[sel ?? g.sq] })
    }
    const r = e.currentTarget.getBoundingClientRect()
    gx.set(e.clientX - r.left - cell / 2)
    gy.set(e.clientY - r.top - cell / 2)
    const s = squareFromPoint(e.clientX, e.clientY)
    const h = s >= 0 && dests.has(s) ? s : null
    if (h !== hoverSq) setHoverSq(h)
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    gesture.current = null
    const sq = squareFromPoint(e.clientX, e.clientY)
    if (g.dragging) {
      const res = sq >= 0 && sq !== g.sq ? resolve(sq) : null
      if (res) {
        setDrag(null)
        perform(res, true)
        return
      }
      setHoverSq(null)
      // snap back to the square it came from
      const ox = displayCol(g.sq, flip) * cell
      const oy = displayRow(g.sq, flip) * cell
      if (reduce) {
        setDrag(null)
      } else {
        animate(gx, ox, { duration: 0.15, ease: "easeOut" })
        animate(gy, oy, { duration: 0.15, ease: "easeOut", onComplete: () => setDrag(null) })
      }
      return
    }
    if (sq !== g.sq || g.selectedOnDown) return
    activate(sq)
  }

  function onPointerCancel() {
    const g = gesture.current
    gesture.current = null
    if (g?.dragging) {
      setDrag(null)
      setHoverSq(null)
    }
  }

  // ── keyboard: arrows move between dark squares, Enter/Space act, Escape deselects ──
  function onGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      if (partial.length === 0) {
        setSelected(null)
        setNotice(null)
      }
      return
    }
    let dr = displayRow(focusSq, flip)
    let dc = displayCol(focusSq, flip)
    if (e.key === "ArrowLeft") dc -= 2
    else if (e.key === "ArrowRight") dc += 2
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      dc = dr & 1 ? dc + 1 : dc - 1
      dr += e.key === "ArrowUp" ? -1 : 1
    } else return
    e.preventDefault()
    if (dr < 0 || dr > 7 || dc < 0 || dc > 7) return
    const s = R.squareAt(flip ? 7 - dr : dr, flip ? 7 - dc : dc)
    if (s < 0) return
    setFocusSq(s)
    btnRefs.current[s]?.focus()
  }

  // ── status line ──
  const outcome = game.outcome
  let status: string
  if (resigned) status = "You resigned"
  else if (outcome) {
    if (outcome.winner == null) status = outcome.reason === "repetition" ? "Draw by threefold repetition" : "Draw: 40 moves each without progress"
    else if (outcome.winner === human) status = outcome.reason === "no-pieces" ? "You win: all computer pieces taken" : "You win: the computer cannot move"
    else status = outcome.reason === "no-pieces" ? "Computer wins: all your pieces taken" : "Computer wins: you cannot move"
  } else if (cpuTurn) status = "Computer is thinking..."
  else if (partial.length > 0) status = "Continue the jump"
  else if (notice) status = notice
  else if (forced) status = "You must capture"
  else status = "Your move"

  const stats: { label: string; value: ReactNode }[] = [
    {
      label: "Captured",
      value: (
        <span className="inline-flex items-center gap-1 align-middle">
          <MiniDisc side={cpu} />
          <span aria-hidden>{game.captured[human]}</span>
          <MiniDisc side={human} className="ml-1.5" />
          <span aria-hidden>{game.captured[cpu]}</span>
          <span className="sr-only">{`you ${game.captured[human]}, computer ${game.captured[cpu]}`}</span>
        </span>
      ),
    },
    { label: "Move", value: Math.floor(game.plies / 2) + 1 },
  ]
  if (!over && game.pos.quiet >= R.DRAW_WARN_PLIES) {
    stats.push({ label: "Draw count", value: `${Math.floor(game.pos.quiet / 2)}/40` })
  }

  // ── board model for rendering ──
  const last = game.last
  const lastSquares = new Set<number>(last ? [last.from, last.to] : [])
  const trail = new Set<number>(chainAt != null && sel != null ? [sel, ...partial.slice(0, -1)] : [])
  const animFrames = useMemo<Frames | null>(
    () => (anim ? { cols: anim.squares.map((s) => displayCol(s, flip)), rows: anim.squares.map((s) => displayRow(s, flip)) } : null),
    [anim, flip],
  )

  function describe(s: number): string {
    const v = game.pos.board[s]
    let t: string
    if (chainAt != null && s === chainAt) t = `${R.squareName(s)}, ${pieceName(game.pos.board[sel as number])}, jumping`
    else if (chainAt != null && s === sel) t = `${R.squareName(s)}, empty, jump started here`
    else t = `${R.squareName(s)}, ${v ? pieceName(v) : "empty"}`
    if (s === sel && chainAt == null) t += ", selected"
    else if (humanTurn && chainAt == null && movable.has(s)) t += forced ? ", can capture" : ", can move"
    const d = dests.get(s)
    if (d) t += d === "step" && partial.length === 0 && !forced ? ", legal destination" : ", legal destination, capture landing"
    if (taken.has(s)) t += ", captured"
    else if (doomed.has(s)) t += ", will be captured"
    if (lastSquares.has(s)) t += ", last move"
    return t
  }

  const pieces: { s: number; v: number; id: number }[] = []
  for (let s = 0; s < 32; s++) {
    const v = game.pos.board[s]
    if (v !== R.EMPTY) pieces.push({ s, v, id: game.ids[s] })
  }
  const dragSq = drag ? (chainAt ?? drag.from) : null

  const rows = [0, 1, 2, 3, 4, 5, 6, 7]
  const coordSize = Math.max(8, Math.round(frame * 0.58))

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={barRef} className="min-h-11">
        <GameToolbar
          status={status}
          stats={stats}
          actions={over ? undefined : (
            <>
              {canUndo && (
                <ToolButton onClick={undo} disabled={!humanTurn || partial.length > 0 || history.length === 0}>
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />
                  Undo
                </ToolButton>
              )}
              <ToolButton
                onClick={resign}
                onBlur={() => setConfirmResign(false)}
                disabled={over}
                className={cn(confirmResign && "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive")}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {confirmResign ? "Confirm resign" : "Resign"}
              </ToolButton>
            </>
          )}
        />
      </div>

      {wrapSize.width > 0 && (
        <div className="flex justify-center">
          <div
            className="relative select-none rounded-md"
            style={{
              padding: frame,
              background: COLORS.frame,
              boxShadow: `inset 0 0 0 1px ${COLORS.frameEdge}`,
            }}
          >
            {/* coordinates */}
            {rows.map((i) => (
              <span
                key={`f${i}`}
                aria-hidden
                className="pointer-events-none absolute text-center font-medium leading-none"
                style={{
                  left: frame + i * cell,
                  width: cell,
                  bottom: (frame - coordSize) / 2,
                  fontSize: coordSize,
                  color: COLORS.coord,
                }}
              >
                {"abcdefgh"[flip ? 7 - i : i]}
              </span>
            ))}
            {rows.map((i) => (
              <span
                key={`r${i}`}
                aria-hidden
                className="pointer-events-none absolute flex items-center justify-center font-medium leading-none"
                style={{ top: frame + i * cell, height: cell, left: 0, width: frame, fontSize: coordSize, color: COLORS.coord }}
              >
                {flip ? i + 1 : 8 - i}
              </span>
            ))}

            <div
              ref={boardRef}
              role="grid"
              aria-label={`Checkers board, you play ${human === R.BLACK ? "black" : "white"}`}
              aria-readonly={!humanTurn}
              className="relative"
              style={{ width: boardPx, height: boardPx }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse" && !gesture.current) setHoverSq(null)
              }}
              onKeyDown={onGridKeyDown}
            >
              {rows.map((dr) => (
                <div key={dr} role="row" className="flex" style={{ height: cell }}>
                  {rows.map((dc) => {
                    const s = R.squareAt(flip ? 7 - dr : dr, flip ? 7 - dc : dc)
                    if (s < 0) {
                      return <div key={dc} role="gridcell" style={{ width: cell, height: cell, background: COLORS.light }} />
                    }
                    const occupiedShown = chainAt != null ? s === chainAt || (s !== sel && game.pos.board[s] !== R.EMPTY) : game.pos.board[s] !== R.EMPTY
                    const dest = dests.get(s)
                    const canGrab = humanTurn && (chainAt != null ? s === chainAt : movable.has(s))
                    const canMove = humanTurn && chainAt == null && movable.has(s) && s !== sel
                    let bg = canMove && !forced ? COLORS.movable : COLORS.dark
                    if (lastSquares.has(s)) bg = COLORS.last
                    if (s === sel || s === chainAt) bg = COLORS.selected
                    const ringColor = canMove && forced ? COLORS.forced : null
                    return (
                      <div key={dc} role="gridcell" style={{ width: cell, height: cell }}>
                        <button
                          ref={(el) => {
                            btnRefs.current[s] = el
                          }}
                          type="button"
                          tabIndex={s === focusSq ? 0 : -1}
                          aria-label={describe(s)}
                          onClick={(e) => {
                            if (e.detail === 0) activate(s) // keyboard / assistive tech; pointer handled above
                          }}
                          onFocus={() => {
                            setFocusSq(s)
                            if (dests.has(s)) setHoverSq(s)
                          }}
                          onBlur={() => setHoverSq((h) => (h === s ? null : h))}
                          className="relative block h-full w-full outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-sky-400"
                          style={{
                            background: bg,
                            touchAction: canGrab ? "none" : "manipulation",
                            cursor: canGrab ? (drag ? "grabbing" : "grab") : dest ? "pointer" : "default",
                          }}
                        >
                          {ringColor && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-0"
                              style={{ boxShadow: `inset 0 0 0 ${Math.max(2, Math.round(cell * 0.06))}px ${ringColor}` }}
                            />
                          )}
                          {dest && hoverSq === s && (
                            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: COLORS.hover }} />
                          )}
                          {trail.has(s) && s !== sel && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute rounded-full"
                              style={{ inset: "38%", border: `2px solid ${COLORS.dot}` }}
                            />
                          )}
                          {dest && !occupiedShown && (
                            dest === "step" ? (
                              <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ inset: "35%", background: COLORS.dot }} />
                            ) : (
                              <span
                                aria-hidden
                                className="pointer-events-none absolute rounded-full"
                                style={{ inset: "32%", border: `${Math.max(2, Math.round(cell * 0.06))}px solid ${COLORS.dot}` }}
                              />
                            )
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* pieces */}
              <div className="pointer-events-none absolute inset-0">
                <AnimatePresence initial={false} custom={anim}>
                  {pieces.map(({ s, v, id }) => {
                    const isChain = chainAt != null && s === sel
                    const isMover = !isChain && anim != null && anim.id === id && animFrames != null
                    let at = s
                    let frames: Frames | null = null
                    let dur = reduce ? 0 : 0.2
                    if (isChain) {
                      at = chainAt
                      dur = instant ? 0 : hop
                    } else if (isMover) {
                      frames = animFrames
                      dur = (anim.squares.length - 1) * hop
                    }
                    const hidden = dragSq != null && (isChain || (chainAt == null && s === drag?.from))
                    const isTaken = taken.has(s)
                    return (
                      <PieceSprite
                        key={id}
                        id={id}
                        v={v}
                        col={displayCol(at, flip)}
                        row={displayRow(at, flip)}
                        frames={frames}
                        duration={dur}
                        cell={cell}
                        opacity={hidden ? 0 : isTaken ? 0.45 : 1}
                        ring={isTaken || doomed.has(s) ? COLORS.doom : undefined}
                        raised={isMover || isChain}
                        crownDelay={isMover ? dur : 0}
                        reduce={reduce}
                      />
                    )
                  })}
                </AnimatePresence>
                {drag && (
                  <motion.div
                    className="absolute left-0 top-0 z-20 flex items-center justify-center"
                    style={{ width: cell, height: cell, x: gx, y: gy, scale: 1.08 }}
                  >
                    <Disc v={drag.v} cell={cell} lifted />
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
