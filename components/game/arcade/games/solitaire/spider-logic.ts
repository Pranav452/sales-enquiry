// ============================================================
// Spider — pure rules, scoring, hints and layout.
// Two decks, 10 columns. Build down regardless of suit; only
// same-suit runs move as a unit. A complete King-to-Ace run of
// one suit is removed to the foundation automatically.
// Score: starts at 500, -1 per move (deals included), +100 per
// completed run. Undo: the move is taken back (with any run bonus)
// but its point is not refunded, and the undo costs 1 more.
// ============================================================

import { SUITS, shuffledDeck, type Suit } from "@/components/game/arcade/kit/cards"
import { fanOffsets, makeGrid, rect } from "./layout"
import {
  describeMove, faceUp, fmtTime, isSuitRun, last, pileKind, pileNo, toCards,
  type FxMap, type Hint, type MoveRef, type PileId, type Placement, type SCard, type ScoreCtx,
  type SlotSpec, type SolitaireAdapter, type Step, type TableLayout, type Transition,
} from "./model"

export type SpiderSuits = 1 | 2 | 4

export interface SpState {
  t:     SCard[][]
  /** top = last; dealt 10 at a time */
  stock: SCard[]
  /** completed runs, each stored Ace first so the King is on top */
  done:  SCard[][]
  suits: SpiderSuits
  score: number
  moves: number
}

export const SP_UNDO_PENALTY = 2
export const SP_WIN_BONUS: Record<SpiderSuits, number> = { 1: 500, 2: 1500, 4: 4000 }
/** +2 per second under 20 minutes */
export function spSpeedBonus(elapsed: number): number {
  return 2 * Math.max(0, 1200 - Math.floor(elapsed))
}

const T_IDS = Array.from({ length: 10 }, (_, i) => `t${i}`)

// ─── Setup ────────────────────────────────────────────────────

export function spiderSuitList(suits: SpiderSuits): Suit[] {
  return suits === 1 ? ["S"] : suits === 2 ? ["S", "H"] : SUITS
}

export function newSpider(suits: SpiderSuits, rng: () => number): Transition<SpState> {
  const deck = toCards(shuffledDeck(rng, 2, spiderSuitList(suits)))
  const t: SCard[][] = Array.from({ length: 10 }, () => [])
  const fx: FxMap = {}
  for (let i = 0; i < 54; i++) {
    t[i % 10].push(deck[i])
    fx[deck[i].id] = 0.15 + i * 0.016
  }
  for (const col of t) col[col.length - 1] = faceUp(col[col.length - 1])
  return { state: { t, stock: deck.slice(54), done: [], suits, score: 500, moves: 0 }, fx }
}

// ─── Pile access ──────────────────────────────────────────────

export function spPile(s: SpState, id: PileId): SCard[] {
  switch (pileKind(id)) {
    case "tableau": return s.t[pileNo(id)] ?? []
    case "stock":   return s.stock
    case "done":    return s.done[pileNo(id)] ?? []
    default:        return []
  }
}

// ─── Rules ────────────────────────────────────────────────────

export function spCanPick(s: SpState, pile: PileId, index: number): boolean {
  return pileKind(pile) === "tableau" && isSuitRun(spPile(s, pile), index)
}

function fits(lead: SCard, dest: readonly SCard[]): boolean {
  const top = last(dest)
  return !top || (top.up && top.rank === lead.rank + 1)
}

export function spTargets(s: SpState, pile: PileId, index: number): PileId[] {
  if (!spCanPick(s, pile, index)) return []
  const lead = spPile(s, pile)[index]
  return T_IDS.filter((id) => id !== pile && fits(lead, spPile(s, id)))
}

/** Index where a complete K..A same-suit run starts at the top of the column, or -1. */
export function completeRunAt(col: readonly SCard[]): number {
  if (col.length < 13) return -1
  const start = col.length - 13
  return col[start].rank === 13 && isSuitRun(col, start) ? start : -1
}

