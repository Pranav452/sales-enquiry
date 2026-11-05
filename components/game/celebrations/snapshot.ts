// ============================================================
// Celebration snapshot — what the player has already been shown.
// Stored in localStorage so a refresh never replays celebrations,
// and the very first load only seeds it (no flood of toasts).
// ============================================================

import type { GameProfile } from "@/lib/game/types"
import { ARENAS, petStageForArena } from "@/lib/game/levels"
import { ARCADE_GAMES } from "@/lib/game/arcade"
import { TROPHY_MAP } from "@/lib/game/trophies"
import { CLEAN_SWEEP_BONUS } from "@/lib/game/quests"
import { weekStartOf } from "@/lib/game/engine"
import type { NewModal, NewToast, Unlock } from "./celebrationStore"

export const SNAPSHOT_KEY = "voyage.snapshot.v1"

export interface Snapshot {
  v:           1
  person:      string
  level:       number
  arenaIndex:  number
  gateBlocked: boolean
  bankedXp:    number
  prestige:    number
  trophies:    string[]
  dailyDate:   string
  dailies:     string[]
  sweep:       boolean
  week:        string
  weeklies:    string[]
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string")
}

function isSnapshot(v: unknown): v is Snapshot {
  if (!v || typeof v !== "object") return false
  const s = v as Record<string, unknown>
  return s.v === 1
    && typeof s.person === "string"
    && typeof s.level === "number"
    && typeof s.arenaIndex === "number"
    && typeof s.gateBlocked === "boolean"
    && typeof s.bankedXp === "number"
    && typeof s.prestige === "number"
    && isStringArray(s.trophies)
    && typeof s.dailyDate === "string"
    && isStringArray(s.dailies)
    && typeof s.sweep === "boolean"
    && typeof s.week === "string"
    && isStringArray(s.weeklies)
}

export function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isSnapshot(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writeSnapshot(s: Snapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s))
  } catch {
    /* storage full / disabled — celebrations simply repeat next time */
  }
}

export function snapshotOf(me: GameProfile): Snapshot {
  return {
    v: 1,
    person: me.person,
    level: me.level,
    arenaIndex: me.arenaIndex,
    gateBlocked: me.gateBlocked,
    bankedXp: me.bankedXp,
    prestige: me.prestigeStars,
    trophies: me.trophies.filter((t) => t.earned).map((t) => t.id),
    dailyDate: me.today,
    dailies: me.dailyQuests.filter((q) => q.done).map((q) => q.id),
    sweep: me.cleanSweepToday,
    week: weekStartOf(me.today),
    weeklies: me.weeklyQuests.filter((q) => q.done).map((q) => q.id),
  }
}

function unlocksBetween(fromLevel: number, toLevel: number, fromArena: number, toArena: number): Unlock[] {
  const out: Unlock[] = ARCADE_GAMES
    .filter((g) => g.unlockLevel > fromLevel && g.unlockLevel <= toLevel)
    .map((g) => ({ kind: "game" as const, label: `Arcade game: ${g.name}`, icon: g.icon }))
  const fromStage = petStageForArena(fromArena)
  const toStage = petStageForArena(toArena)
  if (toStage > fromStage) {
    out.push({ kind: "pet", label: `Pet companion: stage ${toStage}`, icon: "PawPrint" })
  }
  return out
}

/** Compare the stored snapshot with the fresh profile -> celebrations to show. */
export function diffSnapshot(prev: Snapshot, me: GameProfile): { toasts: NewToast[]; modals: NewModal[] } {
  const toasts: NewToast[] = []
  const modals: NewModal[] = []

  // ── Trophies ──
  const seenTrophies = new Set(prev.trophies)
  for (const t of me.trophies) {
    if (!t.earned || seenTrophies.has(t.id)) continue
    const def = TROPHY_MAP[t.id]
    if (!def) continue
    toasts.push({
      kind: "trophy", title: `Trophy earned: ${def.name}`, detail: def.description,
      reward: def.reward, icon: def.icon, ttl: 6000,
    })
  }

  // ── Daily quests + clean sweep ──
  const sameDay = prev.dailyDate === me.today
  const seenDailies = new Set(sameDay ? prev.dailies : [])
  for (const q of me.dailyQuests) {
    if (!q.done || seenDailies.has(q.id)) continue
    toasts.push({
      kind: "quest", title: `Daily quest complete: ${q.name}`, detail: q.description,
      reward: q.reward, icon: q.icon, ttl: 4500,
    })
  }
  if (me.cleanSweepToday && !(sameDay && prev.sweep)) {
    toasts.push({
      kind: "sweep", title: "All daily quests complete", detail: "+3 arcade tokens added",
      reward: CLEAN_SWEEP_BONUS, icon: "CheckCheck", ttl: 5500,
    })
  }

  // ── Weekly bounties ──
  const week = weekStartOf(me.today)
  const seenWeeklies = new Set(prev.week === week ? prev.weeklies : [])
  for (const q of me.weeklyQuests) {
    if (!q.done || seenWeeklies.has(q.id)) continue
    toasts.push({
      kind: "quest", title: `Weekly quest complete: ${q.name}`, detail: q.description,
      reward: q.reward, icon: q.icon, ttl: 5500,
    })
  }

  // ── Gate reached (XP starts banking) ──
  if (me.gateBlocked && me.nextGate && (!prev.gateBlocked || me.arenaIndex !== prev.arenaIndex)) {
    toasts.push({
      kind: "gate", title: `Gate reached: ${me.nextGate.name}`,
      detail: "New XP is held until you meet the gate requirements.",
      icon: "Lock", ttl: 6500,
    })
  }

  // ── Prestige ──
  if (me.prestigeStars > prev.prestige) {
    toasts.push({
      kind: "prestige", title: "Prestige star earned",
      detail: `${me.prestigeStars} star${me.prestigeStars === 1 ? "" : "s"} beyond level ${me.maxLevel}`,
      icon: "Star", ttl: 6000,
    })
  }

  // ── Level / arena ──
  if (me.level > prev.level) {
    const unlocks = unlocksBetween(prev.level, me.level, prev.arenaIndex, me.arenaIndex)
    if (me.arenaIndex > prev.arenaIndex) {
      // Entering a new arena always means its gate trial was just cleared.
      modals.push({
        kind: "arena",
        fromArena: prev.arenaIndex,
        toArena: me.arenaIndex,
        level: me.level,
        title: me.title,
        gateName: ARENAS[me.arenaIndex]?.gate?.name ?? null,
        bankedXp: prev.gateBlocked ? prev.bankedXp : 0,
        unlocks,
      })
    } else {
      modals.push({
        kind: "level",
        fromLevel: prev.level,
        toLevel: me.level,
        title: me.title,
        arenaIndex: me.arenaIndex,
        unlocks,
      })
    }
  }

  return { toasts, modals }
}
