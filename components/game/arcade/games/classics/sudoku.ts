// ============================================================
// Sudoku engine (pure TypeScript, no React)
//  - cell indexing (rows / columns / boxes / peers)
//  - fast bitmask backtracking solver (counts solutions up to a limit)
//  - human-style technique solver, used to grade puzzles and find hints
//  - generator: unique puzzles graded by givens AND hardest technique
//  - scoring
// Digits are 1-9, empty cells are 0. Candidate sets are 9-bit masks
// (bit d-1 set = digit d possible).
// ============================================================

import { createRng, randInt, shuffle } from "../../kit/random"

// ─── Difficulty ───────────────────────────────────────────────

export type Difficulty = "easy" | "medium" | "hard" | "expert"

export interface DifficultySpec {
  id:             Difficulty
  label:          string
  /** technique level the puzzle must require (see TECHNIQUES) */
  level:          1 | 2 | 3 | 4
  minGivens:      number
  maxGivens:      number
  /** score for a win before bonus/penalties */
  base:           number
  /** largest time bonus; shrinks linearly to 0 at bonusWindow seconds */
  timeBonus:      number
  bonusWindow:    number
  hintPenalty:    number
  mistakePenalty: number
  /** shown on the setup screen */
  techniques:     string
}

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"]

export const DIFFICULTY_SPECS: Record<Difficulty, DifficultySpec> = {
  easy:   { id: "easy",   label: "Easy",   level: 1, minGivens: 36, maxGivens: 40, base: 1000, timeBonus: 500,  bonusWindow: 600,  hintPenalty: 100, mistakePenalty: 50,  techniques: "Singles only" },
  medium: { id: "medium", label: "Medium", level: 2, minGivens: 30, maxGivens: 34, base: 2000, timeBonus: 1000, bonusWindow: 900,  hintPenalty: 200, mistakePenalty: 100, techniques: "Pointing, pairs" },
  hard:   { id: "hard",   label: "Hard",   level: 3, minGivens: 26, maxGivens: 30, base: 3500, timeBonus: 1750, bonusWindow: 1500, hintPenalty: 350, mistakePenalty: 175, techniques: "Hidden pairs, triples" },
  expert: { id: "expert", label: "Expert", level: 4, minGivens: 22, maxGivens: 26, base: 5000, timeBonus: 2500, bonusWindow: 2100, hintPenalty: 500, mistakePenalty: 250, techniques: "X-Wing, XY-Wing" },
}

// ─── Indexing ─────────────────────────────────────────────────

export const ROW = new Uint8Array(81)
export const COL = new Uint8Array(81)
export const BOX = new Uint8Array(81)
for (let i = 0; i < 81; i++) {
  ROW[i] = (i / 9) | 0
  COL[i] = i % 9
  BOX[i] = ((ROW[i] / 3) | 0) * 3 + ((COL[i] / 3) | 0)
}

/** 27 units: 0-8 rows, 9-17 columns, 18-26 boxes. Each lists 9 cell indices. */
export const UNITS: number[][] = []
for (let r = 0; r < 9; r++) UNITS.push(Array.from({ length: 9 }, (_, c) => r * 9 + c))
for (let c = 0; c < 9; c++) UNITS.push(Array.from({ length: 9 }, (_, r) => r * 9 + c))
for (let b = 0; b < 9; b++) {
  const r0 = ((b / 3) | 0) * 3
  const c0 = (b % 3) * 3
  UNITS.push(Array.from({ length: 9 }, (_, k) => (r0 + ((k / 3) | 0)) * 9 + c0 + (k % 3)))
}

/** SEES[a * 81 + b] = 1 when a and b share a row, column or box (a != b). */
const SEES = new Uint8Array(81 * 81)
/** The 20 peers of each cell. */
export const PEERS: number[][] = []
for (let i = 0; i < 81; i++) {
  const list: number[] = []
  for (let j = 0; j < 81; j++) {
    if (i !== j && (ROW[i] === ROW[j] || COL[i] === COL[j] || BOX[i] === BOX[j])) {
      SEES[i * 81 + j] = 1
      list.push(j)
    }
  }
  PEERS.push(list)
}

export function sees(a: number, b: number): boolean {
  return SEES[a * 81 + b] === 1
}

