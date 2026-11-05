// ============================================================
// Reversi computer opponent. Pure TS, no React.
//  Easy   - one ply: square value + flips, with heavy noise.
//  Medium - alpha-beta to depth 4 on a classic positional table
//           plus mobility.
//  Hard   - iterative-deepening negamax (PVS) inside a time budget,
//           verified transposition table, TT-move + fastest-first
//           move ordering, a full evaluation (corner-aware square
//           weights, mobility, potential mobility, corners, edge
//           stability, parity) and an exact endgame solver that
//           maximises the final disc difference.
// ============================================================

import { BIT_HI, BIT_LO, OUT, bitsToSquares, genFlips, genMoves, pop32, sideBits, type Position } from "./reversi"

export type Level = "easy" | "medium" | "hard"

export interface AiOptions {
  level: Level
  /** Hard: time budget in ms (default 1000) */
  timeMs?: number
  /** override the maximum search depth */
  maxDepth?: number
  /** Hard: try an exact solve at or below this many empty squares (default 14) */
  solveEmpties?: number
  random?: () => number
}

export interface AiResult {
  move: number
  /** search score from the mover's point of view (final disc margin when exact) */
  score: number
  /** last completed search depth (empties when exact) */
  depth: number
  nodes: number
  ms: number
  exact: boolean
}

const INF = 30000
/** terminal scores are WIN + disc margin, above any evaluation */
const WIN = 10000
const MAX_PLY = 72
const MAX_MOVES = 40

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())

// ─── Square tables ─────────────────────────────────────────────

// Symmetry classes (top-left quadrant, mirrored to the others):
// 0 corner, 1 C-square, 2 A-square, 3 B-square, 4 X-square, 5-9 inner.
const QUAD = [
  [0, 1, 2, 3],
  [1, 4, 5, 6],
  [2, 5, 7, 8],
  [3, 6, 8, 9],
]
const NCLASS = 10
const CLASS_LO = new Int32Array(NCLASS)
const CLASS_HI = new Int32Array(NCLASS)
const CLASS = new Int8Array(64)
for (let s = 0; s < 64; s++) {
  const r = s >> 3
  const c = s & 7
  const k = QUAD[r < 4 ? r : 7 - r][c < 4 ? c : 7 - c]
  CLASS[s] = k
  CLASS_LO[k] |= BIT_LO[s]
  CLASS_HI[k] |= BIT_HI[s]
}
/** classic weight table (Medium evaluation, Easy, move ordering) */
const W_SIMPLE = [100, -20, 10, 5, -50, -2, -2, -1, -1, -1]
/** Hard evaluation; X/C penalties are lifted once the adjacent corner is taken */
const W_FULL = [100, -24, 12, 6, -45, -4, -3, 2, 0, 0]
const SQ_SIMPLE = new Int16Array(64)
for (let s = 0; s < 64; s++) SQ_SIMPLE[s] = W_SIMPLE[CLASS[s]]

const CORNERS = [0, 7, 56, 63]
const X_SQ = [9, 14, 49, 54]
const C_SQ = [[1, 8], [6, 15], [57, 48], [62, 55]]
const IS_CORNER = new Uint8Array(64)
for (const c of CORNERS) IS_CORNER[c] = 1
/** root preference for corner moves, in evaluation units (a corner is worth ~150) */
const CORNER_BONUS = 50
const CORNER_LO = BIT_LO[0] | BIT_LO[7]
const CORNER_HI = BIT_HI[56] | BIT_HI[63]
const EDGES: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7],
  [56, 57, 58, 59, 60, 61, 62, 63],
  [0, 8, 16, 24, 32, 40, 48, 56],
  [7, 15, 23, 31, 39, 47, 55, 63],
]
const NOT_A = 0xfefefefe | 0
const NOT_H = 0x7f7f7f7f

const has = (lo: number, hi: number, s: number) => ((lo & BIT_LO[s]) | (hi & BIT_HI[s])) !== 0
const bit = (lo: number, hi: number, s: number) => (has(lo, hi, s) ? 1 : 0)

// ─── Evaluation ────────────────────────────────────────────────

