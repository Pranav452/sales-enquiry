// ============================================================
// Reversi / Othello rules on 64-bit bitboards stored as two
// 32-bit halves (no BigInt). Square s = row * 8 + col, row 0 is
// rank 8 (top of the board), col 0 is file a. `lo` holds squares
// 0-31, `hi` squares 32-63. Pure TS, no React.
// ============================================================

export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2
export type Side = 1 | 2
export type Cell = 0 | 1 | 2

export const other = (s: Side): Side => (s === BLACK ? WHITE : BLACK)

/** Immutable position: black/white bitboards plus the side to move. */
export interface Position {
  readonly bl: number
  readonly bh: number
  readonly wl: number
  readonly wh: number
  readonly turn: Side
}

// ─── Bit helpers ───────────────────────────────────────────────

/** Single-square masks: BIT_LO[s] is set for s < 32, BIT_HI[s] for s >= 32. */
export const BIT_LO = new Int32Array(64)
export const BIT_HI = new Int32Array(64)
for (let s = 0; s < 64; s++) {
  if (s < 32) BIT_LO[s] = 1 << s
  else BIT_HI[s] = 1 << (s - 32)
}

/** Scratch output for the bitboard routines: [lo, hi]. Read it immediately after a call. */
export const OUT = new Int32Array(2)

export function pop32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555)
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333)
  return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24
}

export const rowOf = (s: number) => s >> 3
export const colOf = (s: number) => s & 7
export function squareName(s: number): string {
  return "abcdefgh"[s & 7] + String(8 - (s >> 3))
}

/** Squares of a two-half bitboard in ascending order. */
export function bitsToSquares(lo: number, hi: number): number[] {
  const out: number[] = []
  let x = lo
  while (x) {
    const b = x & -x
    x ^= b
    out.push(31 - Math.clz32(b))
  }
  x = hi
  while (x) {
    const b = x & -x
    x ^= b
    out.push(63 - Math.clz32(b))
  }
  return out
}

// ─── Move generation (dumb7fill in the 8 directions) ───────────

/** Columns b-g: stops horizontal and diagonal runs wrapping round the board edge. */
const INNER = 0x7e7e7e7e

let SL = 0
let SH = 0

/** Run of `m` bits reached from `p` stepping +n squares, then one more step (landing squares). */
function runUp(pl: number, ph: number, ml: number, mh: number, n: number): void {
  const r = 32 - n
  let xl = (pl << n) & ml
  let xh = ((ph << n) | (pl >>> r)) & mh
  for (let i = 0; i < 5; i++) {
    const tl = (xl << n) & ml
    const th = ((xh << n) | (xl >>> r)) & mh
    xl |= tl
    xh |= th
  }
  SL = xl << n
  SH = (xh << n) | (xl >>> r)
}

/** As runUp, stepping -n squares. */
function runDown(pl: number, ph: number, ml: number, mh: number, n: number): void {
  const r = 32 - n
  let xl = ((pl >>> n) | (ph << r)) & ml
  let xh = (ph >>> n) & mh
  for (let i = 0; i < 5; i++) {
    const tl = ((xl >>> n) | (xh << r)) & ml
    const th = (xh >>> n) & mh
    xl |= tl
    xh |= th
  }
  SL = (xl >>> n) | (xh << r)
  SH = xh >>> n
}

/** Legal moves for player P against opponent O. Result in OUT. */
export function genMoves(pl: number, ph: number, ol: number, oh: number): void {
  const il = ol & INNER
  const ih = oh & INNER
  let ml = 0
  let mh = 0
  runUp(pl, ph, il, ih, 1); ml |= SL; mh |= SH
  runDown(pl, ph, il, ih, 1); ml |= SL; mh |= SH
  runUp(pl, ph, ol, oh, 8); ml |= SL; mh |= SH
  runDown(pl, ph, ol, oh, 8); ml |= SL; mh |= SH
  runUp(pl, ph, il, ih, 7); ml |= SL; mh |= SH
  runDown(pl, ph, il, ih, 7); ml |= SL; mh |= SH
  runUp(pl, ph, il, ih, 9); ml |= SL; mh |= SH
  runDown(pl, ph, il, ih, 9); ml |= SL; mh |= SH
  OUT[0] = ml & ~(pl | ol)
  OUT[1] = mh & ~(ph | oh)
}

// Rays: for every square and direction, the squares walked outward (-1 terminated).
const DIRS: [number, number][] = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const RAYS = new Int8Array(64 * 8 * 7).fill(-1)
for (let s = 0; s < 64; s++) {
  for (let d = 0; d < 8; d++) {
    let r = s >> 3
    let c = s & 7
    for (let k = 0; k < 7; k++) {
      r += DIRS[d][0]
      c += DIRS[d][1]
      if (r < 0 || r > 7 || c < 0 || c > 7) break
      RAYS[(s * 8 + d) * 7 + k] = r * 8 + c
    }
  }
}

/** Discs flipped if P plays on empty square s (0 when the move is illegal). Result in OUT. */
export function genFlips(pl: number, ph: number, ol: number, oh: number, s: number): void {
  let fl = 0
  let fh = 0
  for (let d = 0; d < 8; d++) {
    const base = (s * 8 + d) * 7
    let rl = 0
    let rh = 0
    for (let k = 0; k < 7; k++) {
      const t = RAYS[base + k]
      if (t < 0) break
      const bl = BIT_LO[t]
      const bh = BIT_HI[t]
      if ((ol & bl) | (oh & bh)) {
        rl |= bl
        rh |= bh
        continue
      }
      if (k > 0 && ((pl & bl) | (ph & bh)) !== 0) {
        fl |= rl
        fh |= rh
      }
      break
    }
  }
  OUT[0] = fl
  OUT[1] = fh
}

