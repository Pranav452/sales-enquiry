// ============================================================
// The Grand Voyage — levels, arenas, gate trials
// ------------------------------------------------------------
// 100 levels on a steep curve (~10,000 XP for level 100).
// Every 10 levels is an Arena. Entering a new Arena needs a
// Gate Trial (real sales outcomes, not just XP). XP earned
// while a gate is locked is banked and unleashed on clearing.
// ============================================================

import type { LifetimeStats, LifetimeStatKey, GateProgress } from "./types"

export const MAX_LEVEL      = 100
export const LEVELS_PER_ARENA = 10
const CURVE_A = 6.1
const CURVE_P = 1.61
/** XP per prestige star once level 100 is reached */
export const PRESTIGE_STEP = 750

/** Cumulative XP required to reach `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(CURVE_A * Math.pow(level - 1, CURVE_P))
}

/** Highest level reachable with `xp`, ignoring gates. */
export function rawLevelForXp(xp: number): number {
  let lvl = 1
  while (lvl < MAX_LEVEL && xp >= xpForLevel(lvl + 1)) lvl++
  return lvl
}

export interface GateRequirement {
  stat:   LifetimeStatKey
  target: number
  label:  string
}

export interface GateDef {
  name:         string
  description:  string
  requirements: GateRequirement[]
}

export interface ArenaPalette {
  /** deep background */   bg:     string
  /** secondary surface */ bg2:    string
  /** primary accent */    accent: string
  /** light ink on bg */   ink:    string
  /** glow / highlight */  glow:   string
}

export interface ArenaDef {
  index:    number
  key:      string
  name:     string
  title:    string          // rank title held inside this arena
  tagline:  string
  minLevel: number
  maxLevel: number
  palette:  ArenaPalette
  /** Trial required to ENTER this arena (null for the first arena) */
  gate:     GateDef | null
}

