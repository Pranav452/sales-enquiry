// ============================================================
// Minesweeper — pure game logic (no React).
// Boards are immutable: every action returns a new Board (or the
// same object when nothing changed). Cells are addressed by flat
// index i = row * cols + col.
// ============================================================

export type LevelId = "beginner" | "intermediate" | "expert"

export interface LevelConfig {
  id:    LevelId
  label: string
  rows:  number
  cols:  number
  mines: number
  /** Points for clearing the board. */
  base:  number
  /** Seconds after which the time bonus reaches zero. */
  par:   number
}

export const LEVELS: Record<LevelId, LevelConfig> = {
  beginner:     { id: "beginner",     label: "Beginner",     rows: 9,  cols: 9,  mines: 10, base: 300,  par: 120 },
  intermediate: { id: "intermediate", label: "Intermediate", rows: 16, cols: 16, mines: 40, base: 1200, par: 360 },
  expert:       { id: "expert",       label: "Expert",       rows: 16, cols: 30, mines: 99, base: 4000, par: 900 },
}

export const LEVEL_ORDER: LevelId[] = ["beginner", "intermediate", "expert"]

export function isLevelId(v: string): v is LevelId {
  return v === "beginner" || v === "intermediate" || v === "expert"
}

/** Share of the base awarded on a loss / give up when the whole field was cleared. */
export const PARTIAL_SHARE = 0.25

export type CellState = "hidden" | "flagged" | "revealed"
export type GameStatus = "ready" | "playing" | "won" | "lost"

export interface Board {
  readonly rows:      number
  readonly cols:      number
  readonly mineCount: number
  /** false everywhere until the first reveal places the mines */
  readonly mines:     readonly boolean[]
  /** adjacent mine count per cell */
  readonly counts:    readonly number[]
  readonly state:     readonly CellState[]
  readonly status:    GameStatus
  /** mines the player set off (red cells) */
  readonly exploded:  readonly number[]
  /** number of revealed safe cells */
  readonly revealed:  number
  /** number of flags on the board */
  readonly flags:     number
}

// ─── Geometry ─────────────────────────────────────────────────

export function neighbors(rows: number, cols: number, i: number): number[] {
  const r = Math.floor(i / cols)
  const c = i % cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    const rr = r + dr
    if (rr < 0 || rr >= rows) continue
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const cc = c + dc
      if (cc < 0 || cc >= cols) continue
      out.push(rr * cols + cc)
    }
  }
  return out
}

export function safeTotal(b: Board): number {
  return b.rows * b.cols - b.mineCount
}

export function minesLeft(b: Board): number {
  return b.mineCount - b.flags
}

/** Fraction (0..1) of safe cells revealed. */
export function progress(b: Board): number {
  const total = safeTotal(b)
  return total > 0 ? b.revealed / total : 0
}

export function adjacentFlags(b: Board, i: number): number {
  let n = 0
  for (const j of neighbors(b.rows, b.cols, i)) if (b.state[j] === "flagged") n++
  return n
}

export function isOver(b: Board): boolean {
  return b.status === "won" || b.status === "lost"
}

// ─── Creation ─────────────────────────────────────────────────

export function createBoard(rows: number, cols: number, mineCount: number): Board {
  const n = rows * cols
  if (mineCount < 1 || mineCount >= n) throw new Error(`Invalid mine count ${mineCount} for ${rows}x${cols}`)
  return {
    rows, cols, mineCount,
    mines:    new Array<boolean>(n).fill(false),
    counts:   new Array<number>(n).fill(0),
    state:    new Array<CellState>(n).fill("hidden"),
    status:   "ready",
    exploded: [],
    revealed: 0,
    flags:    0,
  }
}

export function createLevelBoard(level: LevelId): Board {
  const cfg = LEVELS[level]
  return createBoard(cfg.rows, cfg.cols, cfg.mines)
}

/**
 * Random mine layout that keeps `safeIndex` and its neighbours clear,
 * so the first click is always a zero and opens an area. Falls back to
 * protecting only `safeIndex` if the board is too crowded for that.
 */
export function generateMines(
  rows: number, cols: number, mineCount: number, safeIndex: number, rng: () => number,
): boolean[] {
  const n = rows * cols
  let excluded = new Set<number>([safeIndex, ...neighbors(rows, cols, safeIndex)])
  if (n - excluded.size < mineCount) excluded = new Set([safeIndex])
  const candidates: number[] = []
  for (let i = 0; i < n; i++) if (!excluded.has(i)) candidates.push(i)
  // Partial Fisher-Yates: the first `mineCount` slots become mines.
  for (let k = 0; k < mineCount; k++) {
    const j = k + Math.floor(rng() * (candidates.length - k))
    const t = candidates[k]
    candidates[k] = candidates[j]
    candidates[j] = t
  }
  const mines = new Array<boolean>(n).fill(false)
  for (let k = 0; k < mineCount; k++) mines[candidates[k]] = true
  return mines
}

export function computeCounts(rows: number, cols: number, mines: readonly boolean[]): number[] {
  const counts = new Array<number>(rows * cols).fill(0)
  for (let i = 0; i < mines.length; i++) {
    if (!mines[i]) continue
    for (const j of neighbors(rows, cols, i)) counts[j]++
  }
  return counts
}

/** Places mines around a guaranteed-safe first click and starts play. */
export function startBoard(b: Board, safeIndex: number, rng: () => number): Board {
  const mines = generateMines(b.rows, b.cols, b.mineCount, safeIndex, rng)
  return { ...b, mines, counts: computeCounts(b.rows, b.cols, mines), status: "playing" }
}