function inUnit(cell: number, unit: number): boolean {
  if (unit < 9) return ROW[cell] === unit
  if (unit < 18) return COL[cell] === unit - 9
  return BOX[cell] === unit - 18
}

// ─── Bit helpers ──────────────────────────────────────────────

const ALL = 0x1ff
/** popcount of a 9-bit mask */
const POP = new Uint8Array(512)
/** 1-based index of the lowest set bit (0 for 0) */
const LOW = new Uint8Array(512)
for (let m = 1; m < 512; m++) {
  POP[m] = POP[m >> 1] + (m & 1)
  LOW[m] = m & 1 ? 1 : LOW[m >> 1] + 1
}

export function digitBit(d: number): number {
  return 1 << (d - 1)
}

/** Digits (1-9) present in a 9-bit mask, ascending. */
export function maskDigits(mask: number): number[] {
  const out: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) out.push(d)
  return out
}

/** Calls fn for every k-combination of indices 0..n-1 (stops when fn returns true). */
function combinations(n: number, k: number, fn: (idx: number[]) => boolean): boolean {
  if (k > n) return false
  const idx = Array.from({ length: k }, (_, i) => i)
  for (;;) {
    if (fn(idx)) return true
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) return false
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
}

// ─── Backtracking solver ──────────────────────────────────────

interface SearchResult {
  count:    number
  solution: number[] | null
}

/**
 * Bitmask backtracking with minimum-remaining-values ordering.
 * Stops after `limit` solutions. With `rng`, candidate order is shuffled
 * (used to build random full grids).
 */
function search(grid: ArrayLike<number>, limit: number, rng?: () => number): SearchResult {
  const g = new Uint8Array(81)
  const rows = new Uint16Array(9)
  const cols = new Uint16Array(9)
  const boxes = new Uint16Array(9)
  const empties: number[] = []
  for (let i = 0; i < 81; i++) {
    const v = grid[i]
    if (v) {
      const b = 1 << (v - 1)
      if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & b) return { count: 0, solution: null }
      rows[ROW[i]] |= b
      cols[COL[i]] |= b
      boxes[BOX[i]] |= b
      g[i] = v
    } else {
      empties.push(i)
    }
  }

  const n = empties.length
  let count = 0
  let solution: number[] | null = null

  const rec = (depth: number): boolean => {
    if (depth === n) {
      count++
      if (!solution) solution = Array.from(g)
      return count >= limit
    }
    let bestK = depth
    let bestMask = 0
    let bestPop = 10
    for (let k = depth; k < n; k++) {
      const i = empties[k]
      const m = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & ALL
      const p = POP[m]
      if (p < bestPop) {
        bestPop = p
        bestK = k
        bestMask = m
        if (p <= 1) break
      }
    }
    if (bestPop === 0) return false
    const i = empties[bestK]
    empties[bestK] = empties[depth]
    empties[depth] = i
    const r = ROW[i]
    const c = COL[i]
    const bx = BOX[i]

    let bits: number[]
    if (rng) {
      bits = []
      for (let m = bestMask; m; m &= m - 1) bits.push(m & -m)
      bits = shuffle(bits, rng)
    } else {
      bits = []
      for (let m = bestMask; m; m &= m - 1) bits.push(m & -m)
    }
    for (const b of bits) {
      rows[r] |= b
      cols[c] |= b
      boxes[bx] |= b
      g[i] = LOW[b]
      if (rec(depth + 1)) return true
      rows[r] ^= b
      cols[c] ^= b
      boxes[bx] ^= b
    }
    g[i] = 0
    return false
  }

  rec(0)
  return { count, solution }
}

/** Number of solutions, counting at most `limit` (default 2: 0, 1 or "2+"). */
export function countSolutions(grid: ArrayLike<number>, limit = 2): number {
  return search(grid, limit).count
}

/** First solution found, or null when unsolvable. */
export function solve(grid: ArrayLike<number>): number[] | null {
  return search(grid, 1).solution
}

export function hasUniqueSolution(grid: ArrayLike<number>): boolean {
  return search(grid, 2).count === 1
}

