// ============================================================
// The Grand Voyage — Arcade registry
// Each game unlocks at a level (admins can preview everything).
// Game components live in components/game/arcade/games/<id>.tsx
// (default export, implements ArcadeGameProps); rules live in
// components/game/arcade/rules/<id>.ts (default export GameRules).
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

export type ArcadeCategory = "board" | "cards" | "puzzle"

export const ARCADE_CATEGORIES: { id: ArcadeCategory; label: string }[] = [
  { id: "board",  label: "Board games" },
  { id: "cards",  label: "Card games" },
  { id: "puzzle", label: "Puzzles" },
]

export interface ArcadeGameDef {
  id:          string
  name:        string
  category:    ArcadeCategory
  /** one line shown on the game card */
  description: string
  /** e.g. "1 player vs computer" */
  players:     string
  unlockLevel: number
  icon:        string      // lucide-react icon name
  /** dialog width: md ~640px, lg ~880px, xl ~1120px */
  size:        "md" | "lg" | "xl"
}

export const ARCADE_GAMES: ArcadeGameDef[] = [
  // ── Board games ──
  { id: "snakes-ladders", name: "Snakes & Ladders", category: "board",  unlockLevel: 1,  icon: "Dices",       size: "lg",
    players: "2-4 players vs computer", description: "Classic 100-square race. Climb ladders, dodge snakes, land exactly on 100." },
  { id: "connect-four",   name: "Connect Four",     category: "board",  unlockLevel: 3,  icon: "CircleDot",   size: "md",
    players: "1 player vs computer",    description: "Drop discs and line up four in a row before the computer does." },
  { id: "reversi",        name: "Reversi",          category: "board",  unlockLevel: 3,  icon: "Disc",        size: "md",
    players: "1 player vs computer",    description: "Outflank and flip your opponent's discs. Most discs at the end wins." },
  { id: "checkers",       name: "Checkers",         category: "board",  unlockLevel: 6,  icon: "Grid2x2",     size: "md",
    players: "1 player vs computer",    description: "Draughts with forced captures, multi-jumps and kings." },
  { id: "ludo",           name: "Ludo",             category: "board",  unlockLevel: 10, icon: "Dice5",       size: "lg",
    players: "2-4 players vs computer", description: "Roll a six to leave base, capture rivals and bring all four tokens home." },
  { id: "chess",          name: "Chess",            category: "board",  unlockLevel: 15, icon: "ChessKnight", size: "lg",
    players: "1 player vs computer",    description: "Full chess rules against a computer opponent with three difficulty levels." },
  // ── Card games ──
  { id: "klondike",       name: "Solitaire",        category: "cards",  unlockLevel: 1,  icon: "Spade",       size: "xl",
    players: "1 player",                description: "Klondike solitaire. Build the four foundations from Ace to King." },
  { id: "blackjack",      name: "Blackjack",        category: "cards",  unlockLevel: 1,  icon: "Club",        size: "lg",
    players: "1 player vs dealer",      description: "Beat the dealer to 21 with hit, stand, double down and split." },
  { id: "crazy-eights",   name: "Crazy Eights",     category: "cards",  unlockLevel: 6,  icon: "Layers",      size: "lg",
    players: "1 player vs 3 computers", description: "Match suit or rank, play eights as wild, and empty your hand first." },
  { id: "freecell",       name: "FreeCell",         category: "cards",  unlockLevel: 6,  icon: "Columns4",    size: "xl",
    players: "1 player",                description: "Solitaire with four free cells. Almost every deal can be solved." },
  { id: "spider",         name: "Spider Solitaire", category: "cards",  unlockLevel: 10, icon: "Layers3",     size: "xl",
    players: "1 player",                description: "Build King-to-Ace runs in suit to clear the table. 1, 2 or 4 suits." },
  { id: "hearts",         name: "Hearts",           category: "cards",  unlockLevel: 20, icon: "Heart",       size: "xl",
    players: "1 player vs 3 computers", description: "Trick-taking: avoid hearts and the Queen of Spades, or shoot the moon." },
  // ── Puzzles ──
  { id: "minesweeper",    name: "Minesweeper",      category: "puzzle", unlockLevel: 1,  icon: "Bomb",        size: "lg",
    players: "1 player",                description: "Clear the field without hitting a mine. Beginner, Intermediate, Expert." },
  { id: "sudoku",         name: "Sudoku",           category: "puzzle", unlockLevel: 3,  icon: "Grid3x3",     size: "md",
    players: "1 player",                description: "Fill the 9x9 grid so every row, column and box has 1 to 9." },
]

export const ARCADE_GAME_MAP: Record<string, ArcadeGameDef> =
  Object.fromEntries(ARCADE_GAMES.map((g) => [g.id, g]))

/** Structured "How to play" content for a game. */
export interface GameRules {
  objective: string
  setup?:    string[]
  play:      string[]
  controls:  string[]
  scoring:   string[]
  tips?:     string[]
}

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
