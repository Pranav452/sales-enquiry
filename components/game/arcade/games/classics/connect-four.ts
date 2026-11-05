// ============================================================
// Connect Four — rules, scoring and computer opponent (no React).
// Board: 7 columns x 6 rows, cell index = col * ROWS + row with
// row 0 at the bottom. Player 1 always moves first.
// ============================================================

export const COLS = 7
export const ROWS = 6
export const SIZE = COLS * ROWS

export type Player = 1 | 2
export type Cell = 0 | Player
export type Level = "easy" | "medium" | "hard"

export const idx = (col: number, row: number) => col * ROWS + row
export const colOf = (i: number) => Math.floor(i / ROWS)
export const rowOf = (i: number) => i % ROWS

// ─── Four-cell windows (every possible line of four) ───────────

const DIRS: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]]

/** All 69 lines of four, as cell indexes. */
export const WINDOWS: number[][] = (() => {
  const out: number[][] = []
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      for (const [dc, dr] of DIRS) {
        const ec = c + 3 * dc
        const er = r + 3 * dr
        if (ec < 0 || ec >= COLS || er < 0 || er >= ROWS) continue
        out.push([0, 1, 2, 3].map((k) => idx(c + k * dc, r + k * dr)))
      }
    }
  }
  return out
})()

const NW = WINDOWS.length
/** windows containing each cell, flattened: CELL_WIN[CELL_START[i] .. CELL_START[i+1]) */
const CELL_START = new Int16Array(SIZE + 1)
const CELL_WIN = (() => {
  const lists: number[][] = Array.from({ length: SIZE }, () => [])
  WINDOWS.forEach((w, wi) => w.forEach((i) => lists[i].push(wi)))
  const flat: number[] = []
  for (let i = 0; i < SIZE; i++) {
    CELL_START[i] = flat.length
    flat.push(...lists[i])
  }
  CELL_START[SIZE] = flat.length
  return Int16Array.from(flat)
})()

// ─── Immutable game state used by the UI ───────────────────────

export interface Game {
  cells:   Cell[]
  heights: number[]
  /** columns played, in order */
  moves:   number[]
  winner:  Cell
  /** winning cells (4 or more) when someone has won */
  line:    number[] | null
  /** board full without a winner */
  draw:    boolean
}

export function newGame(): Game {
  return { cells: Array<Cell>(SIZE).fill(0), heights: Array<number>(COLS).fill(0), moves: [], winner: 0, line: null, draw: false }
}

export const toMove = (g: Game): Player => (g.moves.length % 2 === 0 ? 1 : 2)
export const isOver = (g: Game) => g.winner !== 0 || g.draw
export const canPlay = (g: Game, col: number) => !isOver(g) && col >= 0 && col < COLS && g.heights[col] < ROWS
export const legalCols = (g: Game) => [0, 1, 2, 3, 4, 5, 6].filter((c) => canPlay(g, c))

/** Every cell of each line of four or more through `i` owned by `p` (null when there is none). */
export function lineThrough(cells: readonly Cell[], i: number, p: Player): number[] | null {
  const c0 = colOf(i)
  const r0 = rowOf(i)
  const all = new Set<number>()
  for (const [dc, dr] of DIRS) {
    const run = [i]
    for (const s of [1, -1]) {
      let c = c0 + s * dc
      let r = r0 + s * dr
      while (c >= 0 && c < COLS && r >= 0 && r < ROWS && cells[idx(c, r)] === p) {
        run.push(idx(c, r))
        c += s * dc
        r += s * dr
      }
    }
    // a single disc can complete two lines at once: keep both
    if (run.length >= 4) run.forEach((x) => all.add(x))
  }
  return all.size ? [...all].sort((a, b) => a - b) : null
}

/** Drop a disc for the side to move. Returns the same game if the move is illegal. */
export function play(g: Game, col: number): Game {
  if (!canPlay(g, col)) return g
  const p = toMove(g)
  const row = g.heights[col]
  const i = idx(col, row)
  const cells = g.cells.slice()
  cells[i] = p
  const heights = g.heights.slice()
  heights[col] = row + 1
  const moves = [...g.moves, col]
  const line = lineThrough(cells, i, p)
  return { cells, heights, moves, winner: line ? p : 0, line, draw: !line && moves.length === SIZE }
}

/** Rebuild a game from a list of columns (used by undo). */
export function replay(cols: readonly number[]): Game {
  let g = newGame()
  for (const c of cols) g = play(g, c)
  return g
}

