// ============================================================
// Klondike — pure rules, scoring, hints and layout.
// Standard Windows scoring:
//   waste -> tableau +5, waste/tableau -> foundation +10,
//   turn over a tableau card +5, foundation -> tableau -15,
//   recycle the waste -100 (Draw 1 only), -2 every 10 seconds,
//   win bonus 700,000 / seconds. Undo: move reverted, -15.
// ============================================================

import { shuffledDeck } from "@/components/game/arcade/kit/cards"
import { fanOffsets, makeGrid, rect } from "./layout"
import {
  describeMove, faceDown, faceUp, fmtNum, fmtTime, isAltRun, isRedCard, last, pileKind, pileNo, toCards,
  type FxMap, type Hint, type MoveRef, type PileId, type Placement, type SCard, type ScoreCtx,
  type SlotSpec, type SolitaireAdapter, type Step, type TableLayout, type Transition,
} from "./model"

export interface KState {
  t:      SCard[][]
  f:      SCard[][]
  /** top = last */
  stock:  SCard[]
  /** top = last */
  waste:  SCard[]
  /** waste cards shown fanned (Draw 3) */
  shown:  number
  draw:   1 | 3
  /** current pass through the stock, 1-based */
  pass:   number
  score:  number
  moves:  number
}

export const K_MAX_PASSES_DRAW3 = 3
export const K_UNDO_PENALTY = 15
const T_IDS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6"]
const F_IDS = ["f0", "f1", "f2", "f3"]

// ─── Setup ────────────────────────────────────────────────────

export function newKlondike(draw: 1 | 3, rng: () => number): Transition<KState> {
  const deck = toCards(shuffledDeck(rng))
  const t: SCard[][] = Array.from({ length: 7 }, () => [])
  const fx: FxMap = {}
  let k = 0
  for (let row = 0; row < 7; row++) {
    for (let col = row; col < 7; col++) {
      const c = deck[k]
      t[col].push(col === row ? faceUp(c) : c)
      fx[c.id] = 0.15 + k * 0.032
      k++
    }
  }
  return {
    state: { t, f: [[], [], [], []], stock: deck.slice(28), waste: [], shown: 0, draw, pass: 1, score: 0, moves: 0 },
    fx,
  }
}

// ─── Pile access ──────────────────────────────────────────────

export function kPile(s: KState, id: PileId): SCard[] {
  switch (pileKind(id)) {
    case "tableau":    return s.t[pileNo(id)] ?? []
    case "foundation": return s.f[pileNo(id)] ?? []
    case "stock":      return s.stock
    case "waste":      return s.waste
    default:           return []
  }
}

function withPiles(s: KState, patch: Record<PileId, SCard[]>): KState {
  const next: KState = { ...s, t: s.t.slice(), f: s.f.slice() }
  for (const [id, cards] of Object.entries(patch)) {
    switch (pileKind(id)) {
      case "tableau":    next.t[pileNo(id)] = cards; break
      case "foundation": next.f[pileNo(id)] = cards; break
      case "stock":      next.stock = cards; break
      case "waste":      next.waste = cards; break
    }
  }
  return next
}

// ─── Rules ────────────────────────────────────────────────────

export function kCanPick(s: KState, pile: PileId, index: number): boolean {
  const cards = kPile(s, pile)
  if (index < 0 || index >= cards.length) return false
  switch (pileKind(pile)) {
    case "tableau":    return isAltRun(cards, index)
    case "waste":
    case "foundation": return index === cards.length - 1
    default:           return false
  }
}

function fitsFoundation(lead: SCard, pile: readonly SCard[]): boolean {
  const top = last(pile)
  return top ? top.suit === lead.suit && top.rank + 1 === lead.rank : lead.rank === 1
}

function fitsTableau(lead: SCard, pile: readonly SCard[]): boolean {
  const top = last(pile)
  return top ? top.up && isRedCard(top) !== isRedCard(lead) && top.rank === lead.rank + 1 : lead.rank === 13
}

