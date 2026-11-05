"use client"

// Arcade token balance.
//   daily  = earned today (server) − spent today (localStorage, resets daily)
//   bonus  = granted tokens that never expire (localStorage, per player)
// Every player is topped up once to a total of GRANT_TOTAL tokens
// (the difference is added as bonus tokens). Admins play without tokens.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { spendToken, tokensSpent } from "@/lib/game/arcade"

const EVENT = "voyage:arcade-tokens"
export const GRANT_TOTAL = 5

const bonusKey = (person: string) => `voyage.arcade.bonus.${person}`
const grantKey = (person: string) => `voyage.arcade.grant.total5.${person}`

function readBonus(person: string): number {
  if (typeof window === "undefined") return 0
  return Math.max(0, Number(localStorage.getItem(bonusKey(person)) ?? 0) || 0)
}

function writeBonus(person: string, value: number) {
  localStorage.setItem(bonusKey(person), String(Math.max(0, value)))
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb)
  window.addEventListener("storage", cb)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener("storage", cb)
  }
}

export function useArcadeTokens(
  today: string,
  earned: number,
  opts: { person: string; unlimited?: boolean },
) {
  const { person, unlimited = false } = opts
  const spent = useSyncExternalStore(subscribe, () => tokensSpent(today), () => 0)
  const bonus = useSyncExternalStore(subscribe, () => readBonus(person), () => 0)
  const daily = Math.max(0, earned - spent)
  const available = daily + bonus

  // One-time top-up so every player has at least GRANT_TOTAL tokens.
  const [granted, setGranted] = useState(0)
  useEffect(() => {
    if (unlimited || localStorage.getItem(grantKey(person))) return
    const add = Math.max(0, GRANT_TOTAL - available)
    localStorage.setItem(grantKey(person), new Date().toISOString())
    if (add > 0) {
      writeBonus(person, readBonus(person) + add)
      setGranted(add) // eslint-disable-line react-hooks/set-state-in-effect -- one-off notice after the grant
    }
  }, [available, person, unlimited])

  /** Spend one token (daily first, then bonus); returns false when none are left. */
  const spend = useCallback((): boolean => {
    if (unlimited) return true
    if (Math.max(0, earned - tokensSpent(today)) > 0) {
      spendToken(today)
      window.dispatchEvent(new Event(EVENT))
      return true
    }
    const b = readBonus(person)
    if (b > 0) {
      writeBonus(person, b - 1)
      return true
    }
    return false
  }, [today, earned, person, unlimited])

  return { earned, spent, daily, bonus, available, unlimited, spend, granted }
}
