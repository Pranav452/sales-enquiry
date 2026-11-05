// ============================================================
// Crazy Eights — pure game logic (no React).
// Seat 0 is the human. With 2 players the opponent sits North
// (seat 1); with 4 players seats run You -> West -> North -> East.
// House rules (documented in rules/crazy-eights.ts):
//  - 7 cards each with 2 players, 5 each with 4 players.
//  - Starter card: an 8 turned up is buried in the stock and replaced.
//  - Match the suit or rank of the top card; eights are wild and the
//    player names the next suit.
//  - Draw only when you cannot play, one card at a time, until you can.
//    An empty stock is rebuilt from the discard pile (top card stays).
//    With nothing left to draw you pass; if everyone passes in a row the
//    round is blocked and ends.
//  - Penalty points for cards left: 8 = 50, K/Q/J = 10, A = 1, others pip value.
//  - Match: 3 rounds, or sooner if anyone reaches 100 penalty points.
//    Lowest total wins.
// ============================================================

import { shuffledDeck, type Rank, type Suit } from "@/components/game/arcade/kit/cards"
import { shuffle } from "@/components/game/arcade/kit/random"
import { removeCard, type Card } from "./common"

export const MATCH_ROUNDS = 3
export const MATCH_LIMIT = 100

export type C8Phase = "playing" | "roundOver" | "matchOver"

export interface C8Round {
  penalties: number[]
  /** seat that went out, or null for a blocked round */
  winner:    number | null
}

export interface C8LastAction {
  seat:   number
  kind:   "play" | "draw" | "pass"
  card?:  Card
  /** suit named with an eight */
  suit?:  Suit
}

export interface C8State {
  players:   2 | 4
  hands:     Card[][]
  stock:     Card[]
  discard:   Card[]
  /** suit to match (the top card's suit, or the suit named with an eight) */
  activeSuit: Suit
  turn:      number
  phase:     C8Phase
  /** consecutive passes (blocked-round detection) */
  passes:    number
  /** cards drawn by the current player this turn */
  drawnThisTurn: number
  /** 1-based round number */
  round:     number
  totals:    number[]
  rounds:    C8Round[]
  last:      C8LastAction | null
  /** public knowledge: suit each seat could not follow when it last had to draw */
  lacked:    (Suit | null)[]
}

export function handSize(players: 2 | 4): number {
  return players === 2 ? 7 : 5
}

export function penaltyValue(rank: Rank): number {
  if (rank === 8) return 50
  if (rank >= 11) return 10
  return rank
}

export function penaltyPoints(hand: readonly Card[]): number {
  return hand.reduce((sum, c) => sum + penaltyValue(c.rank), 0)
}

export function topCard(s: Pick<C8State, "discard">): Card {
  return s.discard[s.discard.length - 1]
}

export function isPlayable(card: Pick<Card, "suit" | "rank">, top: Pick<Card, "rank">, activeSuit: Suit): boolean {
  if (card.rank === 8) return true
  return card.suit === activeSuit || card.rank === top.rank
}

export function legalCards(s: C8State, seat: number): Card[] {
  if (s.phase !== "playing") return []
  const top = topCard(s)
  return s.hands[seat].filter((c) => isPlayable(c, top, s.activeSuit))
}

export function canDraw(s: C8State): boolean {
  return s.stock.length > 0 || s.discard.length > 1
}

export function nextSeat(s: Pick<C8State, "players">, seat: number): number {
  return (seat + 1) % s.players
}

/** Deals a round. `starter` is the seat that plays first. */
export function dealRound(
  players: 2 | 4, rng: () => number, starter: number,
  carry?: Pick<C8State, "round" | "totals" | "rounds">,
): C8State {
  const deck = shuffledDeck(rng)
  const n = handSize(players)
  const hands: Card[][] = []
  for (let p = 0; p < players; p++) hands.push([])
  // Deal one at a time, like at the table.
  for (let i = 0; i < n; i++) for (let p = 0; p < players; p++) hands[p].push(deck.pop() as Card)
  // Starter: never an eight; bury eights back in the stock.
  let starterCard = deck.pop() as Card
  while (starterCard.rank === 8) {
    const at = Math.floor(rng() * deck.length)
    deck.splice(at, 0, starterCard)
    starterCard = deck.pop() as Card
  }
  return {
    players,
    hands,
    stock: deck,
    discard: [starterCard],
    activeSuit: starterCard.suit,
    turn: starter,
    phase: "playing",
    passes: 0,
    drawnThisTurn: 0,
    round: carry ? carry.round + 1 : 1,
    totals: carry ? carry.totals.slice() : hands.map(() => 0),
    rounds: carry ? carry.rounds.slice() : [],
    last: null,
    lacked: hands.map(() => null),
  }
}