export function kCanPlace(s: KState, moving: readonly SCard[], to: PileId): boolean {
  if (!moving.length) return false
  const dest = kPile(s, to)
  switch (pileKind(to)) {
    case "foundation": return moving.length === 1 && fitsFoundation(moving[0], dest)
    case "tableau":    return fitsTableau(moving[0], dest)
    default:           return false
  }
}

export function kTargets(s: KState, pile: PileId, index: number): PileId[] {
  if (!kCanPick(s, pile, index)) return []
  const moving = kPile(s, pile).slice(index)
  return [...F_IDS, ...T_IDS].filter((id) => id !== pile && kCanPlace(s, moving, id))
}

export function kMove(s: KState, m: MoveRef): Transition<KState> | null {
  if (m.from === m.to || !kCanPick(s, m.from, m.index)) return null
  const src = kPile(s, m.from)
  const moving = src.slice(m.index)
  if (!kCanPlace(s, moving, m.to)) return null
  const fromK = pileKind(m.from), toK = pileKind(m.to)
  let score = s.score
  if (fromK === "waste" && toK === "tableau") score += 5
  if ((fromK === "waste" || fromK === "tableau") && toK === "foundation") score += 10
  if (fromK === "foundation" && toK === "tableau") score -= 15
  const rest = src.slice(0, m.index)
  const below = last(rest)
  if (fromK === "tableau" && below && !below.up) {
    rest[rest.length - 1] = faceUp(below)
    score += 5
  }
  const next = withPiles(s, { [m.from]: rest, [m.to]: kPile(s, m.to).concat(moving) })
  next.score = score
  next.moves = s.moves + 1
  if (fromK === "waste") next.shown = rest.length ? Math.max(1, s.shown - 1) : 0
  return { state: next }
}

export function kCanRecycle(s: KState): boolean {
  return !s.stock.length && s.waste.length > 0 && (s.draw === 1 || s.pass < K_MAX_PASSES_DRAW3)
}

/** Click on the stock: draw 1 or 3 cards, or turn the waste back over. */
export function kDraw(s: KState): Transition<KState> | null {
  if (s.stock.length) {
    const n = Math.min(s.draw, s.stock.length)
    const taken = s.stock.slice(-n).reverse().map(faceUp)
    const fx: FxMap = {}
    taken.forEach((c, i) => { fx[c.id] = i * 0.07 })
    return {
      state: { ...s, stock: s.stock.slice(0, -n), waste: s.waste.concat(taken), shown: n, moves: s.moves + 1 },
      fx,
    }
  }
  if (kCanRecycle(s)) {
    const stock = s.waste.slice().reverse().map(faceDown)
    const fx: FxMap = {}
    stock.forEach((c, i) => { fx[c.id] = i * 0.008 })
    return {
      state: {
        ...s, stock, waste: [], shown: 0, pass: s.pass + 1, moves: s.moves + 1,
        score: s.score - (s.draw === 1 ? 100 : 0),
      },
      fx,
    }
  }
  return null
}

export function kIsWon(s: KState): boolean {
  return s.f.every((p) => p.length === 13)
}

function foundationFor(s: KState, card: SCard): PileId | null {
  // prefer the foundation already holding this suit, else the first empty one
  for (let i = 0; i < 4; i++) if (s.f[i].length && fitsFoundation(card, s.f[i])) return F_IDS[i]
  for (let i = 0; i < 4; i++) if (!s.f[i].length && fitsFoundation(card, s.f[i])) return F_IDS[i]
  return null
}

export function kQuickTarget(s: KState, pile: PileId, index: number): PileId | null {
  if (!kCanPick(s, pile, index)) return null
  const cards = kPile(s, pile)
  const kind = pileKind(pile)
  if (kind === "foundation") return null
  if (index === cards.length - 1) {
    const f = foundationFor(s, cards[index])
    if (f) return f
  }
  const moving = cards.slice(index)
  const filled = T_IDS.find((id) => id !== pile && kPile(s, id).length > 0 && kCanPlace(s, moving, id))
  if (filled) return filled
  // a King only goes to an empty column if that actually frees something
  if (kind === "tableau" && index === 0) return null
  return T_IDS.find((id) => id !== pile && !kPile(s, id).length && kCanPlace(s, moving, id)) ?? null
}

