// ============================================================
// FreeCell — pure rules, scoring, hints and layout.
// Deals use the classic Microsoft FreeCell generator, so
// "Deal #N" here is the same layout as Microsoft's deal N.
// Score: +10 per card played to a foundation, undo -10 (the move
// is reverted too); a win adds 1,000 plus +5 for every second
// under 10 minutes.
// ============================================================

import type { Rank, Suit } from "@/components/game/arcade/kit/cards"
import { cardCode, positionKey, solutionMap, solveFreeCell, type SolverInput, type SolverMove } from "./freecell-solver"
import { fanOffsets, makeGrid, rect } from "./layout"
import {
  describeMove, fmtNum, fmtTime, isAltRun, isRedCard, last, pileKind, pileNo,
  type FxMap, type Hint, type MoveRef, type PileId, type Placement, type SCard, type ScoreCtx,
  type SlotSpec, type SolitaireAdapter, type Step, type TableLayout, type Transition,
} from "./model"

export interface FcState {
  t:     SCard[][]
  cells: (SCard | null)[]
  f:     SCard[][]
  deal:  number
  score: number
  moves: number
}

export const FC_UNDO_PENALTY = 10
export const FC_WIN_BONUS = 1000
export function fcSpeedBonus(elapsed: number): number {
  return 5 * Math.max(0, 600 - Math.floor(elapsed))
}
/** Deals 1..1,000,000 that are known to be unsolvable — never offered at random. */
export const FC_UNSOLVABLE = new Set([11982, 146692, 186216, 455889, 495505, 512118, 517776, 781948])
export const FC_MAX_DEAL = 1000000

const T_IDS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7"]
const C_IDS = ["c0", "c1", "c2", "c3"]
const F_IDS = ["f0", "f1", "f2", "f3"]

// ─── Microsoft deal generator ─────────────────────────────────

/** Columns for Microsoft FreeCell deal number `n` (LCG 214013 / 2531011). */
export function msDeal(n: number): SCard[][] {
  let seed = n % 2147483648
  const rand = () => {
    seed = (seed * 214013 + 2531011) % 2147483648
    return Math.floor(seed / 65536)
  }
  const cards = Array.from({ length: 52 }, (_, i) => 51 - i)
  for (let i = 0; i < 52; i++) {
    const j = 51 - (rand() % (52 - i))
    const tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp
  }
  const suits: Suit[] = ["C", "D", "H", "S"]
  const t: SCard[][] = Array.from({ length: 8 }, () => [])
  cards.forEach((c, k) => {
    const suit = suits[c % 4]
    const rank = (Math.floor(c / 4) + 1) as Rank
    t[k % 8].push({ id: `${suit}${rank}`, suit, rank, up: true })
  })
  return t
}

export function randomDealNumber(rng: () => number): number {
  for (;;) {
    const n = 1 + Math.floor(rng() * FC_MAX_DEAL)
    if (!FC_UNSOLVABLE.has(n)) return n
  }
}

export function newFreeCell(deal: number): Transition<FcState> {
  const t = msDeal(deal)
  const fx: FxMap = {}
  let k = 0
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 8; col++) {
      const c = t[col][row]
      if (c) fx[c.id] = 0.15 + k++ * 0.016
    }
  }
  const state: FcState = { t, cells: [null, null, null, null], f: [[], [], [], []], deal, score: 0, moves: 0 }
  return { state, fx, then: [{ wait: 150, run: safeStep }] }
}

// ─── Pile access ──────────────────────────────────────────────

export function fcPile(s: FcState, id: PileId): SCard[] {
  switch (pileKind(id)) {
    case "tableau":    return s.t[pileNo(id)] ?? []
    case "foundation": return s.f[pileNo(id)] ?? []
    case "cell": {
      const c = s.cells[pileNo(id)]
      return c ? [c] : []
    }
    default: return []
  }
}

// ─── Rules ────────────────────────────────────────────────────

export function fcFreeCells(s: FcState): number {
  return s.cells.filter((c) => !c).length
}

export function fcEmptyColumns(s: FcState): number {
  return s.t.filter((c) => !c.length).length
}

/** Supermove limit: (1 + free cells) x 2^(empty columns), not counting an empty destination. */
export function fcMaxMove(s: FcState, toEmpty: boolean): number {
  const cols = fcEmptyColumns(s) - (toEmpty ? 1 : 0)
  return (1 + fcFreeCells(s)) * 2 ** Math.max(0, cols)
}