/** A uniformly shuffled complete valid grid. */
export function randomSolution(rng: () => number = Math.random): number[] {
  const s = search(new Array<number>(81).fill(0), 1, rng).solution
  if (!s) throw new Error("sudoku: failed to build a full grid")
  return s
}

// ─── Human-style solver ───────────────────────────────────────

export type TechniqueId =
  | "hidden-single" | "naked-single"
  | "pointing" | "claiming" | "naked-pair"
  | "hidden-pair" | "naked-triple" | "hidden-triple"
  | "x-wing" | "xy-wing" | "swordfish" | "xyz-wing" | "naked-quad" | "hidden-quad" | "jellyfish"

export const TECHNIQUE_NAMES: Record<TechniqueId, string> = {
  "hidden-single": "Hidden single",
  "naked-single":  "Naked single",
  "pointing":      "Pointing pair",
  "claiming":      "Box/line reduction",
  "naked-pair":    "Naked pair",
  "hidden-pair":   "Hidden pair",
  "naked-triple":  "Naked triple",
  "hidden-triple": "Hidden triple",
  "x-wing":        "X-Wing",
  "xy-wing":       "XY-Wing",
  "swordfish":     "Swordfish",
  "xyz-wing":      "XYZ-Wing",
  "naked-quad":    "Naked quad",
  "hidden-quad":   "Hidden quad",
  "jellyfish":     "Jellyfish",
}

interface LogicState {
  /** placed digit per cell (0 = empty) */
  v:    Uint8Array
  /** candidate mask per empty cell (0 for filled cells) */
  c:    Uint16Array
  /** empty cells remaining */
  left: number
  /** a contradiction was found (invalid grid) */
  bad:  boolean
}

function place(s: LogicState, i: number, d: number) {
  const b = 1 << (d - 1)
  s.v[i] = d
  s.c[i] = 0
  s.left--
  for (const p of PEERS[i]) {
    if (s.c[p] & b) {
      s.c[p] &= ~b
      if (!s.c[p]) s.bad = true
    }
  }
}

function makeState(grid: ArrayLike<number>): LogicState {
  const s: LogicState = { v: new Uint8Array(81), c: new Uint16Array(81).fill(ALL), left: 81, bad: false }
  for (let i = 0; i < 81; i++) {
    const d = grid[i]
    if (!d) continue
    if (s.v[i] || !(s.c[i] & (1 << (d - 1)))) {
      s.bad = true
      continue
    }
    place(s, i, d)
  }
  return s
}

/** Removes `mask` from cell i's candidates; true when something was removed. */
function elim(s: LogicState, i: number, mask: number): boolean {
  if (!(s.c[i] & mask)) return false
  s.c[i] &= ~mask
  if (!s.c[i]) s.bad = true
  return true
}

function findHiddenSingle(s: LogicState): [number, number] | null {
  // boxes first (the easiest to spot), then rows, then columns
  for (let k = 0; k < 27; k++) {
    const u = (k + 18) % 27
    const cells = UNITS[u]
    let once = 0
    let twice = 0
    let placed = 0
    for (const c of cells) {
      const m = s.c[c]
      twice |= once & m
      once |= m
      if (s.v[c]) placed |= 1 << (s.v[c] - 1)
    }
    if ((once | placed) !== ALL) {
      s.bad = true
      return null
    }
    const single = once & ~twice
    if (single) {
      const b = single & -single
      for (const c of cells) if (s.c[c] & b) return [c, LOW[b]]
    }
  }
  return null
}

function findNakedSingle(s: LogicState): [number, number] | null {
  for (let i = 0; i < 81; i++) {
    if (!s.v[i] && POP[s.c[i]] === 1) return [i, LOW[s.c[i]]]
  }
  return null
}

function hiddenSingle(s: LogicState): boolean {
  const f = findHiddenSingle(s)
  if (!f) return false
  place(s, f[0], f[1])
  return true
}

function nakedSingle(s: LogicState): boolean {
  const f = findNakedSingle(s)
  if (!f) return false
  place(s, f[0], f[1])
  return true
}