/** Cell index the next disc in `col` would occupy, or -1 when full. */
export const landing = (g: Game, col: number) => (g.heights[col] < ROWS ? idx(col, g.heights[col]) : -1)

// ─── Scoring ───────────────────────────────────────────────────

export type ResultKind = "win" | "loss" | "draw" | "resign"

export const SCORING = {
  winBase: 100,
  /** bonus per disc short of 21 (a full game) for a quicker win */
  perDiscSaved: 5,
  draw: 40,
  /** loss / resign: per disc you played */
  perDiscPlayed: 1,
  undoPenalty: 10,
}

/** Multiplier x points, minus undo penalties, never below 0. */
export function computeScore(kind: ResultKind, mult: number, humanDiscs: number, undos: number): number {
  let base: number
  if (kind === "win") base = SCORING.winBase + SCORING.perDiscSaved * Math.max(0, 21 - humanDiscs)
  else if (kind === "draw") base = SCORING.draw
  else base = SCORING.perDiscPlayed * humanDiscs
  return Math.max(0, Math.round(mult * base - undos * SCORING.undoPenalty))
}

// ─── Search engine (mutable, typed arrays) ─────────────────────

const WIN = 10000
const MATE = WIN - 100
const INF = 30000
/** value of k own discs in a window the opponent hasn't touched */
const WEIGHT = [0, 1, 4, 16, 0]
const CENTER_ORDER = [3, 2, 4, 1, 5, 0, 6]
const CENTER_BONUS = [0, 1, 2, 3, 2, 1, 0]

const TT_BITS = 20
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const EXACT = 1
const LOWER = 2
const UPPER = 3

function zobrist(seed: number): Int32Array {
  // fixed seed: hashes only need to be well spread, not secret
  let a = seed >>> 0
  const t = new Int32Array(SIZE * 2)
  for (let i = 0; i < t.length; i++) {
    a = (a + 0x6d2b79f5) >>> 0
    let x = a
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    t[i] = x ^ (x >>> 14)
  }
  return t
}
const Z1 = zobrist(0x1234567)
const Z2 = zobrist(0x7654321)

interface TT {
  check: Int32Array
  value: Int16Array
  depth: Int8Array
  flag:  Int8Array
  move:  Int8Array
}
let sharedTT: TT | null = null
function getTT(): TT {
  if (!sharedTT) {
    sharedTT = {
      check: new Int32Array(TT_SIZE),
      value: new Int16Array(TT_SIZE),
      depth: new Int8Array(TT_SIZE),
      flag: new Int8Array(TT_SIZE),
      move: new Int8Array(TT_SIZE),
    }
  }
  return sharedTT
}

class Engine {
  cells = new Int8Array(SIZE)
  h = new Int8Array(COLS)
  /** discs per window for player 1 / player 2 */
  c1 = new Int8Array(NW)
  c2 = new Int8Array(NW)
  /** sum of window weights, from player 1's point of view */
  score = 0
  n = 0
  h1 = 0
  h2 = 0
  nodes = 0
  deadline = Infinity
  aborted = false
  history = [new Int32Array(COLS), new Int32Array(COLS)]
  tt = getTT()

  constructor(g: Game) {
    for (const col of g.moves) this.play(col)
  }

  side(): Player {
    return this.n % 2 === 0 ? 1 : 2
  }

  private contrib(w: number): number {
    const a = this.c1[w]
    const b = this.c2[w]
    if (a > 0 && b > 0) return 0
    return a > 0 ? WEIGHT[a] : b > 0 ? -WEIGHT[b] : 0
  }

  play(col: number) {
    const p = this.side()
    const i = col * ROWS + this.h[col]
    this.h[col]++
    this.cells[i] = p
    this.n++
    const cnt = p === 1 ? this.c1 : this.c2
    for (let k = CELL_START[i]; k < CELL_START[i + 1]; k++) {
      const w = CELL_WIN[k]
      this.score -= this.contrib(w)
      cnt[w]++
      this.score += this.contrib(w)
    }
    const z = i * 2 + (p - 1)
    this.h1 ^= Z1[z]
    this.h2 ^= Z2[z]
  }

  undo(col: number) {
    this.h[col]--
    const i = col * ROWS + this.h[col]
    const p = this.cells[i] as Player
    this.cells[i] = 0
    this.n--
    const cnt = p === 1 ? this.c1 : this.c2
    for (let k = CELL_START[i]; k < CELL_START[i + 1]; k++) {
      const w = CELL_WIN[k]
      this.score -= this.contrib(w)
      cnt[w]--
      this.score += this.contrib(w)
    }
    const z = i * 2 + (p - 1)
    this.h1 ^= Z1[z]
    this.h2 ^= Z2[z]
  }