export function fcCanPick(s: FcState, pile: PileId, index: number): boolean {
  const cards = fcPile(s, pile)
  if (index < 0 || index >= cards.length) return false
  switch (pileKind(pile)) {
    case "tableau": return isAltRun(cards, index) && cards.length - index <= fcMaxMove(s, false)
    case "cell":    return index === 0
    default:        return false
  }
}

function fitsFoundation(lead: SCard, pile: readonly SCard[]): boolean {
  const top = last(pile)
  return top ? top.suit === lead.suit && top.rank + 1 === lead.rank : lead.rank === 1
}

export function fcCanPlace(s: FcState, moving: readonly SCard[], to: PileId): boolean {
  if (!moving.length) return false
  switch (pileKind(to)) {
    case "cell":       return moving.length === 1 && !s.cells[pileNo(to)]
    case "foundation": return moving.length === 1 && fitsFoundation(moving[0], s.f[pileNo(to)])
    case "tableau": {
      const top = last(s.t[pileNo(to)])
      if (!top) return moving.length <= fcMaxMove(s, true)
      return isRedCard(top) !== isRedCard(moving[0]) && top.rank === moving[0].rank + 1 && moving.length <= fcMaxMove(s, false)
    }
    default: return false
  }
}

export function fcTargets(s: FcState, pile: PileId, index: number): PileId[] {
  if (!fcCanPick(s, pile, index)) return []
  const moving = fcPile(s, pile).slice(index)
  return [...F_IDS, ...T_IDS, ...C_IDS].filter((id) => id !== pile && fcCanPlace(s, moving, id))
}

function setPile(s: FcState, id: PileId, cards: SCard[], next: FcState) {
  switch (pileKind(id)) {
    case "tableau":    next.t[pileNo(id)] = cards; break
    case "foundation": next.f[pileNo(id)] = cards; break
    case "cell":       next.cells[pileNo(id)] = cards[0] ?? null; break
  }
}

/** Apply a move without follow-ups. */
export function fcApply(s: FcState, m: MoveRef): FcState | null {
  if (m.from === m.to || !fcCanPick(s, m.from, m.index)) return null
  const src = fcPile(s, m.from)
  const moving = src.slice(m.index)
  if (!fcCanPlace(s, moving, m.to)) return null
  const next: FcState = { ...s, t: s.t.slice(), cells: s.cells.slice(), f: s.f.slice() }
  setPile(s, m.from, src.slice(0, m.index), next)
  setPile(s, m.to, fcPile(s, m.to).concat(moving), next)
  next.moves = s.moves + 1
  if (pileKind(m.to) === "foundation") next.score = s.score + 10
  return next
}

function homeRank(s: FcState, suit: Suit): number {
  return s.f.find((p) => p[0]?.suit === suit)?.length ?? 0
}

function foundationFor(s: FcState, card: SCard): PileId | null {
  for (let i = 0; i < 4; i++) if (s.f[i].length && fitsFoundation(card, s.f[i])) return F_IDS[i]
  for (let i = 0; i < 4; i++) if (!s.f[i].length && fitsFoundation(card, s.f[i])) return F_IDS[i]
  return null
}

/** A card is safe to play home when no card still in play could need it as a target. */
function isSafe(s: FcState, card: SCard): boolean {
  if (card.rank <= 2) return true
  const opposite: Suit[] = isRedCard(card) ? ["S", "C"] : ["H", "D"]
  return opposite.every((suit) => homeRank(s, suit) >= card.rank - 1)
}

/** Next safe auto-move to a foundation (column tops and free cells). */
export function fcSafeMove(s: FcState): MoveRef | null {
  const sources: PileId[] = [...C_IDS, ...T_IDS]
  for (const id of sources) {
    const cards = fcPile(s, id)
    const top = last(cards)
    if (!top || !isSafe(s, top)) continue
    const f = foundationFor(s, top)
    if (f) return { from: id, index: cards.length - 1, to: f }
  }
  return null
}

function safeStep(s: FcState): Transition<FcState> | null {
  const m = fcSafeMove(s)
  if (!m) return null
  const next = fcApply(s, m)
  if (!next) return null
  next.moves = s.moves                  // automatic plays are not counted as moves
  return { state: next, then: [{ wait: 120, run: safeStep }] }
}

export function fcMove(s: FcState, m: MoveRef): Transition<FcState> | null {
  const next = fcApply(s, m)
  if (!next) return null
  return { state: next, then: fcSafeMove(next) ? [{ wait: 230, run: safeStep }] : undefined }
}

export function fcIsWon(s: FcState): boolean {
  return s.f.every((p) => p.length === 13)
}

