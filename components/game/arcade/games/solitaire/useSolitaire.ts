"use client"

// ============================================================
// Solitaire engine — game state core.
// Holds the current state, an unlimited undo stack, a queue of
// automatic follow-up steps (auto-moves, run removal, auto-
// complete) played one after another, and the game clock (starts
// at the first move, stops when the game is won or ended).
// ============================================================

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { FxMap, Step, Transition } from "./model"

export interface SolitaireCore<S> {
  state:     S
  /** animation delays for the transition that produced `state` */
  fx:        FxMap | null
  canUndo:   boolean
  undos:     number
  /** seconds since the first move */
  elapsed:   number
  /** automatic steps (or the opening deal) are playing */
  busy:      boolean
  /** apply a player action (recorded for undo) */
  run:       (t: Transition<S>) => void
  /** play a list of automatic steps as one undoable action */
  sequence:  (steps: Step<S>[]) => void
  undo:      () => void
  stopClock: () => void
}

export function useSolitaire<S>(init: () => Transition<S>, isWon: (s: S) => boolean, openingMs: number): SolitaireCore<S> {
  const [boot] = useState(init)
  const [state, setState] = useState<S>(boot.state)
  const [fx, setFx] = useState<FxMap | null>(boot.fx ?? null)
  const [past, setPast] = useState<S[]>([])
  const [undos, setUndos] = useState(0)
  const [busy, setBusy] = useState(true)
  const [startAt, setStartAt] = useState<number | null>(null)
  const [endAt, setEndAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)

  const stateRef = useRef<S>(boot.state)
  const timer = useRef<number | null>(null)
  const queue = useRef<Step<S>[]>([])
  const tick = useRef<() => void>(() => {})

  const apply = useCallback((next: S, nextFx: FxMap | null) => {
    stateRef.current = next
    setState(next)
    setFx(nextFx)
    if (isWon(next)) setEndAt((e) => e ?? Date.now())
  }, [isWon])

  const cancel = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    queue.current = []
  }, [])

  // The queue pump lives in a ref so it can re-schedule itself.
  useEffect(() => {
    tick.current = () => {
      if (timer.current != null) return
      const next = queue.current[0]
      if (!next) {
        setBusy(false)
        return
      }
      timer.current = window.setTimeout(() => {
        timer.current = null
        const step = queue.current.shift()
        const t = step?.run(stateRef.current)
        if (t) {
          apply(t.state, t.fx ?? null)
          if (t.then?.length) queue.current.unshift(...t.then)
        }
        tick.current()
      }, next.wait)
    }
  }, [apply])

  const schedule = useCallback((steps: Step<S>[]) => {
    queue.current = steps.slice()
    setBusy(true)
    tick.current()
  }, [])

  // Opening deal: wait for the cards to land, then run any opening auto-moves.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (boot.then?.length) schedule(boot.then)
      else setBusy(false)
    }, openingMs)
    return () => {
      window.clearTimeout(t)
      cancel()
    }
  }, [boot, openingMs, schedule, cancel])

  // Clock
  useEffect(() => {
    if (startAt == null || endAt != null) return
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [startAt, endAt])

  const run = useCallback((t: Transition<S>) => {
    cancel()
    const prev = stateRef.current
    setPast((p) => [...p, prev])
    setStartAt((v) => v ?? Date.now())
    apply(t.state, t.fx ?? null)
    if (t.then?.length) schedule(t.then)
    else setBusy(false)
  }, [apply, cancel, schedule])

  const sequence = useCallback((steps: Step<S>[]) => {
    if (!steps.length) return
    cancel()
    const prev = stateRef.current
    setPast((p) => [...p, prev])
    setStartAt((v) => v ?? Date.now())
    schedule(steps)
  }, [cancel, schedule])

  const undo = useCallback(() => {
    if (!past.length) return
    cancel()
    const prev = past[past.length - 1]
    setPast(past.slice(0, -1))
    setUndos((u) => u + 1)
    apply(prev, null)
    setBusy(false)
  }, [past, apply, cancel])

  const stopClock = useCallback(() => {
    cancel()
    setEndAt((e) => e ?? Date.now())
  }, [cancel])

  const elapsed = startAt == null ? 0 : Math.max(0, Math.floor(((endAt ?? now) - startAt) / 1000))

  return { state, fx, canUndo: past.length > 0, undos, elapsed, busy, run, sequence, undo, stopClock }
}

// ─── Small DOM hooks ──────────────────────────────────────────

/** Width of an element, kept current with a ResizeObserver (0 until measured). */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0)
      setWidth((prev) => (prev === w ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}

export function useViewportHeight(): number {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}