let DL = 0
let DH = 0
/** The 8-neighbourhood of a set of squares. Result in DL/DH. */
function dilate(xl: number, xh: number): void {
  const el = (xl << 1) & NOT_A
  const eh = ((xh << 1) | (xl >>> 31)) & NOT_A
  const wl = ((xl >>> 1) | (xh << 31)) & NOT_H
  const wh = (xh >>> 1) & NOT_H
  // the row itself shifted sideways, then those three columns shifted up and down
  const rl = xl | el | wl
  const rh = xh | eh | wh
  DL = el | wl | (rl << 8) | (rl >>> 8) | (rh << 24)
  DH = eh | wh | (rh << 8) | (rl >>> 24) | (rh >>> 8)
}

/** Discs on an edge that can never be flipped: runs anchored on a corner, and full edges. P minus O. */
function edgeStability(pl: number, ph: number, ol: number, oh: number): number {
  let spl = 0, sph = 0, sol = 0, soh = 0
  const al = pl | ol
  const ah = ph | oh
  for (let e = 0; e < 4; e++) {
    const sq = EDGES[e]
    let full = true
    for (let k = 0; k < 8; k++) {
      if (!has(al, ah, sq[k])) {
        full = false
        break
      }
    }
    if (full) {
      for (let k = 0; k < 8; k++) {
        const s = sq[k]
        if (has(pl, ph, s)) { spl |= BIT_LO[s]; sph |= BIT_HI[s] }
        else { sol |= BIT_LO[s]; soh |= BIT_HI[s] }
      }
      continue
    }
    for (let end = 0; end < 2; end++) {
      const start = end === 0 ? 0 : 7
      const step = end === 0 ? 1 : -1
      const mine = has(pl, ph, sq[start])
      if (!mine && !has(ol, oh, sq[start])) continue
      for (let k = start; k >= 0 && k < 8; k += step) {
        const s = sq[k]
        if (mine) {
          if (!has(pl, ph, s)) break
          spl |= BIT_LO[s]
          sph |= BIT_HI[s]
        } else {
          if (!has(ol, oh, s)) break
          sol |= BIT_LO[s]
          soh |= BIT_HI[s]
        }
      }
    }
  }
  return pop32(spl) + pop32(sph) - pop32(sol) - pop32(soh)
}

function positional(pl: number, ph: number, ol: number, oh: number, w: readonly number[]): number {
  let pos = 0
  for (let k = 0; k < NCLASS; k++) {
    const wk = w[k]
    if (wk === 0) continue
    const cl = CLASS_LO[k]
    const ch = CLASS_HI[k]
    pos += wk * (pop32(pl & cl) + pop32(ph & ch) - pop32(ol & cl) - pop32(oh & ch))
  }
  return pos
}

/** Medium: square table + mobility. (ml, mh) are P's legal moves. */
function evalSimple(pl: number, ph: number, ol: number, oh: number, ml: number, mh: number): number {
  const mobP = pop32(ml) + pop32(mh)
  genMoves(ol, oh, pl, ph)
  const mobO = pop32(OUT[0]) + pop32(OUT[1])
  return positional(pl, ph, ol, oh, W_SIMPLE) + 6 * (mobP - mobO)
}

