// ============================================================
// Checkers computer opponent — negamax alpha-beta (PVS) with
// iterative deepening, a Zobrist transposition table, killer +
// history move ordering, forced-capture quiescence, a threat
// extension and single-reply extension. Pure TS, no React.
// ============================================================

import {
  BLACK, BLACK_KING, BLACK_MAN, COL, DRAW_PLIES, EMPTY, ROW, STEP, WHITE, WHITE_KING, WHITE_MAN,
  Z_HI, Z_LO, Z_SIDE_HI, Z_SIDE_LO,
  generateMoves, hasCapture, hashBoard, isIrreversible, isKing, legalMoves,
  type Hash, type Move, type Position, type Side,
} from "./checkers"

export type Level = "easy" | "medium" | "hard"

export interface AiOptions {
  level: Level
  /** position hashes since the last irreversible move, oldest first, excluding the current position */
  history?: readonly Hash[]
  /** override the time budget in ms */
  timeMs?: number
  /** override the maximum depth */
  maxDepth?: number
  random?: () => number
}

export interface AiResult {
  move: Move
  score: number
  /** last fully completed iteration depth */
  depth: number
  nodes: number
  ms: number
}

const MATE = 30000
const INF = 32000
const MATE_BOUND = MATE - 1000
const MAX_PLY = 128

const MAN_VALUE = 100
const KING_VALUE = 145

const TT_BITS = 18
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const F_EXACT = 1
const F_LOWER = 2
const F_UPPER = 3

interface Table {
  lo: Int32Array
  hi: Int32Array
  score: Int16Array
  depth: Int8Array
  flag: Uint8Array
  move: Int8Array
}
let table: Table | null = null
function getTable(): Table {
  if (!table) {
    table = {
      lo: new Int32Array(TT_SIZE),
      hi: new Int32Array(TT_SIZE),
      score: new Int16Array(TT_SIZE),
      depth: new Int8Array(TT_SIZE),
      flag: new Uint8Array(TT_SIZE),
      move: new Int8Array(TT_SIZE),
    }
  }
  return table
}

// ─── Evaluation tables ─────────────────────────────────────────

/** Men advancement bonus by rows advanced (0 = home row). */
const ADV = [0, 1, 3, 5, 8, 12, 17]
const MEN_CENTRE = new Int8Array(32)
const KING_POS = new Int8Array(32)
const DIST = new Int8Array(32 * 32)
for (let s = 0; s < 32; s++) {
  const r = ROW[s]
  const c = COL[s]
  MEN_CENTRE[s] = r >= 3 && r <= 4 && c >= 2 && c <= 5 ? 5 : (r >= 2 && r <= 5 && c >= 1 && c <= 6 ? 2 : 0)
  const edge = r === 0 || r === 7 || c === 0 || c === 7
  KING_POS[s] = r >= 2 && r <= 5 && c >= 2 && c <= 5 ? 8 : edge ? -6 : 2
  for (let t = 0; t < 32; t++) DIST[s * 32 + t] = Math.max(Math.abs(r - ROW[t]), Math.abs(c - COL[t]))
}
// Back-row guards: the "bridge" (c1 + g1 for Black, b8 + f8 for White) is the strongest.
const GUARD_BLACK = new Int8Array(32)
const GUARD_WHITE = new Int8Array(32)
GUARD_BLACK[29] = 12; GUARD_BLACK[31] = 12; GUARD_BLACK[28] = 5; GUARD_BLACK[30] = 6
for (let s = 0; s < 32; s++) GUARD_WHITE[31 - s] = GUARD_BLACK[s]

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

class Engine {
  b: Int8Array
  side: Side
  lo: number
  hi: number
  quiet: number
  nodes = 0
  deadline = Infinity
  stopped = false
  ext: number
  // hash history (game history + search path); repBase = index of root
  repLo: Int32Array
  repHi: Int32Array
  repBase: number
  quietStack = new Int32Array(MAX_PLY + 2)
  killers = new Int32Array(MAX_PLY * 2).fill(-1)
  hist = new Int32Array(32 * 32)
  tt = getTable()