/** Candidates of a digit in a box confined to one row/column: remove it from the rest of that line. */
function pointing(s: LogicState): boolean {
  for (let b = 0; b < 9; b++) {
    const cells = UNITS[18 + b]
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d
      let rows = 0
      let cols = 0
      let n = 0
      for (const c of cells) {
        if (s.c[c] & bit) {
          rows |= 1 << ROW[c]
          cols |= 1 << COL[c]
          n++
        }
      }
      if (n < 2) continue
      let progress = false
      if (POP[rows] === 1) {
        for (const c of UNITS[LOW[rows] - 1]) if (BOX[c] !== b && elim(s, c, bit)) progress = true
      }
      if (POP[cols] === 1) {
        for (const c of UNITS[9 + LOW[cols] - 1]) if (BOX[c] !== b && elim(s, c, bit)) progress = true
      }
      if (progress) return true
    }
  }
  return false
}

/** Candidates of a digit in a row/column confined to one box: remove it from the rest of the box. */
function claiming(s: LogicState): boolean {
  for (let u = 0; u < 18; u++) {
    const cells = UNITS[u]
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d
      let boxes = 0
      let n = 0
      for (const c of cells) {
        if (s.c[c] & bit) {
          boxes |= 1 << BOX[c]
          n++
        }
      }
      if (n < 2 || POP[boxes] !== 1) continue
      let progress = false
      for (const c of UNITS[18 + LOW[boxes] - 1]) if (!inUnit(c, u) && elim(s, c, bit)) progress = true
      if (progress) return true
    }
  }
  return false
}

/** k cells of a unit whose candidates together are exactly k digits. */
function nakedSubset(s: LogicState, k: number): boolean {
  for (let u = 0; u < 27; u++) {
    const cells = UNITS[u]
    let empty = 0
    const pool: number[] = []
    for (const c of cells) {
      if (s.v[c]) continue
      empty++
      const p = POP[s.c[c]]
      if (p >= 2 && p <= k) pool.push(c)
    }
    if (empty <= k || pool.length < k) continue
    const hit = combinations(pool.length, k, (idx) => {
      let union = 0
      for (const j of idx) union |= s.c[pool[j]]
      if (POP[union] !== k) return false
      let progress = false
      for (const c of cells) {
        if (s.v[c]) continue
        let member = false
        for (const j of idx) if (pool[j] === c) member = true
        if (!member && elim(s, c, union)) progress = true
      }
      return progress
    })
    if (hit) return true
  }
  return false
}

/** k digits of a unit that fit only in the same k cells: strip other candidates from those cells. */
function hiddenSubset(s: LogicState, k: number): boolean {
  for (let u = 0; u < 27; u++) {
    const cells = UNITS[u]
    let empty = 0
    for (const c of cells) if (!s.v[c]) empty++
    if (empty <= k) continue
    const digits: number[] = []
    const where: number[] = []
    for (let d = 0; d < 9; d++) {
      const bit = 1 << d
      let pos = 0
      for (let j = 0; j < 9; j++) if (s.c[cells[j]] & bit) pos |= 1 << j
      const p = POP[pos]
      if (p >= 2 && p <= k) {
        digits.push(d)
        where.push(pos)
      }
    }
    if (digits.length < k) continue
    const hit = combinations(digits.length, k, (idx) => {
      let pos = 0
      let keep = 0
      for (const j of idx) {
        pos |= where[j]
        keep |= 1 << digits[j]
      }
      if (POP[pos] !== k) return false
      let progress = false
      for (let j = 0; j < 9; j++) if (pos & (1 << j) && elim(s, cells[j], ~keep & ALL)) progress = true
      return progress
    })
    if (hit) return true
  }
  return false
}

/** X-Wing (k=2), Swordfish (3), Jellyfish (4) on rows and on columns. */
function fish(s: LogicState, k: number): boolean {
  for (let d = 0; d < 9; d++) {
    const bit = 1 << d
    for (let orient = 0; orient < 2; orient++) {
      const lines: number[] = []
      const cover: number[] = []
      for (let a = 0; a < 9; a++) {
        let pos = 0
        for (let b = 0; b < 9; b++) {
          const cell = orient === 0 ? a * 9 + b : b * 9 + a
          if (s.c[cell] & bit) pos |= 1 << b
        }
        const p = POP[pos]
        if (p >= 2 && p <= k) {
          lines.push(a)
          cover.push(pos)
        }
      }
      if (lines.length < k) continue
      const hit = combinations(lines.length, k, (idx) => {
        let union = 0
        let base = 0
        for (const j of idx) {
          union |= cover[j]
          base |= 1 << lines[j]
        }
        if (POP[union] !== k) return false
        let progress = false
        for (let b = 0; b < 9; b++) {
          if (!(union & (1 << b))) continue
          for (let a = 0; a < 9; a++) {
            if (base & (1 << a)) continue
            const cell = orient === 0 ? a * 9 + b : b * 9 + a
            if (elim(s, cell, bit)) progress = true
          }
        }
        return progress
      })
      if (hit) return true
    }
  }
  return false
}

