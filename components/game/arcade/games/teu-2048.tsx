"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { ArcadeGameProps } from "@/lib/game/arcade"

type Dir = "left" | "right" | "up" | "down"

export interface Tile {
  id: number
  value: number
  r: number
  c: number
  merged: boolean
  isNew: boolean
  gone: boolean
}

const C = { panel: "#111c33", border: "#1e2d4d", text: "#e2e8f0", muted: "#94a3b8", gold: "#fbbf24", cell: "#0f1a30" }

const RAMP: Record<number, { bg: string; fg: string }> = {
  2: { bg: "#7dd3fc", fg: "#0c4a6e" },
  4: { bg: "#38bdf8", fg: "#082f49" },
  8: { bg: "#2dd4bf", fg: "#042f2e" },
  16: { bg: "#4ade80", fg: "#052e16" },
  32: { bg: "#a3e635", fg: "#1a2e05" },
  64: { bg: "#facc15", fg: "#422006" },
  128: { bg: "#fb923c", fg: "#431407" },
  256: { bg: "#f97316", fg: "#ffffff" },
  512: { bg: "#ef4444", fg: "#ffffff" },
  1024: { bg: "#db2777", fg: "#ffffff" },
  2048: { bg: "#7c3aed", fg: "#ffffff" },
}
const BEYOND = { bg: "#0f172a", fg: "#fde047" }

function cellAt(dir: Dir, line: number, k: number): [number, number] {
  switch (dir) {
    case "left": return [line, k]
    case "right": return [line, 3 - k]
    case "up": return [k, line]
    case "down": return [3 - k, line]
  }
}

/** Slides/merges all live tiles. A tile merges at most once per move. Consumed tiles stay (gone) so they can animate in. */
export function slide(prev: Tile[], dir: Dir): { tiles: Tile[]; gained: number; moved: boolean; reached: boolean } {
  const grid: (Tile | null)[][] = Array.from({ length: 4 }, () => Array<Tile | null>(4).fill(null))
  prev.filter((t) => !t.gone).forEach((t) => { grid[t.r][t.c] = t })
  const out: Tile[] = []
  let gained = 0
  let moved = false
  let reached = false
  for (let line = 0; line < 4; line++) {
    const placed: Tile[] = []
    for (let k = 0; k < 4; k++) {
      const [r, c] = cellAt(dir, line, k)
      const t = grid[r][c]
      if (!t) continue
      const last = placed[placed.length - 1]
      if (last && last.value === t.value && !last.merged) {
        last.value *= 2
        last.merged = true
        gained += last.value
        if (last.value === 2048) reached = true
        moved = true
        out.push({ ...t, r: last.r, c: last.c, merged: false, isNew: false, gone: true })
      } else {
        const [nr, nc] = cellAt(dir, line, placed.length)
        if (nr !== t.r || nc !== t.c) moved = true
        placed.push({ ...t, r: nr, c: nc, merged: false, isNew: false, gone: false })
      }
    }
    out.push(...placed)
  }
  return { tiles: out, gained, moved, reached }
}

export function canMove(tiles: Tile[]): boolean {
  const live = tiles.filter((t) => !t.gone)
  if (live.length < 16) return true
  const v = (r: number, c: number) => live.find((t) => t.r === r && t.c === c)?.value
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (c < 3 && v(r, c) === v(r, c + 1)) return true
      if (r < 3 && v(r, c) === v(r + 1, c)) return true
    }
  }
  return false
}

function spawn(tiles: Tile[], id: number): Tile[] {
  const taken = new Set(tiles.filter((t) => !t.gone).map((t) => t.r * 4 + t.c))
  const free: number[] = []
  for (let i = 0; i < 16; i++) if (!taken.has(i)) free.push(i)
  if (free.length === 0) return tiles
  const p = free[Math.floor(Math.random() * free.length)]
  return [...tiles, { id, value: Math.random() < 0.9 ? 2 : 4, r: Math.floor(p / 4), c: p % 4, merged: false, isNew: true, gone: false }]
}

interface State { tiles: Tile[]; score: number; nextId: number; over: boolean; won: boolean }

function initial(): State {
  return { tiles: spawn(spawn([], 1), 2), score: 0, nextId: 3, over: false, won: false }
}

function step(s: State, dir: Dir): State {
  if (s.over) return s
  const res = slide(s.tiles, dir)
  if (!res.moved) return s
  const tiles = spawn(res.tiles, s.nextId)
  return { tiles, score: s.score + res.gained, nextId: s.nextId + 1, over: !canMove(tiles), won: s.won || res.reached }
}

const KEYS: Record<string, Dir> = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down",
}