/** Hard: the full evaluation, from P's point of view. (ml, mh) are P's legal moves. */
function evalFull(pl: number, ph: number, ol: number, oh: number, ml: number, mh: number): number {
  const occL = pl | ol
  const occH = ph | oh
  const discP = pop32(pl) + pop32(ph)
  const discO = pop32(ol) + pop32(oh)
  const empties = 64 - discP - discO

  const mobP = pop32(ml) + pop32(mh)
  genMoves(ol, oh, pl, ph)
  const mobO = pop32(OUT[0]) + pop32(OUT[1])

  let pos = positional(pl, ph, ol, oh, W_FULL)
  let corners = 0
  let stable = 0
  if ((occL & CORNER_LO) | (occH & CORNER_HI)) {
    for (let c = 0; c < 4; c++) {
      if (!has(occL, occH, CORNERS[c])) continue
      corners += has(pl, ph, CORNERS[c]) ? 1 : -1
      // X and C squares next to a taken corner are no longer a liability
      const x = X_SQ[c]
      const [c1, c2] = C_SQ[c]
      pos -= W_FULL[4] * (bit(pl, ph, x) - bit(ol, oh, x))
      pos -= W_FULL[1] * (bit(pl, ph, c1) - bit(ol, oh, c1) + bit(pl, ph, c2) - bit(ol, oh, c2))
    }
    stable = edgeStability(pl, ph, ol, oh)
  }

  // potential mobility: empty squares next to the other side's discs
  const el = ~occL
  const eh = ~occH
  dilate(ol, oh)
  const potP = pop32(el & DL) + pop32(eh & DH)
  dilate(pl, ph)
  const potO = pop32(el & DL) + pop32(eh & DH)

  const mob = ((mobP - mobO) * 100) / (mobP + mobO + 2)
  const pot = ((potP - potO) * 100) / (potP + potO + 2)
  let score = pos + 30 * corners + 22 * stable
  if (empties > 40) score += 1.3 * mob + 0.9 * pot
  else if (empties > 18) score += 1.1 * mob + 0.6 * pot
  else score += 0.8 * mob + 0.25 * pot + 3 * (discP - discO) + (empties & 1 ? 10 : -10)
  if (score > WIN - 100) return WIN - 100
  if (score < 100 - WIN) return 100 - WIN
  return score | 0
}

// ─── Search state ──────────────────────────────────────────────

let nodes = 0
let deadline = Infinity
let stopped = false
let fullEval = true

function tick(): boolean {
  if ((++nodes & 1023) === 0 && now() > deadline) stopped = true
  return stopped
}

/** Game over: final disc margin, offset so any win beats any evaluation. */
function terminal(pl: number, ph: number, ol: number, oh: number): number {
  const d = pop32(pl) + pop32(ph) - pop32(ol) - pop32(oh)
  return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0
}

// Transposition table: full 128-bit position key stored, so there are no false hits.
const TT_BITS = 18
const TT_MASK = (1 << TT_BITS) - 1
const F_EXACT = 1
const F_LOWER = 2
const F_UPPER = 3
interface Table {
  k0: Int32Array
  k1: Int32Array
  k2: Int32Array
  k3: Int32Array
  score: Int16Array
  depth: Int8Array
  flag: Uint8Array
  move: Int8Array
}
function makeTable(bits: number): Table {
  const n = 1 << bits
  return {
    k0: new Int32Array(n), k1: new Int32Array(n), k2: new Int32Array(n), k3: new Int32Array(n),
    score: new Int16Array(n), depth: new Int8Array(n), flag: new Uint8Array(n), move: new Int8Array(n),
  }
}
let table: Table | null = null
let tableMode = -1
function selectTable(mode: number): Table {
  if (!table) table = makeTable(TT_BITS)
  if (tableMode !== mode) {
    table.k0.fill(0)
    table.k1.fill(0)
    table.k2.fill(0)
    table.k3.fill(0)
    tableMode = mode
  }
  return table
}
const SOLVE_BITS = 17
const SOLVE_MASK = (1 << SOLVE_BITS) - 1
let solveTable: Table | null = null

function hashKey(pl: number, ph: number, ol: number, oh: number): number {
  let h = Math.imul(pl ^ 0x5bd1e995, 0x9e3779b1)
  h ^= Math.imul(ph ^ (h >>> 15), 0x85ebca77)
  h ^= Math.imul(ol ^ (h >>> 13), 0xc2b2ae3d)
  h ^= Math.imul(oh ^ (h >>> 16), 0x27d4eb2f)
  return h ^ (h >>> 15)
}

const MOVES = Array.from({ length: MAX_PLY + 2 }, () => new Int8Array(MAX_MOVES))
const KEYS = Array.from({ length: MAX_PLY + 2 }, () => new Int32Array(MAX_MOVES))

/** Fill MOVES[ply] from a move mask; returns the count. */
function listMoves(ml: number, mh: number, ply: number): number {
  const mv = MOVES[ply]
  let n = 0
  let x = ml
  while (x) {
    const b = x & -x
    x ^= b
    mv[n++] = 31 - Math.clz32(b)
  }
  x = mh
  while (x) {
    const b = x & -x
    x ^= b
    mv[n++] = 63 - Math.clz32(b)
  }
  return n
}

