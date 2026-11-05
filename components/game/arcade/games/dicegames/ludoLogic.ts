// ============================================================
// Ludo — pure game logic (no React).
//
// Board: 15 x 15 grid, (col, row) with row 0 at the top.
// Bases: green top-left, yellow top-right, blue bottom-right,
// red bottom-left. Play runs clockwise: red → green → yellow → blue.
//
// Token progress is stored relative to its own colour:
//   -1        in base
//    0 .. 50  on the shared 52-square track (0 = own start square)
//   51 .. 55  own home column
//   56        home (centre)
// ============================================================

export type LudoColor = "red" | "green" | "yellow" | "blue"
export type Difficulty = "easy" | "medium" | "hard"

export const TURN_ORDER: LudoColor[] = ["red", "green", "yellow", "blue"]

export const BASE = -1
export const LAST_TRACK = 50
export const HOME = 56
export const TRACK_LEN = 52

type Cell = [col: number, row: number]

function seg(from: Cell, dx: number, dy: number, n: number): Cell[] {
  return Array.from({ length: n }, (_, i) => [from[0] + dx * i, from[1] + dy * i] as Cell)
}

/** The 52 shared squares, clockwise, starting at green's start square. */
export const TRACK: Cell[] = [
  ...seg([1, 6], 1, 0, 5),    //  0- 4 left arm, top row →
  ...seg([6, 5], 0, -1, 6),   //  5-10 top arm, left column ↑
  [7, 0],                     // 11
  ...seg([8, 0], 0, 1, 6),    // 12-17 top arm, right column ↓
  ...seg([9, 6], 1, 0, 6),    // 18-23 right arm, top row →
  [14, 7],                    // 24
  ...seg([14, 8], -1, 0, 6),  // 25-30 right arm, bottom row ←
  ...seg([8, 9], 0, 1, 6),    // 31-36 bottom arm, right column ↓
  [7, 14],                    // 37
  ...seg([6, 14], 0, -1, 6),  // 38-43 bottom arm, left column ↑
  ...seg([5, 8], -1, 0, 6),   // 44-49 left arm, bottom row ←
  [0, 7],                     // 50
  [0, 6],                     // 51
]

export const START_INDEX: Record<LudoColor, number> = { green: 0, yellow: 13, blue: 26, red: 39 }

/** Home column cells, outer → inner. */
export const HOME_COLUMN: Record<LudoColor, Cell[]> = {
  green:  seg([1, 7], 1, 0, 5),
  yellow: seg([7, 1], 0, 1, 5),
  blue:   seg([13, 7], -1, 0, 5),
  red:    seg([7, 13], 0, -1, 5),
}

/** Top-left cell of each 6x6 base. */
export const BASE_ORIGIN: Record<LudoColor, Cell> = { green: [0, 0], yellow: [9, 0], blue: [9, 9], red: [0, 9] }

export const STAR_INDICES = [8, 21, 34, 47]
export const SAFE_INDICES = new Set<number>([...Object.values(START_INDEX), ...STAR_INDICES])

export function isSafe(abs: number): boolean {
  return SAFE_INDICES.has(abs)
}

/** Track index (0..51) of a token at relative progress `rel` (0..50); null otherwise. */
export function absIndex(color: LudoColor, rel: number): number | null {
  if (rel < 0 || rel > LAST_TRACK) return null
  return (START_INDEX[color] + rel) % TRACK_LEN
}

/** Grid cell of a token not in base / not home. */
export function tokenCell(color: LudoColor, rel: number): Cell | null {
  const a = absIndex(color, rel)
  if (a != null) return TRACK[a]
  if (rel > LAST_TRACK && rel < HOME) return HOME_COLUMN[color][rel - LAST_TRACK - 1]
  return null
}

// ─── State ────────────────────────────────────────────────────

export interface LudoSide {
  color:  LudoColor
  tokens: number[]   // 4 relative positions
}

export type LudoState = LudoSide[]

export function newState(colors: LudoColor[]): LudoState {
  return colors.map((color) => ({ color, tokens: [BASE, BASE, BASE, BASE] }))
}

export function cloneState(s: LudoState): LudoState {
  return s.map((p) => ({ color: p.color, tokens: p.tokens.slice() }))
}

export function hasFinished(side: LudoSide): boolean {
  return side.tokens.every((t) => t === HOME)
}

export function tokensHome(side: LudoSide): number {
  return side.tokens.filter((t) => t === HOME).length
}

/** Destination of a token for a roll, or null when it cannot move. */
export function destination(rel: number, roll: number): number | null {
  if (rel === BASE) return roll === 6 ? 0 : null
  if (rel >= HOME) return null
  const to = rel + roll
  return to <= HOME ? to : null
}

