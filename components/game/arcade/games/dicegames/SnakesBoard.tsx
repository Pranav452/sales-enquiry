"use client"

// Snakes & Ladders board, drawn in SVG (1000 x 1000 units, 100 per square).

import { memo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { LADDERS, SNAKES, squareCenter, type Jump } from "./snakesLogic"
import type { TokenMotion } from "./shared"

const CELL = 100
const N = 10

// ─── Static geometry (computed once) ─────────────────────────

const CREAM = "#fbf6e9"
const ROW_TINTS = ["#d7ecd3", "#f8dccb", "#d5e4f3", "#f6ebb8", "#ecd9ec"]

function cellFill(row: number, col: number) {
  return (row + col) % 2 === 0 ? CREAM : ROW_TINTS[row % ROW_TINTS.length]
}

interface Pt { x: number; y: number }

const SNAKE_COLORS: { body: string; dark: string }[] = [
  { body: "#3f9a4a", dark: "#1f4d25" },
  { body: "#d4483b", dark: "#6e1d16" },
  { body: "#7b55c7", dark: "#3b2468" },
  { body: "#e08a1e", dark: "#71400a" },
  { body: "#178f86", dark: "#0b4642" },
  { body: "#c43d78", dark: "#621838" },
  { body: "#5b7d1e", dark: "#2c3d0d" },
  { body: "#b4572a", dark: "#562610" },
]

/** Centre line of a snake: head (from) to tail (to) with a sine wiggle that returns to the line at both ends. */
function snakeSpine(s: Jump, idx: number): Pt[] {
  const H = squareCenter(s.from, CELL)
  const T = squareCenter(s.to, CELL)
  const dx = T.x - H.x
  const dy = T.y - H.y
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  const halfWaves = Math.max(2, Math.round(len / 95))
  const amp = Math.min(30, 16 + len * 0.03) * (idx % 2 === 0 ? 1 : -1)
  const steps = Math.max(48, Math.round(len / 5))
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const env = Math.sin(Math.PI * t) * (1.15 - 0.35 * t)
    const off = amp * Math.sin(Math.PI * halfWaves * t) * env
    pts.push({ x: H.x + dx * t + nx * off, y: H.y + dy * t + ny * off })
  }
  return pts
}

interface SnakeShape {
  body:  string
  bands: { x1: number; y1: number; x2: number; y2: number }[]
  head:  { x: number; y: number; angle: number }
  color: { body: string; dark: string }
  spine: Pt[]
}

