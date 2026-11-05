"use client"

// ============================================================
// Small hooks/helpers shared by the classic games (Connect Four,
// Reversi, Checkers, Sudoku, Minesweeper). Game logic lives in
// the per-game .ts files next to this one.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react"
import type { ArcadeGameResult } from "@/lib/game/arcade"
import { useGameOverOnce } from "../../kit/GameShell"

/** 75 -> "1:15" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

/**
 * Whole seconds elapsed while `running` is true (pauses otherwise).
 * Changing `resetKey` restarts the clock from zero.
 */
export function useStopwatch(running: boolean, resetKey: string | number = 0): number {
  const [state, setState] = useState({ key: resetKey, ms: 0 })
  let ms = state.ms
  if (state.key !== resetKey) {
    // Render-phase reset (React's "adjust state on prop change" pattern).
    setState({ key: resetKey, ms: 0 })
    ms = 0
  }

  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const delta = now - last
      last = now
      setState((s) => ({ ...s, ms: s.ms + delta }))
    }, 200)
    return () => window.clearInterval(id)
  }, [running, resetKey])

  return Math.floor(ms / 1000)
}

/**
 * Observed content-box size of an element. Pass the returned callback
 * as `ref`; works for elements that mount later (e.g. after setup).
 */
export function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect
      if (r) setSize({ width: Math.floor(r.width), height: Math.floor(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, size] as const
}

/**
 * onGameOver wrapper that fires once, optionally after a short pause so the
 * player can see the final position (winning line, revealed mines...) before
 * the result card covers the board. A pending result is flushed on unmount.
 */
export function useDelayedGameOver(onGameOver: (r: ArcadeGameResult) => void, defaultDelayMs = 1400) {
  const once = useGameOverOnce(onGameOver)
  const onceRef = useRef(once)
  const pendingRef = useRef<{ result: ArcadeGameResult; timer: number } | null>(null)

  useEffect(() => {
    onceRef.current = once
  }, [once])

  useEffect(() => {
    const pending = pendingRef
    const fire = onceRef
    return () => {
      const p = pending.current
      if (p) {
        window.clearTimeout(p.timer)
        pending.current = null
        fire.current(p.result)
      }
    }
  }, [])

  return useCallback((result: ArcadeGameResult, delayMs: number = defaultDelayMs) => {
    if (pendingRef.current) return
    if (delayMs <= 0) {
      onceRef.current(result)
      return
    }
    const timer = window.setTimeout(() => {
      pendingRef.current = null
      onceRef.current(result)
    }, delayMs)
    pendingRef.current = { result, timer }
  }, [defaultDelayMs])
}