  constructor(pos: Position, history: readonly Hash[], ext: number) {
    this.b = Int8Array.from(pos.board)
    this.side = pos.turn
    const [lo, hi] = hashBoard(pos.board, pos.turn)
    this.lo = lo
    this.hi = hi
    this.quiet = pos.quiet
    this.ext = ext
    // only the positions inside the reversible window can repeat
    const usable = history.slice(Math.max(0, history.length - pos.quiet))
    this.repBase = usable.length
    this.repLo = new Int32Array(usable.length + MAX_PLY + 2)
    this.repHi = new Int32Array(usable.length + MAX_PLY + 2)
    usable.forEach((h, i) => { this.repLo[i] = h[0]; this.repHi[i] = h[1] })
    // the root slot: unmake() at ply 0 restores the root hash from here
    this.repLo[this.repBase] = lo
    this.repHi[this.repBase] = hi
  }

  make(m: Move, ply: number) {
    const b = this.b
    let lo = this.lo
    let hi = this.hi
    b[m.from] = EMPTY
    lo ^= Z_LO[m.piece * 32 + m.from]
    hi ^= Z_HI[m.piece * 32 + m.from]
    for (let i = 0; i < m.caps.length; i++) {
      const c = m.caps[i]
      const v = m.capVals[i]
      b[c] = EMPTY
      lo ^= Z_LO[v * 32 + c]
      hi ^= Z_HI[v * 32 + c]
    }
    const np = m.promote ? m.piece + 1 : m.piece
    b[m.to] = np
    lo ^= Z_LO[np * 32 + m.to] ^ Z_SIDE_LO
    hi ^= Z_HI[np * 32 + m.to] ^ Z_SIDE_HI
    this.lo = lo
    this.hi = hi
    this.side = this.side === BLACK ? 1 : 0
    this.quietStack[ply] = this.quiet
    this.quiet = isIrreversible(m) ? 0 : this.quiet + 1
  }

  unmake(m: Move, ply: number) {
    const b = this.b
    b[m.to] = EMPTY
    for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.capVals[i]
    b[m.from] = m.piece
    this.side = this.side === BLACK ? 1 : 0
    this.quiet = this.quietStack[ply]
    this.lo = this.repLo[this.repBase + ply]
    this.hi = this.repHi[this.repBase + ply]
  }

  /** Static evaluation from the side to move's point of view. */
  evaluate(): number {
    const b = this.b
    let bm = 0, bk = 0, wm = 0, wk = 0
    for (let s = 0; s < 32; s++) {
      const v = b[s]
      if (v === BLACK_MAN) bm++
      else if (v === BLACK_KING) bk++
      else if (v === WHITE_MAN) wm++
      else if (v === WHITE_KING) wk++
    }
    const total = bm + bk + wm + wk
    const endgame = total <= 10
    const advMul = endgame ? 2 : 1
    const guardB = wm > 0 && total > 8
    const guardW = bm > 0 && total > 8
    const matB = bm * MAN_VALUE + bk * KING_VALUE
    const matW = wm * MAN_VALUE + wk * KING_VALUE
    let score = matB - matW

    for (let s = 0; s < 32; s++) {
      const v = b[s]
      if (v === EMPTY) continue
      if (v === BLACK_MAN) {
        score += ADV[7 - ROW[s]] * advMul + MEN_CENTRE[s]
        if (guardB) score += GUARD_BLACK[s]
      } else if (v === WHITE_MAN) {
        score -= ADV[ROW[s]] * advMul + MEN_CENTRE[s]
        if (guardW) score -= GUARD_WHITE[s]
      } else {
        // king: position + mobility
        let mob = 0
        for (let d = 0; d < 4; d++) {
          const t = STEP[s * 4 + d]
          if (t >= 0 && b[t] === EMPTY) mob++
        }
        const k = KING_POS[s] + mob * 2
        score += v === BLACK_KING ? k : -k
      }
    }

    // When ahead, trade down: the same lead is worth more with fewer pieces.
    if (matB !== matW) score += Math.trunc(((matB - matW) * (24 - total)) / 32)

    // Endgame technique: the stronger side's kings close in on the enemy.
    if (total <= 12) {
      if (matB >= matW + 50 && bk > 0) score -= this.approach(BLACK_KING, WHITE)
      else if (matW >= matB + 50 && wk > 0) score += this.approach(WHITE_KING, BLACK)
    }

    return this.side === BLACK ? score : -score
  }

  /** Sum over kings of `kingCode` of the distance to the nearest enemy piece, weighted. */
  approach(kingCode: number, enemy: Side): number {
    const b = this.b
    let sum = 0
    for (let s = 0; s < 32; s++) {
      if (b[s] !== kingCode) continue
      let best = 8
      for (let t = 0; t < 32; t++) {
        const v = b[t]
        if (v === EMPTY) continue
        if ((enemy === BLACK) !== (v <= BLACK_KING)) continue
        const d = DIST[s * 32 + t]
        if (d < best) best = d
      }
      sum += best * 4
    }
    return sum
  }

