// ============================================================
// The Grand Voyage — profile engine (pure, server-side)
// ------------------------------------------------------------
// Everything is derived from TBL_CALLS_VISITS aggregates; no
// game state is stored. Same input -> same profile on every
// device, and nothing to tamper with client-side.
//
// Fair-play rules for quests / streaks / bonus XP:
//   * only activity dates up to today count (future-dated rows wait)
//   * a row counts toward quests/streaks only if it was entered
//     within 3 days after (or 1 day before) its activity date —
//     back-filling old days still earns base XP, not bonuses
// ============================================================

import type {
  DayStat, LifetimeStats, GameProfile, BoardEntry, PetMood, QuestProgress, StreakInfo,
} from "./types"
import { resolveLevel, petStageForArena, MAX_LEVEL } from "./levels"
import { evaluateDaily, evaluateWeekly, CLEAN_SWEEP_BONUS, type WeekAgg } from "./quests"
import { evaluateTrophies, trophyBonus } from "./trophies"

/** Season 1 starts Monday 2 Nov 2026 — quest/streak bonuses count from here. */
export const SEASON_START = "2026-11-02"

/** Raw aggregate row from SQL: one person x activity date x created date. */
export interface RawDayRow {
  person:        string
  d:             string          // ACTIVITY_DATE
  c:             string | null   // CREATED_AT date (yyyy-mm-dd) or null
  n:             number
  xp:            number
  cold:          number
  warm:          number
  call_secured:  number
  client_visit:  number
  visit_secured: number
  line_visit:    number
  interested:    number
  secured:       number
  clients:       number
  types:         number
}

export interface RawPersonExtras {
  person:  string
  clients: number
  pods:    number
}

// ─── Date helpers (pure yyyy-mm-dd strings, UTC math) ─────────

const DAY_MS = 86400000

export function dayNum(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / DAY_MS)
}

export function dateFromNum(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  return new Date(dayNum(date) * DAY_MS).getUTCDay()
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: string): string {
  const wd = weekday(date)
  const offset = wd === 0 ? 6 : wd - 1
  return dateFromNum(dayNum(date) - offset)
}

/** Today's date in India (all users are IST). */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now)
}

function emptyDay(date: string): DayStat {
  return {
    date, n: 0, xp: 0, cold: 0, warm: 0, callSecured: 0, clientVisits: 0, visitSecured: 0,
    lineVisits: 0, interested: 0, secured: 0, clients: 0, types: 0,
  }
}

function addRow(target: DayStat, r: RawDayRow) {
  target.n            += Number(r.n) || 0
  target.xp           += Number(r.xp) || 0
  target.cold         += Number(r.cold) || 0
  target.warm         += Number(r.warm) || 0
  target.callSecured  += Number(r.call_secured) || 0
  target.clientVisits += Number(r.client_visit) || 0
  target.visitSecured += Number(r.visit_secured) || 0
  target.lineVisits   += Number(r.line_visit) || 0
  target.interested   += Number(r.interested) || 0
  target.secured      += Number(r.secured) || 0
  target.clients      += Number(r.clients) || 0
  target.types         = Math.max(target.types, Number(r.types) || 0)
}

function addDay(target: DayStat, d: DayStat) {
  target.n += d.n; target.xp += d.xp; target.cold += d.cold; target.warm += d.warm
  target.callSecured += d.callSecured; target.clientVisits += d.clientVisits
  target.visitSecured += d.visitSecured; target.lineVisits += d.lineVisits
  target.interested += d.interested; target.secured += d.secured; target.clients += d.clients
  target.types = Math.max(target.types, d.types)
}

function isFair(r: RawDayRow): boolean {
  if (!r.c) return true
  const diff = dayNum(r.c) - dayNum(r.d)   // days between activity date and entry
  return diff >= -1 && diff <= 3
}

function streakBonus(streak: number): number {
  if (streak >= 20) return 3
  if (streak >= 10) return 2
  if (streak >= 5)  return 1
  return 0
}

// ─── Profile ─────────────────────────────────────────────────

