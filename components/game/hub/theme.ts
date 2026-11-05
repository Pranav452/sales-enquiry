// ============================================================
// Small helpers shared by the Activity Tracker hub screens
// (arena lookup and the IST quest-reset countdowns).
// ============================================================

import { ARENAS, type ArenaDef } from "@/lib/game/levels"

/** Arena for an index, clamped to the valid range. */
export function arenaAt(index: number): ArenaDef {
  return ARENAS[Math.max(0, Math.min(ARENAS.length - 1, index))]
}

// ─── IST clock maths (dailies reset at midnight Asia/Kolkata) ──

const DAY_MS = 86_400_000
const IST_OFFSET_MS = 19_800_000 // +05:30

export function msUntilDailyReset(now: number): number {
  const msIntoDay = (now + IST_OFFSET_MS) % DAY_MS
  return DAY_MS - msIntoDay
}

/** Weeklies reset Monday 00:00 IST. */
export function msUntilWeeklyReset(now: number): number {
  const weekdayIST = new Date(now + IST_OFFSET_MS).getUTCDay() // 0 = Sun
  const daysUntilMonday = ((1 - weekdayIST + 7) % 7) || 7
  return msUntilDailyReset(now) + (daysUntilMonday - 1) * DAY_MS
}

export function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