/** Pivot {x,y}, pincers {x,z} and {y,z}: z leaves every cell that sees both pincers. */
function xyWing(s: LogicState): boolean {
  for (let pivot = 0; pivot < 81; pivot++) {
    const m = s.c[pivot]
    if (POP[m] !== 2) continue
    const wings: number[] = []
    for (const p of PEERS[pivot]) {
      const pm = s.c[p]
      if (POP[pm] === 2 && pm !== m && POP[pm & m] === 1) wings.push(p)
    }
    for (let i = 0; i < wings.length; i++) {
      for (let j = i + 1; j < wings.length; j++) {
        const a = wings[i]
        const b = wings[j]
        const ma = s.c[a]
        const mb = s.c[b]
        if ((ma & m) === (mb & m)) continue
        const z = ma & ~m
        if (z !== (mb & ~m)) continue
        let progress = false
        for (const c of PEERS[a]) {
          if (c !== b && c !== pivot && SEES[c * 81 + b] && elim(s, c, z)) progress = true
        }
        if (progress) return true
      }
    }
  }
  return false
}

/** Pivot {x,y,z}, pincers {x,z} and {y,z}: z leaves every cell that sees all three. */
function xyzWing(s: LogicState): boolean {
  for (let pivot = 0; pivot < 81; pivot++) {
    const m = s.c[pivot]
    if (POP[m] !== 3) continue
    const wings: number[] = []
    for (const p of PEERS[pivot]) {
      const pm = s.c[p]
      if (POP[pm] === 2 && (pm & ~m) === 0) wings.push(p)
    }
    for (let i = 0; i < wings.length; i++) {
      for (let j = i + 1; j < wings.length; j++) {
        const a = wings[i]
        const b = wings[j]
        const ma = s.c[a]
        const mb = s.c[b]
        if (ma === mb || (ma | mb) !== m) continue
        const z = ma & mb
        let progress = false
        for (const c of PEERS[pivot]) {
          if (c !== a && c !== b && SEES[c * 81 + a] && SEES[c * 81 + b] && elim(s, c, z)) progress = true
        }
        if (progress) return true
      }
    }
  }
  return false
}

interface Technique {
  id:    TechniqueId
  level: 1 | 2 | 3 | 4
  run:   (s: LogicState) => boolean
}

/**
 * Ordered easiest first. Level 1 = Easy, 2 = Medium, 3 = Hard, 4 = Expert.
 * The grader always applies the easiest technique that makes progress.
 */
export const TECHNIQUES: readonly Technique[] = [
  { id: "hidden-single", level: 1, run: hiddenSingle },
  { id: "naked-single",  level: 1, run: nakedSingle },
  { id: "pointing",      level: 2, run: pointing },
  { id: "claiming",      level: 2, run: claiming },
  { id: "naked-pair",    level: 2, run: (s) => nakedSubset(s, 2) },
  { id: "hidden-pair",   level: 3, run: (s) => hiddenSubset(s, 2) },
  { id: "naked-triple",  level: 3, run: (s) => nakedSubset(s, 3) },
  { id: "hidden-triple", level: 3, run: (s) => hiddenSubset(s, 3) },
  { id: "x-wing",        level: 4, run: (s) => fish(s, 2) },
  { id: "xy-wing",       level: 4, run: xyWing },
  { id: "swordfish",     level: 4, run: (s) => fish(s, 3) },
  { id: "xyz-wing",      level: 4, run: xyzWing },
  { id: "naked-quad",    level: 4, run: (s) => nakedSubset(s, 4) },
  { id: "hidden-quad",   level: 4, run: (s) => hiddenSubset(s, 4) },
  { id: "jellyfish",     level: 4, run: (s) => fish(s, 4) },
]