// ─── Hints and move detection ─────────────────────────────────

function hintMove(s: KState, from: PileId, index: number, to: PileId): Hint {
  return { kind: "move", move: { from, index, to }, text: describeMove(kPile(s, from).slice(index), to, kPile(s, to)) }
}

/** A card can go home without being missed: both opposite-colour foundations are close behind. */
function isSafeHome(s: KState, card: SCard): boolean {
  if (card.rank <= 2) return true
  const opposite = s.f.filter((p) => p.length && isRedCard(p[0]) !== isRedCard(card)).map((p) => p.length)
  const lowest = opposite.length === 2 ? Math.min(...opposite) : 0
  return card.rank <= lowest + 2
}

/** Useful moves in priority order (no pointless back-and-forth). */
function usefulMoves(s: KState): Hint[] {
  const out: Hint[] = []
  const homeMoves: { hint: Hint; safe: boolean }[] = []
  for (const id of ["waste", ...T_IDS]) {
    const cards = kPile(s, id)
    const top = last(cards)
    if (!top || !top.up) continue
    const f = foundationFor(s, top)
    if (f) homeMoves.push({ hint: hintMove(s, id, cards.length - 1, f), safe: isSafeHome(s, top) })
  }
  // 1. low cards home (never needed on the tableau)
  for (const h of homeMoves) if (h.safe) out.push(h.hint)
  // 2. tableau runs that uncover a face-down card (most face-down cards first)
  const order = T_IDS.map((id) => ({ id, cards: kPile(s, id) }))
    .map((c) => ({ ...c, first: c.cards.findIndex((x) => x.up) }))
    .filter((c) => c.first > 0)
    .sort((a, b) => b.first - a.first)
  for (const c of order) {
    const to = T_IDS.find((id) => id !== c.id && kPile(s, id).length > 0 && kCanPlace(s, c.cards.slice(c.first), id))
      ?? T_IDS.find((id) => id !== c.id && !kPile(s, id).length && kCanPlace(s, c.cards.slice(c.first), id))
    if (to) out.push(hintMove(s, c.id, c.first, to))
  }
  // 3. waste onto the tableau
  if (s.waste.length) {
    const i = s.waste.length - 1
    const to = T_IDS.find((id) => kPile(s, id).length > 0 && kCanPlace(s, [s.waste[i]], id))
      ?? T_IDS.find((id) => !kPile(s, id).length && kCanPlace(s, [s.waste[i]], id))
    if (to) out.push(hintMove(s, "waste", i, to))
  }
  // 4. the remaining foundation plays
  for (const h of homeMoves) if (!h.safe) out.push(h.hint)
  // 5. split a run so the card underneath can go to a foundation
  for (const id of T_IDS) {
    const cards = kPile(s, id)
    for (let j = 1; j < cards.length; j++) {
      if (!cards[j - 1].up || !kCanPick(s, id, j)) continue
      if (!foundationFor(s, cards[j - 1])) continue
      const to = T_IDS.find((d) => d !== id && kCanPlace(s, cards.slice(j), d))
      if (to) out.push(hintMove(s, id, j, to))
    }
  }
  return out
}

