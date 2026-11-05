// ============================================================
// Chess engine for the arcade Chess game.
// Self-contained 0x88 move generator (verified against chess.js
// with perft) plus a PVS alpha-beta search: iterative deepening,
// aspiration windows, transposition table, null-move pruning,
// late-move reductions, check extensions, MVV-LVA / killer /
// history move ordering and a capture quiescence search.
// Evaluation is tapered piece-square tables (PeSTO values) with
// a bishop-pair bonus, mop-up for lone kings and drawish-material
// scaling. chess.js remains the source of truth for the game
// itself; the engine only proposes moves (UCI strings).
// ============================================================

import { createRng } from "../../kit/random"

// ─── Pieces / squares ─────────────────────────────────────────

const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6
const WHITE = 0, BLACK = 8

const F_CAPTURE = 1, F_DOUBLE = 2, F_EP = 4, F_CASTLE = 8

export const MATE = 30000
const INF = 32000
const MAX_PLY = 64
const MOVE_SLOTS = MAX_PLY + 4
const SLOT_SIZE = 256
const HIST_SIZE = 4096
const TT_BITS = 20
const TT_SIZE = 1 << TT_BITS
const TT_MASK = TT_SIZE - 1
const TT_EXACT = 1, TT_LOWER = 2, TT_UPPER = 3

const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33]
const KING_OFFSETS = [-17, -16, -15, -1, 1, 15, 16, 17]
const DIAG = [-17, -15, 15, 17]
const ORTHO = [-16, -1, 1, 16]

/** Ordering / delta values (centipawns) indexed by piece type. */
const VALUE = [0, 100, 320, 330, 500, 900, 20000]
/** Material used for draw scaling and mop-up (no pawns, no king). */
const NP_VALUE = [0, 0, 300, 300, 500, 900, 0]
const PHASE_INC = [0, 0, 1, 1, 2, 4, 0]

const PIECE_CHARS = " pnbrqk"
const PROMO_CHARS = "  nbrq"

// Square helpers (a8 = 0 in 0x88, i.e. rank 8 is row 0)
const sqName = (sq: number) => "abcdefgh"[sq & 7] + String(8 - (sq >> 4))
function parseSq(s: string): number {
  const f = s.charCodeAt(0) - 97
  const r = 8 - (s.charCodeAt(1) - 48)
  if (f < 0 || f > 7 || r < 0 || r > 7) return -1
  return r * 16 + f
}

// Move encoding: from | to<<7 | promo<<14 | flags<<17
const mFrom = (m: number) => m & 127
const mTo = (m: number) => (m >> 7) & 127
const mPromo = (m: number) => (m >> 14) & 7
const mFlags = (m: number) => (m >> 17) & 15
const encode = (from: number, to: number, promo: number, flags: number) =>
  from | (to << 7) | (promo << 14) | (flags << 17)

// ─── PeSTO piece-square tables (a8 first, white's view) ───────

const MG_VALUE = [0, 82, 337, 365, 477, 1025, 0]
const EG_VALUE = [0, 94, 281, 297, 512, 936, 0]

const MG_PST: number[][] = [
  [],
  [ // pawn
      0,   0,   0,   0,   0,   0,  0,   0,
     98, 134,  61,  95,  68, 126, 34, -11,
     -6,   7,  26,  31,  65,  56, 25, -20,
    -14,  13,   6,  21,  23,  12, 17, -23,
    -27,  -2,  -5,  12,  17,   6, 10, -25,
    -26,  -4,  -4, -10,   3,   3, 33, -12,
    -35,  -1, -20, -23, -15,  24, 38, -22,
      0,   0,   0,   0,   0,   0,  0,   0,
  ],
  [ // knight
    -167, -89, -34, -49,  61, -97, -15, -107,
     -73, -41,  72,  36,  23,  62,   7,  -17,
     -47,  60,  37,  65,  84, 129,  73,   44,
      -9,  17,  19,  53,  37,  69,  18,   22,
     -13,   4,  16,  13,  28,  19,  21,   -8,
     -23,  -9,  12,  10,  19,  17,  25,  -16,
     -29, -53, -12,  -3,  -1,  18, -14,  -19,
    -105, -21, -58, -33, -17, -28, -19,  -23,
  ],
  [ // bishop
    -29,   4, -82, -37, -25, -42,   7,  -8,
    -26,  16, -18, -13,  30,  59,  18, -47,
    -16,  37,  43,  40,  35,  50,  37,  -2,
     -4,   5,  19,  50,  37,  37,   7,  -2,
     -6,  13,  13,  26,  34,  12,  10,   4,
      0,  15,  15,  15,  14,  27,  18,  10,
      4,  15,  16,   0,   7,  21,  33,   1,
    -33,  -3, -14, -21, -13, -12, -39, -21,
  ],
  [ // rook
     32,  42,  32,  51, 63,  9,  31,  43,
     27,  32,  58,  62, 80, 67,  26,  44,
     -5,  19,  26,  36, 17, 45,  61,  16,
    -24, -11,   7,  26, 24, 35,  -8, -20,
    -36, -26, -12,  -1,  9, -7,   6, -23,
    -45, -25, -16, -17,  3,  0,  -5, -33,
    -44, -16, -20,  -9, -1, 11,  -6, -71,
    -19, -13,   1,  17, 16,  7, -37, -26,
  ],
  [ // queen
    -28,   0,  29,  12,  59,  44,  43,  45,
    -24, -39,  -5,   1, -16,  57,  28,  54,
    -13, -17,   7,   8,  29,  56,  47,  57,
    -27, -27, -16, -16,  -1,  17,  -2,   1,
     -9, -26,  -9, -10,  -2,  -4,   3,  -3,
    -14,   2, -11,  -2,  -5,   2,  14,   5,
    -35,  -8,  11,   2,   8,  15,  -3,   1,
     -1, -18,  -9,  10, -15, -25, -31, -50,
  ],
  [ // king
    -65,  23,  16, -15, -56, -34,   2,  13,
     29,  -1, -20,  -7,  -8,  -4, -38, -29,
     -9,  24,   2, -16, -20,   6,  22, -22,
    -17, -20, -12, -27, -30, -25, -14, -36,
    -49,  -1, -27, -39, -46, -44, -33, -51,
    -14, -14, -22, -46, -44, -30, -15, -27,
      1,   7,  -8, -64, -43, -16,   9,   8,
    -15,  36,  12, -54,   8, -28,  24,  14,
  ],
]