export function fcQuickTarget(s: FcState, pile: PileId, index: number): PileId | null {
  if (!fcCanPick(s, pile, index)) return null
  const cards = fcPile(s, pile)
  const moving = cards.slice(index)
  if (moving.length === 1) {
    const f = foundationFor(s, moving[0])
    if (f) return f
  }
  const filled = T_IDS.find((id) => id !== pile && s.t[pileNo(id)].length > 0 && fcCanPlace(s, moving, id))
  if (filled) return filled
  if (pileKind(pile) === "tableau" && moving.length === 1) {
    const cell = C_IDS.find((id) => fcCanPlace(s, moving, id))
    if (cell) return cell
  }
  if (pileKind(pile) === "tableau" && index === 0) return null
  return T_IDS.find((id) => id !== pile && !s.t[pileNo(id)].length && fcCanPlace(s, moving, id)) ?? null
}

// ─── Hints and move detection ─────────────────────────────────

function hintFor(s: FcState, m: MoveRef): Hint {
  return { kind: "move", move: m, text: describeMove(fcPile(s, m.from).slice(m.index), m.to, fcPile(s, m.to)) }
}

/** Ranked sensible moves (pointless shuffles left out), used for the fallback hint. */
function candidates(s: FcState): { m: MoveRef; prio: number }[] {
  const out: { m: MoveRef; prio: number }[] = []
  // to foundations
  for (const id of [...C_IDS, ...T_IDS]) {
    const cards = fcPile(s, id)
    const top = last(cards)
    if (!top) continue
    const f = foundationFor(s, top)
    if (f) out.push({ m: { from: id, index: cards.length - 1, to: f }, prio: 100 })
  }
  // column runs onto other columns
  for (let c = 0; c < 8; c++) {
    const col = s.t[c]
    for (let i = col.length - 1; i >= 0 && isAltRun(col, i); i--) {
      const below = i > 0 ? col[i - 1] : null
      const sitsWell = !!below && isRedCard(below) !== isRedCard(col[i]) && below.rank === col[i].rank + 1
      const moving = col.slice(i)
      for (let d = 0; d < 8; d++) {
        if (d === c || !fcCanPlace(s, moving, T_IDS[d])) continue
        const empty = !s.t[d].length
        let prio: number
        // a run already in order only moves sideways to free the card beneath for home
        if (!empty) prio = sitsWell ? (foundationFor(s, below!) ? 55 : 0) : i === 0 ? 70 : 60 + moving.length
        else prio = i === 0 ? 0 : sitsWell ? 15 : 30 + moving.length
        if (prio > 0) out.push({ m: { from: T_IDS[c], index: i, to: T_IDS[d] }, prio })
      }
    }
  }
  // free cells back to the columns
  for (const id of C_IDS) {
    const card = s.cells[pileNo(id)]
    if (!card) continue
    for (const d of T_IDS) {
      if (!fcCanPlace(s, [card], d)) continue
      out.push({ m: { from: id, index: 0, to: d }, prio: s.t[pileNo(d)].length ? 65 : 25 })
    }
  }
  // column top to a free cell: prefer the column hiding the next card needed at home
  const cell = C_IDS.find((id) => !s.cells[pileNo(id)])
  if (cell) {
    for (let c = 0; c < 8; c++) {
      const col = s.t[c]
      if (!col.length) continue
      const below = col.length > 1 ? col[col.length - 2] : null
      const top = col[col.length - 1]
      if (below && isRedCard(below) !== isRedCard(top) && below.rank === top.rank + 1) continue
      // cards sitting on top of the next card needed at home (fewer = better)
      const needed = col.findIndex((x) => homeRank(s, x.suit) === x.rank - 1)
      const prio = needed >= 0 ? Math.max(2, 20 - (col.length - 1 - needed)) : 1
      out.push({ m: { from: T_IDS[c], index: col.length - 1, to: cell }, prio })
    }
  }
  return out.sort((a, b) => b.prio - a.prio)
}

/** Apply a move plus the safe auto-moves that would follow it. */
function settled(s: FcState, m: MoveRef): FcState | null {
  let x = fcApply(s, m)
  if (!x) return null
  for (let safe = fcSafeMove(x); safe; safe = fcSafeMove(x)) x = fcApply(x, safe) ?? x
  return x
}