export const TECHNIQUE_LEVEL: Record<TechniqueId, number> = Object.fromEntries(
  TECHNIQUES.map((t) => [t.id, t.level]),
) as Record<TechniqueId, number>

export interface Grade {
  /** the logical solver reached a full grid (implies a unique solution) */
  solved:  boolean
  /** highest technique level used (0 when nothing was needed) */
  level:   number
  /** hardest technique used */
  hardest: TechniqueId | null
  /** times each technique was applied */
  counts:  Partial<Record<TechniqueId, number>>
  /** grid reached by the solver (complete when solved) */
  values:  number[]
}

/**
 * Solves like a person: repeatedly applies the easiest technique that makes
 * progress, never guessing. `maxLevel` caps the techniques allowed.
 */
export function gradePuzzle(grid: ArrayLike<number>, maxLevel = 4): Grade {
  const s = makeState(grid)
  const counts: Partial<Record<TechniqueId, number>> = {}
  let level = 0
  let hardestIdx = -1
  outer: while (s.left > 0 && !s.bad) {
    for (let t = 0; t < TECHNIQUES.length; t++) {
      const tech = TECHNIQUES[t]
      if (tech.level > maxLevel) break
      if (tech.run(s)) {
        if (s.bad) break outer
        counts[tech.id] = (counts[tech.id] ?? 0) + 1
        if (tech.level > level) level = tech.level
        if (t > hardestIdx) hardestIdx = t
        continue outer
      }
      if (s.bad) break outer
    }
    break
  }
  return {
    solved:  s.left === 0 && !s.bad,
    level,
    hardest: hardestIdx >= 0 ? TECHNIQUES[hardestIdx].id : null,
    counts,
    values:  Array.from(s.v),
  }
}

export interface Placement {
  cell:  number
  digit: number
  /** single that places the digit */
  via:   "hidden-single" | "naked-single"
  /** hardest elimination technique needed before the single appeared, if any */
  after: TechniqueId | null
}

function listSingles(s: LogicState): { cell: number; digit: number; via: Placement["via"] }[] {
  const out: { cell: number; digit: number; via: Placement["via"] }[] = []
  const seen = new Uint8Array(81)
  for (let k = 0; k < 27; k++) {
    const cells = UNITS[(k + 18) % 27]
    let once = 0
    let twice = 0
    for (const c of cells) {
      twice |= once & s.c[c]
      once |= s.c[c]
    }
    for (let single = once & ~twice; single; single &= single - 1) {
      const b = single & -single
      for (const c of cells) {
        if (s.c[c] & b && !seen[c]) {
          seen[c] = 1
          out.push({ cell: c, digit: LOW[b], via: "hidden-single" })
        }
      }
    }
  }
  for (let i = 0; i < 81; i++) {
    if (!s.v[i] && !seen[i] && POP[s.c[i]] === 1) {
      seen[i] = 1
      out.push({ cell: i, digit: LOW[s.c[i]], via: "naked-single" })
    }
  }
  return out
}

/**
 * Cells that can be filled next by logic from `grid` (only correct digits
 * should be passed). Applies the fewest/easiest eliminations needed until at
 * least one single appears. Empty array when the solver is stuck.
 */
export function nextLogicalPlacements(grid: ArrayLike<number>): Placement[] {
  const s = makeState(grid)
  if (s.bad) return []
  let after: TechniqueId | null = null
  let afterIdx = -1
  for (let guard = 0; guard < 400 && s.left > 0; guard++) {
    const singles = listSingles(s)
    if (singles.length) return singles.map((p) => ({ ...p, after }))
    let progressed = false
    for (let t = 0; t < TECHNIQUES.length; t++) {
      const tech = TECHNIQUES[t]
      if (tech.level === 1) continue
      if (tech.run(s)) {
        progressed = true
        if (t > afterIdx) {
          afterIdx = t
          after = tech.id
        }
        break
      }
    }
    if (!progressed || s.bad) return []
  }
  return []
}

// ─── Board helpers for the UI ─────────────────────────────────