const EG_PST: number[][] = [
  [],
  [ // pawn
      0,   0,   0,   0,   0,   0,   0,   0,
    178, 173, 158, 134, 147, 132, 165, 187,
     94, 100,  85,  67,  56,  53,  82,  84,
     32,  24,  13,   5,  -2,   4,  17,  17,
     13,   9,  -3,  -7,  -7,  -8,   3,  -1,
      4,   7,  -6,   1,   0,  -5,  -1,  -8,
     13,   8,   8,  10,  13,   0,   2,  -7,
      0,   0,   0,   0,   0,   0,   0,   0,
  ],
  [ // knight
    -58, -38, -13, -28, -31, -27, -63, -99,
    -25,  -8, -25,  -2,  -9, -25, -24, -52,
    -24, -20,  10,   9,  -1,  -9, -19, -41,
    -17,   3,  22,  22,  22,  11,   8, -18,
    -18,  -6,  16,  25,  16,  17,   4, -18,
    -23,  -3,  -1,  15,  10,  -3, -20, -22,
    -42, -20, -10,  -5,  -2, -20, -23, -44,
    -29, -51, -23, -15, -22, -18, -50, -64,
  ],
  [ // bishop
    -14, -21, -11,  -8, -7,  -9, -17, -24,
     -8,  -4,   7, -12, -3, -13,  -4, -14,
      2,  -8,   0,  -1, -2,   6,   0,   4,
     -3,   9,  12,   9, 14,  10,   3,   2,
     -6,   3,  13,  19,  7,  10,  -3,  -9,
    -12,  -3,   8,  10, 13,   3,  -7, -15,
    -14, -18,  -7,  -1,  4,  -9, -15, -27,
    -23,  -9, -23,  -5, -9, -16,  -5, -17,
  ],
  [ // rook
    13, 10, 18, 15, 12,  12,   8,   5,
    11, 13, 13, 11, -3,   3,   8,   3,
     7,  7,  7,  5,  4,  -3,  -5,  -3,
     4,  3, 13,  1,  2,   1,  -1,   2,
     3,  5,  8,  4, -5,  -6,  -8, -11,
    -4,  0, -5, -1, -7, -12,  -8, -16,
    -6, -6,  0,  2, -9,  -9, -11,  -3,
    -9,  2,  3, -1, -5, -13,   4, -20,
  ],
  [ // queen
     -9,  22,  22,  27,  27,  19,  10,  20,
    -17,  20,  32,  41,  58,  25,  30,   0,
    -20,   6,   9,  49,  47,  35,  19,   9,
      3,  22,  24,  45,  57,  40,  57,  36,
    -18,  28,  19,  47,  31,  34,  39,  23,
    -16, -27,  15,   6,   9,  17,  10,   5,
    -22, -23, -30, -16, -16, -23, -36, -32,
    -33, -28, -22, -43,  -5, -32, -20, -41,
  ],
  [ // king
    -74, -35, -18, -18, -11,  15,   4, -17,
    -12,  17,  14,  17,  17,  38,  23,  11,
     10,  17,  23,  15,  20,  45,  44,  13,
     -8,  22,  24,  27,  26,  33,  26,   3,
    -18,  -4,  21,  24,  27,  23,   9, -11,
    -19,  -3,  11,  21,  23,  16,   7,  -9,
    -27, -11,   4,  13,  14,   4,  -5, -17,
    -53, -34, -21, -11, -28, -14, -24, -43,
  ],
]

// Combined (material + PST) tables indexed [piece * 128 + sq0x88]
const MG = new Int16Array(16 * 128)
const EG = new Int16Array(16 * 128)
for (let t = PAWN; t <= KING; t++) {
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) continue
    const s64 = (sq >> 4) * 8 + (sq & 7)
    MG[(WHITE | t) * 128 + sq] = MG_VALUE[t] + MG_PST[t][s64]
    EG[(WHITE | t) * 128 + sq] = EG_VALUE[t] + EG_PST[t][s64]
    MG[(BLACK | t) * 128 + sq] = MG_VALUE[t] + MG_PST[t][s64 ^ 56]
    EG[(BLACK | t) * 128 + sq] = EG_VALUE[t] + EG_PST[t][s64 ^ 56]
  }
}

// ─── Zobrist keys (two 32-bit halves, no BigInt) ──────────────

const zrng = createRng(0x5eed_c4e5)
const rand32 = () => (zrng() * 4294967296) | 0
const Z_PIECE_LO = new Int32Array(16 * 128).map(rand32)
const Z_PIECE_HI = new Int32Array(16 * 128).map(rand32)
const Z_CASTLE_LO = new Int32Array(16).map(rand32)
const Z_CASTLE_HI = new Int32Array(16).map(rand32)
const Z_EP_LO = new Int32Array(8).map(rand32)
const Z_EP_HI = new Int32Array(8).map(rand32)
const Z_SIDE_LO = rand32()
const Z_SIDE_HI = rand32()

// Castling-rights masks: rights &= mask[from] & mask[to]
const CASTLE_MASK = new Uint8Array(128).fill(15)
CASTLE_MASK[0x70] = 13  // a1 → lose white queenside
CASTLE_MASK[0x74] = 12  // e1 → lose both white
CASTLE_MASK[0x77] = 14  // h1 → lose white kingside
CASTLE_MASK[0x00] = 7   // a8 → lose black queenside
CASTLE_MASK[0x04] = 3   // e8 → lose both black
CASTLE_MASK[0x07] = 11  // h8 → lose black kingside

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