/** Tokens (indexes) of side `pi` that may move with this roll. */
export function legalTokens(state: LudoState, pi: number, roll: number): number[] {
  const out: number[] = []
  state[pi].tokens.forEach((rel, ti) => { if (destination(rel, roll) != null) out.push(ti) })
  return out
}

/** Legal tokens with duplicates (same position = same outcome) removed. */
export function distinctMoves(state: LudoState, pi: number, roll: number): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const ti of legalTokens(state, pi, roll)) {
    const rel = state[pi].tokens[ti]
    if (seen.has(rel)) continue
    seen.add(rel)
    out.push(ti)
  }
  return out
}

export interface Occupant { pi: number; ti: number; rel: number }

/** Opposing tokens on a track square. */
export function opponentsAt(state: LudoState, pi: number, abs: number): Occupant[] {
  const out: Occupant[] = []
  state.forEach((side, pj) => {
    if (pj === pi) return
    side.tokens.forEach((rel, ti) => {
      if (absIndex(side.color, rel) === abs) out.push({ pi: pj, ti, rel })
    })
  })
  return out
}

export interface MoveResult {
  state:       LudoState
  from:        number
  to:          number
  captured:    Occupant[]
  reachedHome: boolean
  /** this move brought the side's 4th token home */
  finished:    boolean
}

/** Apply a legal move. Throws on an illegal one. */
export function applyMove(state: LudoState, pi: number, ti: number, roll: number): MoveResult {
  const from = state[pi].tokens[ti]
  const to = destination(from, roll)
  if (to == null) throw new Error(`illegal move: side ${pi} token ${ti} rel ${from} roll ${roll}`)
  const next = cloneState(state)
  next[pi].tokens[ti] = to
  const captured: Occupant[] = []
  const abs = absIndex(next[pi].color, to)
  if (abs != null && !isSafe(abs)) {
    for (const o of opponentsAt(next, pi, abs)) {
      captured.push(o)
      next[o.pi].tokens[o.ti] = BASE
    }
  }
  const reachedHome = to === HOME
  return { state: next, from, to, captured, reachedHome, finished: reachedHome && hasFinished(next[pi]) }
}

/** Does this move earn another roll? (a 6, a capture, or a token reaching home — unless the side just finished) */
export function earnsBonusRoll(roll: number, res: Pick<MoveResult, "captured" | "reachedHome" | "finished">): boolean {
  if (res.finished) return false
  return roll === 6 || res.captured.length > 0 || res.reachedHome
}

/** Three sixes in a row forfeit the turn. `sixes` counts the current roll too. */
export function isTripleSix(sixes: number): boolean {
  return sixes >= 3
}

// ─── Bots ─────────────────────────────────────────────────────

/**
 * Rough chance that some opponent can land on track square `abs` on their next turn.
 * Tokens 1..6 behind count 1/6, 7..12 behind 1/36 (a six then the rest), and a side
 * with tokens in base threatens squares 1..6 past its start at 1/36.
 */
export function threatAt(state: LudoState, pi: number, abs: number): number {
  if (isSafe(abs)) return 0
  let p = 0
  state.forEach((side, pj) => {
    if (pj === pi || hasFinished(side)) return
    let baseCounted = false
    for (const rel of side.tokens) {
      if (rel === BASE) {
        if (baseCounted) continue
        baseCounted = true
        const d = (abs - START_INDEX[side.color] + TRACK_LEN) % TRACK_LEN
        if (d >= 1 && d <= 6) p += 1 / 36
        continue
      }
      const oa = absIndex(side.color, rel)
      if (oa == null) continue
      const d = (abs - oa + TRACK_LEN) % TRACK_LEN
      if (d === 0 || rel + d > LAST_TRACK) continue
      if (d <= 6) p += 1 / 6
      else if (d <= 12) p += 1 / 36
    }
  })
  return Math.min(1, p)
}

/** Simple danger check used by the medium bot: any opponent 1..6 squares behind. */
function inDangerSimple(state: LudoState, pi: number, abs: number): boolean {
  if (isSafe(abs)) return false
  return state.some((side, pj) => pj !== pi && side.tokens.some((rel) => {
    const oa = absIndex(side.color, rel)
    if (oa == null) return false
    const d = (abs - oa + TRACK_LEN) % TRACK_LEN
    return d >= 1 && d <= 6 && rel + d <= LAST_TRACK
  }))
}

function capturesOf(state: LudoState, pi: number, ti: number, roll: number): Occupant[] {
  const to = destination(state[pi].tokens[ti], roll)
  if (to == null) return []
  const abs = absIndex(state[pi].color, to)
  if (abs == null || isSafe(abs)) return []
  return opponentsAt(state, pi, abs)
}

