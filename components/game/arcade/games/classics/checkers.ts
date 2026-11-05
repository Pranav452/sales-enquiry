// ============================================================
// Checkers (English draughts) — pure rules engine, no React.
//
// Board: the 32 dark squares, indexed 0..31 row by row from the
// top (row 0 = rank 8). Black starts on rows 5-7 (bottom), moves
// up and moves first; White starts on rows 0-2 and moves down.
// The UI flips the picture when the human plays White.
// ============================================================

export type Side = 0 | 1
export const BLACK: Side = 0
export const WHITE: Side = 1

export const EMPTY = 0
export const BLACK_MAN = 1
export const BLACK_KING = 2
export const WHITE_MAN = 3
export const WHITE_KING = 4
/** Temporary marker for a piece already jumped during the current chain. */
const MARK = 9

/** 40 moves by each side (80 plies) without a capture or a man move = draw. */
export const DRAW_PLIES = 80
/** Show the draw counter once this many plies passed without progress. */
export const DRAW_WARN_PLIES = 40

export interface MutableBoard {
  [index: number]: number
  readonly length: number
}

export interface Move {
  from: number
  to: number
  /** landing squares in order; the last one equals `to` */
  path: number[]
  /** jumped squares in order (same length as path for captures; empty for simple moves) */
  caps: number[]
  /** piece codes that were jumped, parallel to caps */
  capVals: number[]
  /** mover's piece code before the move */
  piece: number
  /** a man reaches the far row and is crowned (the move ends there) */
  promote: boolean
}

// ─── Geometry ──────────────────────────────────────────────────

export const ROW = new Int8Array(32)
export const COL = new Int8Array(32)
/** STEP[s*4+d] = neighbour in direction d (or -1); JUMP = square two steps away. */
export const STEP = new Int8Array(128).fill(-1)
export const JUMP = new Int8Array(128).fill(-1)
/** d: 0 up-left, 1 up-right, 2 down-left, 3 down-right ("up" = towards row 0). */
const DR = [-1, -1, 1, 1]
const DC = [-1, 1, -1, 1]
/** Directions each piece code may move in (men forward only, kings both ways). */
export const DIRS_BY_PIECE: readonly (readonly number[])[] = [[], [0, 1], [0, 1, 2, 3], [2, 3], [0, 1, 2, 3]]

export function squareAt(row: number, col: number): number {
  if (row < 0 || row > 7 || col < 0 || col > 7) return -1
  if (((row + col) & 1) === 0) return -1
  return row * 4 + (col >> 1)
}

for (let s = 0; s < 32; s++) {
  const r = s >> 2
  const c = ((s & 3) << 1) + ((r & 1) ? 0 : 1)
  ROW[s] = r
  COL[s] = c
}
for (let s = 0; s < 32; s++) {
  for (let d = 0; d < 4; d++) {
    STEP[s * 4 + d] = squareAt(ROW[s] + DR[d], COL[s] + DC[d])
    JUMP[s * 4 + d] = squareAt(ROW[s] + 2 * DR[d], COL[s] + 2 * DC[d])
  }
}

/** "c3" style name of a square. */
export function squareName(s: number): string {
  return "abcdefgh"[COL[s]] + String(8 - ROW[s])
}

// ─── Pieces ────────────────────────────────────────────────────

export function pieceSide(v: number): Side {
  return v <= BLACK_KING ? BLACK : WHITE
}
export function isKing(v: number): boolean {
  return v === BLACK_KING || v === WHITE_KING
}
export function isOwn(v: number, side: Side): boolean {
  return side === BLACK ? (v === BLACK_MAN || v === BLACK_KING) : (v === WHITE_MAN || v === WHITE_KING)
}
export function other(side: Side): Side {
  return side === BLACK ? WHITE : BLACK
}
function promoRow(side: Side): number {
  return side === BLACK ? 0 : 7
}

// ─── Move generation ───────────────────────────────────────────

const NONE: number[] = []

// Scratch state for the jump search (module level: no closures per call).
let jb: MutableBoard = []
let jSide: Side = BLACK
let jKing = false
let jDirs: readonly number[] = []
let jFrom = 0
let jPiece = 0
let jOut: Move[] = []
const jPath: number[] = []
const jCaps: number[] = []
const jCapVals: number[] = []

function pushJump(promote: boolean) {
  jOut.push({
    from: jFrom,
    to: jPath[jPath.length - 1],
    path: jPath.slice(),
    caps: jCaps.slice(),
    capVals: jCapVals.slice(),
    piece: jPiece,
    promote,
  })
}

