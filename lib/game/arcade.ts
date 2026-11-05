// ============================================================
// The Grand Voyage — Arcade registry
// Each game unlocks at a level. Game components live in
// components/game/arcade/games/<id>.tsx (default export) and
// implement ArcadeGameProps.
// ============================================================

export interface ArcadeGameResult {
  score: number
  won?:  boolean
  /** short line shown on the result card, e.g. "Cleared in 42s" */
  summary?: string
}

export interface ArcadeGameProps {
  /** Call exactly once when the run ends. */
  onGameOver: (result: ArcadeGameResult) => void
}

export interface ArcadeGameDef {
  id:          string
  name:        string
  tagline:     string
  howTo:       string
  unlockLevel: number
  icon:        string      // lucide-react icon name
  accent:      string      // hex
}

export const ARCADE_GAMES: ArcadeGameDef[] = [
  { id: "anchors",     name: "Knots & Anchors",    unlockLevel: 1,  icon: "Anchor",     accent: "#38bdf8",
    tagline: "Three in a row against the harbour master.",
    howTo: "Best of 5 rounds vs the bot. Win = 3 pts, draw = 1 pt." },
  { id: "cargo-match", name: "Cargo Match",         unlockLevel: 4,  icon: "Boxes",      accent: "#f59e0b",
    tagline: "Flip the containers, pair the cargo.",
    howTo: "Match all 8 pairs. Fewer moves and less time = higher score." },
  { id: "lighthouse",  name: "Lighthouse Signals",  unlockLevel: 8,  icon: "Lightbulb",  accent: "#facc15",
    tagline: "Repeat the beacon sequence. It only gets longer.",
    howTo: "Watch the lights, repeat the pattern. Score = longest sequence." },
  { id: "teu-2048",    name: "TEU Stacker",         unlockLevel: 12, icon: "Container",  accent: "#f97316",
    tagline: "Merge containers. Reach the 2048 TEU mega-vessel.",
    howTo: "Arrow keys or swipe. Equal stacks merge. Score = merged TEU." },
  { id: "minesweep",   name: "Strait Sweeper",      unlockLevel: 16, icon: "Bomb",       accent: "#ef4444",
    tagline: "Chart a safe channel through the minefield.",
    howTo: "Reveal every safe cell. Right-click / long-press to flag." },
  { id: "convoy",      name: "Convoy",              unlockLevel: 21, icon: "Ship",       accent: "#22c55e",
    tagline: "Lead the convoy, collect cargo, never ram yourself.",
    howTo: "Arrow keys / WASD / swipe. Each cargo = 10 pts." },
  { id: "port-battle", name: "Port Battle",         unlockLevel: 31, icon: "Swords",     accent: "#a855f7",
    tagline: "Four in a row against a rival forwarder.",
    howTo: "Drop discs, connect four. Win fast for a bigger score." },
  { id: "locode",      name: "LOCODE",              unlockLevel: 41, icon: "Globe2",     accent: "#14b8a6",
    tagline: "Guess the 5-letter UN/LOCODE port in 6 tries.",
    howTo: "Green = right spot, amber = wrong spot. Fewer guesses = more points." },
  { id: "ice-breaker", name: "Ice Breaker",         unlockLevel: 61, icon: "Snowflake",  accent: "#7dd3fc",
    tagline: "Slide the ice floes back into order.",
    howTo: "Order tiles 1-15. Fewer moves and less time = higher score." },
  { id: "kraken-hunt", name: "Kraken Hunt",         unlockLevel: 81, icon: "Crosshair",  accent: "#e11d48",
    tagline: "Hunt the enemy fleet before it finds yours.",
    howTo: "Place your fleet, then fire. Sink all ships to win." },
]

export const ARCADE_GAME_MAP: Record<string, ArcadeGameDef> =
  Object.fromEntries(ARCADE_GAMES.map((g) => [g.id, g]))

// ─── Local persistence (tokens + personal bests) ──────────────

const TOKENS_KEY = (date: string) => `voyage.arcade.spent.${date}`
const BEST_KEY   = (id: string) => `voyage.arcade.best.${id}`

export function tokensSpent(date: string): number {
  if (typeof window === "undefined") return 0
  return Number(localStorage.getItem(TOKENS_KEY(date)) ?? 0) || 0
}

export function spendToken(date: string): number {
  const next = tokensSpent(date) + 1
  localStorage.setItem(TOKENS_KEY(date), String(next))
  return next
}

export function personalBest(id: string): number | null {
  if (typeof window === "undefined") return null
  const v = localStorage.getItem(BEST_KEY(id))
  return v == null ? null : Number(v)
}

/** Saves if better; returns true when it is a new personal best. */
export function recordScore(id: string, score: number): boolean {
  const best = personalBest(id)
  if (best == null || score > best) {
    localStorage.setItem(BEST_KEY(id), String(score))
    return true
  }
  return false
}