export const ARENAS: ArenaDef[] = [
  {
    index: 0, key: "harbor", name: "Harbor Docks", title: "Deckhand",
    tagline: "Every legend starts by coiling rope on the pier.",
    minLevel: 1, maxLevel: 10,
    palette: { bg: "#0f1d2b", bg2: "#18304a", accent: "#5eb3d6", ink: "#e6f1f8", glow: "#9ad8f0" },
    gate: null,
  },
  {
    index: 1, key: "shallows", name: "Coastal Shallows", title: "Bosun",
    tagline: "Warm water, quick currents, the first real clients.",
    minLevel: 11, maxLevel: 20,
    palette: { bg: "#0b2a2a", bg2: "#114040", accent: "#2dd4bf", ink: "#e6fbf7", glow: "#7af0dc" },
    gate: {
      name: "The Breakwater",
      description: "Leave the desk. Meet someone face to face.",
      requirements: [
        { stat: "fieldVisits", target: 1, label: "Field visits (client or shipping line)" },
      ],
    },
  },
  {
    index: 2, key: "spice", name: "Spice Route", title: "Navigator",
    tagline: "Long lanes, rich cargo, rivals on every horizon.",
    minLevel: 21, maxLevel: 30,
    palette: { bg: "#2a160b", bg2: "#432310", accent: "#f59e0b", ink: "#fff4e3", glow: "#fcd27a" },
    gate: {
      name: "The Merchant's Seal",
      description: "Prove you can close. Secure your first deal.",
      requirements: [
        { stat: "secured",     target: 1, label: "Deals secured" },
        { stat: "fieldVisits", target: 5, label: "Field visits" },
      ],
    },
  },
  {
    index: 3, key: "monsoon", name: "Monsoon Straits", title: "First Mate",
    tagline: "Storm season. Only steady crews make it through.",
    minLevel: 31, maxLevel: 40,
    palette: { bg: "#0d1a33", bg2: "#16294f", accent: "#6366f1", ink: "#e8eaff", glow: "#a5b4fc" },
    gate: {
      name: "Eye of the Monsoon",
      description: "Consistency and allies. Hold a streak, court the lines.",
      requirements: [
        { stat: "secured",    target: 5, label: "Deals secured" },
        { stat: "lineVisits", target: 2, label: "Shipping line visits" },
        { stat: "bestStreak", target: 7, label: "Best streak (working days)" },
      ],
    },
  },
  {
    index: 4, key: "silk", name: "Silk Passage", title: "Captain",
    tagline: "Your own ship now. Your own crew. Your own name.",
    minLevel: 41, maxLevel: 50,
    palette: { bg: "#2a0d1f", bg2: "#451634", accent: "#ec4899", ink: "#ffe8f4", glow: "#f9a8d4" },
    gate: {
      name: "The Captain's Oath",
      description: "Command takes deals, miles and discipline.",
      requirements: [
        { stat: "secured",      target: 10, label: "Deals secured" },
        { stat: "fieldVisits",  target: 20, label: "Field visits" },
        { stat: "weekliesDone", target: 5,  label: "Weekly quests completed" },
      ],
    },
  },
  {
    index: 5, key: "cape", name: "Cape of Storms", title: "Commodore",
    tagline: "Where fleets are lost and reputations are made.",
    minLevel: 51, maxLevel: 60,
    palette: { bg: "#161616", bg2: "#262626", accent: "#ef4444", ink: "#fbeaea", glow: "#fca5a5" },
    gate: {
      name: "Rounding the Cape",
      description: "A wide network and an iron routine.",
      requirements: [
        { stat: "secured",         target: 20,  label: "Deals secured" },
        { stat: "bestStreak",      target: 15,  label: "Best streak (working days)" },
        { stat: "distinctClients", target: 300, label: "Unique clients contacted" },
      ],
    },
  },
  {
    index: 6, key: "arctic", name: "Arctic Convoy", title: "Admiral",
    tagline: "Ice in the rigging. A fleet that follows your lead.",
    minLevel: 61, maxLevel: 70,
    palette: { bg: "#0c2233", bg2: "#123651", accent: "#7dd3fc", ink: "#f0f9ff", glow: "#e0f2fe" },
    gate: {
      name: "The Frozen Passage",
      description: "Only the relentless break the ice.",
      requirements: [
        { stat: "secured",     target: 35,  label: "Deals secured" },
        { stat: "fieldVisits", target: 50,  label: "Field visits" },
        { stat: "questsDone",  target: 100, label: "Daily quests completed" },
      ],
    },
  },
  {
    index: 7, key: "kraken", name: "Kraken Deep", title: "Sea Lord",
    tagline: "Something vast moves beneath the hull.",
    minLevel: 71, maxLevel: 80,
    palette: { bg: "#0a0f1f", bg2: "#141b38", accent: "#a855f7", ink: "#f3e8ff", glow: "#d8b4fe" },
    gate: {
      name: "Wake the Kraken",
      description: "Command the lines and never break rhythm.",
      requirements: [
        { stat: "secured",    target: 50, label: "Deals secured" },
        { stat: "lineVisits", target: 10, label: "Shipping line visits" },
        { stat: "bestStreak", target: 30, label: "Best streak (working days)" },
      ],
    },
  },
  {
    index: 8, key: "celestial", name: "Celestial Meridian", title: "Star Captain",
    tagline: "Navigation by starlight. Few have charted this far.",
    minLevel: 81, maxLevel: 90,
    palette: { bg: "#0b0b24", bg2: "#17173f", accent: "#facc15", ink: "#fefce8", glow: "#fef08a" },
    gate: {
      name: "The Star Chart",
      description: "A century of visits and a season of weekly wins.",
      requirements: [
        { stat: "secured",      target: 75,  label: "Deals secured" },
        { stat: "fieldVisits",  target: 100, label: "Field visits" },
        { stat: "weekliesDone", target: 30,  label: "Weekly quests completed" },
      ],
    },
  },
  {
    index: 9, key: "leviathan", name: "Leviathan's Throne", title: "Leviathan",
    tagline: "The end of the map. The throne at the bottom of the sea.",
    minLevel: 91, maxLevel: 100,
    palette: { bg: "#06121a", bg2: "#0c2430", accent: "#34d399", ink: "#ecfdf5", glow: "#a7f3d0" },
    gate: {
      name: "Trial of the Leviathan",
      description: "One hundred deals. Forty-five days unbroken. A thousand clients.",
      requirements: [
        { stat: "secured",         target: 100,  label: "Deals secured" },
        { stat: "bestStreak",      target: 45,   label: "Best streak (working days)" },
        { stat: "distinctClients", target: 1000, label: "Unique clients contacted" },
      ],
    },
  },
]