function removeRun(s: SpState, colNo: number): Transition<SpState> | null {
  const col = s.t[colNo]
  const start = completeRunAt(col)
  if (start < 0) return null
  const run = col.slice(start)
  const rest = col.slice(0, start)
  const below = last(rest)
  if (below && !below.up) rest[rest.length - 1] = faceUp(below)
  const t = s.t.slice()
  t[colNo] = rest
  const stored = run.slice().reverse()   // Ace first, King on top
  const fx: FxMap = {}
  stored.forEach((c, i) => { fx[c.id] = i * 0.04 })
  return { state: { ...s, t, done: s.done.concat([stored]), score: s.score + 100 }, fx }
}

/** Follow-up steps removing every completed run (one after another). */
function runRemovalSteps(s: SpState, wait = 300): Step<SpState>[] | undefined {
  const cols = s.t.map((c, i) => (completeRunAt(c) >= 0 ? i : -1)).filter((i) => i >= 0)
  if (!cols.length) return undefined
  return cols.map((c, k) => ({ wait: k ? 120 : wait, run: (st: SpState) => removeRun(st, c) }))
}

function applyMove(s: SpState, m: MoveRef): SpState | null {
  if (m.from === m.to || !spCanPick(s, m.from, m.index) || pileKind(m.to) !== "tableau") return null
  const src = spPile(s, m.from)
  const moving = src.slice(m.index)
  const dest = spPile(s, m.to)
  if (!fits(moving[0], dest)) return null
  const rest = src.slice(0, m.index)
  const below = last(rest)
  if (below && !below.up) rest[rest.length - 1] = faceUp(below)
  const t = s.t.slice()
  t[pileNo(m.from)] = rest
  t[pileNo(m.to)] = dest.concat(moving)
  return { ...s, t, score: s.score - 1, moves: s.moves + 1 }
}

export function spMove(s: SpState, m: MoveRef): Transition<SpState> | null {
  const next = applyMove(s, m)
  if (!next) return null
  return { state: next, then: runRemovalSteps(next) }
}

export function spCanDeal(s: SpState): boolean {
  if (!s.stock.length) return false
  const onTable = s.t.reduce((n, c) => n + c.length, 0)
  return s.t.every((c) => c.length > 0) || onTable < 10
}

export function spDeal(s: SpState): Transition<SpState> | null {
  if (!spCanDeal(s)) return null
  const n = Math.min(10, s.stock.length)
  const group = s.stock.slice(-n).reverse()
  const t = s.t.slice()
  const fx: FxMap = {}
  group.forEach((c, i) => {
    t[i] = t[i].concat([faceUp(c)])
    fx[c.id] = i * 0.05
  })
  const next: SpState = { ...s, t, stock: s.stock.slice(0, -n), score: s.score - 1, moves: s.moves + 1 }
  return { state: next, fx, then: runRemovalSteps(next, 650) }
}

export function spIsWon(s: SpState): boolean {
  return s.done.length === 8
}

// ─── Hints and move detection ─────────────────────────────────

interface Scored { move: MoveRef; prio: number }

/** After moving the run off `card` (column c, to column d), could `card` join a same-suit card? */
function freesSuitMove(s: SpState, card: SCard, c: number, d: number): boolean {
  for (let k = 0; k < 10; k++) {
    if (k === c || k === d) continue
    const top = last(s.t[k])
    if (top && top.suit === card.suit && top.rank === card.rank + 1) return true
  }
  return false
}

