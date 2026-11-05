"use client"

import { useSyncExternalStore } from "react"

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000)
  return () => window.clearInterval(id)
}

/**
 * Current time bucketed to `stepMs` (default 30s). Returns null during SSR /
 * hydration so countdown text never mismatches between server and client.
 */
export function useClock(stepMs = 30_000): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  )
}