  /** Would `p` complete four by playing cell `i` (assumed empty)? */
  winsAt(i: number, p: Player): boolean {
    const cnt = p === 1 ? this.c1 : this.c2
    for (let k = CELL_START[i]; k < CELL_START[i + 1]; k++) if (cnt[CELL_WIN[k]] === 3) return true
    return false
  }

  /** Would `p` win by dropping into `col` now? */
  winsIn(col: number, p: Player): boolean {
    return this.h[col] < ROWS && this.winsAt(col * ROWS + this.h[col], p)
  }

  /** Static evaluation from the side to move's point of view. */
  evaluate(): number {
    let v = this.score
    // Threat squares (empty cells that would complete four). Classic parity:
    // the first player wants threats on odd rows (1, 3, 5 counted from 1),
    // the second player on even rows.
    for (let col = 0; col < COLS; col++) {
      for (let row = this.h[col]; row < ROWS; row++) {
        const i = col * ROWS + row
        const t1 = this.winsAt(i, 1)
        const t2 = this.winsAt(i, 2)
        if (t1) v += row % 2 === 0 ? 24 : 9
        if (t2) v -= row % 2 === 1 ? 24 : 9
      }
    }
    if (v > 5000) v = 5000
    if (v < -5000) v = -5000
    return this.side() === 1 ? v : -v
  }

  /**
   * Negamax with alpha-beta. Handles immediate wins, forced blocks and
   * double threats exactly before trusting the static evaluation.
   */
  search(depth: number, alpha: number, beta: number, ply: number): number {
    this.nodes++
    if ((this.nodes & 4095) === 0 && performance.now() > this.deadline) this.aborted = true
    if (this.aborted) return 0

    const me = this.side()
    const opp: Player = me === 1 ? 2 : 1
    for (let c = 0; c < COLS; c++) if (this.winsIn(c, me)) return WIN - ply
    if (this.n >= SIZE - 1) {
      // one empty cell left (or none): whoever fills it can't win (checked above)
      return 0
    }

    // opponent's immediate threats: two or more = lost, one = forced block
    let forced = -1
    let threats = 0
    for (let c = 0; c < COLS; c++) {
      if (this.winsIn(c, opp)) {
        threats++
        forced = c
      }
    }
    if (threats >= 2) return -(WIN - ply - 1)

    // bound by the quickest possible result
    const maxPossible = WIN - ply - 2
    if (beta > maxPossible) {
      beta = maxPossible
      if (alpha >= beta) return beta
    }

    // transposition table
    const tt = this.tt
    const slot = this.h1 & TT_MASK
    let ttMove = -1
    if (tt.flag[slot] !== 0 && tt.check[slot] === this.h2) {
      ttMove = tt.move[slot]
      if (tt.depth[slot] >= depth) {
        let v = tt.value[slot]
        if (v > MATE) v -= ply
        else if (v < -MATE) v += ply
        const f = tt.flag[slot]
        if (f === EXACT) return v
        if (f === LOWER && v >= beta) return v
        if (f === UPPER && v <= alpha) return v
      }
    }

    if (depth <= 0) return this.evaluate()

    // candidate moves
    const list: number[] = []
    if (forced >= 0) list.push(forced)
    else {
      for (const c of CENTER_ORDER) {
        if (this.h[c] >= ROWS) continue
        // don't play directly under the opponent's winning square
        if (this.h[c] + 1 < ROWS && this.winsAt(c * ROWS + this.h[c] + 1, opp)) continue
        list.push(c)
      }
      if (list.length === 0) return -(WIN - ply - 1)
      const hist = this.history[me - 1]
      list.sort((a, b) => (b === ttMove ? 1 : 0) - (a === ttMove ? 1 : 0) || hist[b] - hist[a])
    }

    const alpha0 = alpha
    let best = -INF
    let bestMove = list[0]
    for (const c of list) {
      this.play(c)
      const v = -this.search(depth - 1, -beta, -alpha, ply + 1)
      this.undo(c)
      if (this.aborted) return 0
      if (v > best) {
        best = v
        bestMove = c
      }
      if (v > alpha) alpha = v
      if (alpha >= beta) {
        this.history[me - 1][c] += depth * depth
        break
      }
    }

    let stored = best
    if (stored > MATE) stored += ply
    else if (stored < -MATE) stored -= ply
    tt.check[slot] = this.h2
    tt.value[slot] = stored
    tt.depth[slot] = depth
    tt.flag[slot] = best <= alpha0 ? UPPER : best >= beta ? LOWER : EXACT
    tt.move[slot] = bestMove
    return best
  }
}