  search(depth: number, alpha: number, beta: number, ply: number, ext: number): number {
    this.nodes++
    if ((this.nodes & 1023) === 0 && now() >= this.deadline) this.stopped = true
    if (this.stopped) return 0

    const idx = this.repBase + ply
    const lo = this.lo
    const hi = this.hi
    this.repLo[idx] = lo
    this.repHi[idx] = hi

    if (ply > 0) {
      if (this.quiet >= DRAW_PLIES) return 0
      const lim = Math.max(0, idx - this.quiet)
      for (let i = idx - 2; i >= lim; i -= 2) {
        if (this.repLo[i] === lo && this.repHi[i] === hi) return 0
      }
    }

    const tt = this.tt
    const slot = lo & TT_MASK
    let ttIdx = -1
    if (tt.flag[slot] !== 0 && tt.lo[slot] === lo && tt.hi[slot] === hi) {
      ttIdx = tt.move[slot]
      if (ply > 0 && tt.depth[slot] >= depth) {
        let s = tt.score[slot]
        if (s > MATE_BOUND) s -= ply
        else if (s < -MATE_BOUND) s += ply
        const f = tt.flag[slot]
        if (f === F_EXACT) return s
        if (f === F_LOWER && s >= beta) return s
        if (f === F_UPPER && s <= alpha) return s
      }
    }

    const moves = generateMoves(this.b, this.side)
    const n = moves.length
    if (n === 0) return -MATE + ply
    const capturing = moves[0].caps.length > 0

    if (depth <= 0 && !capturing) {
      // Quiet position at the horizon: stop, unless the opponent threatens a capture.
      if (ext > 0 && hasCapture(this.b, this.side === BLACK ? 1 : 0)) {
        depth = 1
        ext--
      } else {
        return this.evaluate()
      }
    }
    if (ply >= MAX_PLY - 2) return this.evaluate()

    // Move ordering
    const scores = new Int32Array(n)
    const orig = new Int8Array(n)
    const k1 = this.killers[ply * 2]
    const k2 = this.killers[ply * 2 + 1]
    for (let i = 0; i < n; i++) {
      const m = moves[i]
      let sc: number
      if (i === ttIdx) sc = 1 << 30
      else if (capturing) {
        let kings = 0
        for (let j = 0; j < m.capVals.length; j++) if (isKing(m.capVals[j])) kings++
        sc = 1_000_000 + m.caps.length * 1000 + kings * 300 + (m.promote ? 200 : 0)
      } else {
        const key = m.from * 32 + m.to
        if (m.promote) sc = 900_000
        else if (key === k1) sc = 800_000
        else if (key === k2) sc = 790_000
        else sc = this.hist[key]
      }
      scores[i] = sc
      orig[i] = i
    }

    const childDepth = n === 1 && ply < 60 ? depth : depth - 1
    const alpha0 = alpha
    let best = -INF
    let bestIdx = 0
    for (let k = 0; k < n; k++) {
      // selection sort step
      let bi = k
      for (let j = k + 1; j < n; j++) if (scores[j] > scores[bi]) bi = j
      if (bi !== k) {
        const tm = moves[k]; moves[k] = moves[bi]; moves[bi] = tm
        const ts = scores[k]; scores[k] = scores[bi]; scores[bi] = ts
        const to = orig[k]; orig[k] = orig[bi]; orig[bi] = to
      }
      const m = moves[k]
      this.make(m, ply)
      let score: number
      if (k === 0) {
        score = -this.search(childDepth, -beta, -alpha, ply + 1, ext)
      } else {
        score = -this.search(childDepth, -alpha - 1, -alpha, ply + 1, ext)
        if (score > alpha && score < beta && !this.stopped) score = -this.search(childDepth, -beta, -alpha, ply + 1, ext)
      }
      this.unmake(m, ply)
      if (this.stopped) return 0
      if (score > best) {
        best = score
        bestIdx = k
        if (score > alpha) {
          alpha = score
          if (alpha >= beta) {
            if (!capturing) {
              const key = m.from * 32 + m.to
              if (key !== this.killers[ply * 2]) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2]
                this.killers[ply * 2] = key
              }
              this.hist[key] += depth * depth + 1
            }
            break
          }
        }
      }
    }

    if (depth >= 0) {
      // Remember the index in generation order (generation is deterministic per position).
      let s = best
      if (s > MATE_BOUND) s += ply
      else if (s < -MATE_BOUND) s -= ply
      tt.lo[slot] = lo
      tt.hi[slot] = hi
      tt.score[slot] = s
      tt.depth[slot] = Math.min(depth, 127)
      tt.flag[slot] = best <= alpha0 ? F_UPPER : best >= beta ? F_LOWER : F_EXACT
      tt.move[slot] = orig[bestIdx]
    }
    return best
  }
}

