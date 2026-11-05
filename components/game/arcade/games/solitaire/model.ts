// ============================================================
// Solitaire engine — shared pure model (no React).
// Every solitaire game (Klondike, Spider, FreeCell) describes its
// state as piles of cards addressed by string ids:
//   t0..tN  tableau columns      f0..f3  foundations
//   c0..c3  free cells           d0..d7  completed Spider runs
//   stock   stock pile           waste   Klondike waste
// A move always takes cards[index..] of one pile onto another.
// ============================================================

import { cardName, type PlayingCardData, type Rank, type Suit } from "@/components/game/arcade/kit/cards"

export interface SCard {
  id:   string
  suit: Suit
  rank: Rank
  /** face up */
  up:   boolean
}

export type PileId = string
export type PileKind = "tableau" | "foundation" | "cell" | "stock" | "waste" | "done"

export function pileKind(id: PileId): PileKind {
  if (id === "stock") return "stock"
  if (id === "waste") return "waste"
  switch (id[0]) {
    case "t": return "tableau"
    case "f": return "foundation"
    case "c": return "cell"
    default:  return "done"
  }
}

/** "t3" -> 3 */
export function pileNo(id: PileId): number {
  return Number(id.slice(1))
}

export interface MoveRef {
  from:  PileId
  /** index of the first (lowest) card moved */
  index: number
  to:    PileId
}

export type Hint =
  | { kind: "move"; move: MoveRef; text: string }
  | { kind: "stock"; text: string }

/** card id -> animation delay (seconds) for the transition that produced a state */
export type FxMap = Record<string, number>

/** Result of a player action: the new state, optional animation staggering and follow-up steps. */
export interface Transition<S> {
  state: S
  fx?:   FxMap
  /** automatic follow-ups (auto-moves, run removal), applied one after another */
  then?: Step<S>[]
}

export interface Step<S> {
  /** ms to wait before running */
  wait: number
  run:  (s: S) => Transition<S> | null
}

// ─── Card helpers ─────────────────────────────────────────────

export function isRedCard(c: { suit: Suit }): boolean {
  return c.suit === "H" || c.suit === "D"
}

export function last<T>(a: readonly T[]): T | undefined {
  return a.length ? a[a.length - 1] : undefined
}

export function toCards(deck: readonly PlayingCardData[], up = false): SCard[] {
  return deck.map((c) => ({ id: c.id, suit: c.suit, rank: c.rank, up }))
}

export function faceUp(c: SCard): SCard {
  return c.up ? c : { ...c, up: true }
}

export function faceDown(c: SCard): SCard {
  return c.up ? { ...c, up: false } : c
}

/** Cards from `index` upward form an alternating-colour run, each one rank lower. */
export function isAltRun(cards: readonly SCard[], index: number): boolean {
  if (index < 0 || index >= cards.length || !cards[index].up) return false
  for (let i = index + 1; i < cards.length; i++) {
    const a = cards[i - 1], b = cards[i]
    if (!b.up || isRedCard(a) === isRedCard(b) || a.rank !== b.rank + 1) return false
  }
  return true
}

/** Cards from `index` upward form a same-suit run, each one rank lower. */
export function isSuitRun(cards: readonly SCard[], index: number): boolean {
  if (index < 0 || index >= cards.length || !cards[index].up) return false
  for (let i = index + 1; i < cards.length; i++) {
    const a = cards[i - 1], b = cards[i]
    if (!b.up || a.suit !== b.suit || a.rank !== b.rank + 1) return false
  }
  return true
}

/** "Move the 7 of Hearts onto the 8 of Clubs" style text for hints. */
export function describeMove(moving: readonly SCard[], to: PileId, target: readonly SCard[]): string {
  const lead = moving[0]
  const what = moving.length > 1 ? `the ${cardName(lead)} and the ${moving.length - 1} card${moving.length > 2 ? "s" : ""} on it` : `the ${cardName(lead)}`
  const top = last(target)
  switch (pileKind(to)) {
    case "foundation": return `Move ${what} to a foundation`
    case "cell":       return `Move ${what} to a free cell`
    case "tableau":    return top ? `Move ${what} onto the ${cardName(top)}` : `Move ${what} to the empty column`
    default:           return `Move ${what}`
  }
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}

// ─── Layout description (consumed by the table renderer) ──────

export interface Rect { x: number; y: number; w: number; h: number }

export interface Placement {
  id:        string
  suit:      Suit
  rank:      Rank
  up:        boolean
  pile:      PileId
  index:     number
  x:         number
  y:         number
  z:         number
  /** reacts to click / tap */
  clickable: boolean
  /** a drag can start from this card */
  draggable: boolean
  /** aria label override */
  label?:    string
}

export interface SlotSpec {
  id:        PileId
  x:         number
  y:         number
  /** drawn outline (empty piles); false = invisible drop zone only */
  outline:   boolean
  /** lighter outline for secondary piles */
  faint?:    boolean
  /** small text in the outline, e.g. "A" */
  text?:     string
  icon?:     "recycle" | "blocked"
  clickable: boolean
  /** hit area for drops (null = not a drop target) */
  drop:      Rect | null
  /** rectangle highlighted when this pile is the drop/hint target */
  target:    Rect
  ariaLabel?: string
}

export interface TableLayout {
  width:    number
  height:   number
  cw:       number
  ch:       number
  cards:    Placement[]
  slots:    SlotSpec[]
  /** where the cards fly in from on the opening deal */
  dealFrom: { x: number; y: number }
}

/** Shared bits of game-over / scoring context. */
export interface ScoreCtx {
  undos:   number
  /** seconds */
  elapsed: number
}

export interface GameResult {
  score:   number
  won:     boolean
  summary: string
}

/**
 * Everything the generic board needs from a game. All functions are pure
 * and must treat the state as immutable.
 */
export interface SolitaireAdapter<S> {
  pile(s: S, id: PileId): SCard[]
  canPick(s: S, pile: PileId, index: number): boolean
  /** legal destination piles for cards[index..] of `pile` */
  targets(s: S, pile: PileId, index: number): PileId[]
  move(s: S, m: MoveRef): Transition<S> | null
  /** destination for double-click / double-tap (foundation first) */
  quickTarget(s: S, pile: PileId, index: number): PileId | null
  /** the pile a click on which runs `stock` (draw / deal) */
  stockPile?: PileId
  stock?(s: S): Transition<S> | null
  /** explanation shown when the stock cannot be used */
  stockBlocked?(s: S): string
  hint(s: S): Hint | null
  /** false when no useful move is left (the game offers to end) */
  hasMoves(s: S): boolean
  /** steps that finish the game automatically, or null if not (yet) possible */
  autoComplete(s: S): Step<S>[] | null
  isWon(s: S): boolean
  layout(s: S, width: number, height: number): TableLayout
  /** running score shown in the toolbar */
  liveScore(s: S, ctx: ScoreCtx): number
  result(s: S, ctx: ScoreCtx, won: boolean): GameResult
  status(s: S): string
  moves(s: S): number
}
