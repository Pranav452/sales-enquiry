// ============================================================
// Blackjack — pure game logic (no React).
// Table rules: 6-deck shoe, cut card at 75% penetration, dealer
// peeks for blackjack and stands on soft 17, blackjack pays 3:2,
// insurance pays 2:1, double on any first two cards (also after
// a split), split pairs of equal value up to 3 hands, split aces
// receive one card each.
// ============================================================

import { shuffledDeck, type Rank } from "@/components/game/arcade/kit/cards"
import type { Card } from "./common"

export const DECKS = 6
export const SHOE_SIZE = 52 * DECKS
/** Reshuffle before a round once fewer than this many cards remain (75% penetration). */
export const CUT_CARD = 78
export const START_BANKROLL = 1000
export const BET_SIZES = [10, 25, 50, 100] as const
export const MIN_BET = 10
export const MAX_ROUNDS = 20
export const MAX_HANDS = 3

export type Phase = "betting" | "insurance" | "player" | "dealer" | "settled" | "over"
export type Outcome = "blackjack" | "win" | "push" | "lose" | "bust"
export type Action = "hit" | "stand" | "double" | "split"

export interface BJHand {
  cards:     Card[]
  bet:       number
  doubled:   boolean
  fromSplit: boolean
  splitAces: boolean
  done:      boolean
  outcome:   Outcome | null
  /** chips paid back at settlement (stake + winnings; 0 when lost) */
  returned:  number
}

export interface BJState {
  shoe:          Card[]
  bankroll:      number
  /** rounds completed */
  round:         number
  phase:         Phase
  hands:         BJHand[]
  active:        number
  dealer:        Card[]
  holeHidden:    boolean
  /** insurance stake for this round (0 = declined / not offered) */
  insurance:     number
  insuranceWon:  number
  /** shoe was reshuffled at the start of the current round */
  reshuffled:    boolean
  /** increments with every new shoe (card ids repeat between shoes) */
  shoeNo:        number
  /** ids of the cards drawn by the last action, in draw order (for deal animations) */
  lastDrawn:     string[]
  /** net chip result of the last settled round */
  net:           number
  message:       string
}

// ─── Hand values ──────────────────────────────────────────────

/** Blackjack value of a rank with the ace counted as 1. */
export function pointValue(rank: Rank): number {
  return rank >= 10 ? 10 : rank
}

export interface HandValue {
  total: number
  /** an ace is currently counted as 11 */
  soft:  boolean
}

export function handValue(cards: readonly Pick<Card, "rank">[]): HandValue {
  let total = 0
  let aces = 0
  for (const c of cards) {
    if (c.rank === 1) aces++
    total += pointValue(c.rank)
  }
  if (aces > 0 && total + 10 <= 21) return { total: total + 10, soft: true }
  return { total, soft: false }
}

export function isBust(cards: readonly Pick<Card, "rank">[]): boolean {
  return handValue(cards).total > 21
}

/** Two-card 21 that did not come from a split. */
export function isNatural(cards: readonly Pick<Card, "rank">[], fromSplit = false): boolean {
  return !fromSplit && cards.length === 2 && handValue(cards).total === 21
}

/** "Soft 17", "Hard 15", "Blackjack", "Bust (24)". */
export function describeHand(cards: readonly Pick<Card, "rank">[], fromSplit = false): string {
  if (cards.length === 0) return ""
  const v = handValue(cards)
  if (isNatural(cards, fromSplit)) return "Blackjack"
  if (v.total > 21) return `Bust (${v.total})`
  return `${v.soft ? "Soft" : "Hard"} ${v.total}`
}

/** Dealer draws to 16 and stands on every 17, soft 17 included. */
export function dealerShouldHit(cards: readonly Pick<Card, "rank">[]): boolean {
  return handValue(cards).total < 17
}

// ─── Money ────────────────────────────────────────────────────

/** Chips returned for a winning blackjack (stake + 3:2, odd half-chips rounded down). */
export function blackjackReturn(bet: number): number {
  return bet + Math.floor((bet * 3) / 2)
}

/** Insurance stake: half the bet, rounded down to a whole chip. */
export function insuranceCost(bet: number): number {
  return Math.floor(bet / 2)
}

/** Bets the player may choose with this bankroll. Below the minimum, the rest can go all in. */
export function betOptions(bankroll: number): number[] {
  const opts = BET_SIZES.filter((b) => b <= bankroll) as number[]
  if (opts.length === 0 && bankroll > 0) return [bankroll]
  return opts
}