function shuffleInPlace<T>(a: T[], rnd: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
}

const SETTINGS: Record<Level, { depth: number; timeMs: number; ext: number }> = {
  easy:   { depth: 2,  timeMs: 400,  ext: 1 },
  medium: { depth: 6,  timeMs: 1200, ext: 2 },
  hard:   { depth: 40, timeMs: 1000, ext: 2 },
}

/** Pick the computer's move for the side to move in `pos`. */
export function chooseMove(pos: Position, opts: AiOptions): AiResult {
  const t0 = now()
  const rnd = opts.random ?? Math.random
  const cfg = SETTINGS[opts.level]
  const maxDepth = opts.maxDepth ?? cfg.depth
  const budget = opts.timeMs ?? cfg.timeMs
  const rootMoves = legalMoves(pos)
  if (rootMoves.length === 0) throw new Error("chooseMove: no legal moves")
  if (rootMoves.length === 1) return { move: rootMoves[0], score: 0, depth: 0, nodes: 0, ms: now() - t0 }

  const eng = new Engine(pos, opts.history ?? [], cfg.ext)
  eng.deadline = t0 + budget
  shuffleInPlace(rootMoves, rnd)

  // Easy: exact score for every root move at a shallow depth, then noise.
  if (opts.level === "easy") {
    let best = rootMoves[0]
    let bestScore = -Infinity
    let rawBest = 0
    for (const m of rootMoves) {
      eng.make(m, 0)
      const s = -eng.search(maxDepth - 1, -INF, INF, 1, cfg.ext)
      eng.unmake(m, 0)
      const noisy = s + (rnd() - 0.5) * 140
      if (noisy > bestScore) { bestScore = noisy; best = m; rawBest = s }
    }
    // now and then just play something plausible at random
    if (rnd() < 0.12) best = rootMoves[Math.floor(rnd() * rootMoves.length)]
    return { move: best, score: rawBest, depth: maxDepth, nodes: eng.nodes, ms: now() - t0 }
  }

  // Medium / Hard: iterative deepening PVS at the root.
  const order = rootMoves.map((m, i) => ({ m, score: -INF, i }))
  // captures with more pieces first for the first iteration
  order.sort((a, b) => b.m.caps.length - a.m.caps.length)
  let bestMove = order[0].m
  let bestScore = 0
  let completed = 0
  for (let depth = 1; depth <= maxDepth; depth++) {
    let alpha = -INF
    const beta = INF
    let iterBest: Move | null = null
    let iterScore = -INF
    for (let k = 0; k < order.length; k++) {
      const entry = order[k]
      eng.make(entry.m, 0)
      let s: number
      if (k === 0) s = -eng.search(depth - 1, -beta, -alpha, 1, cfg.ext)
      else {
        s = -eng.search(depth - 1, -alpha - 1, -alpha, 1, cfg.ext)
        if (s > alpha && !eng.stopped) s = -eng.search(depth - 1, -beta, -alpha, 1, cfg.ext)
      }
      eng.unmake(entry.m, 0)
      if (eng.stopped) break
      entry.score = k === 0 || s > alpha ? s : -INF + 1 + (order.length - k)
      if (s > iterScore) { iterScore = s; iterBest = entry.m }
      if (s > alpha) alpha = s
    }
    if (eng.stopped) {
      // keep a partially searched iteration's move only if it beat the previous best outright
      if (iterBest && iterBest !== bestMove && iterScore > bestScore + 20) { bestMove = iterBest; bestScore = iterScore }
      break
    }
    if (iterBest) { bestMove = iterBest; bestScore = iterScore }
    completed = depth
    // PV move first, then by this iteration's scores
    order.sort((a, b) => (a.m === bestMove ? -1 : b.m === bestMove ? 1 : b.score - a.score))
    if (Math.abs(bestScore) > MATE_BOUND) break
    if (now() - t0 > budget * 0.45) break
  }
  return { move: bestMove, score: bestScore, depth: completed, nodes: eng.nodes, ms: now() - t0 }
}