export function arenaForLevel(level: number): ArenaDef {
  const idx = Math.min(ARENAS.length - 1, Math.max(0, Math.floor((level - 1) / LEVELS_PER_ARENA)))
  return ARENAS[idx]
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

export function titleForLevel(level: number): string {
  const arena = arenaForLevel(level)
  const sub = level - arena.minLevel
  return `${arena.title} ${ROMAN[Math.max(0, Math.min(9, sub))]}`
}

export function gateProgress(arenaIndex: number, stats: LifetimeStats): GateProgress | null {
  const arena = ARENAS[arenaIndex]
  if (!arena?.gate) return null
  const requirements = arena.gate.requirements.map((r) => {
    const current = stats[r.stat] ?? 0
    return { stat: r.stat, label: r.label, current, target: r.target, done: current >= r.target }
  })
  return {
    arenaIndex,
    name: arena.gate.name,
    requirements,
    cleared: requirements.every((r) => r.done),
  }
}

export interface LevelState {
  level:         number
  rawLevel:      number
  arenaIndex:    number
  title:         string
  levelFloorXp:  number
  nextLevelXp:   number | null
  progress:      number
  bankedXp:      number
  prestigeStars: number
  nextGate:      GateProgress | null
  gateBlocked:   boolean
}

/** Resolve the effective level: XP curve, capped by the first uncleared gate. */
export function resolveLevel(totalXp: number, stats: LifetimeStats): LevelState {
  const rawLevel = rawLevelForXp(totalXp)
  let level = rawLevel

  // Walk gates in order; the first uncleared gate caps the level.
  for (let a = 1; a < ARENAS.length; a++) {
    const gate = gateProgress(a, stats)
    if (gate && !gate.cleared && level >= ARENAS[a].minLevel) {
      level = ARENAS[a].minLevel - 1
      break
    }
  }

  const arena = arenaForLevel(level)
  const nextGate = gateProgress(arena.index + 1, stats)
  const gateBlocked = level < rawLevel
  const levelFloorXp = xpForLevel(level)
  const atMax = level >= MAX_LEVEL
  const nextLevelXp = atMax ? null : xpForLevel(level + 1)

  let progress = 1
  if (!atMax && !gateBlocked && nextLevelXp != null) {
    progress = Math.max(0, Math.min(1, (totalXp - levelFloorXp) / (nextLevelXp - levelFloorXp)))
  }

  // XP sitting behind a locked gate (beyond what the next level needs)
  const bankedXp = gateBlocked && nextLevelXp != null ? Math.max(0, totalXp - nextLevelXp) : 0
  const prestigeStars = atMax ? Math.floor((totalXp - xpForLevel(MAX_LEVEL)) / PRESTIGE_STEP) : 0

  return {
    level, rawLevel, arenaIndex: arena.index, title: titleForLevel(level),
    levelFloorXp, nextLevelXp, progress, bankedXp, prestigeStars,
    nextGate, gateBlocked,
  }
}

/** Pet evolution stage (1..5) from arena. */
export function petStageForArena(arenaIndex: number): number {
  return Math.min(5, Math.floor(arenaIndex / 2) + 1)
}
