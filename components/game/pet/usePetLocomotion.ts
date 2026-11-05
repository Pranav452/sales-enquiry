"use client"

// ============================================================
// Follow + Wander movement. One requestAnimationFrame loop, only
// while a moving mode is active and not paused (dragging, menu
// open, tab hidden, modal open). Positions go straight into
// motion values — React never re-renders per frame.
// ============================================================

import { useEffect, useRef, type MutableRefObject } from "react"
import type { MotionValue } from "framer-motion"
import { useChatDock } from "@/lib/store/chatDock"
import type { PetMode } from "./species"

export interface LocomotionCallbacks {
  onWalking: (walking: boolean) => void
  /** 1 = facing left (the art's natural pose), -1 = facing right. */
  onFacing:  (facing: 1 | -1) => void
  onLand:    () => void
  onHop:     () => void
  onRest:    (x: number, y: number) => void
}

interface Options {
  mode:      PetMode
  paused:    boolean
  x:         MotionValue<number>
  y:         MotionValue<number>
  w:         number
  h:         number
  callbacks: LocomotionCallbacks
}

type SizeRef = MutableRefObject<{ w: number; h: number }>
type CbRef = MutableRefObject<LocomotionCallbacks>

/** Left gutter so the pet never parks on the collapsed sidebar. */
export const SIDEBAR_GUTTER = 64

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function viewportBounds(w: number, h: number): { maxX: number; maxY: number } {
  return {
    maxX: Math.max(0, window.innerWidth - w),
    maxY: Math.max(0, window.innerHeight - h),
  }
}

/**
 * Space to keep clear on the right of the bottom edge: the calculator /
 * rate-chat buttons, plus any open chat-dock panels (320px each).
 */
export function rightReserve(vw: number): number {
  let reserve = 150
  const items = useChatDock.getState().items
  if (items.length && vw >= 768) {
    const max = vw < 1024 ? 1 : vw < 1280 ? 2 : vw < 1600 ? 3 : 4
    const shown = Math.min(items.length, max)
    reserve = Math.max(reserve, 24 + shown * 328 + (items.length > max ? 110 : 0))
  }
  return reserve
}

export function usePetLocomotion({ mode, paused, x, y, w, h, callbacks }: Options) {
  const size = useRef({ w, h })
  const cb = useRef(callbacks)

  useEffect(() => { size.current = { w, h } }, [w, h])
  useEffect(() => { cb.current = callbacks })

  useEffect(() => {
    if (paused || mode === "stay") return
    return mode === "follow" ? runFollow(x, y, size, cb) : runWander(x, y, size, cb)
  }, [mode, paused, x, y])
}

// ─── Follow: lagged spring on a leash behind the cursor ──────

function runFollow(x: MotionValue<number>, y: MotionValue<number>, size: SizeRef, cb: CbRef): () => void {
  let raf = 0
  let running = false
  let last = 0
  let vx = 0
  let vy = 0
  let moving = false
  let facing = 0
  const cursor = { x: Number.NaN, y: Number.NaN, t: 0 }

  const tick = (now: number) => {
    const dt = clamp((now - last) / 1000, 0.001, 0.034)
    last = now
    const { w, h } = size.current
    const px = x.get()
    const py = y.get()
    const cx = px + w / 2
    const cy = py + h / 2
    const dx = cursor.x - cx
    const dy = cursor.y - cy
    const dist = Math.hypot(dx, dy)
    // Rest on a leash: inside it the pet stays put (so you can click it).
    const leash = Math.max(w, h) * 0.5 + 40

    let tx = cx
    let ty = cy
    if (dist > leash) {
      tx = cursor.x - (dx / dist) * leash
      ty = cursor.y - (dy / dist) * leash
    }

    const K = 20
    const C = 8
    vx += ((tx - cx) * K - vx * C) * dt
    vy += ((ty - cy) * K - vy * C) * dt
    const speed = Math.hypot(vx, vy)
    if (speed > 1500) { vx *= 1500 / speed; vy *= 1500 / speed }

    let nx = px + vx * dt
    let ny = py + vy * dt

    // While travelling, never slide underneath the cursor's click target.
    if (speed > 60) {
      const pad = 10
      if (cursor.x > nx - pad && cursor.x < nx + w + pad && cursor.y > ny - pad && cursor.y < ny + h + pad) {
        const ox = nx + w / 2 - cursor.x
        const oy = ny + h / 2 - cursor.y
        const ol = Math.hypot(ox, oy) || 1
        nx = cursor.x + (ox / ol) * leash - w / 2
        ny = cursor.y + (oy / ol) * leash - h / 2
        vx *= 0.4
        vy *= 0.4
      }
    }

    const b = viewportBounds(w, h)
    nx = clamp(nx, 0, b.maxX)
    ny = clamp(ny, 0, b.maxY)
    x.set(nx)
    y.set(ny)

    const nowMoving = speed > 35
    if (nowMoving !== moving) {
      moving = nowMoving
      cb.current.onWalking(moving)
      if (!moving) cb.current.onRest(nx, ny)
    }
    if (Math.abs(vx) > 45) {
      const f = vx > 0 ? -1 : 1
      if (f !== facing) { facing = f; cb.current.onFacing(f) }
    }

    // Settled and the cursor is idle: sleep until it moves again.
    if (!moving && speed < 3 && now - cursor.t > 1200) {
      running = false
      return
    }
    raf = requestAnimationFrame(tick)
  }

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    cursor.x = e.clientX
    cursor.y = e.clientY
    cursor.t = performance.now()
    if (!running) {
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  }

  window.addEventListener("pointermove", onMove, { passive: true })
  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener("pointermove", onMove)
    if (moving) cb.current.onWalking(false)
  }
}