/** true for every cell whose digit repeats in its row, column or box. */
export function findConflicts(values: ArrayLike<number>): boolean[] {
  const out = new Array<boolean>(81).fill(false)
  for (const cells of UNITS) {
    const first = new Int8Array(10).fill(-1)
    for (const c of cells) {
      const v = values[c]
      if (!v) continue
      if (first[v] === -1) {
        first[v] = c
      } else {
        out[c] = true
        out[first[v]] = true
      }
    }
  }
  return out
}

/** Candidate digits for a cell given the placed digits (0 mask if filled). */
export function candidatesOf(values: ArrayLike<number>, cell: number): number {
  if (values[cell]) return 0
  let used = 0
  for (const p of PEERS[cell]) if (values[p]) used |= 1 << (values[p] - 1)
  return ~used & ALL
}

/** Units (by index into UNITS) that are complete and valid in `values`. */
export function completedUnits(values: ArrayLike<number>, solution: ArrayLike<number>, cell: number): number[] {
  const out: number[] = []
  for (const u of [ROW[cell], 9 + COL[cell], 18 + BOX[cell]]) {
    if (UNITS[u].every((c) => values[c] === solution[c])) out.push(u)
  }
  return out
}

// ─── Generator ────────────────────────────────────────────────

export interface GeneratedPuzzle {
  difficulty: Difficulty
  /** 81 digits, 0 = empty */
  puzzle:     number[]
  solution:   number[]
  givens:     number
  /** hardest technique level required (1-4) */
  level:      number
  hardest:    TechniqueId | null
  /** true when both the level and the givens count match the difficulty */
  exact:      boolean
  attempts:   number
  ms:         number
}

interface Candidate {
  puzzle:   number[]
  solution: number[]
  givens:   number
  grade:    Grade
}

/**
 * Puzzle polish: keep generating (up to polishMs) until an exact match needs
 * the target-level technique at least `want` times.
 */
const RICHNESS: Record<Difficulty, { want: number; polishMs: number }> = {
  easy:   { want: 0, polishMs: 0 },
  medium: { want: 3, polishMs: 250 },
  hard:   { want: 2, polishMs: 350 },
  expert: { want: 2, polishMs: 450 },
}

/** 180-degree rotational pairs (cell 40 stands alone), used for symmetric layouts. */
const SYM_PAIRS: number[][] = []
for (let i = 0; i < 41; i++) SYM_PAIRS.push(i === 40 ? [40] : [i, 80 - i])

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

/**
 * Incremental generator: call run(ms) repeatedly (e.g. from setTimeout) so the
 * UI stays responsive, then result(). Each attempt builds a random full grid
 * and removes clues (symmetric pairs first) while the puzzle stays unique and
 * solvable with techniques up to the target level, stopping once the target
 * level is required within the givens range.
 */
export class SudokuGenerator {
  readonly difficulty: Difficulty
  private readonly spec: DifficultySpec
  private readonly rng: () => number
  private best: Candidate | null = null
  private bestScore = Infinity
  private bestRich = -1
  private attempts = 0
  private elapsed = 0
  done = false

  constructor(difficulty: Difficulty, rng: () => number = createRng()) {
    this.difficulty = difficulty
    this.spec = DIFFICULTY_SPECS[difficulty]
    this.rng = rng
  }

  /** Works for up to `ms` (at least one attempt). Returns true once an exact match was found. */
  run(ms: number): boolean {
    if (this.done) return true
    const start = now()
    const { want, polishMs } = RICHNESS[this.difficulty]
    do {
      this.attempts++
      const cand = this.attempt()
      if (cand) {
        const score = this.distance(cand)
        const rich = this.richness(cand)
        if (score < this.bestScore || (score === this.bestScore && rich > this.bestRich)) {
          this.best = cand
          this.bestScore = score
          this.bestRich = rich
        }
      }
      // An exact match is enough once it uses the target technique `want`
      // times, or once the polishing time is spent.
      if (this.bestScore === 0 && (this.bestRich >= want || this.elapsed + now() - start >= polishMs)) {
        this.done = true
      }
    } while (!this.done && now() - start < ms)
    this.elapsed += now() - start
    return this.done
  }