/** Swap the best-keyed move in [i, n) into slot i. */
function pickNext(ply: number, i: number, n: number): number {
  const mv = MOVES[ply]
  const ks = KEYS[ply]
  let bi = i
  for (let j = i + 1; j < n; j++) if (ks[j] > ks[bi]) bi = j
  if (bi !== i) {
    const m = mv[i]; mv[i] = mv[bi]; mv[bi] = m
    const k = ks[i]; ks[i] = ks[bi]; ks[bi] = k
  }
  return mv[i]
}

/** Order key: TT move first, then fewest replies for the opponent, then square value. */
function orderMoves(pl: number, ph: number, ol: number, oh: number, n: number, ply: number, ttMove: number, mobility: boolean): void {
  const mv = MOVES[ply]
  const ks = KEYS[ply]
  for (let i = 0; i < n; i++) {
    const s = mv[i]
    if (s === ttMove) {
      ks[i] = 1 << 28
      continue
    }
    let k = SQ_SIMPLE[s] * 2
    if (mobility) {
      genFlips(pl, ph, ol, oh, s)
      const fl = OUT[0]
      const fh = OUT[1]
      genMoves(ol & ~fl, oh & ~fh, pl | fl | BIT_LO[s], ph | fh | BIT_HI[s])
      k -= 40 * (pop32(OUT[0]) + pop32(OUT[1]))
    }
    ks[i] = k
  }
}

// ─── Midgame search ────────────────────────────────────────────

function negamax(pl: number, ph: number, ol: number, oh: number, depth: number, alpha: number, beta: number, ply: number): number {
  if (tick()) return 0
  genMoves(pl, ph, ol, oh)
  const ml = OUT[0]
  const mh = OUT[1]
  if ((ml | mh) === 0) {
    genMoves(ol, oh, pl, ph)
    if ((OUT[0] | OUT[1]) === 0) return terminal(pl, ph, ol, oh)
    return -negamax(ol, oh, pl, ph, depth, -beta, -alpha, ply + 1) // pass
  }
  if (depth <= 0 || ply >= MAX_PLY) {
    return fullEval ? evalFull(pl, ph, ol, oh, ml, mh) : evalSimple(pl, ph, ol, oh, ml, mh)
  }

  const t = table as Table
  const idx = hashKey(pl, ph, ol, oh) & TT_MASK
  let ttMove = -1
  if (t.k0[idx] === pl && t.k1[idx] === ph && t.k2[idx] === ol && t.k3[idx] === oh) {
    ttMove = t.move[idx]
    if (t.depth[idx] >= depth) {
      const v = t.score[idx]
      const f = t.flag[idx]
      if (f === F_EXACT) return v
      if (f === F_LOWER && v >= beta) return v
      if (f === F_UPPER && v <= alpha) return v
    }
  }

  const n = listMoves(ml, mh, ply)
  orderMoves(pl, ph, ol, oh, n, ply, ttMove, depth >= 3)
  const alpha0 = alpha
  let best = -INF
  let bestMove = -1
  for (let i = 0; i < n; i++) {
    const s = pickNext(ply, i, n)
    genFlips(pl, ph, ol, oh, s)
    const fl = OUT[0]
    const fh = OUT[1]
    const npl = pl | fl | BIT_LO[s]
    const nph = ph | fh | BIT_HI[s]
    const nol = ol & ~fl
    const noh = oh & ~fh
    let v: number
    if (i === 0) {
      v = -negamax(nol, noh, npl, nph, depth - 1, -beta, -alpha, ply + 1)
    } else {
      v = -negamax(nol, noh, npl, nph, depth - 1, -alpha - 1, -alpha, ply + 1)
      if (!stopped && v > alpha && v < beta) v = -negamax(nol, noh, npl, nph, depth - 1, -beta, -v, ply + 1)
    }
    if (stopped) return 0
    if (v > best) {
      best = v
      bestMove = s
      if (v > alpha) {
        alpha = v
        if (alpha >= beta) break
      }
    }
  }

  t.k0[idx] = pl
  t.k1[idx] = ph
  t.k2[idx] = ol
  t.k3[idx] = oh
  t.score[idx] = best
  t.depth[idx] = depth
  t.flag[idx] = best <= alpha0 ? F_UPPER : best >= beta ? F_LOWER : F_EXACT
  t.move[idx] = bestMove
  return best
}