// ─── State ────────────────────────────────────────────────────

export function newShoe(rng: () => number): Card[] {
  return shuffledDeck(rng, DECKS)
}

export function initialState(rng: () => number): BJState {
  return {
    shoe: newShoe(rng),
    bankroll: START_BANKROLL,
    round: 0,
    phase: "betting",
    hands: [],
    active: 0,
    dealer: [],
    holeHidden: true,
    insurance: 0,
    insuranceWon: 0,
    reshuffled: false,
    shoeNo: 1,
    lastDrawn: [],
    net: 0,
    message: "Place your bet to start the round.",
  }
}

function clone(s: BJState): BJState {
  return {
    ...s,
    shoe: s.shoe.slice(),
    hands: s.hands.map((h) => ({ ...h, cards: h.cards.slice() })),
    dealer: s.dealer.slice(),
    lastDrawn: [],
  }
}

function draw(s: BJState, rng: () => number): Card {
  if (s.shoe.length === 0) {
    // Safety net only: the cut card makes this practically unreachable.
    s.shoe = newShoe(rng)
    s.shoeNo += 1
    s.reshuffled = true
  }
  const card = s.shoe.pop() as Card
  s.lastDrawn.push(card.id)
  return card
}

function newHand(bet: number, cards: Card[] = [], fromSplit = false, splitAces = false): BJHand {
  return { cards, bet, doubled: false, fromSplit, splitAces, done: false, outcome: null, returned: 0 }
}

export function canDeal(s: BJState, bet: number): boolean {
  return (s.phase === "betting" || s.phase === "settled") && bet > 0 && bet <= s.bankroll
}

/** Starts a round: takes the bet and deals player, dealer, player, dealer (hole card). */
export function deal(s: BJState, bet: number, rng: () => number): BJState {
  if (!canDeal(s, bet)) return s
  const n = clone(s)
  n.reshuffled = false
  if (n.shoe.length < CUT_CARD) {
    n.shoe = newShoe(rng)
    n.shoeNo += 1
    n.reshuffled = true
  }
  n.bankroll -= bet
  const hand = newHand(bet)
  n.hands = [hand]
  n.dealer = []
  n.active = 0
  n.holeHidden = true
  n.insurance = 0
  n.insuranceWon = 0
  n.net = 0
  hand.cards.push(draw(n, rng))
  n.dealer.push(draw(n, rng))
  hand.cards.push(draw(n, rng))
  n.dealer.push(draw(n, rng))

  if (n.dealer[0].rank === 1 && n.bankroll >= insuranceCost(bet) && insuranceCost(bet) > 0) {
    n.phase = "insurance"
    n.message = "Dealer shows an Ace. Take insurance?"
    return n
  }
  return afterPeek(n)
}

/** Dealer checks the hole card for blackjack when showing an Ace or a 10-value card. */
function afterPeek(n: BJState): BJState {
  const up = n.dealer[0]
  const dealerBJ = (up.rank === 1 || pointValue(up.rank) === 10) && isNatural(n.dealer)
  const playerBJ = isNatural(n.hands[0].cards)
  if (dealerBJ || playerBJ) {
    n.holeHidden = false
    n.hands[0].done = true
    return settle(n)
  }
  n.phase = "player"
  n.message = "Your turn."
  return n
}

/** Answer the insurance offer (only valid while the dealer shows an Ace). */
export function resolveInsurance(s: BJState, take: boolean): BJState {
  if (s.phase !== "insurance") return s
  const n = clone(s)
  if (take) {
    const cost = insuranceCost(n.hands[0].bet)
    n.bankroll -= cost
    n.insurance = cost
    // Paid out with the hands at settlement: stake back + 2:1.
    if (isNatural(n.dealer)) n.insuranceWon = cost * 3
  }
  return afterPeek(n)
}

// ─── Player actions ───────────────────────────────────────────

export function activeHand(s: BJState): BJHand | null {
  return s.phase === "player" ? s.hands[s.active] ?? null : null
}

export function canHit(s: BJState): boolean {
  const h = activeHand(s)
  return !!h && !h.done && !h.splitAces && handValue(h.cards).total < 21
}

export function canDouble(s: BJState): boolean {
  const h = activeHand(s)
  return !!h && !h.done && !h.splitAces && h.cards.length === 2 && s.bankroll >= h.bet
}

