// ============================================================
// Hearts computer players.
//  easy   — random legal card, random pass.
//  medium — heuristics: duck under the winning card, dump the
//           Queen of Spades and high hearts when void, never lead
//           the Queen or bare A/K of spades, pass the dangerous cards.
//  hard   — medium + card counting (unseen cards, known voids),
//           smoking out the Queen, moon-shot attempts with strong
//           hands and active defence against an opponent's moon shot.
// Bots only use public information plus their own hand.
// ============================================================

import type { Suit } from "@/components/game/arcade/kit/cards"
import { pick, shuffle } from "@/components/game/arcade/kit/random"
import { countSuit, highRank, type Card, type Level } from "./common"
import {
  cardPoints, isQueenOfSpades, legalPlays, trickPoints, trickWinner,
  type HeartsState, type PassDir, type TrickPlay,
} from "./hearts"

const ALL_SUITS: Suit[] = ["C", "D", "S", "H"]

// ─── Shared evaluation helpers ────────────────────────────────

const byHighDesc = (a: Card, b: Card) => highRank(b.rank) - highRank(a.rank)
const byHighAsc = (a: Card, b: Card) => highRank(a.rank) - highRank(b.rank)

function highest(cards: readonly Card[]): Card {
  return cards.slice().sort(byHighDesc)[0]
}

function lowest(cards: readonly Card[]): Card {
  return cards.slice().sort(byHighAsc)[0]
}

/** Rough strength of a hand for shooting the moon (higher = better). */
export function moonPotential(hand: readonly Card[]): number {
  let score = 0
  let hearts = 0
  let highHearts = 0
  for (const c of hand) {
    const r = highRank(c.rank)
    if (r === 14) score += 2
    else if (r === 13) score += 1.2
    else if (r === 12) score += 0.6
    if (c.suit === "H") {
      hearts++
      if (r >= 11) highHearts++
    } else if (r <= 6) {
      score -= 0.5
    }
  }
  if (hearts >= 6) score += 2
  score += highHearts * 0.8
  return score
}

/** Hard bots try for the moon at or above this potential (post-pass hand). */
export const MOON_ATTEMPT = 11
/** Hard bots pass low cards (keeping their winners) at or above this potential. */
const MOON_PASS = 12

// ─── Passing ──────────────────────────────────────────────────

function dangerMedium(c: Card, hand: readonly Card[]): number {
  if (isQueenOfSpades(c)) return 100
  const r = highRank(c.rank)
  if (c.suit === "S" && r > 12) return 80 + r
  if (c.suit === "H") return 20 + r
  return r + (countSuit(hand, c.suit) <= 2 ? 3 : 0)
}

export function choosePass(hand: readonly Card[], _dir: PassDir, level: Level, rng: () => number): Card[] {
  if (level === "easy") return shuffle(hand, rng).slice(0, 3)
  if (level === "medium") return hand.slice().sort((a, b) => dangerMedium(b, hand) - dangerMedium(a, hand)).slice(0, 3)

  // Hard
  if (moonPotential(hand) >= MOON_PASS) {
    // Keep the winners; give away the cards most likely to lose a trick.
    return hand.slice().sort((a, b) => {
      const ha = a.suit === "H" ? 1 : 0
      const hb = b.suit === "H" ? 1 : 0
      return ha - hb || highRank(a.rank) - highRank(b.rank)
    }).slice(0, 3)
  }

  const picks: Card[] = []
  const add = (c: Card | undefined) => {
    if (c && picks.length < 3 && !picks.some((p) => p.id === c.id)) picks.push(c)
  }
  const spades = hand.filter((c) => c.suit === "S")
  const hasQ = spades.some(isQueenOfSpades)
  const lowSpades = spades.filter((c) => highRank(c.rank) < 12).length

  if (hasQ && lowSpades < 4) add(spades.find(isQueenOfSpades))
  if (!hasQ && lowSpades < 3) {
    add(spades.find((c) => c.rank === 1))
    add(spades.find((c) => c.rank === 13))
  }
  // Void a short minor suit when the remaining slots allow it.
  const minors = (["C", "D"] as Suit[])
    .map((s) => hand.filter((c) => c.suit === s && !picks.includes(c)))
    .filter((cards) => cards.length > 0)
    .sort((a, b) => a.length - b.length)
  for (const cards of minors) {
    if (cards.length <= 3 - picks.length) for (const c of cards.sort(byHighDesc)) add(c)
  }
  const danger = (c: Card) => {
    const r = highRank(c.rank)
    if (c.suit === "H") return r + 2
    if (c.suit === "S") return hasQ ? r - 6 : r > 12 ? r + 4 : r - 6 // low spades protect against the Queen
    return r
  }
  for (const c of hand.slice().sort((a, b) => danger(b) - danger(a))) add(c)
  return picks
}

// ─── Knowledge ────────────────────────────────────────────────

interface View {
  s:          HeartsState
  seat:       number
  hand:       Card[]
  legal:      Card[]
  qsPlayed:   boolean
  holdsQS:    boolean
  /** cards not in this hand and not yet played */
  unseen:     Card[]
}