/** All legal tableau moves with a usefulness score (0 = pointless, filtered out). */
function scoredMoves(s: SpState): Scored[] {
  const out: Scored[] = []
  for (let c = 0; c < 10; c++) {
    const col = s.t[c]
    for (let i = col.length - 1; i >= 0 && isSuitRun(col, i); i--) {
      const lead = col[i]
      const below = i > 0 ? col[i - 1] : null
      const reveals = !!below && !below.up
      const sitsWell = !!below && below.up && below.rank === lead.rank + 1
      const sitsInSuit = sitsWell && below!.suit === lead.suit
      if (sitsInSuit) continue                        // already in its best place
      for (let d = 0; d < 10; d++) {
        if (d === c) continue
        const dest = s.t[d]
        if (!fits(lead, dest)) continue
        const top = last(dest)
        let prio = 0
        if (top) {
          const joinsSuit = top.suit === lead.suit
          if (joinsSuit) prio = 100 + (reveals ? 30 : 0) + (i === 0 ? 20 : 0) + (col.length - i)
          else if (reveals) prio = 80 + (col.length - i)
          else if (i === 0) prio = 60
          else if (!sitsWell) prio = 50
          else if (below && freesSuitMove(s, below, c, d)) prio = 15  // sideways, so the card beneath can join its suit
          else prio = 0                                    // off-suit to off-suit: pointless
        } else {
          if (i === 0) prio = 0                            // whole column into an empty one
          else if (reveals) prio = 40
          else if (!sitsWell) prio = 20
          else prio = 10                                   // splits an off-suit build
        }
        if (prio > 0) out.push({ move: { from: T_IDS[c], index: i, to: T_IDS[d] }, prio })
      }
    }
  }
  return out.sort((a, b) => b.prio - a.prio)
}

/** Apply a move and remove any run it completes (search helper). */
function playAndSettle(s: SpState, m: MoveRef): SpState | null {
  let x = applyMove(s, m)
  if (!x) return null
  for (let col = x.t.findIndex((c) => completeRunAt(c) >= 0); col >= 0; col = x.t.findIndex((c) => completeRunAt(c) >= 0)) {
    x = removeRun(x, col)!.state
  }
  return x
}

/** Position quality: completed runs, hidden cards, suited links, empty columns. */
function evaluate(s: SpState): number {
  let down = 0, suited = 0, offSuit = 0, empty = 0
  for (const col of s.t) {
    if (!col.length) { empty++; continue }
    for (let i = 0; i < col.length; i++) {
      const c = col[i]
      if (!c.up) { down++; continue }
      const b = i > 0 ? col[i - 1] : null
      if (b && b.up && b.rank === c.rank + 1) {
        if (b.suit === c.suit) suited++
        else offSuit++
      }
    }
  }
  return s.done.length * 1000 - down * 40 + suited * 12 + offSuit * 3 + empty * 25
}

// Positions a hint has already been given for: never suggest going back to one
// (stops hints from ping-ponging a card in and out of an empty column).
const hintSeen = new Set<string>()
function positionKey(s: SpState): string {
  return s.t.map((c) => c.map((x) => (x.up ? x.id : `${x.id}*`)).join(",")).join("|") + `#${s.stock.length}`
}

function hintText(s: SpState, m: MoveRef): Hint {
  return { kind: "move", move: m, text: describeMove(spPile(s, m.from).slice(m.index), m.to, spPile(s, m.to)) }
}

/**
 * Best move by a two-move lookahead; dealing is suggested only when no
 * move actually improves the position.
 */
export function spHint(s: SpState): Hint | null {
  const list = scoredMoves(s)
  const base = evaluate(s)
  if (hintSeen.size > 4000) hintSeen.clear()
  hintSeen.add(positionKey(s))
  let best: MoveRef | null = null
  let bestScore = -Infinity
  for (const { move, prio } of list) {
    const a = playAndSettle(s, move)
    if (!a || hintSeen.has(positionKey(a))) continue
    const now = evaluate(a)
    let ahead = now
    for (const { move: m2 } of scoredMoves(a)) {
      const b = playAndSettle(a, m2)
      if (b) ahead = Math.max(ahead, evaluate(b))
    }
    const score = now * 0.5 + ahead * 0.5 + prio * 0.01
    if (score > bestScore) {
      bestScore = score
      best = move
    }
  }
  if (best && (bestScore > base + 2 || !spCanDeal(s))) return hintText(s, best)
  if (spCanDeal(s)) return { kind: "stock", text: "Deal a new row from the stock" }
  return best ? hintText(s, best) : null
}