// ─── Search configuration ─────────────────────────────────────

export interface SearchConfig {
  /** wall-clock budget in ms */
  timeMs:   number
  /** iterative-deepening depth cap */
  maxDepth: number
  /** +/- centipawn evaluation noise (0 = exact) */
  noise:    number
  /** >0: score every root move and pick randomly among those within this margin of the best */
  margin:   number
  /** probability of playing a random legal move instead of searching */
  blunder:  number
  /** evaluation request: always search, even with a single legal move */
  analyze?: boolean
}

export interface SearchResult {
  /** UCI, e.g. "e2e4" or "e7e8q"; null when there is no legal move */
  move:   string | null
  /** centipawns from the side to move's point of view (mate = +/-30000 minus distance) */
  score:  number
  depth:  number
  nodes:  number
  timeMs: number
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now())

// ─── Engine ───────────────────────────────────────────────────

export class Engine {
  board = new Int8Array(128)
  side = WHITE
  castle = 0
  ep = -1
  halfmove = 0
  hashLo = 0
  hashHi = 0
  kingSq = new Int16Array(2)
  mg = new Int32Array(2)
  eg = new Int32Array(2)
  phase = 0
  count = new Int8Array(16)

  // history / undo (indexed by game ply)
  hply = 0
  private posLo = new Int32Array(HIST_SIZE)
  private posHi = new Int32Array(HIST_SIZE)
  private uMove = new Int32Array(HIST_SIZE)
  private uCaptured = new Int8Array(HIST_SIZE)
  private uCastle = new Int8Array(HIST_SIZE)
  private uEp = new Int16Array(HIST_SIZE)
  private uHalf = new Int16Array(HIST_SIZE)
  private uHashLo = new Int32Array(HIST_SIZE)
  private uHashHi = new Int32Array(HIST_SIZE)

  // move lists per ply
  private moves = new Int32Array(MOVE_SLOTS * SLOT_SIZE)
  private scores = new Int32Array(MOVE_SLOTS * SLOT_SIZE)

  // search state
  private ttKey = new Int32Array(TT_SIZE)
  private ttMove = new Int32Array(TT_SIZE)
  private ttScore = new Int16Array(TT_SIZE)
  private ttDepth = new Int8Array(TT_SIZE)
  private ttFlag = new Uint8Array(TT_SIZE)
  private killers = new Int32Array(MOVE_SLOTS * 2)
  private history = new Int32Array(16 * 128)
  private nodes = 0
  private deadline = 0
  private stopped = false
  private rootBest = 0
  private rootBestScore = -INF
  private noiseAmp = 0
  private noiseSeed = 0
  private lastNoiseAmp = 0

  constructor(fen: string = START_FEN) {
    this.loadFen(fen)
  }

  // ─── Position setup ───────────────────────────────────────

  loadFen(fen: string): void {
    this.board.fill(0)
    this.mg.fill(0)
    this.eg.fill(0)
    this.count.fill(0)
    this.phase = 0
    this.hashLo = 0
    this.hashHi = 0
    const [placement, turn = "w", castling = "-", epStr = "-", half = "0"] = fen.trim().split(/\s+/)
    let r = 0, f = 0
    for (const ch of placement) {
      if (ch === "/") { r++; f = 0; continue }
      if (ch >= "1" && ch <= "8") { f += Number(ch); continue }
      const lower = ch.toLowerCase()
      const t = PIECE_CHARS.indexOf(lower)
      if (t <= 0) continue
      const color = ch === lower ? BLACK : WHITE
      this.addPiece(r * 16 + f, color | t)
      f++
    }
    this.side = turn === "b" ? BLACK : WHITE
    if (this.side === BLACK) { this.hashLo ^= Z_SIDE_LO; this.hashHi ^= Z_SIDE_HI }
    this.castle = 0
    if (castling.includes("K")) this.castle |= 1
    if (castling.includes("Q")) this.castle |= 2
    if (castling.includes("k")) this.castle |= 4
    if (castling.includes("q")) this.castle |= 8
    this.hashLo ^= Z_CASTLE_LO[this.castle]
    this.hashHi ^= Z_CASTLE_HI[this.castle]
    this.ep = epStr !== "-" ? parseSq(epStr) : -1
    if (this.ep >= 0) { this.hashLo ^= Z_EP_LO[this.ep & 7]; this.hashHi ^= Z_EP_HI[this.ep & 7] }
    this.halfmove = Number(half) || 0
    this.hply = 0
    this.posLo[0] = this.hashLo
    this.posHi[0] = this.hashHi
  }

  /** Load a start position and replay UCI moves (keeps history for repetition detection). */
  setPosition(startFen: string, uciMoves: readonly string[]): void {
    this.loadFen(startFen)
    for (const u of uciMoves) {
      if (!this.playUci(u)) throw new Error(`Illegal move in history: ${u}`)
    }
  }

  playUci(uci: string): boolean {
    const m = this.findMove(uci)
    return m !== 0 && this.makeMove(m)
  }

  private findMove(uci: string): number {
    const from = parseSq(uci.slice(0, 2))
    const to = parseSq(uci.slice(2, 4))
    const promo = uci.length > 4 ? PROMO_CHARS.indexOf(uci[4].toLowerCase()) : 0
    const slot = MOVE_SLOTS - 1
    const n = this.generate(slot, false)
    const base = slot * SLOT_SIZE
    for (let i = 0; i < n; i++) {
      const m = this.moves[base + i]
      if (mFrom(m) === from && mTo(m) === to && mPromo(m) === Math.max(promo, 0)) return m
    }
    return 0
  }

  get sideToMove(): "w" | "b" { return this.side === WHITE ? "w" : "b" }

  inCheck(): boolean {
    return this.isAttacked(this.kingSq[this.side >> 3], this.side ^ 8)
  }