function jumpRec(cur: number) {
  let extended = false
  for (let i = 0; i < jDirs.length; i++) {
    const d = jDirs[i]
    const land = JUMP[cur * 4 + d]
    if (land < 0) continue
    const over = STEP[cur * 4 + d]
    const ov = jb[over]
    if (ov === EMPTY || ov === MARK || pieceSide(ov) === jSide) continue
    if (jb[land] !== EMPTY) continue
    extended = true
    jb[over] = MARK
    jPath.push(land)
    jCaps.push(over)
    jCapVals.push(ov)
    // A man reaching the far row is crowned and the move ends immediately.
    if (!jKing && ROW[land] === promoRow(jSide)) pushJump(true)
    else jumpRec(land)
    jPath.pop()
    jCaps.pop()
    jCapVals.pop()
    jb[over] = ov
  }
  if (!extended && jPath.length > 0) pushJump(false)
}

function genJumps(b: MutableBoard, from: number, v: number, out: Move[]) {
  jb = b
  jSide = pieceSide(v)
  jKing = isKing(v)
  jDirs = DIRS_BY_PIECE[v]
  jFrom = from
  jPiece = v
  jOut = out
  // Lift the piece so a king may pass back over its starting square.
  b[from] = EMPTY
  jumpRec(from)
  b[from] = v
}

/**
 * All legal moves for `side`. Captures are compulsory: if any capture exists
 * only (complete, maximal-continuation) capture sequences are returned.
 * The board is temporarily mutated during generation and restored.
 */
export function generateMoves(b: MutableBoard, side: Side): Move[] {
  const out: Move[] = []
  const man = side === BLACK ? BLACK_MAN : WHITE_MAN
  const king = man + 1
  for (let s = 0; s < 32; s++) {
    const v = b[s]
    if (v === man || v === king) genJumps(b, s, v, out)
  }
  if (out.length > 0) return out
  const pr = promoRow(side)
  for (let s = 0; s < 32; s++) {
    const v = b[s]
    if (v !== man && v !== king) continue
    const dirs = DIRS_BY_PIECE[v]
    for (let i = 0; i < dirs.length; i++) {
      const t = STEP[s * 4 + dirs[i]]
      if (t < 0 || b[t] !== EMPTY) continue
      out.push({ from: s, to: t, path: [t], caps: NONE, capVals: NONE, piece: v, promote: v === man && ROW[t] === pr })
    }
  }
  return out
}

/** True when `side` has at least one capture available. */
export function hasCapture(b: MutableBoard, side: Side): boolean {
  for (let s = 0; s < 32; s++) {
    const v = b[s]
    if (v === EMPTY || pieceSide(v) !== side) continue
    const dirs = DIRS_BY_PIECE[v]
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i]
      const land = JUMP[s * 4 + d]
      if (land < 0 || b[land] !== EMPTY) continue
      const ov = b[STEP[s * 4 + d]]
      if (ov !== EMPTY && pieceSide(ov) !== side) return true
    }
  }
  return false
}

export function makeMove(b: MutableBoard, m: Move) {
  b[m.from] = EMPTY
  for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = EMPTY
  b[m.to] = m.promote ? m.piece + 1 : m.piece
}

export function unmakeMove(b: MutableBoard, m: Move) {
  b[m.to] = EMPTY
  for (let i = 0; i < m.caps.length; i++) b[m.caps[i]] = m.capVals[i]
  b[m.from] = m.piece
}

/** True when the move resets the draw counter (a capture or a man move). */
export function isIrreversible(m: Move): boolean {
  return m.caps.length > 0 || !isKing(m.piece)
}

// ─── Zobrist hashing (two independent 32-bit keys) ─────────────

function seededRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) | 0
  }
}

export const Z_LO = new Int32Array(5 * 32)
export const Z_HI = new Int32Array(5 * 32)
const zr = seededRng(0x5eed_c4ec)
for (let i = 0; i < 5 * 32; i++) {
  Z_LO[i] = zr()
  Z_HI[i] = zr()
}
export const Z_SIDE_LO = zr()
export const Z_SIDE_HI = zr()

export type Hash = readonly [number, number]

export function hashBoard(b: MutableBoard, turn: Side): Hash {
  let lo = 0
  let hi = 0
  for (let s = 0; s < 32; s++) {
    const v = b[s]
    if (v === EMPTY) continue
    lo ^= Z_LO[v * 32 + s]
    hi ^= Z_HI[v * 32 + s]
  }
  if (turn === WHITE) {
    lo ^= Z_SIDE_LO
    hi ^= Z_SIDE_HI
  }
  return [lo, hi]
}

// ─── Game-level helpers (immutable) ────────────────────────────

export interface Position {
  board: number[]
  turn: Side
  /** plies since the last capture or man move (draw counter) */
  quiet: number
}

export function initialBoard(): number[] {
  const b = new Array<number>(32).fill(EMPTY)
  for (let s = 0; s < 12; s++) b[s] = WHITE_MAN
  for (let s = 20; s < 32; s++) b[s] = BLACK_MAN
  return b
}