export function computeProfile(
  person: string,
  rows: RawDayRow[],
  extras: { clients: number; pods: number } | undefined,
  today: string,
): GameProfile {
  const todayN = dayNum(today)
  const seasonN = dayNum(SEASON_START)

  const allDays  = new Map<string, DayStat>()
  const fairDays = new Map<string, DayStat>()

  for (const r of rows) {
    if (!r.d || r.d > today) continue
    if (!allDays.has(r.d)) allDays.set(r.d, emptyDay(r.d))
    addRow(allDays.get(r.d)!, r)
    if (isFair(r)) {
      if (!fairDays.has(r.d)) fairDays.set(r.d, emptyDay(r.d))
      addRow(fairDays.get(r.d)!, r)
    }
  }

  // ── Streaks (working days Mon-Sat; Sunday never breaks a streak) ──
  const fairDates = [...fairDays.keys()].sort()
  const streakAt = new Map<string, number>()
  let best = 0
  let running = 0
  if (fairDates.length) {
    for (let n = dayNum(fairDates[0]); n <= todayN; n++) {
      const date = dateFromNum(n)
      const active = (fairDays.get(date)?.n ?? 0) > 0
      if (active) {
        running++
        streakAt.set(date, running)
        best = Math.max(best, running)
      } else if (weekday(date) !== 0 && n !== todayN) {
        running = 0   // missed a working day (today is still in play)
      }
    }
  }
  const activeToday = (fairDays.get(today)?.n ?? 0) > 0
  const streak: StreakInfo = {
    current: running,
    best,
    activeToday,
    atRisk: running > 0 && !activeToday && weekday(today) !== 0,
  }

  // ── Daily quests + sweeps + streak bonus, season only ──
  let dailyBonus = 0, sweepBonus = 0, streakBonusTotal = 0
  let questsDone = 0, cleanSweeps = 0
  const weekStartToday = weekStartOf(today)
  let weekBonus = 0, questsThisWeek = 0

  for (let n = seasonN; n <= todayN; n++) {
    const date = dateFromNum(n)
    const day = fairDays.get(date)
    if (!day || day.n === 0) continue
    const qs = evaluateDaily(date, day)
    const done = qs.filter((q) => q.done)
    const reward = done.reduce((s, q) => s + q.reward, 0)
    const sweep = done.length === qs.length ? CLEAN_SWEEP_BONUS : 0
    const sb = streakBonus(streakAt.get(date) ?? 0)
    dailyBonus += reward; sweepBonus += sweep; streakBonusTotal += sb
    questsDone += done.length
    if (sweep) cleanSweeps++
    if (date >= weekStartToday) { weekBonus += reward + sweep + sb; questsThisWeek += done.length }
  }

  // ── Weekly quests, season only ──
  let weeklyBonus = 0, weekliesDone = 0
  let currentWeekly: QuestProgress[] = []
  for (let ws = dayNum(weekStartOf(SEASON_START)); ws <= todayN; ws += 7) {
    const wsDate = dateFromNum(ws)
    const agg: WeekAgg = { ...emptyDay(wsDate), activeDays: 0 }
    for (let n = Math.max(ws, seasonN); n < ws + 7 && n <= todayN; n++) {
      const day = fairDays.get(dateFromNum(n))
      if (day && day.n > 0) { addDay(agg, day); agg.activeDays++ }
    }
    const qs = evaluateWeekly(wsDate, agg)
    for (const q of qs) if (q.done) { weeklyBonus += q.reward; weekliesDone++ }
    if (wsDate === weekStartToday) {
      currentWeekly = qs
      const wDone = qs.filter((q) => q.done)
      weekBonus += wDone.reduce((s, q) => s + q.reward, 0)
      questsThisWeek += wDone.length
    }
  }

  // ── Lifetime stats ──
  const life: LifetimeStats = {
    activities: 0, activityXp: 0, calls: 0, coldCalls: 0, warmCalls: 0, clientVisits: 0,
    lineVisits: 0, fieldVisits: 0, secured: 0, callSecured: 0, interested: 0,
    distinctClients: extras?.clients ?? 0, distinctPods: extras?.pods ?? 0,
    activeDays: 0, bestStreak: best, questsDone, weekliesDone, cleanSweeps,
    maxDayActivities: 0, sundayDays: 0,
  }
  let lastActiveDate: string | null = null
  for (const day of allDays.values()) {
    if (day.n <= 0) continue
    life.activities   += day.n
    life.activityXp   += day.xp
    life.coldCalls    += day.cold
    life.warmCalls    += day.warm
    life.callSecured  += day.callSecured
    life.calls        += day.cold + day.warm + day.callSecured
    life.clientVisits += day.clientVisits + day.visitSecured
    life.lineVisits   += day.lineVisits
    life.secured      += day.secured
    life.interested   += day.interested
    life.activeDays++
    life.maxDayActivities = Math.max(life.maxDayActivities, day.n)
    if (weekday(day.date) === 0) life.sundayDays++
    if (!lastActiveDate || day.date > lastActiveDate) lastActiveDate = day.date
  }
  life.fieldVisits = life.clientVisits + life.lineVisits

  // ── Trophies, totals, level ──
  const trophies = evaluateTrophies(life)
  const tBonus = trophyBonus(trophies)
  const bonusXp = dailyBonus + weeklyBonus + sweepBonus + streakBonusTotal + tBonus
  const totalXp = life.activityXp + bonusXp
  const lvl = resolveLevel(totalXp, life)

  // ── Today + this week ──
  const todayAll  = allDays.get(today) ?? emptyDay(today)
  const todayFair = fairDays.get(today) ?? emptyDay(today)
  const dailyQuests = evaluateDaily(today, todayFair)
  const cleanSweepToday = dailyQuests.every((q) => q.done)

  let weekXp = 0, weekN = 0, weekActive = 0
  for (let n = dayNum(weekStartToday); n <= todayN; n++) {
    const day = allDays.get(dateFromNum(n))
    if (day && day.n > 0) { weekXp += day.xp; weekN += day.n; weekActive++ }
  }

  // ── Pet ──
  let petMood: PetMood = "content"
  const idleDays = lastActiveDate ? todayN - dayNum(lastActiveDate) : 99
  if (todayAll.n === 0) petMood = idleDays >= 3 ? "grumpy" : "sleepy"
  else if (cleanSweepToday) petMood = "ecstatic"
  else if (todayAll.n >= 5) petMood = "happy"

  return {
    person,
    today,
    seasonStart: SEASON_START,
    activityXp: life.activityXp,
    bonusXp,
    totalXp,
    bonusBreakdown: {
      dailies: dailyBonus, weeklies: weeklyBonus, sweeps: sweepBonus,
      streak: streakBonusTotal, trophies: tBonus,
    },
    level: lvl.level,
    rawLevel: lvl.rawLevel,
    maxLevel: MAX_LEVEL,
    title: lvl.title,
    arenaIndex: lvl.arenaIndex,
    levelFloorXp: lvl.levelFloorXp,
    nextLevelXp: lvl.nextLevelXp,
    progress: lvl.progress,
    bankedXp: lvl.bankedXp,
    prestigeStars: lvl.prestigeStars,
    nextGate: lvl.nextGate,
    gateBlocked: lvl.gateBlocked,
    streak,
    todayStats: todayAll,
    weekStats: { xp: weekXp + weekBonus, bonus: weekBonus, n: weekN, activeDays: weekActive, quests: questsThisWeek },
    dailyQuests,
    weeklyQuests: currentWeekly,
    cleanSweepToday,
    trophies,
    lifetime: life,
    lastActiveDate,
    arcadeTokensEarned: 1 + Math.floor(todayFair.n / 3) + (cleanSweepToday ? 3 : 0),
    petMood,
    petStage: petStageForArena(lvl.arenaIndex),
  }
}

export function toBoardEntry(p: GameProfile, isMe: boolean, showDetail: boolean): BoardEntry {
  return {
    person: p.person,
    isMe,
    level: p.level,
    title: p.title,
    arenaIndex: p.arenaIndex,
    totalXp: p.totalXp,
    activityXp: p.activityXp,
    bonusXp: p.bonusXp,
    weekXp: p.weekStats.xp,
    streak: p.streak.current,
    bestStreak: p.streak.best,
    trophies: p.trophies.filter((t) => t.earned).length,
    questsThisWeek: p.weekStats.quests,
    prestigeStars: p.prestigeStars,
    gateBlocked: p.gateBlocked,
    detail: showDetail
      ? {
          calls: p.lifetime.calls,
          visits: p.lifetime.clientVisits,
          lineVisits: p.lifetime.lineVisits,
          secured: p.lifetime.secured,
          interested: p.lifetime.interested,
        }
      : null,
  }
}

/** Group raw rows by person. */
export function groupRows(rows: RawDayRow[]): Map<string, RawDayRow[]> {
  const map = new Map<string, RawDayRow[]>()
  for (const r of rows) {
    const key = (r.person ?? "").trim()
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }
  return map
}