interface RootResult { move: number; score: number; depth: number }

/** Iterative deepening at the root (PVS); keeps the best move of the deepest finished iteration. */
function searchRoot(pl: number, ph: number, ol: number, oh: number, moves: number[], maxDepth: number, empties: number, t0: number, budget: number): RootResult {
  let order = moves.slice()
  let best = order[0]
  let bestScore = -INF
  let depth = 0
  for (let d = 1; d <= maxDepth; d++) {
    let alpha = -INF
    let iterBest = -1
    let iterScore = -INF
    for (let i = 0; i < order.length; i++) {
      const s = order[i]
      genFlips(pl, ph, ol, oh, s)
      const fl = OUT[0]
      const fh = OUT[1]
      const npl = pl | fl | BIT_LO[s]
      const nph = ph | fh | BIT_HI[s]
      const nol = ol & ~fl
      const noh = oh & ~fh
      // a corner gets a small bonus at the root: never pass one up for a marginal gain
      const bonus = IS_CORNER[s] ? CORNER_BONUS : 0
      const a = alpha - bonus
      let v: number
      if (i === 0) {
        v = -negamax(nol, noh, npl, nph, d - 1, -INF, INF, 1)
      } else {
        v = -negamax(nol, noh, npl, nph, d - 1, -a - 1, -a, 1)
        if (!stopped && v > a) v = -negamax(nol, noh, npl, nph, d - 1, -INF, -a, 1)
      }
      if (stopped) break
      if (v + bonus > alpha) {
        alpha = v + bonus
        iterBest = s
        iterScore = v
      }
    }
    if (stopped) {
      // a move that beat the previous best at this depth was fully searched: trust it
      if (iterBest >= 0) {
        best = iterBest
        bestScore = iterScore
      }
      break
    }
    best = iterBest
    bestScore = iterScore
    depth = d
    order = [best, ...order.filter((m) => m !== best)]
    if (d >= empties) break // searched to the end of the game
    if (budget < Infinity && now() - t0 > budget * 0.45) break // the next iteration would not finish
  }
  return { move: best, score: bestScore, depth }
}

// ─── Exact endgame solver (final disc margin) ──────────────────

function discDiff(pl: number, ph: number, ol: number, oh: number): number {
  return pop32(pl) + pop32(ph) - pop32(ol) - pop32(oh)
}

/** One empty square left. */
function solveLast(pl: number, ph: number, ol: number, oh: number): number {
  const el = ~(pl | ol)
  const eh = ~(ph | oh)
  const s = el ? 31 - Math.clz32(el & -el) : 63 - Math.clz32(eh & -eh)
  const p = pop32(pl) + pop32(ph)
  const o = 63 - p
  genFlips(pl, ph, ol, oh, s)
  let n = pop32(OUT[0]) + pop32(OUT[1])
  if (n) return p + n + 1 - (o - n)
  genFlips(ol, oh, pl, ph, s)
  n = pop32(OUT[0]) + pop32(OUT[1])
  if (n) return p - n - (o + n + 1)
  return p - o
}

/** Few empties: try every empty square, no move ordering. */
function solveShallow(pl: number, ph: number, ol: number, oh: number, alpha: number, beta: number, empties: number): number {
  if (tick()) return 0
  if (empties === 1) return solveLast(pl, ph, ol, oh)
  let best = -99
  let x = ~(pl | ol)
  let y = ~(ph | oh)
  while (x | y) {
    let s: number
    if (x) {
      const b = x & -x
      x ^= b
      s = 31 - Math.clz32(b)
    } else {
      const b = y & -y
      y ^= b
      s = 63 - Math.clz32(b)
    }
    genFlips(pl, ph, ol, oh, s)
    const fl = OUT[0]
    const fh = OUT[1]
    if ((fl | fh) === 0) continue
    const v = -solveShallow(ol & ~fl, oh & ~fh, pl | fl | BIT_LO[s], ph | fh | BIT_HI[s], -beta, -alpha, empties - 1)
    if (stopped) return 0
    if (v > best) {
      best = v
      if (v > alpha) {
        alpha = v
        if (alpha >= beta) return best
      }
    }
  }
  if (best !== -99) return best
  // no move: pass if the opponent can play, otherwise the game is over
  genMoves(ol, oh, pl, ph)
  if ((OUT[0] | OUT[1]) === 0) return discDiff(pl, ph, ol, oh)
  return -solveShallow(ol, oh, pl, ph, -beta, -alpha, empties)
}

