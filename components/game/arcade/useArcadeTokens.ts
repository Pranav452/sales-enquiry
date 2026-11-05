"use client"

// Arcade token balance: earned today (server) minus spent today (localStorage).

import { useCallback, useSyncExternalStore } from "react"
import { spendToken, tokensSpent } from "@/lib/game/arcade"

const EVENT = "voyage:arcade-tokens"

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

export function useArcadeTokens(today: string, earned: number) {
  const spent = useSyncExternalStore(
    subscribe,
    () => tokensSpent(today),
    () => 0,
  )
  const available = Math.max(0, earned - spent)

  /** Spend one token; returns false when none are left. */
  const spend = useCallback((): boolean => {
    if (Math.max(0, earned - tokensSpent(today)) <= 0) return false
    spendToken(today)
    window.dispatchEvent(new Event(EVENT))
    return true
  }, [today, earned])

  return { earned, spent, available, spend }
}