/** Test helper / custom layouts: a board already in play with the given mines. */
export function boardFromMines(rows: number, cols: number, mines: readonly boolean[]): Board {
  const count = mines.filter(Boolean).length
  const base = createBoard(rows, cols, count)
  return { ...base, mines: mines.slice(), counts: computeCounts(rows, cols, mines), status: "playing" }
}

// ─── Actions ──────────────────────────────────────────────────

/**
 * Opens `starts` (safe, hidden cells) and cascades through zeros with an
 * explicit stack. Flagged cells are never opened. Mutates `state`;
 * returns how many cells were opened.
 */
function floodOpen(b: Board, state: CellState[], starts: number[]): number {
  let opened = 0
  const stack = starts.slice()
  while (stack.length > 0) {
    const i = stack.pop() as number
    if (state[i] !== "hidden" || b.mines[i]) continue
    state[i] = "revealed"
    opened++
    if (b.counts[i] !== 0) continue
    for (const j of neighbors(b.rows, b.cols, i)) {
      if (state[j] === "hidden" && !b.mines[j]) stack.push(j)
    }
  }
  return opened
}

/** Win check + classic win cleanup (every mine gets a flag). */
function settle(b: Board, state: CellState[], revealed: number): Board {
  if (revealed === safeTotal(b)) {
    for (let i = 0; i < state.length; i++) if (b.mines[i]) state[i] = "flagged"
    return { ...b, state, revealed, flags: b.mineCount, status: "won" }
  }
  return { ...b, state, revealed }
}

/** Reveal one hidden cell. The first reveal of a game places the mines. */
export function reveal(board: Board, i: number, rng: () => number = Math.random): Board {
  if (isOver(board) || board.state[i] !== "hidden") return board
  const b = board.status === "ready" ? startBoard(board, i, rng) : board
  const state = b.state.slice()
  if (b.mines[i]) {
    state[i] = "revealed"
    return { ...b, state, status: "lost", exploded: [i] }
  }
  const opened = floodOpen(b, state, [i])
  return settle(b, state, b.revealed + opened)
}

export function toggleFlag(b: Board, i: number): Board {
  if (isOver(b)) return b
  const s = b.state[i]
  if (s === "revealed") return b
  const state = b.state.slice()
  state[i] = s === "flagged" ? "hidden" : "flagged"
  return { ...b, state, flags: b.flags + (s === "flagged" ? -1 : 1) }
}

/** A revealed number whose flag count matches it, with something left to open. */
export function canChord(b: Board, i: number): boolean {
  if (b.status !== "playing" || b.state[i] !== "revealed" || b.counts[i] === 0) return false
  let flags = 0
  let hidden = 0
  for (const j of neighbors(b.rows, b.cols, i)) {
    if (b.state[j] === "flagged") flags++
    else if (b.state[j] === "hidden") hidden++
  }
  return flags === b.counts[i] && hidden > 0
}

/** Hidden, unflagged neighbours of `i` (the cells a chord would open). */
export function chordTargets(b: Board, i: number): number[] {
  return neighbors(b.rows, b.cols, i).filter((j) => b.state[j] === "hidden")
}

/**
 * Chording: on a satisfied number, open every hidden unflagged neighbour.
 * A misplaced flag means a mine gets opened — the game is lost.
 */
export function chord(b: Board, i: number): Board {
  if (!canChord(b, i)) return b
  const targets = chordTargets(b, i)
  const state = b.state.slice()
  const boom = targets.filter((j) => b.mines[j])
  const opened = floodOpen(b, state, targets.filter((j) => !b.mines[j]))
  const revealed = b.revealed + opened
  if (boom.length > 0) {
    for (const j of boom) state[j] = "revealed"
    return { ...b, state, revealed, status: "lost", exploded: boom }
  }
  return settle(b, state, revealed)
}

/** Give up: ends the game as a loss without an exploded cell. */
export function forfeit(b: Board): Board {
  if (isOver(b)) return b
  return { ...b, status: "lost" }
}

export type CellAction = "reveal" | "flag"

/**
 * What a click / tap / Enter does. A revealed number always chords;
 * otherwise `action` decides (reveal or flag).
 */
export function act(b: Board, i: number, action: CellAction, rng: () => number = Math.random): Board {
  if (b.state[i] === "revealed") return chord(b, i)
  return action === "flag" ? toggleFlag(b, i) : reveal(b, i, rng)
}

// ─── View model ───────────────────────────────────────────────

export type CellView =
  | { kind: "hidden" }
  | { kind: "flag" }
  | { kind: "wrong-flag" }   // loss: flag on a safe cell
  | { kind: "mine" }         // loss: unflagged mine
  | { kind: "exploded" }     // loss: the mine that went off
  | { kind: "open"; count: number }

export function cellView(b: Board, i: number): CellView {
  const s = b.state[i]
  const lost = b.status === "lost"
  if (s === "revealed") return b.mines[i] ? { kind: "exploded" } : { kind: "open", count: b.counts[i] }
  if (s === "flagged") return lost && !b.mines[i] ? { kind: "wrong-flag" } : { kind: "flag" }
  return lost && b.mines[i] ? { kind: "mine" } : { kind: "hidden" }
}

// ─── Scoring ──────────────────────────────────────────────────

/** Win: base + base * (par - seconds) / par (bonus floored, never negative). */
export function winScore(level: LevelId, seconds: number): number {
  const { base, par } = LEVELS[level]
  const t = Math.max(0, Math.floor(seconds))
  return base + Math.floor((base * Math.max(0, par - t)) / par)
}

/** Loss / give up: up to 25% of the base, in proportion to the safe cells revealed. */
export function partialScore(level: LevelId, revealed: number, total: number): number {
  if (total <= 0) return 0
  const frac = Math.min(1, Math.max(0, revealed / total))
  return Math.floor(LEVELS[level].base * PARTIAL_SHARE * frac)
}