const SHALLOW = 6

function solveDeep(pl: number, ph: number, ol: number, oh: number, alpha: number, beta: number, empties: number, ply: number): number {
  if (empties <= SHALLOW) return solveShallow(pl, ph, ol, oh, alpha, beta, empties)
  if (tick()) return 0
  genMoves(pl, ph, ol, oh)
  const ml = OUT[0]
  const mh = OUT[1]
  if ((ml | mh) === 0) {
    genMoves(ol, oh, pl, ph)
    if ((OUT[0] | OUT[1]) === 0) return discDiff(pl, ph, ol, oh)
    return -solveDeep(ol, oh, pl, ph, -beta, -alpha, empties, ply + 1)
  }

  const t = solveTable as Table
  const idx = hashKey(pl, ph, ol, oh) & SOLVE_MASK
  let ttMove = -1
  if (t.k0[idx] === pl && t.k1[idx] === ph && t.k2[idx] === ol && t.k3[idx] === oh) {
    ttMove = t.move[idx]
    const v = t.score[idx]
    const f = t.flag[idx]
    if (f === F_EXACT) return v
    if (f === F_LOWER && v >= beta) return v
    if (f === F_UPPER && v <= alpha) return v
  }

  const n = listMoves(ml, mh, ply)
  orderMoves(pl, ph, ol, oh, n, ply, ttMove, true)
  const alpha0 = alpha
  let best = -99
  let bestMove = -1
  for (let i = 0; i < n; i++) {
    const s = pickNext(ply, i, n)
    genFlips(pl, ph, ol, oh, s)
    const fl = OUT[0]
    const fh = OUT[1]
    const npl = pl | fl | BIT_LO[s]
    const nph = ph | fh | BIT_HI[s]
    const nol = ol & ~fl
    const noh = oh & ~fh
    let v: number
    if (i === 0) {
      v = -solveDeep(nol, noh, npl, nph, -beta, -alpha, empties - 1, ply + 1)
    } else {
      v = -solveDeep(nol, noh, npl, nph, -alpha - 1, -alpha, empties - 1, ply + 1)
      if (!stopped && v > alpha && v < beta) v = -solveDeep(nol, noh, npl, nph, -beta, -v, empties - 1, ply + 1)
    }
    if (stopped) return 0
    if (v > best) {
      best = v
      bestMove = s
      if (v > alpha) {
        alpha = v
        if (alpha >= beta) break
      }
    }
  }
  t.k0[idx] = pl
  t.k1[idx] = ph
  t.k2[idx] = ol
  t.k3[idx] = oh
  t.score[idx] = best
  t.flag[idx] = best <= alpha0 ? F_UPPER : best >= beta ? F_LOWER : F_EXACT
  t.move[idx] = bestMove
  return best
}

/** Exact solve at the root; null when the deadline passed first. */
function solveRoot(pl: number, ph: number, ol: number, oh: number, moves: number[], empties: number, first = -1): { move: number; score: number } | null {
  if (!solveTable) solveTable = makeTable(SOLVE_BITS)
  else solveTable.k0.fill(0)
  // fastest-first at the root too
  const keyed = moves.map((s) => {
    genFlips(pl, ph, ol, oh, s)
    const fl = OUT[0]
    const fh = OUT[1]
    genMoves(ol & ~fl, oh & ~fh, pl | fl | BIT_LO[s], ph | fh | BIT_HI[s])
    // corners first, so they win ties (moves only replace the best on a strictly better margin)
    const k = IS_CORNER[s] ? 1 << 29 : s === first ? 1 << 28 : 0
    return { s, k: k + SQ_SIMPLE[s] * 2 - 40 * (pop32(OUT[0]) + pop32(OUT[1])) }
  })
  keyed.sort((a, b) => b.k - a.k)
  let alpha = -65
  let best = -1
  for (let i = 0; i < keyed.length; i++) {
    const s = keyed[i].s
    genFlips(pl, ph, ol, oh, s)
    const fl = OUT[0]
    const fh = OUT[1]
    const npl = pl | fl | BIT_LO[s]
    const nph = ph | fh | BIT_HI[s]
    const nol = ol & ~fl
    const noh = oh & ~fh
    let v: number
    if (i === 0) {
      v = -solveDeep(nol, noh, npl, nph, -65, 65, empties - 1, 1)
    } else {
      v = -solveDeep(nol, noh, npl, nph, -alpha - 1, -alpha, empties - 1, 1)
      if (!stopped && v > alpha) v = -solveDeep(nol, noh, npl, nph, -65, -alpha, empties - 1, 1)
    }
    if (stopped) return null
    if (v > alpha) {
      alpha = v
      best = s
    }
  }
  return { move: best, score: alpha }
}