/** Position quality: cards home, free space, and how buried the low cards are. */
function evaluate(s: FcState): number {
  let home = 0
  for (const p of s.f) home += p.length
  let blockers = 0, disorder = 0
  for (const col of s.t) {
    let minBelow = 99
    for (let i = 0; i < col.length; i++) {
      const c = col[i]
      if (c.rank > minBelow) blockers++
      if (c.rank < minBelow) minBelow = c.rank
      if (i > 0) {
        const b = col[i - 1]
        if (isRedCard(b) === isRedCard(c) || b.rank !== c.rank + 1) disorder++
      }
    }
  }
  return home * 100 + fcFreeCells(s) * 14 + fcEmptyColumns(s) * 32 - blockers * 5 - disorder * 2
}

const SUIT_INDEX: Record<Suit, number> = { S: 0, H: 1, D: 2, C: 3 }

function solverInput(s: FcState): SolverInput {
  const ch = (c: SCard) => cardCode(SUIT_INDEX[c.suit], c.rank)
  return {
    cols: s.t.map((col) => col.map(ch).join("")),
    cells: s.cells.filter((c): c is SCard => !!c).map(ch).join(""),
    found: (["S", "H", "D", "C"] as Suit[]).map((suit) => homeRank(s, suit)),
  }
}

/** Translate a solver move back to pile ids of the real state. */
function fromSolver(s: FcState, m: SolverMove): MoveRef | null {
  const cellOf = (card: number) => s.cells.findIndex((c) => !!c && cardCode(SUIT_INDEX[c.suit], c.rank) === cardCode(Math.floor(card / 13), (card % 13) + 1))
  switch (m.kind) {
    case "col-col":  return { from: T_IDS[m.from], index: s.t[m.from].length - m.count, to: T_IDS[m.to] }
    case "col-cell": {
      const cell = C_IDS.find((id) => !s.cells[pileNo(id)])
      return cell ? { from: T_IDS[m.from], index: s.t[m.from].length - 1, to: cell } : null
    }
    case "col-home": {
      const top = last(s.t[m.from])
      const f = top && foundationFor(s, top)
      return f ? { from: T_IDS[m.from], index: s.t[m.from].length - 1, to: f } : null
    }
    case "cell-col": {
      const i = cellOf(m.card)
      return i >= 0 ? { from: C_IDS[i], index: 0, to: T_IDS[m.to] } : null
    }
    case "cell-home": {
      const i = cellOf(m.card)
      const f = i >= 0 ? foundationFor(s, s.cells[i]!) : null
      return f ? { from: C_IDS[i], index: 0, to: f } : null
    }
  }
}

// The last solution found, keyed by position, so following hints stays instant.
let solved: Map<string, SolverMove> | null = null

/** Next move of a full solution from here (null if none found within the search budget). */
export function fcSolverMove(s: FcState, budget = 12000): MoveRef | null {
  const input = solverInput(s)
  const key = positionKey(input)
  let next = solved?.get(key)
  if (!next) {
    const path = solveFreeCell(input, budget)
    if (!path?.length) return null
    solved = solutionMap(input, path)
    next = path[0]
  }
  const m = fromSolver(s, next)
  return m && fcApply(s, m) ? m : null
}