export function canSplit(s: BJState): boolean {
  const h = activeHand(s)
  return !!h && !h.done && !h.splitAces && h.cards.length === 2
    && pointValue(h.cards[0].rank) === pointValue(h.cards[1].rank)
    && s.hands.length < MAX_HANDS && s.bankroll >= h.bet
}

export function legalActions(s: BJState): Action[] {
  const out: Action[] = []
  if (canHit(s)) out.push("hit")
  if (activeHand(s)) out.push("stand")
  if (canDouble(s)) out.push("double")
  if (canSplit(s)) out.push("split")
  return out
}

export function hit(s: BJState, rng: () => number): BJState {
  if (!canHit(s)) return s
  const n = clone(s)
  const h = n.hands[n.active]
  h.cards.push(draw(n, rng))
  if (handValue(h.cards).total >= 21) h.done = true
  return h.done ? advance(n, rng) : n
}

export function stand(s: BJState, rng: () => number): BJState {
  if (!activeHand(s)) return s
  const n = clone(s)
  n.hands[n.active].done = true
  return advance(n, rng)
}

export function double(s: BJState, rng: () => number): BJState {
  if (!canDouble(s)) return s
  const n = clone(s)
  const h = n.hands[n.active]
  n.bankroll -= h.bet
  h.bet *= 2
  h.doubled = true
  h.cards.push(draw(n, rng))
  h.done = true
  return advance(n, rng)
}

export function split(s: BJState, rng: () => number): BJState {
  if (!canSplit(s)) return s
  const n = clone(s)
  const h = n.hands[n.active]
  const [a, b] = h.cards
  const aces = a.rank === 1
  n.bankroll -= h.bet
  const first = newHand(h.bet, [a], true, aces)
  const second = newHand(h.bet, [b], true, aces)
  n.hands.splice(n.active, 1, first, second)
  first.cards.push(draw(n, rng))
  if (aces) {
    // Split aces get exactly one card each and stand.
    second.cards.push(draw(n, rng))
    first.done = true
    second.done = true
  } else if (handValue(first.cards).total === 21) {
    first.done = true
  }
  return first.done ? advance(n, rng) : n
}

/** Moves to the next unfinished hand (dealing its second card) or hands over to the dealer. */
function advance(n: BJState, rng: () => number): BJState {
  for (;;) {
    const next = n.hands.findIndex((h) => !h.done)
    if (next < 0) break
    n.active = next
    const h = n.hands[next]
    if (h.cards.length === 1) {
      h.cards.push(draw(n, rng))
      if (handValue(h.cards).total === 21) {
        h.done = true
        continue
      }
    }
    n.phase = "player"
    n.message = n.hands.length > 1 ? `Playing hand ${next + 1} of ${n.hands.length}.` : "Your turn."
    return n
  }
  n.holeHidden = false
  if (n.hands.every((h) => isBust(h.cards))) return settle(n)
  n.phase = "dealer"
  n.message = "Dealer's turn."
  return n
}

// ─── Dealer ───────────────────────────────────────────────────

/** One dealer step: reveal the hole card, draw one card, or settle. Call repeatedly while phase is "dealer". */
export function dealerStep(s: BJState, rng: () => number): BJState {
  if (s.phase !== "dealer") return s
  const n = clone(s)
  if (n.holeHidden) {
    n.holeHidden = false
    return n
  }
  if (dealerShouldHit(n.dealer)) {
    n.dealer.push(draw(n, rng))
    return n
  }
  return settle(n)
}

/** Plays the dealer hand to the end (used by tests and fast-forward). */
export function finishDealer(s: BJState, rng: () => number): BJState {
  let n = s
  for (let i = 0; i < 30 && n.phase === "dealer"; i++) n = dealerStep(n, rng)
  return n
}

// ─── Settlement ───────────────────────────────────────────────

export function settleHand(hand: BJHand, dealer: readonly Card[]): { outcome: Outcome; returned: number } {
  const pv = handValue(hand.cards)
  const dv = handValue(dealer)
  const playerBJ = isNatural(hand.cards, hand.fromSplit)
  const dealerBJ = isNatural(dealer)
  if (pv.total > 21) return { outcome: "bust", returned: 0 }
  if (playerBJ && dealerBJ) return { outcome: "push", returned: hand.bet }
  if (playerBJ) return { outcome: "blackjack", returned: blackjackReturn(hand.bet) }
  if (dealerBJ) return { outcome: "lose", returned: 0 }
  if (dv.total > 21 || pv.total > dv.total) return { outcome: "win", returned: hand.bet * 2 }
  if (pv.total === dv.total) return { outcome: "push", returned: hand.bet }
  return { outcome: "lose", returned: 0 }
}