/** Cards the stock/waste cycle can still bring to the top of the waste. */
function reachableStockCards(s: KState): SCard[] {
  if (s.draw === 1) {
    const all = s.stock.concat(s.waste.slice(0, -1))
    return kCanRecycle(s) || s.stock.length ? all : []
  }
  const seen = new Map<string, SCard>()
  let stock = s.stock.slice(), waste = s.waste.slice(), pass = s.pass
  for (let guard = 0; guard < 200; guard++) {
    if (stock.length) {
      const n = Math.min(3, stock.length)
      waste = waste.concat(stock.slice(-n).reverse())
      stock = stock.slice(0, -n)
      const top = waste[waste.length - 1]
      seen.set(top.id, top)
    } else if (waste.length && pass < K_MAX_PASSES_DRAW3) {
      stock = waste.slice().reverse()
      waste = []
      pass++
    } else break
  }
  return [...seen.values()]
}

export function kHint(s: KState): Hint | null {
  const moves = usefulMoves(s)
  if (moves.length) return moves[0]
  if (s.stock.length) return { kind: "stock", text: s.draw === 1 ? "Draw a card from the stock" : "Draw cards from the stock" }
  if (kCanRecycle(s)) return { kind: "stock", text: "Turn the waste back over onto the stock" }
  return null
}

export function kHasMoves(s: KState): boolean {
  if (usefulMoves(s).length) return true
  for (const c of reachableStockCards(s)) {
    const card = faceUp(c)
    if (foundationFor(s, card)) return true
    if (T_IDS.some((id) => kCanPlace(s, [card], id))) return true
  }
  return false
}

/**
 * Finish automatically once every tableau card is face up and the
 * remaining cards can be played home by drawing through the stock once.
 */
export function kAutoComplete(s: KState): Step<KState>[] | null {
  if (kIsWon(s) || s.t.some((col) => col.some((c) => !c.up))) return null
  const steps: Step<KState>[] = []
  let x = s
  for (let guard = 0; guard < 200 && !kIsWon(x); guard++) {
    let best: MoveRef | null = null
    let bestRank = 99
    for (const id of ["waste", ...T_IDS]) {
      const cards = kPile(x, id)
      const top = last(cards)
      if (!top || top.rank >= bestRank) continue
      const f = foundationFor(x, top)
      if (f) { best = { from: id, index: cards.length - 1, to: f }; bestRank = top.rank }
    }
    if (best) {
      const m = best
      const t = kMove(x, m)
      if (!t) return null
      x = t.state
      steps.push({ wait: 85, run: (st) => kMove(st, m) })
    } else if (x.stock.length) {
      const t = kDraw(x)
      if (!t) return null
      x = t.state
      steps.push({ wait: 85, run: (st) => kDraw(st) })
    } else return null
  }
  return kIsWon(x) ? steps : null
}

// ─── Scoring ──────────────────────────────────────────────────

export function kLiveScore(s: KState, ctx: ScoreCtx): number {
  return Math.max(0, s.score - K_UNDO_PENALTY * ctx.undos - 2 * Math.floor(ctx.elapsed / 10))
}

export function kTimeBonus(elapsed: number): number {
  return Math.round(700000 / Math.max(30, elapsed))
}

// ─── Layout ───────────────────────────────────────────────────

