"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ship } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

const N = 20
const CELL = 20
const PX = N * CELL

type Dir = "up" | "down" | "left" | "right"
interface Pt { x: number; y: number }

const VEC: Record<Dir, Pt> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" }
const ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }
const BARGE_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#f97316", "#a855f7"]

interface RunState {
  snake: Pt[] // head first
  dir: Dir
  queue: Dir[]
  crate: Pt
  cargo: number
  started: boolean
  over: boolean
  deadAt: number
}

function placeCrate(snake: Pt[]): Pt | null {
  const free: Pt[] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y })
    }
  }
  if (free.length === 0) return null
  return free[Math.floor(Math.random() * free.length)]
}

function newRun(): RunState {
  const snake: Pt[] = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ]
  return {
    snake,
    dir: "right",
    queue: [],
    crate: placeCrate(snake) ?? { x: 15, y: 10 },
    cargo: 0,
    started: false,
    over: false,
    deadAt: 0,
  }
}

function stepDelay(cargo: number): number {
  return Math.max(70, 150 - cargo * 3)
}

function draw(ctx: CanvasRenderingContext2D, s: RunState, t: number, reduced: boolean) {
  // sea
  const g = ctx.createLinearGradient(0, 0, 0, PX)
  g.addColorStop(0, "#0b4a78")
  g.addColorStop(1, "#082f52")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, PX, PX)

  // waves
  ctx.lineWidth = 1
  ctx.strokeStyle = "rgba(186,230,253,0.09)"
  const phase = reduced ? 0 : t / 900
  for (let row = 0; row < N; row += 2) {
    ctx.beginPath()
    for (let x = 0; x <= PX; x += 4) {
      const y = row * CELL + 10 + Math.sin(x / 22 + phase + row) * 2.5
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // faint grid
  ctx.strokeStyle = "rgba(255,255,255,0.025)"
  ctx.beginPath()
  for (let i = 1; i < N; i++) {
    ctx.moveTo(i * CELL, 0)
    ctx.lineTo(i * CELL, PX)
    ctx.moveTo(0, i * CELL)
    ctx.lineTo(PX, i * CELL)
  }
  ctx.stroke()

  // crate
  {
    const bob = reduced ? 0 : Math.sin(t / 260) * 1.2
    const cx = s.crate.x * CELL
    const cy = s.crate.y * CELL + bob
    ctx.fillStyle = "#f59e0b"
    ctx.fillRect(cx + 3, cy + 3, CELL - 6, CELL - 6)
    ctx.strokeStyle = "#92400e"
    ctx.lineWidth = 1.5
    ctx.strokeRect(cx + 3.75, cy + 3.75, CELL - 7.5, CELL - 7.5)
    ctx.beginPath()
    ctx.moveTo(cx + 3, cy + 3)
    ctx.lineTo(cx + CELL - 3, cy + CELL - 3)
    ctx.moveTo(cx + CELL - 3, cy + 3)
    ctx.lineTo(cx + 3, cy + CELL - 3)
    ctx.stroke()
  }

  // tow lines
  ctx.strokeStyle = "#cbd5e1"
  ctx.lineWidth = 2
  ctx.beginPath()
  s.snake.forEach((p, i) => {
    const px = p.x * CELL + CELL / 2
    const py = p.y * CELL + CELL / 2
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()

  // barges
  for (let i = s.snake.length - 1; i >= 1; i--) {
    const p = s.snake[i]
    const x = p.x * CELL
    const y = p.y * CELL
    ctx.fillStyle = BARGE_COLORS[(i - 1) % BARGE_COLORS.length]
    ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4)
    ctx.strokeStyle = "rgba(0,0,0,0.3)"
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let k = 1; k < 4; k++) {
      ctx.moveTo(x + 2 + k * ((CELL - 4) / 4), y + 2)
      ctx.lineTo(x + 2 + k * ((CELL - 4) / 4), y + CELL - 2)
    }
    ctx.stroke()
    ctx.strokeStyle = "rgba(255,255,255,0.25)"
    ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5)
  }

  // lead ship
  {
    const h = s.snake[0]
    ctx.save()
    ctx.translate(h.x * CELL + CELL / 2, h.y * CELL + CELL / 2)
    ctx.rotate(ANGLE[s.dir])
    ctx.fillStyle = "#e2e8f0"
    ctx.beginPath()
    ctx.moveTo(10, 0)
    ctx.lineTo(4, -7)
    ctx.lineTo(-9, -7)
    ctx.lineTo(-9, 7)
    ctx.lineTo(4, 7)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "#38bdf8"
    ctx.fillRect(-6, -4, 6, 8)
    ctx.fillStyle = "#0f172a"
    ctx.fillRect(-4, -2, 3, 4)
    ctx.restore()
  }

  if (s.over) {
    const k = Math.min(1, Math.max(0, (t - s.deadAt) / 400))
    ctx.fillStyle = `rgba(239,68,68,${0.35 * k})`
    ctx.fillRect(0, 0, PX, PX)
  }
}