export function spHasMoves(s: SpState): boolean {
  if (spCanDeal(s) || scoredMoves(s).length) return true
  // an empty column must be filled before dealing; any spare card can do it
  return s.stock.length > 0 && s.t.some((c) => c.length > 1)
}

/** With the stock empty and every card face up, search for a finishing sequence. */
export function spSolve(s: SpState, budget = 6000): MoveRef[] | null {
  if (s.stock.length || s.t.some((c) => c.some((x) => !x.up))) return null
  const seen = new Set<string>()
  let nodes = 0
  const key = (st: SpState) => st.t.map((c) => c.map((x) => `${x.suit}${x.rank}`).join(",")).sort().join("|")
  const settle = (st: SpState): SpState => {
    let x = st
    for (;;) {
      const col = x.t.findIndex((c) => completeRunAt(c) >= 0)
      if (col < 0) return x
      x = removeRun(x, col)!.state
    }
  }
  const dfs = (st: SpState): MoveRef[] | null => {
    if (spIsWon(st)) return []
    if (++nodes > budget) return null
    const k = key(st)
    if (seen.has(k)) return null
    seen.add(k)
    const cands: { m: MoveRef; prio: number }[] = []
    for (let c = 0; c < 10; c++) {
      const col = st.t[c]
      for (let i = col.length - 1; i >= 0 && isSuitRun(col, i); i--) {
        const lead = col[i]
        const below = i > 0 ? col[i - 1] : null
        if (below && below.suit === lead.suit && below.rank === lead.rank + 1) continue
        for (let d = 0; d < 10; d++) {
          if (d === c) continue
          const top = last(st.t[d])
          if (top ? top.suit === lead.suit && top.rank === lead.rank + 1 : i > 0) {
            cands.push({ m: { from: T_IDS[c], index: i, to: T_IDS[d] }, prio: top ? 2 : 1 })
          }
        }
      }
    }
    cands.sort((a, b) => b.prio - a.prio)
    for (const { m } of cands) {
      const next = applyMove(st, m)
      if (!next) continue
      const rest = dfs(settle(next))
      if (rest) return [m, ...rest]
    }
    return null
  }
  return dfs(settle(s))
}

export function spAutoComplete(s: SpState): Step<SpState>[] | null {
  if (spIsWon(s)) return null
  const plan = spSolve(s)
  if (!plan || !plan.length) return null
  return plan.map((m) => ({ wait: 220, run: (st: SpState) => spMove(st, m) }))
}

// ─── Scoring ──────────────────────────────────────────────────

export function spLiveScore(s: SpState, ctx: ScoreCtx): number {
  return Math.max(0, s.score - SP_UNDO_PENALTY * ctx.undos)
}

// ─── Layout ───────────────────────────────────────────────────

