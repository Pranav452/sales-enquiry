// ============================================================
// Snakes & Ladders — pure game logic (no React).
// Squares are numbered 1..100 on a 10x10 boustrophedon board:
// square 1 is bottom-left, row 1 runs left→right, row 2 runs
// right→left, and so on up to 100 at the top-left.
// Position 0 means "not on the board yet".
// ============================================================

export const BOARD_SIZE = 10
export const LAST_SQUARE = 100

export interface Jump {
  from: number
  to:   number
}

/** Ladders: foot → top. Classic Milton Bradley-style layout. */
export const LADDERS: Jump[] = [
  { from: 4,  to: 14 },
  { from: 9,  to: 31 },
  { from: 21, to: 42 },
  { from: 28, to: 84 },
  { from: 36, to: 44 },
  { from: 51, to: 67 },
  { from: 71, to: 91 },
  { from: 80, to: 100 },
]

/** Snakes: head → tail. */
export const SNAKES: Jump[] = [
  { from: 16, to: 6 },
  { from: 47, to: 26 },
  { from: 49, to: 11 },
  { from: 62, to: 19 },
  { from: 64, to: 60 },
  { from: 87, to: 24 },
  { from: 93, to: 73 },
  { from: 98, to: 78 },
]

const LADDER_AT = new Map(LADDERS.map((l) => [l.from, l]))
const SNAKE_AT  = new Map(SNAKES.map((s) => [s.from, s]))

/** Grid cell of a square. row 0 = bottom row, col 0 = left column. */
export function squareToCell(square: number): { row: number; col: number } {
  if (square < 1 || square > LAST_SQUARE) throw new RangeError(`square ${square} out of range`)
  const row = Math.floor((square - 1) / BOARD_SIZE)
  const idx = (square - 1) % BOARD_SIZE
  const col = row % 2 === 0 ? idx : BOARD_SIZE - 1 - idx
  return { row, col }
}

/** Inverse of squareToCell. */
export function cellToSquare(row: number, col: number): number {
  const idx = row % 2 === 0 ? col : BOARD_SIZE - 1 - col
  return row * BOARD_SIZE + idx + 1
}

/** Centre of a square in board units where one cell = `cell` units and y grows downward. */
export function squareCenter(square: number, cell = 100): { x: number; y: number } {
  const { row, col } = squareToCell(square)
  return { x: col * cell + cell / 2, y: (BOARD_SIZE - 1 - row) * cell + cell / 2 }
}

export interface SLOptions {
  /** must land exactly on 100; an overshooting roll is wasted */
  exactFinish: boolean
  /** rolling a 6 gives the same player another roll */
  sixExtra:    boolean
}

export interface MovePlan {
  from:    number
  roll:    number
  /** squares visited one by one (excludes `from`); empty when blocked */
  path:    number[]
  /** square reached by the dice count (before any snake/ladder) */
  landed:  number
  jump:    (Jump & { kind: "ladder" | "snake" }) | null
  /** final square after the jump */
  final:   number
  /** roll was wasted because of the exact-finish rule */
  blocked: boolean
  won:     boolean
}

export function planMove(from: number, roll: number, opts: Pick<SLOptions, "exactFinish">): MovePlan {
  if (roll < 1 || roll > 6) throw new RangeError(`bad roll ${roll}`)
  let target = from + roll
  if (target > LAST_SQUARE) {
    if (opts.exactFinish) {
      return { from, roll, path: [], landed: from, jump: null, final: from, blocked: true, won: false }
    }
    target = LAST_SQUARE
  }
  const path: number[] = []
  for (let s = from + 1; s <= target; s++) path.push(s)
  const ladder = LADDER_AT.get(target)
  const snake  = SNAKE_AT.get(target)
  const jump = ladder ? { ...ladder, kind: "ladder" as const } : snake ? { ...snake, kind: "snake" as const } : null
  const final = jump ? jump.to : target
  return { from, roll, path, landed: target, jump, final, blocked: false, won: final === LAST_SQUARE }
}

/** True when the given roll should be followed by another roll for the same player. */
export function grantsExtraRoll(roll: number, opts: Pick<SLOptions, "sixExtra">, won: boolean): boolean {
  return opts.sixExtra && roll === 6 && !won
}

// ─── Scoring ──────────────────────────────────────────────────

export const SL_TURN_PAR = 40

/**
 * 1st place: 300 + 50 per opponent beyond the first + 5 per turn under 40 (max +150).
 * 2nd: 120 · 3rd: 60 · last place: 20.
 */
export function placeScore(place: number, playerCount: number, turns: number): number {
  if (place === 1) {
    const speed = Math.min(150, Math.max(0, SL_TURN_PAR - turns) * 5)
    return 300 + 50 * (playerCount - 2) + speed
  }
  if (place === playerCount) return 20
  return place === 2 ? 120 : 60
}

/** Partial score when quitting: half the highest square reached, rounded down. */
export function quitScore(position: number): number {
  return Math.floor(Math.max(0, position) / 2)
}

export function ordinal(n: number): string {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
}