export function kLayout(s: KState, width: number, height: number): TableLayout {
  const g = makeGrid(width, height, 7, 112, 3.6)
  const { cw, ch, topY, tabY } = g
  const cards: Placement[] = []
  const slots: SlotSpec[] = []
  const card = (c: SCard, pile: PileId, index: number, x: number, y: number, extra: Partial<Placement> = {}) => {
    cards.push({
      id: c.id, suit: c.suit, rank: c.rank, up: c.up, pile, index, x, y, z: 10 + index,
      clickable: false, draggable: false, ...extra,
    })
  }

  // stock
  const sx = g.colX(0)
  const canRecycle = kCanRecycle(s)
  slots.push({
    id: "stock", x: sx, y: topY, outline: true, clickable: true,
    icon: s.stock.length ? undefined : canRecycle ? "recycle" : "blocked",
    drop: null, target: rect(sx, topY, cw, ch),
    ariaLabel: canRecycle ? "Turn the waste over" : "Stock is empty",
  })
  s.stock.forEach((c, i) => {
    const top = i === s.stock.length - 1
    card(c, "stock", i, sx, topY, top ? { clickable: true, label: `Stock, ${s.stock.length} cards. Draw` } : {})
  })

  // waste (Draw 3 fans the latest group)
  const wx = g.colX(1)
  slots.push({ id: "waste", x: wx, y: topY, outline: false, clickable: false, drop: null, target: rect(wx, topY, cw, ch) })
  const fanX = Math.min(Math.round(cw * 0.3), Math.round((cw + g.gap) / 2.3))
  const shown = s.draw === 3 ? Math.min(s.shown, s.waste.length) : 1
  const firstFanned = s.waste.length - shown
  s.waste.forEach((c, i) => {
    const top = i === s.waste.length - 1
    const x = wx + (i >= firstFanned ? (i - firstFanned) * fanX : 0)
    card(c, "waste", i, x, topY, top ? { clickable: true, draggable: true } : {})
  })

  // foundations
  for (let i = 0; i < 4; i++) {
    const fx = g.colX(3 + i)
    const pile = s.f[i]
    slots.push({
      id: F_IDS[i], x: fx, y: topY, outline: true, text: "A", clickable: true,
      drop: rect(fx, topY, cw, ch), target: rect(fx, topY, cw, ch), ariaLabel: `Foundation ${i + 1}`,
    })
    pile.forEach((c, j) => {
      const top = j === pile.length - 1
      card(c, F_IDS[i], j, fx, topY, top ? { clickable: true, draggable: true } : {})
    })
  }

  // tableau
  const avail = height - tabY - g.pad
  for (let i = 0; i < 7; i++) {
    const x = g.colX(i)
    const col = s.t[i]
    const offs = fanOffsets(col, avail, ch, 0.11, 0.27)
    const topCardY = col.length ? tabY + offs[col.length - 1] : tabY
    slots.push({
      id: T_IDS[i], x, y: tabY, outline: true, text: "K", clickable: true,
      drop: rect(x - g.gap / 2, tabY, cw + g.gap, Math.max(height - tabY, ch)),
      target: rect(x, topCardY, cw, ch), ariaLabel: `Column ${i + 1}`,
    })
    col.forEach((c, j) => {
      const pickable = c.up && kCanPick(s, T_IDS[i], j)
      card(c, T_IDS[i], j, x, tabY + offs[j], { clickable: c.up, draggable: pickable })
    })
  }

  return { width, height, cw, ch, cards, slots, dealFrom: { x: sx, y: topY } }
}

// ─── Adapter ──────────────────────────────────────────────────

export const klondikeAdapter: SolitaireAdapter<KState> = {
  pile: kPile,
  canPick: kCanPick,
  targets: kTargets,
  move: kMove,
  quickTarget: kQuickTarget,
  stockPile: "stock",
  stock: kDraw,
  stockBlocked: () => "No passes left through the stock",
  hint: kHint,
  hasMoves: kHasMoves,
  autoComplete: kAutoComplete,
  isWon: kIsWon,
  layout: kLayout,
  liveScore: kLiveScore,
  moves: (s) => s.moves,
  status: (s) => {
    const passes = s.draw === 3 ? ` · Pass ${s.pass} of ${K_MAX_PASSES_DRAW3}` : s.pass > 1 ? ` · Pass ${s.pass}` : ""
    return `Draw ${s.draw}${passes}`
  },
  result: (s, ctx, won) => {
    const live = kLiveScore(s, ctx)
    const home = s.f.reduce((n, p) => n + p.length, 0)
    if (won) {
      const bonus = kTimeBonus(ctx.elapsed)
      return {
        score: live + bonus, won: true,
        summary: `Draw ${s.draw} solved in ${fmtTime(ctx.elapsed)} · ${s.moves} moves · time bonus ${fmtNum(bonus)}`,
      }
    }
    return { score: live, won: false, summary: `Draw ${s.draw} · ${home} of 52 cards home · ${fmtTime(ctx.elapsed)}` }
  },
}
