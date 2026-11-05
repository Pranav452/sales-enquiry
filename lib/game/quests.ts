// ============================================================
// The Grand Voyage — daily + weekly side quests
// ------------------------------------------------------------
// Quests rotate deterministically from the date, so every
// player gets the same board and history can be re-evaluated
// server-side without storing anything.
// ============================================================

import type { DayStat, QuestProgress, QuestTier } from "./types"

export interface DayQuestDef {
  id:          string
  name:        string
  description: string
  icon:        string
  tier:        Exclude<QuestTier, "weekly">
  reward:      number
  target:      number
  metric:      (d: DayStat) => number
}

export interface WeekAgg extends DayStat {
  activeDays: number
}

export interface WeekQuestDef {
  id:          string
  name:        string
  description: string
  icon:        string
  pool:        "volume" | "field"
  reward:      number
  target:      number
  metric:      (w: WeekAgg) => number
}

const calls = (d: DayStat) => d.cold + d.warm + d.callSecured
const fieldVisits = (d: DayStat) => d.clientVisits + d.visitSecured + d.lineVisits

export const DAILY_QUESTS: DayQuestDef[] = [
  // ── easy ──
  { id: "d_dialer",   tier: "easy", icon: "PhoneCall",     reward: 2, target: 6,  name: "Dial Tone",          description: "Make 6 calls",                         metric: calls },
  { id: "d_fresh",    tier: "easy", icon: "Sprout",        reward: 2, target: 3,  name: "Fresh Waters",       description: "Make 3 cold calls",                    metric: (d) => d.cold },
  { id: "d_rekindle", tier: "easy", icon: "Flame",         reward: 2, target: 4,  name: "Rekindle the Flame", description: "Make 4 warm calls",                    metric: (d) => d.warm },
  { id: "d_manifest", tier: "easy", icon: "ClipboardList", reward: 2, target: 8,  name: "Full Manifest",      description: "Log 8 activities",                     metric: (d) => d.n },
  // ── medium ──
  { id: "d_hotlead",  tier: "medium", icon: "Magnet",      reward: 3, target: 2,  name: "Hot Lead",           description: "Get 2 'Interested' outcomes",          metric: (d) => d.interested },
  { id: "d_mixed",    tier: "medium", icon: "Shuffle",     reward: 3, target: 2,  name: "Mixed Cargo",        description: "Log 2 different activity types",       metric: (d) => d.types },
  { id: "d_horizons", tier: "medium", icon: "Compass",     reward: 3, target: 6,  name: "New Horizons",       description: "Contact 6 different clients",          metric: (d) => d.clients },
  { id: "d_longhaul", tier: "medium", icon: "Route",       reward: 4, target: 14, name: "Long Haul",          description: "Log 14 activities",                    metric: (d) => d.n },
  // ── hard ──
  { id: "d_boots",    tier: "hard", icon: "Footprints",    reward: 5, target: 1,  name: "Boots on Deck",      description: "Visit a client in person",             metric: (d) => d.clientVisits + d.visitSecured },
  { id: "d_line",     tier: "hard", icon: "Ship",          reward: 5, target: 1,  name: "Line Diplomacy",     description: "Visit a shipping line office",         metric: (d) => d.lineVisits },
  { id: "d_seal",     tier: "hard", icon: "Stamp",         reward: 6, target: 1,  name: "Seal the Deal",      description: "Secure a deal (call or visit)",        metric: (d) => d.secured },
  { id: "d_blitz",    tier: "hard", icon: "Zap",           reward: 6, target: 20, name: "Blitz",              description: "Log 20 activities in one day",         metric: (d) => d.n },
]

export const WEEKLY_QUESTS: WeekQuestDef[] = [
  // ── volume pool ──
  { id: "w_voyage",     pool: "volume", icon: "Sailboat",   reward: 10, target: 50, name: "Voyage of Fifty",   description: "Log 50 activities this week",              metric: (w) => w.n },
  { id: "w_fleet",      pool: "volume", icon: "CalendarCheck", reward: 8, target: 5, name: "Five-Day Fleet",  description: "Be active on 5 different days",            metric: (w) => w.activeDays },
  { id: "w_prospector", pool: "volume", icon: "Pickaxe",    reward: 8,  target: 15, name: "Prospector's Week", description: "Make 15 cold calls",                       metric: (w) => w.cold },
  { id: "w_magnet",     pool: "volume", icon: "Magnet",     reward: 10, target: 6,  name: "Lead Magnet",       description: "Get 6 'Interested' outcomes",              metric: (w) => w.interested },
  // ── field pool ──
  { id: "w_harbor",     pool: "field",  icon: "MapPinned",  reward: 12, target: 3,  name: "Harbor Tour",       description: "Make 3 field visits (client or line)",     metric: fieldVisits },
  { id: "w_treasure",   pool: "field",  icon: "Gem",        reward: 15, target: 2,  name: "Treasure Hunter",   description: "Secure 2 deals",                           metric: (w) => w.secured },
  { id: "w_diplomat",   pool: "field",  icon: "Handshake",  reward: 12, target: 2,  name: "Grand Diplomat",    description: "Visit 1 client and 1 shipping line",       metric: (w) => Math.min(1, w.clientVisits + w.visitSecured) + Math.min(1, w.lineVisits) },
  { id: "w_closer",     pool: "field",  icon: "Trophy",     reward: 12, target: 4,  name: "Closer's Week",     description: "Secure 1 deal and get 3 'Interested'",     metric: (w) => Math.min(1, w.secured) + Math.min(3, w.interested) },
]

/** Bonus for completing all three dailies on the same day */
export const CLEAN_SWEEP_BONUS = 3

// ─── Deterministic rotation ──────────────────────────────────

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(items: T[], seed: string): T {
  return items[hashString(seed) % items.length]
}

/** Three dailies for a date: one easy, one medium, one hard. */
export function dailyQuestsFor(date: string): DayQuestDef[] {
  return (["easy", "medium", "hard"] as const).map((tier) =>
    pick(DAILY_QUESTS.filter((q) => q.tier === tier), `daily:${tier}:${date}`)
  )
}

/** Two weeklies for the week starting `weekStart` (Monday). */
export function weeklyQuestsFor(weekStart: string): WeekQuestDef[] {
  return (["volume", "field"] as const).map((pool) =>
    pick(WEEKLY_QUESTS.filter((q) => q.pool === pool), `weekly:${pool}:${weekStart}`)
  )
}

export function evaluateDaily(date: string, day: DayStat): QuestProgress[] {
  return dailyQuestsFor(date).map((q) => {
    const current = q.metric(day)
    return {
      id: q.id, name: q.name, description: q.description, icon: q.icon,
      tier: q.tier, reward: q.reward, current: Math.min(current, q.target), target: q.target,
      done: current >= q.target,
    }
  })
}

export function evaluateWeekly(weekStart: string, week: WeekAgg): QuestProgress[] {
  return weeklyQuestsFor(weekStart).map((q) => {
    const current = q.metric(week)
    return {
      id: q.id, name: q.name, description: q.description, icon: q.icon,
      tier: "weekly" as const, reward: q.reward, current: Math.min(current, q.target), target: q.target,
      done: current >= q.target,
    }
  })
}