/** Perfect-play final disc margin for the side to move (for tests; no time limit). */
export function solveExact(p: Position): number {
  const [pl, ph, ol, oh] = sideBits(p)
  nodes = 0
  stopped = false
  deadline = Infinity
  if (!solveTable) solveTable = makeTable(SOLVE_BITS)
  else solveTable.k0.fill(0)
  const empties = 64 - pop32(pl | ol) - pop32(ph | oh)
  return solveDeep(pl, ph, ol, oh, -65, 65, empties, 0)
}

// ─── Entry point ───────────────────────────────────────────────

function shuffled(xs: number[], rng: () => number): number[] {
  const a = xs.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

/** Pick a move for the side to move. The side must have at least one legal move. */
export function chooseMove(p: Position, opts: AiOptions): AiResult {
  const t0 = now()
  const rng = opts.random ?? Math.random
  const [pl, ph, ol, oh] = sideBits(p)
  genMoves(pl, ph, ol, oh)
  // random order among equals so games vary
  const moves = shuffled(bitsToSquares(OUT[0], OUT[1]), rng)
  if (moves.length === 0) throw new Error("No legal move")
  nodes = 0
  stopped = false
  deadline = Infinity
  const empties = 64 - pop32(pl | ol) - pop32(ph | oh)
  const done = (move: number, score: number, depth: number, exact: boolean): AiResult =>
    ({ move, score, depth, nodes, ms: now() - t0, exact })

  if (moves.length === 1) return done(moves[0], 0, 0, false)

  if (opts.level === "easy") {
    let best = moves[0]
    let bestV = -Infinity
    for (const s of moves) {
      genFlips(pl, ph, ol, oh, s)
      const flips = pop32(OUT[0]) + pop32(OUT[1])
      const v = SQ_SIMPLE[s] * 0.6 + flips * 3 + rng() * 70
      if (v > bestV) {
        bestV = v
        best = s
      }
    }
    return done(best, Math.round(bestV), 1, false)
  }

  if (opts.level === "medium") {
    fullEval = false
    selectTable(0)
    const r = searchRoot(pl, ph, ol, oh, moves, opts.maxDepth ?? 4, empties, t0, Infinity)
    return done(r.move, r.score, r.depth, false)
  }

  // hard
  fullEval = true
  selectTable(1)
  const budget = opts.timeMs ?? 1000
  const solveAt = opts.solveEmpties ?? 14
  const maxDepth = opts.maxDepth ?? 60
  if (empties <= solveAt) {
    if (empties > 10) {
      // a quick midgame search first, so there is a sound move if the solve runs out of time
      deadline = t0 + budget * 0.35
      const mid = searchRoot(pl, ph, ol, oh, moves, maxDepth, empties, t0, budget * 0.35)
      stopped = false
      deadline = t0 + budget
      const ex = solveRoot(pl, ph, ol, oh, moves, empties, mid.move)
      if (ex) return done(ex.move, ex.score, empties, true)
      return done(mid.move, mid.score, mid.depth, false)
    }
    deadline = t0 + budget
    const ex = solveRoot(pl, ph, ol, oh, moves, empties)
    if (ex) return done(ex.move, ex.score, empties, true)
    stopped = false
    deadline = now() + 150
  } else {
    deadline = t0 + budget
  }
  const r = searchRoot(pl, ph, ol, oh, moves, maxDepth, empties, t0, budget)
  return done(r.move, r.score, r.depth, false)
}
