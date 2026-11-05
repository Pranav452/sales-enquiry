// ============================================================
// Crazy Eights computer players.
//  easy   — any legal card at random; names a random suit it holds.
//  medium — holds eights until nothing else plays, sheds high-penalty
//           cards first, keeps suits it is long in, names its longest suit.
//  hard   — medium + tracking: counts the cards of each suit already
//           seen, remembers which suit each opponent could not follow,
//           switches suit against an opponent close to going out and
//           keeps an eight in reserve for the last card.
// ============================================================

import type { Suit } from "@/components/game/arcade/kit/cards"
import { pick } from "@/components/game/arcade/kit/random"
import { countSuit, removeCard, type Card, type Level } from "./common"
import { legalCards, nextSeat, penaltyValue, topCard, type C8State } from "./crazyEights"

const SUIT_LIST: Suit[] = ["S", "H", "D", "C"]

export interface C8Move {
  card: Card
  /** suit named when the card is an eight */
  suit?: Suit
}

/** Best suit to name with an eight given the cards left after playing it. */
function bestSuit(rest: readonly Card[], s: C8State, seat: number, level: Level, rng: () => number): Suit {
  const nonEights = rest.filter((c) => c.rank !== 8)
  if (level === "easy") {
    const held = SUIT_LIST.filter((su) => nonEights.some((c) => c.suit === su))
    return held.length ? pick(held, rng) : pick(SUIT_LIST, rng)
  }
  const nextP = nextSeat(s, seat)
  const seen = seenCounts(s)
  const score = (su: Suit) => {
    let sc = countSuit(nonEights, su) * 10 + nonEights.filter((c) => c.suit === su).reduce((a, c) => a + penaltyValue(c.rank), 0) / 10
    if (level === "hard") {
      if (s.lacked[nextP] === su) sc += s.hands[nextP].length <= 3 ? 25 : 8
      sc += seen[su] * 0.6 // fewer of this suit left for opponents
    }
    return sc
  }
  return SUIT_LIST.slice().sort((a, b) => score(b) - score(a))[0]
}

/** Cards of each suit that are public (discard pile) plus our own. */
function seenCounts(s: C8State): Record<Suit, number> {
  const out: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 }
  for (const c of s.discard) out[c.suit]++
  return out
}

/** Picks a card to play, or null when the bot has no legal play (it must draw). */
export function chooseC8Move(s: C8State, seat: number, level: Level, rng: () => number): C8Move | null {
  const legal = legalCards(s, seat)
  if (legal.length === 0) return null
  const hand = s.hands[seat]

  if (level === "easy") {
    const card = pick(legal, rng)
    return { card, suit: card.rank === 8 ? bestSuit(removeCard(hand, card), s, seat, level, rng) : undefined }
  }

  // Going out wins the round.
  if (hand.length === 1) {
    const card = legal[0]
    return { card, suit: card.rank === 8 ? bestSuit([], s, seat, level, rng) : undefined }
  }

  const nextP = nextSeat(s, seat)
  const nextSize = s.hands[nextP].length
  const top = topCard(s)
  const eightsHeld = hand.filter((c) => c.rank === 8).length

  const score = (card: Card): number => {
    const rest = removeCard(hand, card)
    const isEight = card.rank === 8
    const newSuit = isEight ? bestSuit(rest, s, seat, level, rng) : card.suit
    // Follow-up options next turn: cards in the new suit or the same rank.
    const followSuit = rest.filter((c) => c.rank !== 8 && c.suit === newSuit).length
    const followRank = rest.filter((c) => c.rank !== 8 && c.rank === card.rank).length
    let sc = followSuit * 3 + followRank * 1.5 + penaltyValue(card.rank === 8 ? 1 : card.rank) / 5
    if (isEight) sc -= 40 // eights are kept until nothing else plays
    if (level === "hard") {
      if (isEight && rest.length <= 1) sc += 30 // an eight to finish is fine
      if (isEight && eightsHeld > 1) sc += 10
      // Opponent close to going out: switch to a suit they could not follow.
      if (nextSize <= 2) {
        if (s.lacked[nextP] && newSuit === s.lacked[nextP]) sc += 20
        if (newSuit === s.activeSuit && card.rank !== top.rank) sc -= 4
        if (isEight) sc += 25
      }
    }
    return sc
  }

  const ranked = legal.slice().sort((a, b) => score(b) - score(a))
  const card = ranked[0]
  return { card, suit: card.rank === 8 ? bestSuit(removeCard(hand, card), s, seat, level, rng) : undefined }
}