function buildSnake(s: Jump, idx: number): SnakeShape {
  const spine = snakeSpine(s, idx)
  const n = spine.length
  const left: Pt[] = []
  const right: Pt[] = []
  const bands: SnakeShape["bands"] = []
  let dist = 0
  let nextBand = 34
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(n - 1, i + 1)]
    const tx = b.x - a.x
    const ty = b.y - a.y
    const tl = Math.hypot(tx, ty) || 1
    const nx = -ty / tl
    const ny = tx / tl
    const t = i / (n - 1)
    const w = 26 * (1 - 0.93 * t ** 1.15) + (t < 0.08 ? -7 * (1 - t / 0.08) : 0)
    left.push({ x: spine[i].x + nx * w / 2, y: spine[i].y + ny * w / 2 })
    right.push({ x: spine[i].x - nx * w / 2, y: spine[i].y - ny * w / 2 })
    if (i > 0) dist += Math.hypot(spine[i].x - spine[i - 1].x, spine[i].y - spine[i - 1].y)
    if (dist >= nextBand && t < 0.92) {
      nextBand += 24
      bands.push({
        x1: spine[i].x + nx * w * 0.36, y1: spine[i].y + ny * w * 0.36,
        x2: spine[i].x - nx * w * 0.36, y2: spine[i].y - ny * w * 0.36,
      })
    }
  }
  const fmt = (p: Pt) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`
  const body = `M ${left.map(fmt).join(" L ")} L ${right.reverse().map(fmt).join(" L ")} Z`
  const h0 = spine[0]
  const h1 = spine[3]
  const angle = (Math.atan2(h0.y - h1.y, h0.x - h1.x) * 180) / Math.PI
  return { body, bands, head: { x: h0.x, y: h0.y, angle }, color: SNAKE_COLORS[idx % SNAKE_COLORS.length], spine }
}

const SNAKE_SHAPES = SNAKES.map(buildSnake)

/** Points (board units) a token follows when sliding down snake `from`. */
export function snakeSlidePoints(from: number): Pt[] {
  const i = SNAKES.findIndex((s) => s.from === from)
  if (i < 0) return []
  const spine = SNAKE_SHAPES[i].spine
  const out: Pt[] = []
  const stride = Math.max(1, Math.floor(spine.length / 24))
  for (let k = 0; k < spine.length; k += stride) out.push(spine[k])
  const last = spine[spine.length - 1]
  if (out[out.length - 1] !== last) out.push(last)
  return out
}

interface LadderShape {
  rails: [Pt, Pt][]
  rungs: [Pt, Pt][]
}

function buildLadder(l: Jump): LadderShape {
  const B = squareCenter(l.from, CELL)
  const T = squareCenter(l.to, CELL)
  const dx = T.x - B.x
  const dy = T.y - B.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const half = 17
  const ext = 14
  const a = { x: B.x - ux * ext, y: B.y - uy * ext }
  const b = { x: T.x + ux * ext, y: T.y + uy * ext }
  const rails: [Pt, Pt][] = [-1, 1].map((sgn) => [
    { x: a.x + nx * half * sgn, y: a.y + ny * half * sgn },
    { x: b.x + nx * half * sgn, y: b.y + ny * half * sgn },
  ]) as [Pt, Pt][]
  const total = len + ext * 2
  const count = Math.max(2, Math.round(total / 34))
  const gap = total / (count + 1)
  const rungs: [Pt, Pt][] = []
  for (let i = 1; i <= count; i++) {
    const c = { x: a.x + ux * gap * i, y: a.y + uy * gap * i }
    rungs.push([
      { x: c.x + nx * half, y: c.y + ny * half },
      { x: c.x - nx * half, y: c.y - ny * half },
    ])
  }
  return { rails, rungs }
}

const LADDER_SHAPES = LADDERS.map(buildLadder)

// ─── Tokens ──────────────────────────────────────────────────

export interface SLTokenView {
  key:     string
  name:    string
  initial: string
  color:   string
  /** text colour on the token */
  ink:     string
  /** square the token is shown on (0 = waiting at the start) */
  square:  number
  /** seat number, used to place waiting tokens side by side */
  slot:    number
  /** while set, the token follows these keyframes instead of resting on `square` */
  motion:  TokenMotion | null
  active:  boolean
}

/** Where a token waits on the START square before its first move (slot = seat 0..3). */
export function startPoint(slot: number): Pt {
  return { x: 17 + slot * 22, y: 956 }
}

const STACK_OFFSETS: Record<number, Pt[]> = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -19, y: 4 }, { x: 19, y: -4 }],
  3: [{ x: -19, y: -12 }, { x: 19, y: -12 }, { x: 0, y: 18 }],
  4: [{ x: -18, y: -17 }, { x: 18, y: -17 }, { x: -18, y: 17 }, { x: 18, y: 17 }],
}
const TOKEN_R: Record<number, number> = { 1: 24, 2: 20, 3: 17, 4: 16 }

function Token({ t, x, y, r, moving }: { t: SLTokenView; x: number; y: number; r: number; moving: TokenMotion | null }) {
  const reduce = useReducedMotion()
  const anim = moving
    ? { x: moving.xs, y: moving.ys }
    : { x, y }
  const transition = moving
    ? { duration: reduce ? 0 : moving.dur, ease: moving.ease }
    : { duration: reduce ? 0 : 0.22, ease: "easeOut" as const }
  return (
    <motion.g initial={false} animate={anim} transition={transition}>
      <ellipse cx={2} cy={r * 0.62} rx={r * 0.95} ry={r * 0.42} fill="#000" opacity={0.22} />
      {t.active && (
        <motion.circle
          r={r + (r >= 14 ? 7 : 4)}
          fill="none"
          stroke="#0f172a"
          strokeWidth={r >= 14 ? 3.5 : 2.5}
          initial={false}
          animate={reduce ? { opacity: 0.9 } : { opacity: [0.35, 0.95, 0.35] }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <circle r={r} fill={t.color} stroke="#111827" strokeWidth={r >= 14 ? 3 : 2} />
      <circle r={r * 0.68} fill="none" stroke={t.ink} strokeOpacity={0.55} strokeWidth={2} />
      {r >= 14 && <text
        y={r * 0.34}
        textAnchor="middle"
        fontSize={r * 0.95}
        fontWeight={700}
        fill={t.ink}
        style={{ fontFamily: "var(--font-sans), Arial, sans-serif" }}
      >
        {t.initial}
      </text>}
    </motion.g>
  )
}

// ─── Board ───────────────────────────────────────────────────

const StaticBoard = memo(function StaticBoard() {
  const cells = []
  const labels = []
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const x = col * CELL
      const y = (N - 1 - row) * CELL
      const sq = row % 2 === 0 ? row * N + col + 1 : row * N + (N - 1 - col) + 1
      const fill = cellFill(row, col)
      const end = sq === 100 || sq === 1
      cells.push(<rect key={sq} x={x} y={y} width={CELL} height={CELL} fill={fill} stroke="#b9ae95" strokeWidth={1.5} />)
      labels.push(
        <g key={sq} stroke={fill} strokeWidth={5} strokeLinejoin="round" paintOrder="stroke" fill="#363b47">
          <text x={x + 8} y={y + 26} fontSize={end ? 25 : 23} fontWeight={end ? 800 : 600}>{sq}</text>
          {end && (
            <text x={x + CELL / 2} y={y + CELL - 11} textAnchor="middle" fontSize={15} fontWeight={700} letterSpacing={1.5}>
              {sq === 1 ? "START" : "FINISH"}
            </text>
          )}
        </g>,
      )
    }
  }

  return (
    <>
      <rect x={0} y={0} width={1000} height={1000} fill="#fdf8ec" />
      {cells}

      {/* ladders */}
      {LADDER_SHAPES.map((l, i) => (
        <g key={`l${i}`} strokeLinecap="round">
          <g transform="translate(5 6)" stroke="#000" strokeOpacity={0.16}>
            {l.rails.map(([p, q], k) => <line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={11} />)}
            {l.rungs.map(([p, q], k) => <line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} strokeWidth={8} />)}
          </g>
          {l.rungs.map(([p, q], k) => <line key={`ro${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#4a2a0c" strokeWidth={9} />)}
          {l.rungs.map(([p, q], k) => <line key={`rf${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#c98b45" strokeWidth={5} />)}
          {l.rails.map(([p, q], k) => <line key={`ao${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#4a2a0c" strokeWidth={12} />)}
          {l.rails.map(([p, q], k) => <line key={`af${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#a8692b" strokeWidth={7} />)}
        </g>
      ))}

      {/* snakes */}
      {SNAKE_SHAPES.map((s, i) => (
        <g key={`s${i}`}>
          <path d={s.body} transform="translate(4 5)" fill="#000" opacity={0.16} />
          <path d={s.body} fill={s.color.body} stroke={s.color.dark} strokeWidth={2.5} strokeLinejoin="round" />
          {s.bands.map((b, k) => (
            <line key={k} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={s.color.dark} strokeWidth={3.5} strokeLinecap="round" opacity={0.6} />
          ))}
          <g transform={`translate(${s.head.x.toFixed(1)} ${s.head.y.toFixed(1)}) rotate(${s.head.angle.toFixed(1)})`}>
            <path d="M 26 0 L 36 0 M 36 0 L 42 -5 M 36 0 L 42 5" stroke="#c81e1e" strokeWidth={2.6} strokeLinecap="round" fill="none" />
            <ellipse cx={4} cy={0} rx={24} ry={17} fill={s.color.body} stroke={s.color.dark} strokeWidth={2.5} />
            <circle cx={12} cy={-8} r={5} fill="#fff" stroke={s.color.dark} strokeWidth={1.2} />
            <circle cx={12} cy={8} r={5} fill="#fff" stroke={s.color.dark} strokeWidth={1.2} />
            <circle cx={13.5} cy={-8} r={2.4} fill="#111" />
            <circle cx={13.5} cy={8} r={2.4} fill="#111" />
            <circle cx={24} cy={-3.5} r={1.3} fill={s.color.dark} />
            <circle cx={24} cy={3.5} r={1.3} fill={s.color.dark} />
          </g>
        </g>
      ))}

      <g style={{ fontFamily: "var(--font-sans), Arial, sans-serif" }}>{labels}</g>

      <rect x={3} y={3} width={994} height={994} fill="none" stroke="#3b3326" strokeWidth={6} />
    </>
  )
})

export function SnakesBoard({ tokens, label }: { tokens: SLTokenView[]; label: string }) {
  // group resting tokens by square for stacking offsets
  const stacks = new Map<number, string[]>()
  for (const t of tokens) {
    if (t.square <= 0 || t.motion) continue
    const list = stacks.get(t.square) ?? []
    list.push(t.key)
    stacks.set(t.square, list)
  }
  // moving token and the active player's token are drawn last (on top)
  const ordered = [...tokens].sort((a, b) => Number(!!a.motion) - Number(!!b.motion) || Number(a.active) - Number(b.active))

  return (
    <svg viewBox="0 0 1000 1000" className="block h-full w-full select-none rounded-md" role="img" aria-label={label}>
      <StaticBoard />
      {ordered.map((t) => {
        if (t.square <= 0) {
          const p = startPoint(t.slot)
          return <Token key={t.key} t={t} x={p.x} y={p.y} r={t.motion ? 24 : 10} moving={t.motion} />
        }
        const stack = stacks.get(t.square) ?? [t.key]
        const n = Math.min(4, stack.length)
        const idx = Math.max(0, stack.indexOf(t.key)) % 4
        const r = t.motion ? 24 : TOKEN_R[n]
        const c = squareCenter(t.square, CELL)
        const off = t.motion ? { x: 0, y: 0 } : STACK_OFFSETS[n][idx]
        return <Token key={t.key} t={t} x={c.x + off.x} y={c.y + off.y} r={r} moving={t.motion} />
      })}
    </svg>
  )
}