export function newMatch(players: 2 | 4, rng: () => number): C8State {
  return dealRound(players, rng, 0)
}

/** Plays a card. `suit` is required for an eight (the suit the next player must match). */
export function playCard(s: C8State, seat: number, card: Card, suit?: Suit): C8State {
  if (s.phase !== "playing" || s.turn !== seat) throw new Error("Not your turn")
  if (!s.hands[seat].some((c) => c.id === card.id)) throw new Error(`Seat ${seat} does not hold ${card.id}`)
  if (!isPlayable(card, topCard(s), s.activeSuit)) throw new Error(`Illegal play ${card.id}`)
  if (card.rank === 8 && !suit) throw new Error("An eight needs a suit")
  const hands = s.hands.slice()
  hands[seat] = removeCard(hands[seat], card)
  const activeSuit = card.rank === 8 ? (suit as Suit) : card.suit
  const lacked = s.lacked.slice()
  if (lacked[seat] === card.suit) lacked[seat] = null
  const n: C8State = {
    ...s,
    hands,
    discard: [...s.discard, card],
    activeSuit,
    passes: 0,
    drawnThisTurn: 0,
    lacked,
    last: { seat, kind: "play", card, suit: card.rank === 8 ? suit : undefined },
  }
  if (hands[seat].length === 0) return endRound(n, seat)
  n.turn = nextSeat(s, seat)
  return n
}

/** Draws one card for the current player (only allowed with no legal play). */
export function drawCard(s: C8State, seat: number, rng: () => number): C8State {
  if (s.phase !== "playing" || s.turn !== seat) throw new Error("Not your turn")
  if (legalCards(s, seat).length > 0) throw new Error("You can play, so you may not draw")
  if (!canDraw(s)) throw new Error("Nothing to draw")
  let stock = s.stock.slice()
  let discard = s.discard
  if (stock.length === 0) {
    const top = discard[discard.length - 1]
    stock = shuffle(discard.slice(0, -1), rng)
    discard = [top]
  }
  const card = stock.pop() as Card
  const hands = s.hands.slice()
  hands[seat] = [...hands[seat], card]
  const lacked = s.lacked.slice()
  lacked[seat] = s.activeSuit
  return {
    ...s, hands, stock, discard, lacked,
    drawnThisTurn: s.drawnThisTurn + 1,
    last: { seat, kind: "draw" },
  }
}

/** Passes when the player can neither play nor draw. */
export function passTurn(s: C8State, seat: number): C8State {
  if (s.phase !== "playing" || s.turn !== seat) throw new Error("Not your turn")
  if (legalCards(s, seat).length > 0 || canDraw(s)) throw new Error("Passing is only allowed when you cannot play or draw")
  const passes = s.passes + 1
  const n: C8State = { ...s, passes, drawnThisTurn: 0, last: { seat, kind: "pass" } }
  if (passes >= s.players) return endRound(n, null)
  n.turn = nextSeat(s, seat)
  return n
}

function endRound(s: C8State, winner: number | null): C8State {
  const penalties = s.hands.map(penaltyPoints)
  const totals = s.totals.map((t, i) => t + penalties[i])
  const rounds = [...s.rounds, { penalties, winner }]
  const over = s.round >= MATCH_ROUNDS || totals.some((t) => t >= MATCH_LIMIT)
  return { ...s, totals, rounds, phase: over ? "matchOver" : "roundOver" }
}

export function nextRound(s: C8State, rng: () => number): C8State {
  if (s.phase !== "roundOver") return s
  // The deal rotates: the first player moves one seat each round.
  return dealRound(s.players, rng, s.round % s.players, s)
}

/** Seats sharing the lowest total. */
export function matchLeaders(totals: readonly number[]): number[] {
  const min = Math.min(...totals)
  return totals.map((t, i) => (t === min ? i : -1)).filter((i) => i >= 0)
}

/** Seat names for a table of 2 or 4. */
export function seatNames(players: 2 | 4): string[] {
  return players === 2 ? ["You", "North"] : ["You", "West", "North", "East"]
}

/** Arcade points for the human from finished rounds (before the difficulty multiplier). */
export function roundPoints(r: C8Round): number {
  if (r.winner !== 0) return 0
  return 50 + r.penalties.reduce((a, b) => a + b, 0)
}