/** Heuristic value of a move for the hard bot (higher is better). */
export function evaluateMove(state: LudoState, pi: number, ti: number, roll: number): number {
  const color = state[pi].color
  const from = state[pi].tokens[ti]
  const to = destination(from, roll)
  if (to == null) return -Infinity
  let score = 0
  if (from === BASE) score += 30
  else score += to - from
  if (to === HOME) score += 55
  else if (to > LAST_TRACK && from <= LAST_TRACK) score += 22

  for (const v of capturesOf(state, pi, ti, roll)) score += 45 + v.rel * 0.9

  const res = applyMove(state, pi, ti, roll)
  const fromAbs = absIndex(color, from)
  const toAbs = absIndex(color, to)
  if (fromAbs != null && !isSafe(fromAbs)) score += threatAt(state, pi, fromAbs) * (from + 8) * 1.7
  if (toAbs != null) {
    if (isSafe(toAbs)) score += 6
    else score -= threatAt(res.state, pi, toAbs) * (to + 8) * 1.7
    // lining up a capture for next turn
    for (const [pj, side] of res.state.entries()) {
      if (pj === pi) continue
      for (const rel of side.tokens) {
        const oa = absIndex(side.color, rel)
        if (oa == null || isSafe(oa)) continue
        const d = (oa - toAbs + TRACK_LEN) % TRACK_LEN
        if (d >= 1 && d <= 6 && to + d <= LAST_TRACK) score += 2 + rel * 0.05
      }
    }
  }
  return score
}

/** Pick a token for a bot. Always returns a legal token index. */
export function chooseMove(state: LudoState, pi: number, roll: number, difficulty: Difficulty, rng: () => number): number {
  const legal = legalTokens(state, pi, roll)
  if (legal.length === 0) throw new Error("no legal move")
  if (legal.length === 1) return legal[0]
  const pickRandom = (xs: number[]) => xs[Math.floor(rng() * xs.length)]

  if (difficulty === "easy") return pickRandom(legal)

  if (difficulty === "medium") {
    const color = state[pi].color
    const tokens = state[pi].tokens
    // 1. capture the most advanced rival
    let best = -1
    let bestRel = -1
    for (const ti of legal) {
      for (const v of capturesOf(state, pi, ti, roll)) if (v.rel > bestRel) { best = ti; bestRel = v.rel }
    }
    if (best >= 0) return best
    // 2. bring a token home
    const home = legal.find((ti) => destination(tokens[ti], roll) === HOME)
    if (home != null) return home
    // 3. get out of base
    const out = legal.find((ti) => tokens[ti] === BASE)
    if (out != null) return out
    // 4. escape danger to a square that is not threatened
    const escapes = legal.filter((ti) => {
      const a = absIndex(color, tokens[ti])
      if (a == null || !inDangerSimple(state, pi, a)) return false
      const to = destination(tokens[ti], roll)!
      const b = absIndex(color, to)
      return b == null || !inDangerSimple(state, pi, b)
    })
    if (escapes.length) return escapes.reduce((m, ti) => (tokens[ti] > tokens[m] ? ti : m))
    // 5. land somewhere safe (safe square or home column)
    const safe = legal.filter((ti) => {
      const to = destination(tokens[ti], roll)!
      const b = absIndex(color, to)
      return b == null ? to > LAST_TRACK && tokens[ti] <= LAST_TRACK : isSafe(b)
    })
    if (safe.length) return pickRandom(safe)
    // 6. otherwise advance the leading token that is still on the shared track
    const onTrack = legal.filter((ti) => tokens[ti] >= 0 && tokens[ti] <= LAST_TRACK)
    const pool = onTrack.length ? onTrack : legal
    return pool.reduce((m, ti) => (tokens[ti] > tokens[m] ? ti : m))
  }

  // hard
  let bestTi = legal[0]
  let bestScore = -Infinity
  for (const ti of legal) {
    const s = evaluateMove(state, pi, ti, roll) + rng() * 0.01
    if (s > bestScore) { bestScore = s; bestTi = ti }
  }
  return bestTi
}

// ─── Scoring ──────────────────────────────────────────────────

export const CAPTURE_POINTS = 25
export const HOME_POINTS = 15

/** Points for finishing `place` (1-based) in a game of `players`. */
export function placePoints(place: number, players: number): number {
  if (place === 1) return 300 + 100 * (players - 1)
  if (place === players) return 0
  return place === 2 ? 200 : 100
}

/** Final score: (place points + 25 per capture + 15 per token home) × difficulty multiplier. */
export function ludoScore(opts: { place: number | null; players: number; captures: number; home: number; multiplier: number }): number {
  const base = (opts.place != null ? placePoints(opts.place, opts.players) : 0)
    + opts.captures * CAPTURE_POINTS + opts.home * HOME_POINTS
  return Math.round(base * opts.multiplier)
}

/** Total progress of a side (0..224), used to rank unfinished sides. */
export function progressOf(side: LudoSide): number {
  return side.tokens.reduce((s, t) => s + (t === BASE ? 0 : t + 1), 0)
}