// ─── Public AI entry point ─────────────────────────────────────

export interface AiResult {
  col:   number
  /** search value from the computer's point of view (> 9900 = forced win) */
  value: number
  depth: number
  nodes: number
  ms:    number
}

export interface AiOptions {
  rng?:      () => number
  /** Hard: time budget in ms once the minimum depth is done */
  timeMs?:   number
  /** Hard: depth that is always completed regardless of time */
  minDepth?: number
}

/** Values of every legal root move at a fixed depth (full window, so they are comparable). */
function rootValues(e: Engine, cols: number[], depth: number): { col: number; v: number }[] {
  return cols.map((c) => {
    e.play(c)
    const v = -e.search(depth - 1, -INF, INF, 1)
    e.undo(c)
    return { col: c, v }
  })
}

export function chooseMove(g: Game, level: Level, opts: AiOptions = {}): AiResult {
  const rng = opts.rng ?? Math.random
  const t0 = performance.now()
  const cols = legalCols(g)
  if (cols.length === 0) return { col: -1, value: 0, depth: 0, nodes: 0, ms: 0 }
  const e = new Engine(g)
  const me = e.side()
  const opp: Player = me === 1 ? 2 : 1
  const done = (col: number, value: number, depth: number): AiResult =>
    ({ col, value, depth, nodes: e.nodes, ms: Math.round(performance.now() - t0) })

  const wins = cols.filter((c) => e.winsIn(c, me))
  const blocks = cols.filter((c) => e.winsIn(c, opp))

  if (level === "easy") {
    // Takes a win most of the time, blocks about half the time, otherwise a
    // one-move look with a lot of noise — it makes real mistakes.
    if (wins.length && rng() < 0.7) return done(wins[0], WIN, 1)
    if (blocks.length && rng() < 0.5) return done(blocks[0], 0, 1)
    if (rng() < 0.2) return done(cols[Math.floor(rng() * cols.length)], 0, 0)
    let best = cols[0]
    let bestV = -INF
    for (const c of cols) {
      e.play(c)
      const v = -e.evaluate() + CENTER_BONUS[c] * 2 + (rng() * 40 - 20)
      e.undo(c)
      if (v > bestV) {
        bestV = v
        best = c
      }
    }
    return done(best, bestV, 1)
  }

  if (wins.length) return done(wins[0], WIN, 1)
  if (blocks.length) return done(blocks[0], 0, 1)

  if (level === "medium") {
    // Fixed 6-ply look-ahead; picks randomly among moves within a small margin
    // of the best and now and then settles for the second best (never one that
    // loses by force).
    const depth = Math.min(6, SIZE - g.moves.length)
    const vals = rootValues(e, cols, depth).sort((a, b) => b.v - a.v)
    const top = vals[0].v
    let pool = vals.filter((x) => x.v >= top - 6)
    if (rng() < 0.15 && vals.length > 1 && vals[1].v > -MATE && top < MATE) pool = [vals[1]]
    const pickd = pool[Math.floor(rng() * pool.length)]
    return done(pickd.col, pickd.v, depth)
  }

  // Hard: iterative deepening. The minimum depth always completes; deeper
  // iterations run until the time budget is used or the result is decided.
  const minDepth = opts.minDepth ?? 8
  const budget = opts.timeMs ?? 900
  const end = t0 + budget
  const remaining = SIZE - g.moves.length
  let bestCol = cols.includes(3) ? 3 : cols[0]
  let bestVal = 0
  let reached = 0
  let order = CENTER_ORDER.filter((c) => cols.includes(c))
  for (let depth = 1; depth <= remaining; depth++) {
    e.deadline = depth <= minDepth ? Infinity : end
    e.aborted = false
    let alpha = -INF
    let iterBest = -1
    let iterVal = -INF
    for (const c of order) {
      e.play(c)
      const v = -e.search(depth - 1, -INF, -alpha, 1)
      e.undo(c)
      if (e.aborted) break
      if (v > iterVal) {
        iterVal = v
        iterBest = c
      }
      if (v > alpha) alpha = v
    }
    if (e.aborted) break
    bestCol = iterBest
    bestVal = iterVal
    reached = depth
    // best move first next time
    order = [iterBest, ...order.filter((c) => c !== iterBest)]
    if (Math.abs(iterVal) > MATE) break
    if (depth >= minDepth && performance.now() > t0 + budget * 0.55) break
  }
  // When every move loses by force the search has already picked the slowest loss.
  return done(bestCol, bestVal, reached)
}