export default function TeuStacker({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [s, setS] = useState<State>(initial)
  const finishedRef = useRef(false)
  const cbRef = useRef(onGameOver)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => { cbRef.current = onGameOver }, [onGameOver])

  const move = (dir: Dir) => setS((prev) => step(prev, dir))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.startsWith("Arrow") || e.key === " ") e.preventDefault()
      const dir = KEYS[e.key]
      if (dir) {
        e.preventDefault()
        setS((prev) => step(prev, dir))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!s.over) return
    const t = setTimeout(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      const top = s.tiles.reduce((m, x) => (x.gone ? m : Math.max(m, x.value)), 0)
      cbRef.current({ score: s.score, won: s.won, summary: `Biggest stack: ${top} TEU` })
    }, 800)
    return () => clearTimeout(t)
  }, [s.over, s.score, s.won, s.tiles])

  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const st = swipeRef.current
    swipeRef.current = null
    if (!st) return
    const dx = e.clientX - st.x
    const dy = e.clientY - st.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up")
  }

  const top = s.tiles.reduce((m, x) => (x.gone ? m : Math.max(m, x.value)), 0)
  const spring = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 38 }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 select-none" style={{ color: C.text }}>
      <div className="grid w-full max-w-[380px] grid-cols-2 gap-2">
        {([["Merged TEU", String(s.score)], ["Biggest stack", `${top} TEU`]] as const).map(([label, val]) => (
          <div key={label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: label === "Merged TEU" ? C.gold : C.text }}>{val}</div>
          </div>
        ))}
      </div>

      <div
        className="relative aspect-square w-full max-w-[380px] rounded-xl p-[6px]"
        style={{ background: C.panel, border: `1px solid ${C.border}`, touchAction: "none", containerType: "inline-size" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipeRef.current = null }}
        role="application"
        aria-label="TEU stacker board. Use arrow keys or swipe."
      >
        <div className="relative h-full w-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="absolute h-1/4 w-1/4 p-[3px]" style={{ left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 25}%` }}>
              <div className="h-full w-full rounded-md" style={{ background: C.cell }} />
            </div>
          ))}
          {s.tiles.map((t) => {
            const col = RAMP[t.value] ?? BEYOND
            const big = t.value >= 1000
            return (
              <motion.div
                key={t.id}
                className="absolute left-0 top-0 h-1/4 w-1/4 p-[3px]"
                style={{ zIndex: t.gone ? 1 : 2 }}
                initial={{ x: `${t.c * 100}%`, y: `${t.r * 100}%` }}
                animate={{ x: `${t.c * 100}%`, y: `${t.r * 100}%`, opacity: t.gone ? 0 : 1 }}
                transition={{ x: spring, y: spring, opacity: { duration: 0.01, delay: t.gone ? 0.12 : 0 } }}
              >
                <motion.div
                  key={t.value}
                  className="flex h-full w-full flex-col items-center justify-center rounded-md"
                  initial={reduced ? false : { scale: t.isNew ? 0.2 : t.merged ? 1.25 : 1 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  style={{
                    background: `repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 3px, rgba(255,255,255,0.05) 3px 7px), ${col.bg}`,
                    color: col.fg,
                    border: "2px solid rgba(255,255,255,0.35)",
                    boxShadow: t.value >= 128 ? `0 0 14px ${col.bg}99, inset 0 -4px 0 rgba(0,0,0,0.22)` : "inset 0 -4px 0 rgba(0,0,0,0.22)",
                  }}
                >
                  <span className="font-extrabold leading-none tabular-nums" style={{ fontSize: big ? "6.4cqw" : "8cqw" }}>{t.value}</span>
                  <span className="mt-0.5 font-semibold leading-none tracking-widest opacity-80" style={{ fontSize: "2.6cqw" }}>TEU</span>
                </motion.div>
              </motion.div>
            )
          })}
        </div>

        {s.over && (
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl text-center"
            style={{ background: "rgba(11,18,32,0.78)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div>
              <div className="text-xl font-extrabold" style={{ color: C.gold }}>{s.won ? "Mega-vessel loaded!" : "Terminal full"}</div>
              <div className="text-sm" style={{ color: C.muted }}>{s.score} TEU merged</div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <p className="text-xs" style={{ color: s.won ? C.gold : C.muted }} aria-live="polite">
          {s.won ? "2048 TEU reached! Keep stacking, or end your run." : "Arrow keys / WASD or swipe. Equal stacks merge."}
        </p>
        <button
          type="button"
          disabled={s.over}
          onClick={() => setS((p) => ({ ...p, over: true }))}
          className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text }}
        >
          End run
        </button>
      </div>
    </div>
  )
}