function makeView(s: HeartsState, seat: number): View {
  const hand = s.hands[seat]
  const legal = legalPlays(hand, s.trick, s.heartsBroken, s.trickNo === 0)
  const seen = new Set<string>([...hand.map((c) => c.id), ...s.played.map((p) => p.card.id)])
  const unseen: Card[] = []
  for (const suit of ALL_SUITS) {
    for (let r = 1; r <= 13; r++) {
      const id = `${suit}${r}`
      if (!seen.has(id)) unseen.push({ id, suit, rank: r as Card["rank"] })
    }
  }
  return {
    s, seat, hand, legal,
    qsPlayed: s.played.some((p) => isQueenOfSpades(p.card)),
    holdsQS: hand.some(isQueenOfSpades),
    unseen,
  }
}

function unseenHigher(v: View, c: Card): number {
  return v.unseen.filter((u) => u.suit === c.suit && highRank(u.rank) > highRank(c.rank)).length
}

function unseenInSuit(v: View, suit: Suit): number {
  return v.unseen.filter((u) => u.suit === suit).length
}

/** Seats that still have to play to the current trick. */
function stillToPlay(trick: readonly TrickPlay[], seat: number): number[] {
  const out: number[] = []
  for (let i = 1; i < 4 - trick.length; i++) out.push((seat + i) % 4)
  return out
}

// ─── Playing ──────────────────────────────────────────────────

export function choosePlay(s: HeartsState, seat: number, level: Level, rng: () => number): Card {
  const v = makeView(s, seat)
  if (v.legal.length === 0) throw new Error("No legal play")
  if (v.legal.length === 1) return v.legal[0]
  if (level === "easy") return pick(v.legal, rng)

  if (level === "hard") {
    if (isShootingMoon(v)) return playForMoon(v)
    const threat = moonThreat(v)
    if (threat != null) {
      const c = defendMoon(v, threat)
      if (c) return c
    }
  }
  if (s.trick.length === 0) return chooseLead(v, level)
  if (v.legal[0].suit === s.trick[0].card.suit) return chooseFollow(v, level)
  return chooseDiscard(v, level)
}

function chooseLead(v: View, level: Level): Card {
  const dangerSpade = (c: Card) => c.suit === "S" && highRank(c.rank) > 12 && !v.qsPlayed && !v.holdsQS
  let pool = v.legal.filter((c) => !isQueenOfSpades(c) && !dangerSpade(c))
  if (pool.length === 0) pool = v.legal

  if (level === "medium") {
    return pool.slice().sort((a, b) =>
      highRank(a.rank) - highRank(b.rank) || countSuit(v.hand, a.suit) - countSuit(v.hand, b.suit),
    )[0]
  }

  // Hard: smoke out the Queen with low spades when we hold no spade above it.
  if (!v.qsPlayed && !v.holdsQS && !v.hand.some(dangerSpade)) {
    const lowSp = pool.filter((c) => c.suit === "S" && highRank(c.rank) < 12)
    if (lowSp.length > 0 && unseenInSuit(v, "S") > 0) return lowest(lowSp)
  }
  const opponentsVoid = (suit: Suit) => [1, 2, 3].some((i) => v.s.voids[(v.seat + i) % 4][suit])
  const score = (c: Card) => {
    let sc = highRank(c.rank)
    if (unseenHigher(v, c) === 0 && unseenInSuit(v, c.suit) > 0) sc += 20 // would surely win the trick
    if (opponentsVoid(c.suit)) sc += 8
    if (c.suit === "S" && v.holdsQS && !v.qsPlayed) sc += 10
    sc -= (4 - Math.min(4, countSuit(v.hand, c.suit))) * 0.5 // prefer shortening short suits
    return sc
  }
  return pool.slice().sort((a, b) => score(a) - score(b))[0]
}

function chooseFollow(v: View, level: Level): Card {
  const { s } = v
  const led = s.trick[0].card.suit
  const winSeat = trickWinner(s.trick)
  const winCard = s.trick.find((p) => p.seat === winSeat)!.card
  const winRank = highRank(winCard.rank)
  const last = s.trick.length === 3
  const points = trickPoints(s.trick)
  const legal = v.legal
  const nonQ = legal.filter((c) => !isQueenOfSpades(c))
  const below = legal.filter((c) => highRank(c.rank) < winRank)

  if (led === "S") {
    const qs = legal.find(isQueenOfSpades)
    if (qs && winRank > 12) return qs // drop the Queen under the Ace or King
  }

  if (last) {
    if (points === 0) return nonQ.length ? highest(nonQ) : legal[0] // a clean trick: shed the biggest card
    if (below.length) return highest(below)
    return nonQ.length ? highest(nonQ) : legal[0]
  }

  // Players still to act who are void in the led suit could dump points on the winner.
  const voidBehind = level === "hard" && stillToPlay(s.trick, v.seat).some((p) => s.voids[p][led])

  if (below.length) {
    const safe = below.filter((c) => !isQueenOfSpades(c))
    return highest(safe.length ? safe : below)
  }
  // Every legal card wins the trick for now.
  const pool = nonQ.length ? nonQ : legal
  if (led === "S" && !v.qsPlayed) return lowest(pool) // keep A/K spades away from a falling Queen
  if (points === 0 && !voidBehind && (level === "medium" || unseenInSuit(v, led) >= 3)) return highest(pool)
  return lowest(pool)
}

