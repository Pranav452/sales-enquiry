"use client"

// Ludo board, drawn in SVG (600 x 600 units, 40 per cell, 15 x 15 grid).

import { memo, useState, type KeyboardEvent } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  BASE, BASE_ORIGIN, HOME, HOME_COLUMN, START_INDEX, STAR_INDICES, TRACK, TURN_ORDER, tokenCell,
  type LudoColor,
} from "./ludoLogic"
import type { TokenMotion } from "./shared"

export const C = 40

export const LUDO_COLORS: Record<LudoColor, { fill: string; dark: string; tint: string; label: string }> = {
  red:    { fill: "#de3b35", dark: "#7a1a16", tint: "#f7d0cd", label: "Red" },
  green:  { fill: "#2c9b50", dark: "#134f2c", tint: "#cbe9d4", label: "Green" },
  yellow: { fill: "#f1bb1b", dark: "#775600", tint: "#fbe9b0", label: "Yellow" },
  blue:   { fill: "#2c6dd1", dark: "#163a76", tint: "#cad9f4", label: "Blue" },
}

interface Pt { x: number; y: number }

const SLOT_OFFSETS: Pt[] = [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 4 }]

/** Centre of each colour's triangle in the home square (cell units). */
const HOME_CENTRE: Record<LudoColor, Pt> = {
  green:  { x: 6.55, y: 7.5 },
  yellow: { x: 7.5, y: 6.55 },
  blue:   { x: 8.45, y: 7.5 },
  red:    { x: 7.5, y: 8.45 },
}
const HOME_SPREAD: Record<LudoColor, Pt[]> = {
  green:  [{ x: 0, y: -0.62 }, { x: 0, y: 0.62 }, { x: -0.25, y: -0.2 }, { x: -0.25, y: 0.2 }],
  yellow: [{ x: -0.62, y: 0 }, { x: 0.62, y: 0 }, { x: -0.2, y: -0.25 }, { x: 0.2, y: -0.25 }],
  blue:   [{ x: 0, y: -0.62 }, { x: 0, y: 0.62 }, { x: 0.25, y: -0.2 }, { x: 0.25, y: 0.2 }],
  red:    [{ x: -0.62, y: 0 }, { x: 0.62, y: 0 }, { x: -0.2, y: 0.25 }, { x: 0.2, y: 0.25 }],
}

/** Resting point (board units) of a token. */
export function restingPoint(color: LudoColor, rel: number, ti: number): Pt {
  if (rel === BASE) {
    const o = BASE_ORIGIN[color]
    return { x: (o[0] + SLOT_OFFSETS[ti].x) * C, y: (o[1] + SLOT_OFFSETS[ti].y) * C }
  }
  if (rel >= HOME) {
    const h = HOME_CENTRE[color]
    const d = HOME_SPREAD[color][ti]
    return { x: (h.x + d.x) * C, y: (h.y + d.y) * C }
  }
  const cell = tokenCell(color, rel)!
  return { x: (cell[0] + 0.5) * C, y: (cell[1] + 0.5) * C }
}

const STACK: Record<number, { pts: Pt[]; scale: number }> = {
  1: { pts: [{ x: 0, y: 0 }], scale: 1 },
  2: { pts: [{ x: -8.5, y: 1 }, { x: 8.5, y: 1 }], scale: 0.72 },
  3: { pts: [{ x: -8.5, y: -6 }, { x: 8.5, y: -6 }, { x: 0, y: 9 }], scale: 0.6 },
  4: { pts: [{ x: -8.5, y: -6.5 }, { x: 8.5, y: -6.5 }, { x: -8.5, y: 9.5 }, { x: 8.5, y: 9.5 }], scale: 0.56 },
}
const STACK_MANY = {
  pts: [-11, 0, 11].flatMap((y) => [-11, 0, 11].map((x) => ({ x, y: y + 2 }))),
  scale: 0.42,
}

// ─── Static board ────────────────────────────────────────────