/** Hint: the next move of a solution; otherwise the best move by a two-move lookahead. */
export function fcHint(s: FcState): Hint | null {
  const solverMove = fcSolverMove(s)
  if (solverMove) return hintFor(s, solverMove)
  const list = candidates(s)
  if (!list.length) return null
  let best = list[0].m
  let bestScore = -Infinity
  for (const { m, prio } of list) {
    const a = settled(s, m)
    if (!a) continue
    const now = evaluate(a)
    let ahead = now
    for (const { m: m2 } of candidates(a)) {
      const b = settled(a, m2)
      if (b) ahead = Math.max(ahead, evaluate(b))
    }
    const score = now * 0.45 + ahead * 0.55 + prio * 0.05
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return hintFor(s, best)
}

/** Stuck only when no legal move exists at all (as in Microsoft FreeCell). */
export function fcHasMoves(s: FcState): boolean {
  for (const id of [...C_IDS, ...T_IDS]) {
    const cards = fcPile(s, id)
    for (let i = cards.length - 1; i >= 0 && fcCanPick(s, id, i); i--) {
      if (fcTargets(s, id, i).length) return true
    }
  }
  return false
}

/** Every column in descending order: the rest plays home without thought. */
export function fcAutoComplete(s: FcState): Step<FcState>[] | null {
  if (fcIsWon(s)) return null
  for (const col of s.t) {
    for (let i = 1; i < col.length; i++) if (col[i].rank > col[i - 1].rank) return null
  }
  const steps: Step<FcState>[] = []
  let x = s
  for (let guard = 0; guard < 60 && !fcIsWon(x); guard++) {
    let best: MoveRef | null = null
    let bestRank = 99
    for (const id of [...C_IDS, ...T_IDS]) {
      const cards = fcPile(x, id)
      const top = last(cards)
      if (!top || top.rank >= bestRank) continue
      const f = foundationFor(x, top)
      if (f) { best = { from: id, index: cards.length - 1, to: f }; bestRank = top.rank }
    }
    if (!best) return null
    const m = best
    const next = fcApply(x, m)
    if (!next) return null
    x = next
    steps.push({ wait: 85, run: (st) => { const n = fcApply(st, m); return n ? { state: n } : null } })
  }
  return fcIsWon(x) ? steps : null
}

// ─── Scoring ──────────────────────────────────────────────────

export function fcLiveScore(s: FcState, ctx: ScoreCtx): number {
  return Math.max(0, s.score - FC_UNDO_PENALTY * ctx.undos)
}

// ─── Layout ───────────────────────────────────────────────────

export function fcLayout(s: FcState, width: number, height: number): TableLayout {
  const g = makeGrid(width, height, 8, 104, 3.75)
  const { cw, ch, topY, tabY } = g
  const cards: Placement[] = []
  const slots: SlotSpec[] = []
  const add = (c: SCard, pile: PileId, index: number, x: number, y: number, extra: Partial<Placement> = {}) => {
    cards.push({ id: c.id, suit: c.suit, rank: c.rank, up: c.up, pile, index, x, y, z: 10 + index, clickable: false, draggable: false, ...extra })
  }

  for (let i = 0; i < 4; i++) {
    const x = g.colX(i)
    slots.push({
      id: C_IDS[i], x, y: topY, outline: true, clickable: true,
      drop: rect(x, topY, cw, ch), target: rect(x, topY, cw, ch), ariaLabel: `Free cell ${i + 1}`,
    })
    const c = s.cells[i]
    if (c) add(c, C_IDS[i], 0, x, topY, { clickable: true, draggable: true })
  }
  for (let i = 0; i < 4; i++) {
    const x = g.colX(4 + i)
    slots.push({
      id: F_IDS[i], x, y: topY, outline: true, text: "A", clickable: true,
      drop: rect(x, topY, cw, ch), target: rect(x, topY, cw, ch), ariaLabel: `Foundation ${i + 1}`,
    })
    s.f[i].forEach((c, j) => add(c, F_IDS[i], j, x, topY, j === s.f[i].length - 1 ? { clickable: true } : {}))
  }

  const avail = height - tabY - g.pad
  for (let i = 0; i < 8; i++) {
    const x = g.colX(i)
    const col = s.t[i]
    const offs = fanOffsets(col, avail, ch, 0.1, 0.27)
    const topCardY = col.length ? tabY + offs[col.length - 1] : tabY
    slots.push({
      id: T_IDS[i], x, y: tabY, outline: true, clickable: true,
      drop: rect(x - g.gap / 2, tabY, cw + g.gap, Math.max(height - tabY, ch)),
      target: rect(x, topCardY, cw, ch), ariaLabel: `Column ${i + 1}`,
    })
    col.forEach((c, j) => add(c, T_IDS[i], j, x, tabY + offs[j], { clickable: true, draggable: fcCanPick(s, T_IDS[i], j) }))
  }

  return { width, height, cw, ch, cards, slots, dealFrom: { x: Math.round(width / 2 - cw / 2), y: topY } }
}

// ─── Adapter ──────────────────────────────────────────────────

export const freecellAdapter: SolitaireAdapter<FcState> = {
  pile: fcPile,
  canPick: fcCanPick,
  targets: fcTargets,
  move: fcMove,
  quickTarget: fcQuickTarget,
  hint: fcHint,
  hasMoves: fcHasMoves,
  autoComplete: fcAutoComplete,
  isWon: fcIsWon,
  layout: fcLayout,
  liveScore: fcLiveScore,
  moves: (s) => s.moves,
  status: (s) => `Deal #${s.deal}`,
  result: (s, ctx, won) => {
    const live = fcLiveScore(s, ctx)
    if (won) {
      const speed = fcSpeedBonus(ctx.elapsed)
      return {
        score: live + FC_WIN_BONUS + speed, won: true,
        summary: `Deal #${s.deal} solved in ${fmtTime(ctx.elapsed)} · ${s.moves} moves${speed ? ` · speed bonus ${fmtNum(speed)}` : ""}`,
      }
    }
    const home = s.f.reduce((n, p) => n + p.length, 0)
    return { score: live, won: false, summary: `Deal #${s.deal} · ${home} of 52 cards home · ${fmtTime(ctx.elapsed)}` }
  },
}