function chooseDiscard(v: View, level: Level): Card {
  const legal = v.legal
  const qs = legal.find(isQueenOfSpades)
  if (qs) return qs
  if (!v.qsPlayed) {
    const bigSpade = legal.filter((c) => c.suit === "S" && highRank(c.rank) > 12)
    if (bigSpade.length) return highest(bigSpade)
  }
  const hearts = legal.filter((c) => c.suit === "H")
  if (hearts.length) {
    if (level === "hard") {
      // Keep a low heart or two as safe exits; dump the dangerous high ones.
      const high = hearts.filter((c) => unseenHigher(v, c) > 0 || highRank(c.rank) >= 10)
      if (high.length) return highest(high)
    } else {
      return highest(hearts)
    }
  }
  // Shed the highest card, preferring suits we can void soon.
  const score = (c: Card) => highRank(c.rank) + (4 - Math.min(4, countSuit(v.hand, c.suit))) * 1.5
  return legal.slice().sort((a, b) => score(b) - score(a))[0]
}

// ─── Hard: shooting the moon ──────────────────────────────────

function isShootingMoon(v: View): boolean {
  const { s, seat } = v
  if (s.handPoints.some((p, i) => i !== seat && p > 0)) return false
  const original = [...v.hand, ...s.played.filter((p) => p.seat === seat).map((p) => p.card)]
  return moonPotential(original) >= MOON_ATTEMPT
}

function playForMoon(v: View): Card {
  const { s } = v
  const legal = v.legal
  const masters = legal.filter((c) => unseenHigher(v, c) === 0)
  if (s.trick.length === 0) {
    if (masters.length) {
      // Lead winners from the longest suit (hearts first once broken).
      return masters.slice().sort((a, b) =>
        (b.suit === "H" ? 1 : 0) - (a.suit === "H" ? 1 : 0) ||
        countSuit(v.hand, b.suit) - countSuit(v.hand, a.suit) ||
        highRank(b.rank) - highRank(a.rank),
      )[0]
    }
    const longest = ALL_SUITS
      .filter((suit) => legal.some((c) => c.suit === suit))
      .sort((a, b) => countSuit(v.hand, b) - countSuit(v.hand, a))[0]
    return highest(legal.filter((c) => c.suit === longest))
  }
  const led = s.trick[0].card.suit
  if (legal[0].suit === led) {
    const winRank = highRank(s.trick.find((p) => p.seat === trickWinner(s.trick))!.card.rank)
    const above = legal.filter((c) => highRank(c.rank) > winRank)
    if (s.trick.length === 3) return above.length ? lowest(above) : lowest(legal)
    return above.length ? highest(above) : lowest(legal)
  }
  // Void: we cannot win this trick, so keep our points to ourselves.
  const clean = legal.filter((c) => cardPoints(c) === 0)
  return clean.length ? lowest(clean) : lowest(legal)
}

// ─── Hard: stopping someone else's moon ───────────────────────

function moonThreat(v: View): number | null {
  const { s, seat } = v
  const total = s.handPoints.reduce((a, b) => a + b, 0)
  if (total < 8) return null
  const holders = s.handPoints.map((p, i) => (p > 0 ? i : -1)).filter((i) => i >= 0)
  if (holders.length === 1 && holders[0] !== seat) return holders[0]
  return null
}

function defendMoon(v: View, threat: number): Card | null {
  const { s } = v
  const legal = v.legal
  if (s.trick.length === 0) {
    // Lead a heart we are sure to win: one point for us breaks the shot.
    const masterHearts = legal.filter((c) => c.suit === "H" && unseenHigher(v, c) === 0)
    if (masterHearts.length) return lowest(masterHearts)
    return null
  }
  const led = s.trick[0].card.suit
  const winSeat = trickWinner(s.trick)
  const winRank = highRank(s.trick.find((p) => p.seat === winSeat)!.card.rank)
  if (legal[0].suit === led) {
    const pointsComing = trickPoints(s.trick) > 0 || led === "H"
    if (winSeat === threat && pointsComing) {
      const above = legal.filter((c) => highRank(c.rank) > winRank)
      if (above.length) return s.trick.length === 3 ? lowest(above) : highest(above)
    }
    return null
  }
  // Void in the led suit.
  if (winSeat === threat) {
    const clean = legal.filter((c) => cardPoints(c) === 0)
    if (clean.length) return highest(clean)
    return null
  }
  const pointed = legal.filter((c) => cardPoints(c) > 0)
  if (pointed.length) return pointed.find(isQueenOfSpades) ?? highest(pointed)
  return null
}