function starPath(cx: number, cy: number, r: number, inner: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 === 0 ? r : inner
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(2)} ${(cy + Math.sin(a) * rad).toFixed(2)}`)
  }
  return `M ${pts.join(" L ")} Z`
}

const ENTRY_ARROWS: { color: LudoColor; cell: [number, number]; angle: number }[] = [
  { color: "green",  cell: [0, 7],  angle: 0 },
  { color: "yellow", cell: [7, 0],  angle: 90 },
  { color: "blue",   cell: [14, 7], angle: 180 },
  { color: "red",    cell: [7, 14], angle: 270 },
]

const LINE = "#8e97a3"

const StaticBoard = memo(function StaticBoard() {
  const startCells = new Map<number, LudoColor>(TURN_ORDER.map((c) => [START_INDEX[c], c]))
  return (
    <>
      <rect x={0} y={0} width={600} height={600} fill="#ffffff" />

      {/* bases */}
      {TURN_ORDER.map((color) => {
        const [bx, by] = BASE_ORIGIN[color]
        const k = LUDO_COLORS[color]
        return (
          <g key={color}>
            <rect x={bx * C} y={by * C} width={6 * C} height={6 * C} fill={k.fill} stroke={k.dark} strokeWidth={1.5} />
            <rect x={(bx + 1) * C} y={(by + 1) * C} width={4 * C} height={4 * C} rx={14} fill="#ffffff" stroke={k.dark} strokeOpacity={0.35} strokeWidth={1.5} />
            {SLOT_OFFSETS.map((o, i) => (
              <circle key={i} cx={(bx + o.x) * C} cy={(by + o.y) * C} r={15} fill={k.tint} stroke={k.fill} strokeWidth={3} />
            ))}
          </g>
        )
      })}

      {/* shared track */}
      {TRACK.map(([col, row], i) => {
        const startOf = startCells.get(i)
        const fill = startOf ? LUDO_COLORS[startOf].fill : "#ffffff"
        return <rect key={`t${i}`} x={col * C} y={row * C} width={C} height={C} fill={fill} stroke={LINE} strokeWidth={1} />
      })}

      {/* home columns */}
      {TURN_ORDER.map((color) => HOME_COLUMN[color].map(([col, row], i) => (
        <rect key={`h${color}${i}`} x={col * C} y={row * C} width={C} height={C} fill={LUDO_COLORS[color].fill} stroke={LINE} strokeWidth={1} />
      )))}

      {/* safe squares: stars on the star squares, white stars on the start squares */}
      {STAR_INDICES.map((i) => {
        const [col, row] = TRACK[i]
        return <path key={`s${i}`} d={starPath((col + 0.5) * C, (row + 0.5) * C, 13, 5.6)} fill="none" stroke="#6b7480" strokeWidth={1.8} strokeLinejoin="round" />
      })}
      {TURN_ORDER.map((color) => {
        const [col, row] = TRACK[START_INDEX[color]]
        return <path key={`ss${color}`} d={starPath((col + 0.5) * C, (row + 0.5) * C, 13, 5.6)} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
      })}

      {/* arrows into each home column */}
      {ENTRY_ARROWS.map(({ color, cell, angle }) => (
        <g key={`a${color}`} transform={`translate(${(cell[0] + 0.5) * C} ${(cell[1] + 0.5) * C}) rotate(${angle})`}>
          <path d="M -11 0 L 9 0 M 2 -7 L 10 0 L 2 7" fill="none" stroke={LUDO_COLORS[color].fill} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}

      {/* centre home */}
      <g stroke={LINE} strokeWidth={1} strokeLinejoin="round">
        <polygon points={`${6 * C},${6 * C} ${7.5 * C},${7.5 * C} ${6 * C},${9 * C}`} fill={LUDO_COLORS.green.fill} />
        <polygon points={`${6 * C},${6 * C} ${9 * C},${6 * C} ${7.5 * C},${7.5 * C}`} fill={LUDO_COLORS.yellow.fill} />
        <polygon points={`${9 * C},${6 * C} ${9 * C},${9 * C} ${7.5 * C},${7.5 * C}`} fill={LUDO_COLORS.blue.fill} />
        <polygon points={`${6 * C},${9 * C} ${7.5 * C},${7.5 * C} ${9 * C},${9 * C}`} fill={LUDO_COLORS.red.fill} />
      </g>

      <rect x={1.5} y={1.5} width={597} height={597} fill="none" stroke="#1f2937" strokeWidth={3} />
    </>
  )
})

// ─── Tokens ──────────────────────────────────────────────────

export interface LudoTokenView {
  key:        string
  pi:         number
  ti:         number
  color:      LudoColor
  /** displayed progress (may lag the logical one while animating) */
  rel:        number
  motion:     TokenMotion | null
  selectable: boolean
  /** destination progress if chosen (for the hover preview) */
  dest:       number | null
  label:      string
}

const PIN = "M 0 12 C -3 7 -10 2 -10 -5 A 10 10 0 1 1 10 -5 C 10 2 3 7 0 12 Z"

function Pin({ t, x, y, scale, focused, onChoose, onHover }: {
  t: LudoTokenView
  x: number
  y: number
  scale: number
  focused: boolean
  onChoose: (pi: number, ti: number) => void
  onHover: (key: string | null) => void
}) {
  const reduce = useReducedMotion()
  const k = LUDO_COLORS[t.color]
  const anim = t.motion ? { x: t.motion.xs, y: t.motion.ys } : { x, y }
  const transition = t.motion
    ? { duration: reduce ? 0 : t.motion.dur, ease: t.motion.ease }
    : { duration: reduce ? 0 : 0.2, ease: "easeOut" as const }

  function onKey(e: KeyboardEvent<SVGGElement>) {
    if (!t.selectable) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onChoose(t.pi, t.ti)
    }
  }

  return (
    <motion.g initial={false} animate={anim} transition={transition}>
      <g
        transform={`scale(${scale})`}
        role={t.selectable ? "button" : undefined}
        tabIndex={t.selectable ? 0 : undefined}
        aria-label={t.selectable ? t.label : undefined}
        data-choose={t.selectable ? "true" : undefined}
        onClick={t.selectable ? () => onChoose(t.pi, t.ti) : undefined}
        onKeyDown={onKey}
        onPointerEnter={t.selectable ? () => onHover(t.key) : undefined}
        onPointerLeave={t.selectable ? () => onHover(null) : undefined}
        onFocus={t.selectable ? () => onHover(t.key) : undefined}
        onBlur={t.selectable ? () => onHover(null) : undefined}
        style={{ cursor: t.selectable ? "pointer" : undefined, outline: "none" }}
      >
        {t.selectable && <circle cx={0} cy={-1} r={19} fill="transparent" />}
        <ellipse cx={0} cy={12} rx={7.5} ry={2.6} fill="#000" opacity={0.28} />
        <motion.g
          initial={false}
          animate={t.selectable && !reduce ? { y: [0, -3, 0] } : { y: 0 }}
          transition={t.selectable && !reduce ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
        >
          {t.selectable && (
            <motion.circle
              cx={0}
              cy={-5}
              r={focused ? 15.5 : 14.5}
              fill="none"
              stroke="#111827"
              strokeWidth={focused ? 3 : 2.2}
              initial={false}
              animate={reduce || focused ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
              transition={reduce || focused ? { duration: 0 } : { duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <path d={PIN} fill={k.fill} stroke={k.dark} strokeWidth={1.6} strokeLinejoin="round" />
          <circle cx={0} cy={-5} r={5.6} fill="#ffffff" />
          {t.selectable ? (
            <text x={0} y={-2.4} textAnchor="middle" fontSize={7.5} fontWeight={800} fill={k.dark}
              style={{ fontFamily: "var(--font-sans), Arial, sans-serif" }}>
              {t.ti + 1}
            </text>
          ) : (
            <circle cx={0} cy={-5} r={2.4} fill={k.dark} />
          )}
        </motion.g>
      </g>
    </motion.g>
  )
}

export function LudoBoard({ tokens, activeColor, label, onChoose }: {
  tokens:      LudoTokenView[]
  activeColor: LudoColor | null
  label:       string
  onChoose:    (pi: number, ti: number) => void
}) {
  const [hover, setHover] = useState<string | null>(null)

  // stack resting tokens that share a cell
  const stacks = new Map<string, string[]>()
  for (const t of tokens) {
    if (t.motion || t.rel === BASE || t.rel >= HOME) continue
    const cell = tokenCell(t.color, t.rel)!
    const id = `${cell[0]},${cell[1]}`
    const list = stacks.get(id) ?? []
    list.push(t.key)
    stacks.set(id, list)
  }
  const ordered = [...tokens].sort((a, b) =>
    Number(!!a.motion) - Number(!!b.motion) || Number(a.selectable) - Number(b.selectable))

  const hovered = tokens.find((t) => t.key === hover && t.selectable && t.dest != null)
  const previewCell = hovered && hovered.dest != null && hovered.dest < HOME ? tokenCell(hovered.color, hovered.dest) : null
  const previewHome = hovered && hovered.dest === HOME

  return (
    <svg viewBox="0 0 600 600" className="block h-full w-full select-none rounded-md" role="group" aria-label={label}>
      <StaticBoard />

      {activeColor && (() => {
        const [bx, by] = BASE_ORIGIN[activeColor]
        return (
          <rect
            x={bx * C + 3} y={by * C + 3} width={6 * C - 6} height={6 * C - 6}
            fill="none" stroke="#111827" strokeWidth={5} strokeLinejoin="round"
            aria-hidden
          />
        )
      })()}

      {previewCell && (
        <rect
          x={previewCell[0] * C + 3} y={previewCell[1] * C + 3} width={C - 6} height={C - 6} rx={4}
          fill="none" stroke="#111827" strokeWidth={2.5} strokeDasharray="5 4" aria-hidden
        />
      )}
      {previewHome && (
        <rect x={6 * C + 4} y={6 * C + 4} width={3 * C - 8} height={3 * C - 8} rx={6}
          fill="none" stroke="#111827" strokeWidth={2.5} strokeDasharray="6 5" aria-hidden />
      )}

      {ordered.map((t) => {
        const p = restingPoint(t.color, t.rel, t.ti)
        let off: Pt = { x: 0, y: 0 }
        let scale = t.rel >= HOME ? 0.62 : t.rel === BASE ? 1.05 : 1
        if (!t.motion && t.rel !== BASE && t.rel < HOME) {
          const cell = tokenCell(t.color, t.rel)!
          const stack = stacks.get(`${cell[0]},${cell[1]}`) ?? [t.key]
          const layout = STACK[stack.length] ?? STACK_MANY
          const i = Math.max(0, stack.indexOf(t.key)) % layout.pts.length
          off = layout.pts[i]
          scale = layout.scale
        }
        return (
          <Pin
            key={t.key}
            t={t}
            x={p.x + off.x}
            y={p.y + off.y}
            scale={scale}
            focused={hover === t.key}
            onChoose={onChoose}
            onHover={setHover}
          />
        )
      })}
    </svg>
  )
}