export function initialPosition(): Position {
  return { board: initialBoard(), turn: BLACK, quiet: 0 }
}

/**
 * Legal moves for the side to move. Capture sequences that end on the same
 * square having taken exactly the same pieces are merged (they are the same
 * move for every practical purpose).
 */
export function legalMoves(pos: Position): Move[] {
  const b = pos.board.slice()
  const all = generateMoves(b, pos.turn)
  if (all.length < 2 || all[0].caps.length === 0) return all
  const seen = new Set<string>()
  const out: Move[] = []
  for (const m of all) {
    const key = `${m.from}>${m.to}:${m.caps.slice().sort((x, y) => x - y).join(",")}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
}

export function playMove(pos: Position, m: Move): Position {
  const board = pos.board.slice()
  makeMove(board, m)
  return { board, turn: other(pos.turn), quiet: isIrreversible(m) ? 0 : pos.quiet + 1 }
}

export function countPieces(b: MutableBoard, side: Side): number {
  let n = 0
  for (let s = 0; s < 32; s++) if (b[s] !== EMPTY && pieceSide(b[s]) === side) n++
  return n
}

export type EndReason = "no-pieces" | "no-moves" | "forty-move" | "repetition"
export interface Outcome {
  /** null = draw */
  winner: Side | null
  reason: EndReason
}

// ─── Full game record (what the UI keeps; also used by tests) ──

export interface GameRecord {
  pos: Position
  /** stable piece ids per square (0 = none), for animation keys */
  ids: number[]
  /** position hashes since the last irreversible move, including the current one */
  rep: Hash[]
  last: Move | null
  /** pieces captured by Black [0] and by White [1] */
  captured: [number, number]
  /** plies played so far */
  plies: number
  outcome: Outcome | null
}

export function newGame(): GameRecord {
  const pos = initialPosition()
  const ids = new Array<number>(32).fill(0)
  let id = 1
  for (let s = 0; s < 32; s++) if (pos.board[s] !== EMPTY) ids[s] = id++
  return { pos, ids, rep: [hashBoard(pos.board, pos.turn)], last: null, captured: [0, 0], plies: 0, outcome: null }
}

function sameHash(a: Hash, b: Hash) {
  return a[0] === b[0] && a[1] === b[1]
}

/** How many times the current position has occurred (same board, same side to move). */
export function repetitionCount(rep: Hash[]): number {
  const cur = rep[rep.length - 1]
  let n = 0
  for (let i = rep.length - 1; i >= 0; i -= 2) if (sameHash(rep[i], cur)) n++
  return n
}

export function outcomeOf(pos: Position, rep: Hash[]): Outcome | null {
  const moves = legalMoves(pos)
  if (moves.length === 0) {
    const winner = other(pos.turn)
    return { winner, reason: countPieces(pos.board, pos.turn) === 0 ? "no-pieces" : "no-moves" }
  }
  if (pos.quiet >= DRAW_PLIES) return { winner: null, reason: "forty-move" }
  if (repetitionCount(rep) >= 3) return { winner: null, reason: "repetition" }
  return null
}

export function advanceGame(g: GameRecord, m: Move): GameRecord {
  const mover = g.pos.turn
  const pos = playMove(g.pos, m)
  const ids = g.ids.slice()
  const id = ids[m.from]
  ids[m.from] = 0
  for (const c of m.caps) ids[c] = 0
  ids[m.to] = id
  const h = hashBoard(pos.board, pos.turn)
  const rep = isIrreversible(m) ? [h] : [...g.rep, h]
  const captured: [number, number] = [g.captured[0], g.captured[1]]
  captured[mover] += m.caps.length
  return { pos, ids, rep, last: m, captured, plies: g.plies + 1, outcome: outcomeOf(pos, rep) }
}

// ─── Scoring ───────────────────────────────────────────────────

export type ResultKind = "win" | "draw" | "loss" | "resign"

/**
 * Win:  mult x (100 + 10 x your pieces left + 2 x max(0, 60 - your moves))
 * Draw: mult x (30 + 3 x pieces you captured)
 * Loss / resign: mult x 2 x pieces you captured
 * Each undo used costs 20 points. Never below 0.
 */
export function computeScore(o: {
  kind: ResultKind
  mult: number
  piecesLeft: number
  humanMoves: number
  captured: number
  undos: number
}): number {
  let raw: number
  if (o.kind === "win") raw = o.mult * (100 + 10 * o.piecesLeft + 2 * Math.max(0, 60 - o.humanMoves))
  else if (o.kind === "draw") raw = o.mult * (30 + 3 * o.captured)
  else raw = o.mult * 2 * o.captured
  return Math.max(0, Math.round(raw - 20 * o.undos))
}