// ─── Position API (used by the UI) ─────────────────────────────

// d4 = 35, e4 = 36, d5 = 27, e5 = 28
export function initialPosition(): Position {
  return { bl: BIT_LO[27], bh: BIT_HI[36], wl: BIT_LO[28], wh: BIT_HI[35], turn: BLACK }
}

/** [pl, ph, ol, oh] from `side`'s point of view. */
export function sideBits(p: Position, side: Side = p.turn): [number, number, number, number] {
  return side === BLACK ? [p.bl, p.bh, p.wl, p.wh] : [p.wl, p.wh, p.bl, p.bh]
}

export function cellAt(p: Position, s: number): Cell {
  if ((p.bl & BIT_LO[s]) | (p.bh & BIT_HI[s])) return BLACK
  if ((p.wl & BIT_LO[s]) | (p.wh & BIT_HI[s])) return WHITE
  return EMPTY
}

export function cells(p: Position): Cell[] {
  const out: Cell[] = []
  for (let s = 0; s < 64; s++) out.push(cellAt(p, s))
  return out
}

export function legalMoves(p: Position, side: Side = p.turn): number[] {
  const [pl, ph, ol, oh] = sideBits(p, side)
  genMoves(pl, ph, ol, oh)
  return bitsToSquares(OUT[0], OUT[1])
}

export function canMove(p: Position, side: Side = p.turn): boolean {
  const [pl, ph, ol, oh] = sideBits(p, side)
  genMoves(pl, ph, ol, oh)
  return (OUT[0] | OUT[1]) !== 0
}

/** Neither side has a legal move (this includes a full board). */
export function isGameOver(p: Position): boolean {
  return !canMove(p, BLACK) && !canMove(p, WHITE)
}

/** Squares flipped by the side to move playing s; empty when s is not a legal move. */
export function flipsFor(p: Position, s: number, side: Side = p.turn): number[] {
  if (s < 0 || s > 63 || cellAt(p, s) !== EMPTY) return []
  const [pl, ph, ol, oh] = sideBits(p, side)
  genFlips(pl, ph, ol, oh, s)
  return bitsToSquares(OUT[0], OUT[1])
}

/** Plays s for the side to move and hands the turn over. Throws on an illegal move. */
export function playMove(p: Position, s: number): Position {
  if (s < 0 || s > 63 || cellAt(p, s) !== EMPTY) throw new Error(`Illegal move ${s}`)
  const [pl, ph, ol, oh] = sideBits(p)
  genFlips(pl, ph, ol, oh, s)
  const fl = OUT[0]
  const fh = OUT[1]
  if ((fl | fh) === 0) throw new Error(`Illegal move ${squareName(s)}`)
  const npl = pl | fl | BIT_LO[s]
  const nph = ph | fh | BIT_HI[s]
  const nol = ol & ~fl
  const noh = oh & ~fh
  return p.turn === BLACK
    ? { bl: npl, bh: nph, wl: nol, wh: noh, turn: WHITE }
    : { bl: nol, bh: noh, wl: npl, wh: nph, turn: BLACK }
}

export function passTurn(p: Position): Position {
  return { ...p, turn: other(p.turn) }
}

export function discCounts(p: Position): { black: number; white: number; empty: number } {
  const black = pop32(p.bl) + pop32(p.bh)
  const white = pop32(p.wl) + pop32(p.wh)
  return { black, white, empty: 64 - black - white }
}

/** Build a position from 8 strings of "X" (black), "O" (white), "." (empty), top row first. */
export function parsePosition(rows: string[], turn: Side): Position {
  let bl = 0, bh = 0, wl = 0, wh = 0
  rows.forEach((row, r) => {
    for (let c = 0; c < 8; c++) {
      const s = r * 8 + c
      const ch = row[c]
      if (ch === "X" || ch === "x" || ch === "B") { bl |= BIT_LO[s]; bh |= BIT_HI[s] }
      else if (ch === "O" || ch === "o" || ch === "W") { wl |= BIT_LO[s]; wh |= BIT_HI[s] }
    }
  })
  return { bl, bh, wl, wh, turn }
}

// ─── Game record ───────────────────────────────────────────────

export interface LastMove {
  sq: number
  side: Side
  flips: number[]
}

export interface GameState {
  pos: Position
  last: LastMove | null
  /** side that passed most recently, cleared by the next move */
  passed: Side | null
  /** discs placed so far (passes not counted) */
  moves: number
}

export function newGame(): GameState {
  return { pos: initialPosition(), last: null, passed: null, moves: 0 }
}

export function advanceGame(g: GameState, s: number): GameState {
  const flips = flipsFor(g.pos, s)
  const pos = playMove(g.pos, s)
  return { pos, last: { sq: s, side: g.pos.turn, flips }, passed: null, moves: g.moves + 1 }
}

export function passGame(g: GameState): GameState {
  return { ...g, pos: passTurn(g.pos), passed: g.pos.turn }
}

// ─── Scoring ───────────────────────────────────────────────────

export type ResultKind = "win" | "draw" | "loss" | "resign"

/**
 * Win: mult x (100 + 3 x disc margin). Draw: mult x 40.
 * Loss / resign: mult x floor(your discs / 2). Each undo costs 20. Never below 0.
 */
export function computeScore(o: { kind: ResultKind; mult: number; mine: number; theirs: number; undos: number }): number {
  let raw: number
  if (o.kind === "win") raw = o.mult * (100 + 3 * (o.mine - o.theirs))
  else if (o.kind === "draw") raw = o.mult * 40
  else raw = o.mult * Math.floor(o.mine / 2)
  return Math.max(0, Math.round(raw - 20 * o.undos))
}