  /** Best puzzle so far (runs one attempt if none yet). */
  result(): GeneratedPuzzle {
    while (!this.best) this.run(0)
    const b = this.best
    return {
      difficulty: this.difficulty,
      puzzle:     b.puzzle,
      solution:   b.solution,
      givens:     b.givens,
      level:      b.grade.level,
      hardest:    b.grade.hardest,
      exact:      this.bestScore === 0,
      attempts:   this.attempts,
      ms:         Math.round(this.elapsed),
    }
  }

  /** How many solving steps use a technique of the target level. */
  private richness(c: Candidate): number {
    let n = 0
    for (const t of TECHNIQUES) if (t.level === this.spec.level) n += c.grade.counts[t.id] ?? 0
    return n
  }

  private distance(c: Candidate): number {
    const { minGivens, maxGivens, level } = this.spec
    if (!c.grade.solved) return Infinity
    const g = c.givens < minGivens ? minGivens - c.givens : c.givens > maxGivens ? c.givens - maxGivens : 0
    return Math.abs(c.grade.level - level) * 100 + g
  }

  private attempt(): Candidate | null {
    const { minGivens, maxGivens, level } = this.spec
    const solution = randomSolution(this.rng)
    const puzzle = solution.slice()
    let givens = 81
    // Easy aims for a random count in range; harder levels stop as soon as the
    // target technique is required, somewhere at or below a random count.
    const target = randInt(this.rng, minGivens, maxGivens)

    const pairs = shuffle(SYM_PAIRS, this.rng)
    const singles = shuffle(Array.from({ length: 81 }, (_, i) => [i]), this.rng)

    const tryRemove = (cells: number[]): "kept" | "removed" | "done" => {
      if (cells.some((c) => puzzle[c] === 0)) return "kept"
      if (givens - cells.length < minGivens) return "kept"
      for (const c of cells) puzzle[c] = 0
      if (hasUniqueSolution(puzzle)) {
        const g = gradePuzzle(puzzle, level)
        if (g.solved) {
          givens -= cells.length
          if (givens <= target && g.level >= level) return "done"
          return "removed"
        }
      }
      for (const c of cells) puzzle[c] = solution[c]
      return "kept"
    }

    let finished = false
    for (const p of pairs) {
      if (tryRemove(p) === "done") {
        finished = true
        break
      }
    }
    if (!finished) {
      for (const p of singles) {
        if (tryRemove(p) === "done") break
      }
    }
    const finalGrade = gradePuzzle(puzzle, 4)
    if (!finalGrade.solved) return null
    return { puzzle, solution, givens, grade: finalGrade }
  }
}

/** Synchronous convenience wrapper (tests / non-UI use). */
export function generatePuzzle(difficulty: Difficulty, budgetMs = 1200, rng?: () => number): GeneratedPuzzle {
  const gen = new SudokuGenerator(difficulty, rng)
  gen.run(budgetMs)
  return gen.result()
}

// ─── Scoring ──────────────────────────────────────────────────

export interface WinScore {
  base:      number
  timeBonus: number
  hints:     number
  mistakes:  number
  total:     number
}

/**
 * Win: base + time bonus - hint penalties - mistake penalties,
 * never below 10% of base. Time bonus = timeBonus * (1 - seconds / bonusWindow), floored at 0.
 */
export function scoreWin(difficulty: Difficulty, seconds: number, hints: number, mistakes: number): WinScore {
  const spec = DIFFICULTY_SPECS[difficulty]
  const timeBonus = Math.max(0, Math.round(spec.timeBonus * (1 - seconds / spec.bonusWindow)))
  const hintCost = hints * spec.hintPenalty
  const mistakeCost = mistakes * spec.mistakePenalty
  const floor = Math.round(spec.base * 0.1)
  const total = Math.max(floor, spec.base + timeBonus - hintCost - mistakeCost)
  return { base: spec.base, timeBonus, hints: hintCost, mistakes: mistakeCost, total }
}

/** Loss / give up: 10% of base scaled by the share of empty cells filled correctly by the player. */
export function scorePartial(difficulty: Difficulty, correctFraction: number): number {
  const f = Math.min(1, Math.max(0, correctFraction))
  return Math.max(0, Math.round(DIFFICULTY_SPECS[difficulty].base * 0.1 * f))
}