export default function Convoy({ onGameOver }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runRef = useRef<RunState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(false)
  const overCbRef = useRef(onGameOver)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)
  const [cargo, setCargo] = useState(0)
  const [started, setStarted] = useState(false)
  const [crashed, setCrashed] = useState(false)

  useEffect(() => {
    overCbRef.current = onGameOver
  }, [onGameOver])

  const finish = useCallback((score: number) => {
    if (doneRef.current) return
    doneRef.current = true
    overCbRef.current({
      score,
      won: false,
      summary: `${score / 10} cargo crate${score === 10 ? "" : "s"} delivered`,
    })
  }, [])

  const clearTick = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const endRun = useCallback(
    (s: RunState) => {
      s.over = true
      s.deadAt = performance.now()
      setCrashed(true)
      endTimerRef.current = setTimeout(() => finish(s.cargo * 10), 800)
    },
    [finish],
  )

  const tickRef = useRef<() => void>(() => {})

  const tick = useCallback(() => {
    timerRef.current = null
    const s = runRef.current
    if (!s || s.over) return
    const dir = s.queue.shift() ?? s.dir
    s.dir = dir
    const v = VEC[dir]
    const head = s.snake[0]
    const next = { x: head.x + v.x, y: head.y + v.y }
    const eating = next.x === s.crate.x && next.y === s.crate.y
    const body = eating ? s.snake : s.snake.slice(0, -1)
    const hitWall = next.x < 0 || next.y < 0 || next.x >= N || next.y >= N
    const hitSelf = body.some((p) => p.x === next.x && p.y === next.y)
    if (hitWall || hitSelf) {
      endRun(s)
      return
    }
    s.snake.unshift(next)
    if (eating) {
      s.cargo += 1
      setCargo(s.cargo)
      const c = placeCrate(s.snake)
      if (!c) {
        endRun(s)
        return
      }
      s.crate = c
    } else {
      s.snake.pop()
    }
    timerRef.current = setTimeout(() => tickRef.current(), stepDelay(s.cargo))
  }, [endRun])

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  const turn = useCallback(
    (d: Dir) => {
      const s = runRef.current
      if (!s || s.over) return
      if (!s.started) {
        if (OPPOSITE[d] === s.dir) return
        s.dir = d
        s.started = true
        setStarted(true)
        timerRef.current = setTimeout(tick, stepDelay(0))
        return
      }
      const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir
      if (d === last || OPPOSITE[d] === last) return
      if (s.queue.length < 2) s.queue.push(d)
    },
    [tick],
  )

  // init + render loop + visibility
  useEffect(() => {
    runRef.current = newRun()
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d") ?? null
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    const frame = (t: number) => {
      if (ctx && runRef.current) draw(ctx, runRef.current, t, reduced)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onVis = () => {
      const s = runRef.current
      if (document.hidden) clearTick()
      else if (s && s.started && !s.over && timerRef.current === null) {
        timerRef.current = setTimeout(tick, stepDelay(s.cargo))
      }
    }
    document.addEventListener("visibilitychange", onVis)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVis)
      clearTick()
      if (endTimerRef.current !== null) clearTimeout(endTimerRef.current)
    }
  }, [clearTick, tick])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let d: Dir | null = null
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          d = "up"
          break
        case "ArrowDown":
        case "s":
        case "S":
          d = "down"
          break
        case "ArrowLeft":
        case "a":
        case "A":
          d = "left"
          break
        case "ArrowRight":
        case "d":
        case "D":
          d = "right"
          break
        case " ":
          e.preventDefault()
          return
      }
      if (d) {
        e.preventDefault()
        turn(d)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [turn])

  const onPointerDown = (e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const o = swipeRef.current
    if (!o) return
    const dx = e.clientX - o.x
    const dy = e.clientY - o.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left")
    else turn(dy > 0 ? "down" : "up")
    swipeRef.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = () => {
    swipeRef.current = null
  }

  const pad = (d: Dir, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      aria-label={label}
      tabIndex={-1}
      onPointerDown={(e) => {
        e.preventDefault()
        turn(d)
      }}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-100 active:bg-emerald-600"
    >
      {icon}
    </button>
  )

  return (
    <div className="mx-auto flex w-full max-w-[560px] select-none flex-col items-center gap-2 text-slate-100">
      <div className="flex w-full items-center justify-between px-1 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Ship size={14} aria-hidden /> CONVOY
        </span>
        <span className="text-slate-300">
          CARGO <b className="text-amber-400">{cargo}</b>
        </span>
        <span className="text-slate-300">
          SCORE <b className="text-emerald-400">{cargo * 10}</b>
        </span>
      </div>

      <div
        className={`w-full max-w-[400px] touch-none overflow-hidden rounded-xl border-2 ${
          crashed ? "border-red-500" : "border-slate-600"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={PX}
          height={PX}
          className="block h-auto w-full"
          aria-label="Convoy sea chart"
        />
      </div>

      <p className="text-center text-xs text-slate-400">
        {crashed
          ? "Convoy lost. Counting the cargo..."
          : started
            ? "Collect crates. Don't hit the edge or your own barges."
            : "Press an arrow key or swipe to set sail."}
      </p>

      <div className="hidden grid-cols-3 gap-1 [@media(pointer:coarse)]:grid">
        <span />
        {pad("up", <ArrowUp size={20} />, "Up")}
        <span />
        {pad("left", <ArrowLeft size={20} />, "Left")}
        {pad("down", <ArrowDown size={20} />, "Down")}
        {pad("right", <ArrowRight size={20} />, "Right")}
      </div>
    </div>
  )
}