function settle(n: BJState): BJState {
  let returned = 0
  let staked = n.insurance
  for (const h of n.hands) {
    const r = settleHand(h, n.dealer)
    h.outcome = r.outcome
    h.returned = r.returned
    h.done = true
    returned += r.returned
    staked += h.bet
  }
  returned += n.insuranceWon
  n.bankroll += returned
  n.net = returned - staked
  n.round += 1
  n.holeHidden = false
  n.message = settleMessage(n)
  n.phase = n.bankroll <= 0 || n.round >= MAX_ROUNDS ? "over" : "settled"
  return n
}

function settleMessage(n: BJState): string {
  const dealerBJ = isNatural(n.dealer)
  const dv = handValue(n.dealer)
  const parts: string[] = []
  if (n.insurance > 0) parts.push(n.insuranceWon > 0 ? `Insurance pays ${n.insuranceWon - n.insurance}.` : "Insurance lost.")
  if (n.hands.length === 1) {
    const o = n.hands[0].outcome
    if (o === "blackjack") parts.push(`Blackjack! You win ${n.hands[0].returned - n.hands[0].bet}.`)
    else if (o === "bust") parts.push("Bust. You lose.")
    else if (o === "push") parts.push(dealerBJ ? "Both have blackjack. Push." : `Push at ${dv.total}.`)
    else if (o === "win") parts.push(dv.total > 21 ? `Dealer busts with ${dv.total}. You win.` : `You win, ${handValue(n.hands[0].cards).total} to ${dv.total}.`)
    else parts.push(dealerBJ ? "Dealer has blackjack." : `Dealer wins with ${dv.total}.`)
  } else {
    parts.push(dealerBJ ? "Dealer has blackjack." : dv.total > 21 ? `Dealer busts with ${dv.total}.` : `Dealer has ${dv.total}.`)
  }
  if (n.net > 0) parts.push(`Net +${n.net}.`)
  else if (n.net < 0) parts.push(`Net ${n.net}.`)
  else parts.push("Net 0.")
  return parts.join(" ")
}

// ─── Basic strategy (6 decks, dealer stands on soft 17, double after split) ──

export type HintAction = Action

/**
 * Recommended play for the active hand. `dealerUp` is the dealer's face-up card.
 * Falls back sensibly when doubling or splitting is not allowed.
 */
export function basicStrategy(
  cards: readonly Pick<Card, "rank">[],
  dealerUp: Pick<Card, "rank">,
  allowDouble: boolean,
  allowSplit: boolean,
): HintAction {
  const up = dealerUp.rank === 1 ? 11 : pointValue(dealerUp.rank) // 2..11
  const v = handValue(cards)

  if (allowSplit && cards.length === 2 && pointValue(cards[0].rank) === pointValue(cards[1].rank)) {
    const p = cards[0].rank === 1 ? 11 : pointValue(cards[0].rank)
    const splitIt =
      p === 11 || p === 8 ||
      (p === 9 && up !== 7 && up !== 10 && up !== 11) ||
      ((p === 7 || p === 2 || p === 3) && up <= 7) ||
      (p === 6 && up <= 6) ||
      (p === 4 && (up === 5 || up === 6))
    if (splitIt) return "split"
  }

  const dbl = (fallback: HintAction): HintAction => (allowDouble ? "double" : fallback)

  if (v.soft) {
    const t = v.total
    if (t >= 19) return "stand"
    if (t === 18) {
      if (up >= 3 && up <= 6) return dbl("stand")
      if (up === 2 || up === 7 || up === 8) return "stand"
      return "hit"
    }
    if (t === 17) return up >= 3 && up <= 6 ? dbl("hit") : "hit"
    if (t === 15 || t === 16) return up >= 4 && up <= 6 ? dbl("hit") : "hit"
    return up >= 5 && up <= 6 ? dbl("hit") : "hit" // soft 13-14
  }

  const t = v.total
  if (t >= 17) return "stand"
  if (t >= 13) return up <= 6 ? "stand" : "hit"
  if (t === 12) return up >= 4 && up <= 6 ? "stand" : "hit"
  if (t === 11) return up <= 10 ? dbl("hit") : "hit"
  if (t === 10) return up <= 9 ? dbl("hit") : "hit"
  if (t === 9) return up >= 3 && up <= 6 ? dbl("hit") : "hit"
  return "hit"
}

export const ACTION_LABEL: Record<Action, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double down",
  split: "Split",
}