// ─── Wander: stroll along the bottom edge ────────────────────

function runWander(x: MotionValue<number>, y: MotionValue<number>, size: SizeRef, cb: CbRef): () => void {
  let raf = 0
  let wake = 0
  let last = performance.now()
  let phase: "rest" | "walk" = "rest"
  let until = last + 500 + Math.random() * 1200
  let target = x.get()
  let speed = 46
  let vy = 0
  let facing = 0
  let nextHop = last + 6000

  const schedule = () => { raf = requestAnimationFrame(tick) }
  const sleepUntil = (t: number) => {
    window.clearTimeout(wake)
    wake = window.setTimeout(() => { last = performance.now(); schedule() }, Math.max(16, t - performance.now()))
  }

  const tick = (now: number) => {
    const dt = clamp((now - last) / 1000, 0.001, 0.05)
    last = now
    const { w, h } = size.current
    const vw = window.innerWidth
    const ground = Math.max(0, window.innerHeight - h - 6)
    const px = x.get()
    let py = y.get()

    // Dropped above the floor (or just switched to Wander): fall.
    if (py < ground - 0.5) {
      if (phase === "walk") { phase = "rest"; cb.current.onWalking(false) }
      vy = Math.min(1800, vy + 2600 * dt)
      py = Math.min(ground, py + vy * dt)
      y.set(py)
      if (py >= ground) {
        vy = 0
        cb.current.onLand()
        until = now + 700 + Math.random() * 900
      }
      schedule()
      return
    }
    if (py !== ground) y.set(ground)

    const lo = SIDEBAR_GUTTER
    const hi = Math.max(lo, vw - w - rightReserve(vw))

    if (phase === "rest") {
      if (now < until) { sleepUntil(until); return }
      if (hi - lo < 24 && px >= lo && px <= hi) { until = now + 5000; sleepUntil(until); return }
      let t = lo + Math.random() * (hi - lo)
      if (Math.abs(t - px) < 70) {
        t = px < (lo + hi) / 2
          ? Math.min(hi, px + 70 + Math.random() * 140)
          : Math.max(lo, px - 70 - Math.random() * 140)
      }
      target = t
      speed = 38 + Math.random() * 26
      phase = "walk"
      cb.current.onWalking(true)
      const f = target > px ? -1 : 1
      if (f !== facing) { facing = f; cb.current.onFacing(f) }
      if (Math.random() < 0.25) cb.current.onHop()
      nextHop = now + 4000 + Math.random() * 6000
      schedule()
      return
    }

    const dir = Math.sign(target - px)
    let nx = px + dir * speed * dt
    if (dir === 0 || (dir > 0 && nx >= target) || (dir < 0 && nx <= target)) {
      nx = target
      phase = "rest"
      until = now + 2500 + Math.random() * 5000
      cb.current.onWalking(false)
      cb.current.onRest(nx, ground)
    } else if (now >= nextHop) {
      cb.current.onHop()
      nextHop = now + 5000 + Math.random() * 7000
    }
    x.set(clamp(nx, 0, Math.max(0, vw - w)))
    schedule()
  }

  schedule()
  return () => {
    cancelAnimationFrame(raf)
    window.clearTimeout(wake)
    if (phase === "walk") cb.current.onWalking(false)
  }
}