export function spLayout(s: SpState, width: number, height: number): TableLayout {
  const g = makeGrid(width, height, 10, 96, 4.1)
  const { cw, ch, topY, tabY } = g
  const cards: Placement[] = []
  const slots: SlotSpec[] = []
  const add = (c: SCard, pile: PileId, index: number, x: number, y: number, z: number, extra: Partial<Placement> = {}) => {
    cards.push({ id: c.id, suit: c.suit, rank: c.rank, up: c.up, pile, index, x, y, z, clickable: false, draggable: false, ...extra })
  }

  // stock: one stacked group per remaining deal, fanned to the right
  const sx = g.colX(0)
  const groups = Math.ceil(s.stock.length / 10)
  const groupStep = Math.round((cw + g.gap) / 4)
  slots.push({
    id: "stock", x: sx, y: topY, outline: true, clickable: true, icon: s.stock.length ? undefined : "blocked",
    drop: null, target: rect(sx, topY, cw + Math.max(0, groups - 1) * groupStep, ch), ariaLabel: "Stock is empty",
  })
  s.stock.forEach((c, i) => {
    const group = Math.floor(i / 10)
    const top = i === s.stock.length - 1
    add(c, "stock", i, sx + group * groupStep, topY, 10 + i,
      top ? { clickable: true, label: `Stock, ${groups} deal${groups === 1 ? "" : "s"} left. Deal a row` } : {})
  })

  // completed runs, one slot per run under columns 2..9
  for (let k = 0; k < 8; k++) {
    const x = g.colX(2 + k)
    slots.push({ id: `d${k}`, x, y: topY, outline: true, faint: true, clickable: false, drop: null, target: rect(x, topY, cw, ch) })
    const run = s.done[k]
    run?.forEach((c, j) => add(c, `d${k}`, j, x, topY, 10 + j))
  }

  // tableau
  const avail = height - tabY - g.pad
  for (let i = 0; i < 10; i++) {
    const x = g.colX(i)
    const col = s.t[i]
    const offs = fanOffsets(col, avail, ch, 0.085, 0.25)
    const topCardY = col.length ? tabY + offs[col.length - 1] : tabY
    slots.push({
      id: T_IDS[i], x, y: tabY, outline: true, clickable: true,
      drop: rect(x - g.gap / 2, tabY, cw + g.gap, Math.max(height - tabY, ch)),
      target: rect(x, topCardY, cw, ch), ariaLabel: `Column ${i + 1}`,
    })
    col.forEach((c, j) => {
      add(c, T_IDS[i], j, x, tabY + offs[j], 10 + j, { clickable: c.up, draggable: c.up && isSuitRun(col, j) })
    })
  }

  return { width, height, cw, ch, cards, slots, dealFrom: { x: sx, y: topY } }
}

// ─── Adapter ──────────────────────────────────────────────────

export const spiderAdapter: SolitaireAdapter<SpState> = {
  pile: spPile,
  canPick: spCanPick,
  targets: spTargets,
  move: spMove,
  quickTarget: (s, pile, index) => {
    if (!spCanPick(s, pile, index)) return null
    const lead = spPile(s, pile)[index]
    const targets = spTargets(s, pile, index)
    const same = targets.find((id) => last(spPile(s, id))?.suit === lead.suit)
    const any = targets.find((id) => spPile(s, id).length > 0)
    const empty = index > 0 ? targets.find((id) => !spPile(s, id).length) : undefined
    return same ?? any ?? empty ?? null
  },
  stockPile: "stock",
  stock: spDeal,
  stockBlocked: (s) => (s.stock.length ? "Fill every empty column before dealing" : "The stock is empty"),
  hint: spHint,
  hasMoves: spHasMoves,
  autoComplete: spAutoComplete,
  isWon: spIsWon,
  layout: spLayout,
  liveScore: spLiveScore,
  moves: (s) => s.moves,
  status: (s) => {
    const deals = Math.ceil(s.stock.length / 10)
    return `${s.suits} suit${s.suits > 1 ? "s" : ""} · ${s.done.length} of 8 runs · ${deals} deal${deals === 1 ? "" : "s"} left`
  },
  result: (s, ctx, won) => {
    const suits = `${s.suits} suit${s.suits > 1 ? "s" : ""}`
    if (won) {
      const live = spLiveScore(s, ctx)
      const total = live + SP_WIN_BONUS[s.suits] + spSpeedBonus(ctx.elapsed)
      return { score: total, won: true, summary: `${suits} solved in ${fmtTime(ctx.elapsed)} · ${s.moves} moves` }
    }
    return {
      score: 100 * s.done.length, won: false,
      summary: `${suits} · ${s.done.length} of 8 runs completed · ${fmtTime(ctx.elapsed)}`,
    }
  },
}