  legalMovesUci(): string[] {
    const slot = MOVE_SLOTS - 2
    const n = this.generate(slot, false)
    const out: string[] = []
    const base = slot * SLOT_SIZE
    for (let i = 0; i < n; i++) {
      const m = this.moves[base + i]
      if (this.makeMove(m)) { out.push(moveToUci(m)); this.unmakeMove() }
    }
    return out
  }

  // ─── Incremental piece helpers ────────────────────────────

  private addPiece(sq: number, p: number): void {
    this.board[sq] = p
    const c = p >> 3
    const i = p * 128 + sq
    this.mg[c] += MG[i]
    this.eg[c] += EG[i]
    this.phase += PHASE_INC[p & 7]
    this.count[p]++
    this.hashLo ^= Z_PIECE_LO[i]
    this.hashHi ^= Z_PIECE_HI[i]
    if ((p & 7) === KING) this.kingSq[c] = sq
  }

  private removePiece(sq: number): void {
    const p = this.board[sq]
    this.board[sq] = 0
    const c = p >> 3
    const i = p * 128 + sq
    this.mg[c] -= MG[i]
    this.eg[c] -= EG[i]
    this.phase -= PHASE_INC[p & 7]
    this.count[p]--
    this.hashLo ^= Z_PIECE_LO[i]
    this.hashHi ^= Z_PIECE_HI[i]
  }

  // ─── Attacks ──────────────────────────────────────────────

  isAttacked(sq: number, by: number): boolean {
    const b = this.board
    let a: number
    if (by === WHITE) {
      a = sq + 15; if (!(a & 0x88) && b[a] === (WHITE | PAWN)) return true
      a = sq + 17; if (!(a & 0x88) && b[a] === (WHITE | PAWN)) return true
    } else {
      a = sq - 15; if (!(a & 0x88) && b[a] === (BLACK | PAWN)) return true
      a = sq - 17; if (!(a & 0x88) && b[a] === (BLACK | PAWN)) return true
    }
    const kn = by | KNIGHT, kg = by | KING
    for (let i = 0; i < 8; i++) {
      a = sq + KNIGHT_OFFSETS[i]
      if (!(a & 0x88) && b[a] === kn) return true
      a = sq + KING_OFFSETS[i]
      if (!(a & 0x88) && b[a] === kg) return true
    }
    const bi = by | BISHOP, rk = by | ROOK, qn = by | QUEEN
    for (let i = 0; i < 4; i++) {
      let d = DIAG[i]
      a = sq + d
      while (!(a & 0x88)) {
        const q = b[a]
        if (q) { if (q === bi || q === qn) return true; break }
        a += d
      }
      d = ORTHO[i]
      a = sq + d
      while (!(a & 0x88)) {
        const q = b[a]
        if (q) { if (q === rk || q === qn) return true; break }
        a += d
      }
    }
    return false
  }

  // ─── Move generation (pseudo-legal) ───────────────────────

  /** Fills move slot `slot`; returns the count. capturesOnly also keeps queen promotions. */
  private generate(slot: number, capturesOnly: boolean): number {
    const b = this.board
    const us = this.side
    const them = us ^ 8
    const list = this.moves
    const base = slot * SLOT_SIZE
    let n = 0
    const dir = us === WHITE ? -16 : 16
    const startRow = us === WHITE ? 6 : 1
    const promoRow = us === WHITE ? 0 : 7

    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue }
      const p = b[sq]
      if (!p || (p & 8) !== us) continue
      const t = p & 7

      if (t === PAWN) {
        const to = sq + dir
        const promoting = (to >> 4) === promoRow
        if (b[to] === 0) {
          if (promoting) {
            list[base + n++] = encode(sq, to, QUEEN, 0)
            if (!capturesOnly) {
              list[base + n++] = encode(sq, to, ROOK, 0)
              list[base + n++] = encode(sq, to, BISHOP, 0)
              list[base + n++] = encode(sq, to, KNIGHT, 0)
            }
          } else if (!capturesOnly) {
            list[base + n++] = encode(sq, to, 0, 0)
            if ((sq >> 4) === startRow && b[to + dir] === 0) list[base + n++] = encode(sq, to + dir, 0, F_DOUBLE)
          }
        }
        for (let k = -1; k <= 1; k += 2) {
          const c = to + k
          if (c & 0x88) continue
          const q = b[c]
          if (q && (q & 8) === them) {
            if (promoting) {
              list[base + n++] = encode(sq, c, QUEEN, F_CAPTURE)
              list[base + n++] = encode(sq, c, ROOK, F_CAPTURE)
              list[base + n++] = encode(sq, c, BISHOP, F_CAPTURE)
              list[base + n++] = encode(sq, c, KNIGHT, F_CAPTURE)
            } else {
              list[base + n++] = encode(sq, c, 0, F_CAPTURE)
            }
          } else if (c === this.ep) {
            list[base + n++] = encode(sq, c, 0, F_CAPTURE | F_EP)
          }
        }
        continue
      }

      if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? KNIGHT_OFFSETS : KING_OFFSETS
        for (let i = 0; i < 8; i++) {
          const to = sq + offs[i]
          if (to & 0x88) continue
          const q = b[to]
          if (!q) { if (!capturesOnly) list[base + n++] = encode(sq, to, 0, 0) }
          else if ((q & 8) === them) list[base + n++] = encode(sq, to, 0, F_CAPTURE)
        }
        if (t === KING && !capturesOnly) n = this.genCastles(base, n)
        continue
      }

      // sliders
      if (t === BISHOP || t === QUEEN) n = this.genSlides(sq, DIAG, base, n, capturesOnly, them)
      if (t === ROOK || t === QUEEN) n = this.genSlides(sq, ORTHO, base, n, capturesOnly, them)
    }
    return n
  }

  private genSlides(sq: number, dirs: number[], base: number, n: number, capturesOnly: boolean, them: number): number {
    const b = this.board
    const list = this.moves
    for (let i = 0; i < 4; i++) {
      const d = dirs[i]
      let to = sq + d
      while (!(to & 0x88)) {
        const q = b[to]
        if (!q) {
          if (!capturesOnly) list[base + n++] = encode(sq, to, 0, 0)
        } else {
          if ((q & 8) === them) list[base + n++] = encode(sq, to, 0, F_CAPTURE)
          break
        }
        to += d
      }
    }
    return n
  }

  private genCastles(base: number, n: number): number {
    const b = this.board
    const list = this.moves
    if (this.side === WHITE) {
      if ((this.castle & 1) && b[0x74] === (WHITE | KING) && b[0x77] === (WHITE | ROOK) &&
          !b[0x75] && !b[0x76] &&
          !this.isAttacked(0x74, BLACK) && !this.isAttacked(0x75, BLACK) && !this.isAttacked(0x76, BLACK)) {
        list[base + n++] = encode(0x74, 0x76, 0, F_CASTLE)
      }
      if ((this.castle & 2) && b[0x74] === (WHITE | KING) && b[0x70] === (WHITE | ROOK) &&
          !b[0x73] && !b[0x72] && !b[0x71] &&
          !this.isAttacked(0x74, BLACK) && !this.isAttacked(0x73, BLACK) && !this.isAttacked(0x72, BLACK)) {
        list[base + n++] = encode(0x74, 0x72, 0, F_CASTLE)
      }
    } else {
      if ((this.castle & 4) && b[0x04] === (BLACK | KING) && b[0x07] === (BLACK | ROOK) &&
          !b[0x05] && !b[0x06] &&
          !this.isAttacked(0x04, WHITE) && !this.isAttacked(0x05, WHITE) && !this.isAttacked(0x06, WHITE)) {
        list[base + n++] = encode(0x04, 0x06, 0, F_CASTLE)
      }
      if ((this.castle & 8) && b[0x04] === (BLACK | KING) && b[0x00] === (BLACK | ROOK) &&
          !b[0x03] && !b[0x02] && !b[0x01] &&
          !this.isAttacked(0x04, WHITE) && !this.isAttacked(0x03, WHITE) && !this.isAttacked(0x02, WHITE)) {
        list[base + n++] = encode(0x04, 0x02, 0, F_CASTLE)
      }
    }
    return n
  }

  // ─── Make / unmake ────────────────────────────────────────

  /** Plays a pseudo-legal move; returns false (and undoes it) if it leaves the mover in check. */
  makeMove(m: number): boolean {
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m)
    const us = this.side
    const h = this.hply
    this.uMove[h] = m
    this.uCastle[h] = this.castle
    this.uEp[h] = this.ep
    this.uHalf[h] = this.halfmove
    this.uHashLo[h] = this.hashLo
    this.uHashHi[h] = this.hashHi

    const piece = this.board[from]
    let captured = 0
    if (this.ep >= 0) { this.hashLo ^= Z_EP_LO[this.ep & 7]; this.hashHi ^= Z_EP_HI[this.ep & 7] }

    if (flags & F_EP) {
      const capSq = to + (us === WHITE ? 16 : -16)
      captured = this.board[capSq]
      this.removePiece(capSq)
    } else if (this.board[to]) {
      captured = this.board[to]
      this.removePiece(to)
    }
    this.uCaptured[h] = captured

    this.removePiece(from)
    this.addPiece(to, promo ? (us | promo) : piece)

    if (flags & F_CASTLE) {
      if (to === 0x76) { this.removePiece(0x77); this.addPiece(0x75, WHITE | ROOK) }
      else if (to === 0x72) { this.removePiece(0x70); this.addPiece(0x73, WHITE | ROOK) }
      else if (to === 0x06) { this.removePiece(0x07); this.addPiece(0x05, BLACK | ROOK) }
      else if (to === 0x02) { this.removePiece(0x00); this.addPiece(0x03, BLACK | ROOK) }
    }

    this.hashLo ^= Z_CASTLE_LO[this.castle]; this.hashHi ^= Z_CASTLE_HI[this.castle]
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to]
    this.hashLo ^= Z_CASTLE_LO[this.castle]; this.hashHi ^= Z_CASTLE_HI[this.castle]

    this.ep = -1
    if (flags & F_DOUBLE) {
      // only record the en-passant square when an enemy pawn could actually capture
      const enemyPawn = (us ^ 8) | PAWN
      const l = to - 1, r = to + 1
      if ((!(l & 0x88) && this.board[l] === enemyPawn) || (!(r & 0x88) && this.board[r] === enemyPawn)) {
        this.ep = (from + to) >> 1
        this.hashLo ^= Z_EP_LO[this.ep & 7]; this.hashHi ^= Z_EP_HI[this.ep & 7]
      }
    }

    this.halfmove = (piece & 7) === PAWN || captured ? 0 : this.halfmove + 1
    this.side = us ^ 8
    this.hashLo ^= Z_SIDE_LO; this.hashHi ^= Z_SIDE_HI
    this.hply = h + 1
    this.posLo[h + 1] = this.hashLo
    this.posHi[h + 1] = this.hashHi

    if (this.isAttacked(this.kingSq[us >> 3], this.side)) {
      this.unmakeMove()
      return false
    }
    return true
  }

  unmakeMove(): void {
    const h = --this.hply
    const m = this.uMove[h]
    const from = mFrom(m), to = mTo(m), promo = mPromo(m), flags = mFlags(m)
    const us = this.side ^ 8
    this.side = us

    const moved = this.board[to]
    this.removePiece(to)
    this.addPiece(from, promo ? (us | PAWN) : moved)

    const captured = this.uCaptured[h]
    if (flags & F_EP) this.addPiece(to + (us === WHITE ? 16 : -16), captured)
    else if (captured) this.addPiece(to, captured)

    if (flags & F_CASTLE) {
      if (to === 0x76) { this.removePiece(0x75); this.addPiece(0x77, WHITE | ROOK) }
      else if (to === 0x72) { this.removePiece(0x73); this.addPiece(0x70, WHITE | ROOK) }
      else if (to === 0x06) { this.removePiece(0x05); this.addPiece(0x07, BLACK | ROOK) }
      else if (to === 0x02) { this.removePiece(0x03); this.addPiece(0x00, BLACK | ROOK) }
    }

    this.castle = this.uCastle[h]
    this.ep = this.uEp[h]
    this.halfmove = this.uHalf[h]
    this.hashLo = this.uHashLo[h]
    this.hashHi = this.uHashHi[h]
  }

  private makeNull(): void {
    const h = this.hply
    this.uMove[h] = 0
    this.uEp[h] = this.ep
    this.uHalf[h] = this.halfmove
    this.uHashLo[h] = this.hashLo
    this.uHashHi[h] = this.hashHi
    if (this.ep >= 0) { this.hashLo ^= Z_EP_LO[this.ep & 7]; this.hashHi ^= Z_EP_HI[this.ep & 7] }
    this.ep = -1
    this.halfmove++
    this.side ^= 8
    this.hashLo ^= Z_SIDE_LO; this.hashHi ^= Z_SIDE_HI
    this.hply = h + 1
    this.posLo[h + 1] = this.hashLo
    this.posHi[h + 1] = this.hashHi
  }

  private unmakeNull(): void {
    const h = --this.hply
    this.side ^= 8
    this.ep = this.uEp[h]
    this.halfmove = this.uHalf[h]
    this.hashLo = this.uHashLo[h]
    this.hashHi = this.uHashHi[h]
  }

  // ─── Perft (correctness check) ────────────────────────────

  perft(depth: number, ply = 0): number {
    if (depth === 0) return 1
    const n = this.generate(ply, false)
    const base = ply * SLOT_SIZE
    let total = 0
    for (let i = 0; i < n; i++) {
      if (!this.makeMove(this.moves[base + i])) continue
      total += this.perft(depth - 1, ply + 1)
      this.unmakeMove()
    }
    return total
  }

  // ─── Draw detection ───────────────────────────────────────

  private isRepetition(): boolean {
    const lo = this.hashLo, hi = this.hashHi
    const stop = Math.max(0, this.hply - this.halfmove)
    for (let i = this.hply - 2; i >= stop; i -= 2) {
      if (this.posLo[i] === lo && this.posHi[i] === hi) return true
    }
    return false
  }

  private insufficientMaterial(): boolean {
    const c = this.count
    if (c[WHITE | PAWN] || c[BLACK | PAWN] || c[WHITE | ROOK] || c[BLACK | ROOK] || c[WHITE | QUEEN] || c[BLACK | QUEEN]) return false
    return c[WHITE | KNIGHT] + c[WHITE | BISHOP] <= 1 && c[BLACK | KNIGHT] + c[BLACK | BISHOP] <= 1
  }

  private nonPawnMaterial(color: number): number {
    const c = this.count
    return c[color | KNIGHT] * NP_VALUE[KNIGHT] + c[color | BISHOP] * NP_VALUE[BISHOP] +
           c[color | ROOK] * NP_VALUE[ROOK] + c[color | QUEEN] * NP_VALUE[QUEEN]
  }

  // ─── Evaluation (side-to-move perspective) ────────────────

  evaluate(): number {
    const c = this.count
    const phase = Math.min(this.phase, 24)
    let mg = this.mg[0] - this.mg[1]
    let eg = this.eg[0] - this.eg[1]
    if (c[WHITE | BISHOP] >= 2) { mg += 30; eg += 50 }
    if (c[BLACK | BISHOP] >= 2) { mg -= 30; eg -= 50 }
    let score = ((mg * phase + eg * (24 - phase)) / 24) | 0

    if (phase <= 8) {
      const wNP = this.nonPawnMaterial(WHITE), bNP = this.nonPawnMaterial(BLACK)
      const wPawns = c[WHITE | PAWN], bPawns = c[BLACK | PAWN]
      // drive a lone king to the edge and bring our king closer
      if (bNP === 0 && bPawns === 0 && wNP >= 500) score += mopUp(this.kingSq[1], this.kingSq[0])
      if (wNP === 0 && wPawns === 0 && bNP >= 500) score -= mopUp(this.kingSq[0], this.kingSq[1])
      // without pawns, less than a rook's advantage rarely wins
      if (score > 0 && wPawns === 0 && wNP - bNP < 400) score = (score / 4) | 0
      if (score < 0 && bPawns === 0 && bNP - wNP < 400) score = (score / 4) | 0
    }

    score += this.side === WHITE ? 12 : -12 // tempo
    if (this.noiseAmp > 0) {
      let x = (this.hashLo ^ this.noiseSeed) | 0
      x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
      x = Math.imul(x ^ (x >>> 16), 0x45d9f3b)
      x ^= x >>> 16
      score += ((x >>> 0) % (2 * this.noiseAmp + 1)) - this.noiseAmp
    }
    return this.side === WHITE ? score : -score
  }

  // ─── Transposition table ──────────────────────────────────

  private clearTT(): void {
    this.ttKey.fill(0)
    this.ttMove.fill(0)
    this.ttFlag.fill(0)
  }

  private ttStore(depth: number, flag: number, score: number, move: number, ply: number): void {
    const i = this.hashLo & TT_MASK
    if (score > MATE - 200) score += ply
    else if (score < -MATE + 200) score -= ply
    this.ttKey[i] = this.hashHi
    this.ttMove[i] = move
    this.ttScore[i] = score
    this.ttDepth[i] = depth
    this.ttFlag[i] = flag
  }

  // ─── Search ───────────────────────────────────────────────

  private checkTime(): void {
    if ((this.nodes & 1023) === 0 && now() > this.deadline) this.stopped = true
  }

  private scoreMoves(slot: number, n: number, ttMove: number, ply: number): void {
    const base = slot * SLOT_SIZE
    const b = this.board
    const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1]
    for (let i = 0; i < n; i++) {
      const m = this.moves[base + i]
      let s: number
      if (m === ttMove) s = 4_000_000
      else {
        const flags = mFlags(m)
        const promo = mPromo(m)
        if (flags & F_CAPTURE) {
          const victim = flags & F_EP ? PAWN : b[mTo(m)] & 7
          s = 2_000_000 + VALUE[victim] * 16 - (b[mFrom(m)] & 7) + (promo === QUEEN ? 900 : 0)
        } else if (promo) {
          s = promo === QUEEN ? 1_900_000 : 100 + promo
        } else if (m === k1) s = 1_500_000
        else if (m === k2) s = 1_400_000
        else s = this.history[b[mFrom(m)] * 128 + mTo(m)]
      }
      this.scores[base + i] = s
    }
  }

  /** Selection sort step: move the best remaining move to index i and return it. */
  private pickMove(slot: number, i: number, n: number): number {
    const base = slot * SLOT_SIZE
    let best = i
    let bestScore = this.scores[base + i]
    for (let j = i + 1; j < n; j++) {
      const s = this.scores[base + j]
      if (s > bestScore) { bestScore = s; best = j }
    }
    if (best !== i) {
      const tm = this.moves[base + i]; this.moves[base + i] = this.moves[base + best]; this.moves[base + best] = tm
      const ts = this.scores[base + i]; this.scores[base + i] = this.scores[base + best]; this.scores[base + best] = ts
    }
    return this.moves[base + i]
  }

  private quiesce(alpha: number, beta: number, ply: number): number {
    this.nodes++
    this.checkTime()
    if (this.stopped) return 0
    if (ply >= MAX_PLY) return this.evaluate()

    const inCheck = this.isAttacked(this.kingSq[this.side >> 3], this.side ^ 8)
    let best = -INF
    let standPat = 0
    if (!inCheck) {
      standPat = this.evaluate()
      if (standPat >= beta) return standPat
      if (standPat > alpha) alpha = standPat
      best = standPat
    }

    const n = this.generate(ply, !inCheck)
    this.scoreMoves(ply, n, 0, ply)
    let legal = 0
    for (let i = 0; i < n; i++) {
      const m = this.pickMove(ply, i, n)
      if (!inCheck && !mPromo(m)) {
        // delta pruning: even winning this piece cannot lift alpha
        const victim = mFlags(m) & F_EP ? PAWN : this.board[mTo(m)] & 7
        if (standPat + VALUE[victim] + 200 < alpha) continue
      }
      if (!this.makeMove(m)) continue
      legal++
      const score = -this.quiesce(-beta, -alpha, ply + 1)
      this.unmakeMove()
      if (this.stopped) return 0
      if (score > best) {
        best = score
        if (score > alpha) {
          alpha = score
          if (score >= beta) return score
        }
      }
    }
    if (inCheck && legal === 0) return -MATE + ply
    return best
  }

  private negamax(depth: number, alpha: number, beta: number, ply: number, allowNull: boolean): number {
    const pvNode = beta - alpha > 1
    const root = ply === 0

    if (!root) {
      if (this.halfmove >= 100 || this.isRepetition() || this.insufficientMaterial()) return 0
      // mate distance pruning
      if (alpha < -MATE + ply) alpha = -MATE + ply
      if (beta > MATE - ply - 1) beta = MATE - ply - 1
      if (alpha >= beta) return alpha
      if (ply >= MAX_PLY - 2) return this.evaluate()
    }

    const inCheck = this.isAttacked(this.kingSq[this.side >> 3], this.side ^ 8)
    if (inCheck) depth++
    if (depth <= 0) return this.quiesce(alpha, beta, ply)

    this.nodes++
    this.checkTime()
    if (this.stopped) return 0

    // transposition table probe
    let ttMove = 0
    const ti = this.hashLo & TT_MASK
    if (this.ttFlag[ti] && this.ttKey[ti] === this.hashHi) {
      ttMove = this.ttMove[ti]
      if (!root && !pvNode && this.ttDepth[ti] >= depth) {
        let s = this.ttScore[ti]
        if (s > MATE - 200) s -= ply
        else if (s < -MATE + 200) s += ply
        const f = this.ttFlag[ti]
        if (f === TT_EXACT || (f === TT_LOWER && s >= beta) || (f === TT_UPPER && s <= alpha)) return s
      }
    }

    const us = this.side
    const staticEval = inCheck ? -INF : this.evaluate()

    if (!pvNode && !inCheck) {
      // reverse futility pruning
      if (depth <= 3 && staticEval - 110 * depth >= beta && Math.abs(beta) < MATE - 200) return staticEval
      // null-move pruning
      if (allowNull && depth >= 3 && staticEval >= beta && this.nonPawnMaterial(us) > 0) {
        const R = depth >= 7 ? 3 : 2
        this.makeNull()
        const s = -this.negamax(depth - 1 - R, -beta, -beta + 1, ply + 1, false)
        this.unmakeNull()
        if (this.stopped) return 0
        if (s >= beta) return Math.abs(s) >= MATE - 200 ? beta : s
      }
    }

    const n = this.generate(ply, false)
    this.scoreMoves(ply, n, ttMove, ply)
    let legal = 0
    let best = -INF
    let bestMove = 0
    const origAlpha = alpha

    for (let i = 0; i < n; i++) {
      const m = this.pickMove(ply, i, n)
      const flags = mFlags(m)
      const quiet = !(flags & F_CAPTURE) && !mPromo(m)
      const fromPiece = this.board[mFrom(m)]
      if (!this.makeMove(m)) continue
      legal++
      const givesCheck = this.isAttacked(this.kingSq[this.side >> 3], us)

      let score: number
      if (legal === 1) {
        score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true)
      } else {
        let R = 0
        if (depth >= 3 && legal > 3 && quiet && !inCheck && !givesCheck &&
            m !== this.killers[ply * 2] && m !== this.killers[ply * 2 + 1]) {
          R = 1 + (legal > 8 ? 1 : 0) + (depth >= 8 ? 1 : 0)
          if (pvNode) R--
        }
        score = -this.negamax(depth - 1 - R, -alpha - 1, -alpha, ply + 1, true)
        if (score > alpha && R > 0) score = -this.negamax(depth - 1, -alpha - 1, -alpha, ply + 1, true)
        if (score > alpha && score < beta) score = -this.negamax(depth - 1, -beta, -alpha, ply + 1, true)
      }
      this.unmakeMove()
      if (this.stopped) return 0

      if (score > best) {
        best = score
        bestMove = m
        if (score > alpha) {
          alpha = score
          if (root) { this.rootBest = m; this.rootBestScore = score }
          if (score >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) {
                this.killers[ply * 2 + 1] = this.killers[ply * 2]
                this.killers[ply * 2] = m
              }
              const hi = fromPiece * 128 + mTo(m)
              this.history[hi] = Math.min(this.history[hi] + depth * depth, 1_000_000)
            }
            this.ttStore(depth, TT_LOWER, score, m, ply)
            return score
          }
        }
      }
    }

    if (legal === 0) return inCheck ? -MATE + ply : 0
    this.ttStore(depth, alpha > origAlpha ? TT_EXACT : TT_UPPER, best, bestMove, ply)
    return best
  }

  /** Legal root moves as encoded ints. */
  private rootMoves(): number[] {
    const n = this.generate(0, false)
    const out: number[] = []
    for (let i = 0; i < n; i++) {
      const m = this.moves[i]
      if (this.makeMove(m)) { out.push(m); this.unmakeMove() }
    }
    return out
  }

  /**
   * Iterative deepening as a generator: yields after each completed depth so a
   * main-thread fallback can spread the work across tasks. `search()` drains it.
   */
  *iterate(cfg: SearchConfig, rng: () => number = Math.random): Generator<number, SearchResult, void> {
    const start = now()
    this.deadline = start + cfg.timeMs
    this.stopped = false
    this.nodes = 0
    this.killers.fill(0)
    for (let i = 0; i < this.history.length; i++) this.history[i] >>= 3
    if (cfg.noise > 0 || this.lastNoiseAmp > 0) this.clearTT()
    this.noiseAmp = cfg.noise
    this.lastNoiseAmp = cfg.noise
    this.noiseSeed = (rng() * 4294967296) | 0

    const done = (move: number, score: number, depth: number): SearchResult => ({
      move: move ? moveToUci(move) : null,
      score, depth, nodes: this.nodes, timeMs: Math.round(now() - start),
    })

    const legal = this.rootMoves()
    if (legal.length === 0) return done(0, this.inCheck() ? -MATE : 0, 0)
    if (legal.length === 1 && !cfg.analyze) return done(legal[0], this.evaluate(), 0)

    if (cfg.blunder > 0 && rng() < cfg.blunder) {
      return done(legal[Math.floor(rng() * legal.length)], this.evaluate(), 0)
    }

    // Weakened play: score every root move to a shallow depth, then pick
    // randomly (weighted) among moves close to the best.
    if (cfg.margin > 0) {
      const depth = Math.max(1, cfg.maxDepth)
      const scored: { m: number; s: number }[] = []
      for (const m of legal) {
        if (!this.makeMove(m)) continue
        const s = -this.negamax(depth - 1, -INF, INF, 1, true)
        this.unmakeMove()
        if (this.stopped) break
        scored.push({ m, s })
      }
      if (scored.length === 0) return done(legal[0], this.evaluate(), 0)
      const top = Math.max(...scored.map((x) => x.s))
      const cands = scored.filter((x) => x.s >= top - cfg.margin)
      const weights = cands.map((x) => cfg.margin + 10 - (top - x.s))
      let r = rng() * weights.reduce((a, w) => a + w, 0)
      let pick = cands[0]
      for (let i = 0; i < cands.length; i++) {
        r -= weights[i]
        if (r <= 0) { pick = cands[i]; break }
      }
      return done(pick.m, pick.s, depth)
    }

    let bestMove = legal[0]
    let bestScore = 0
    let completed = 0
    for (let depth = 1; depth <= cfg.maxDepth; depth++) {
      this.rootBest = 0
      this.rootBestScore = -INF
      let score: number
      if (depth >= 4 && Math.abs(bestScore) < MATE - 200) {
        let lo = bestScore - 35, hi = bestScore + 35
        score = this.negamax(depth, lo, hi, 0, false)
        while (!this.stopped && (score <= lo || score >= hi)) {
          lo = score <= lo ? Math.max(-INF, lo - 200) : lo
          hi = score >= hi ? Math.min(INF, hi + 200) : hi
          if (lo <= -INF + 1000 && hi >= INF - 1000) { score = this.negamax(depth, -INF, INF, 0, false); break }
          score = this.negamax(depth, lo, hi, 0, false)
        }
      } else {
        score = this.negamax(depth, -INF, INF, 0, false)
      }

      if (this.stopped) {
        // a move that beat the previous best in a partial iteration is still an improvement
        if (this.rootBest) {
          bestMove = this.rootBest
          bestScore = this.rootBestScore
        }
        break
      }
      if (this.rootBest) bestMove = this.rootBest
      bestScore = score
      completed = depth
      yield depth
      if (Math.abs(score) >= MATE - 200 && MATE - Math.abs(score) <= depth) break
      if (now() - start > cfg.timeMs * 0.55) break
    }
    return done(bestMove, bestScore, completed)
  }

  search(cfg: SearchConfig, rng?: () => number): SearchResult {
    const it = this.iterate(cfg, rng)
    for (;;) {
      const r = it.next()
      if (r.done) return r.value
    }
  }
}

function mopUp(loserK: number, winnerK: number): number {
  const lf = loserK & 7, lr = loserK >> 4
  const wf = winnerK & 7, wr = winnerK >> 4
  const centre = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4)
  const dist = Math.abs(lf - wf) + Math.abs(lr - wr)
  return 12 * centre + 6 * (14 - dist)
}

export function moveToUci(m: number): string {
  const promo = mPromo(m)
  return sqName(mFrom(m)) + sqName(mTo(m)) + (promo ? PROMO_CHARS[promo] : "")
}
