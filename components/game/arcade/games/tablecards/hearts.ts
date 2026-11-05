// ============================================================
// Hearts — pure game logic (no React).
// Seats: 0 = You (South), 1 = West, 2 = North, 3 = East.
// Play runs clockwise (South -> West -> North -> East), so "pass
// left" means South passes to West.
// ============================================================

import { shuffledDeck, type Suit } from "@/components/game/arcade/kit/cards"
import { highRank, removeCard, type Card } from "./common"

export const SEATS = [0, 1, 2, 3] as const
export const SEAT_NAMES = ["You", "West", "North", "East"] as const
export const HAND_POINTS = 26

export type PassDir = "left" | "right" | "across" | "none"
export const PASS_ROTATION: PassDir[] = ["left", "right", "across", "none"]

export type HeartsPhase = "passing" | "playing" | "trickDone" | "handDone" | "gameOver"

export interface TrickPlay {
  seat: number
  card: Card
}

export interface HandRecord {
  /** points taken in the hand before the moon adjustment */
  raw:    number[]
  /** points scored after the moon adjustment */
  scored: number[]
  /** seat that shot the moon, or null */
  moon:   number | null
}

export interface HeartsState {
  target:       number
  handNo:       number
  passDir:      PassDir
  phase:        HeartsPhase
  hands:        Card[][]
  /** cards each seat received in this hand's pass */
  received:     Card[][]
  trick:        TrickPlay[]
  /** winner of the trick on the table once it is complete */
  trickWinner:  number | null
  lastTrick:    { plays: TrickPlay[]; winner: number } | null
  leader:       number
  turn:         number
  /** completed tricks this hand (0..13) */
  trickNo:      number
  heartsBroken: boolean
  /** every card played this hand, in order */
  played:       TrickPlay[]
  /** public knowledge: voids[seat][suit] = seat showed out of that suit */
  voids:        Record<Suit, boolean>[]
  handPoints:   number[]
  tricksWon:    number[]
  scores:       number[]
  history:      HandRecord[]
}

// ─── Basics ───────────────────────────────────────────────────

export function passDirFor(handNo: number): PassDir {
  return PASS_ROTATION[handNo % PASS_ROTATION.length]
}

export function passTarget(seat: number, dir: PassDir): number {
  const step = dir === "left" ? 1 : dir === "right" ? 3 : dir === "across" ? 2 : 0
  return (seat + step) % 4
}

export function nextSeat(seat: number): number {
  return (seat + 1) % 4
}

export function isTwoOfClubs(c: Pick<Card, "suit" | "rank">): boolean {
  return c.suit === "C" && c.rank === 2
}

export function isQueenOfSpades(c: Pick<Card, "suit" | "rank">): boolean {
  return c.suit === "S" && c.rank === 12
}

export function cardPoints(c: Pick<Card, "suit" | "rank">): number {
  return c.suit === "H" ? 1 : isQueenOfSpades(c) ? 13 : 0
}

export function trickPoints(plays: readonly TrickPlay[]): number {
  return plays.reduce((sum, p) => sum + cardPoints(p.card), 0)
}

/** Seat currently winning a (possibly incomplete) trick. */
export function trickWinner(plays: readonly TrickPlay[]): number {
  const led = plays[0].card.suit
  let best = plays[0]
  for (const p of plays) {
    if (p.card.suit === led && highRank(p.card.rank) > highRank(best.card.rank)) best = p
  }
  return best.seat
}

/**
 * Legal cards for the player about to play.
 * - The 2 of clubs must open the hand.
 * - Follow the led suit when possible.
 * - Hearts cannot be led until a heart has been played (unless only hearts remain).
 * - No points (hearts or the Queen of Spades) on the first trick unless the hand holds nothing else.
 */
export function legalPlays(hand: readonly Card[], trick: readonly TrickPlay[], heartsBroken: boolean, firstTrick: boolean): Card[] {
  if (hand.length === 0) return []
  if (trick.length === 0) {
    if (firstTrick) {
      const two = hand.find(isTwoOfClubs)
      if (two) return [two]
    }
    if (!heartsBroken) {
      const nonHearts = hand.filter((c) => c.suit !== "H")
      if (nonHearts.length > 0) return nonHearts
    }
    return hand.slice()
  }
  const led = trick[0].card.suit
  const follow = hand.filter((c) => c.suit === led)
  if (follow.length > 0) return follow
  if (firstTrick) {
    const clean = hand.filter((c) => cardPoints(c) === 0)
    if (clean.length > 0) return clean
  }
  return hand.slice()
}

export function isLegal(state: HeartsState, seat: number, card: Card): boolean {
  if (state.phase !== "playing" || state.turn !== seat) return false
  return legalPlays(state.hands[seat], state.trick, state.heartsBroken, state.trickNo === 0).some((c) => c.id === card.id)
}

/** Applies the moon rule: taking all 26 scores 0 and every other player takes 26. */
export function scoreHand(raw: readonly number[]): HandRecord {
  const moon = raw.findIndex((p) => p === HAND_POINTS)
  if (moon >= 0) {
    return { raw: raw.slice(), scored: raw.map((_, i) => (i === moon ? 0 : HAND_POINTS)), moon }
  }
  return { raw: raw.slice(), scored: raw.slice(), moon: null }
}

/** Seats with the lowest score (all of them on a tie). */
export function leaders(scores: readonly number[]): number[] {
  const min = Math.min(...scores)
  return scores.map((s, i) => (s === min ? i : -1)).filter((i) => i >= 0)
}

/** 1-based finishing place of a seat (ties share the better place). */
export function placeOf(scores: readonly number[], seat: number): number {
  return 1 + scores.filter((s) => s < scores[seat]).length
}

function emptyVoids(): Record<Suit, boolean>[] {
  return SEATS.map(() => ({ S: false, H: false, D: false, C: false }))
}

// ─── State transitions ────────────────────────────────────────

export function newGame(target: number, rng: () => number): HeartsState {
  const base: HeartsState = {
    target,
    handNo: 0,
    passDir: "left",
    phase: "passing",
    hands: [[], [], [], []],
    received: [[], [], [], []],
    trick: [],
    trickWinner: null,
    lastTrick: null,
    leader: 0,
    turn: 0,
    trickNo: 0,
    heartsBroken: false,
    played: [],
    voids: emptyVoids(),
    handPoints: [0, 0, 0, 0],
    tricksWon: [0, 0, 0, 0],
    scores: [0, 0, 0, 0],
    history: [],
  }
  return dealHand(base, 0, rng)
}

function holderOfTwoClubs(hands: readonly Card[][]): number {
  return hands.findIndex((h) => h.some(isTwoOfClubs))
}

export function dealHand(s: HeartsState, handNo: number, rng: () => number): HeartsState {
  const deck = shuffledDeck(rng)
  const hands = [0, 1, 2, 3].map((i) => deck.slice(i * 13, i * 13 + 13))
  const passDir = passDirFor(handNo)
  const n: HeartsState = {
    ...s,
    handNo,
    passDir,
    phase: passDir === "none" ? "playing" : "passing",
    hands,
    received: [[], [], [], []],
    trick: [],
    trickWinner: null,
    lastTrick: null,
    trickNo: 0,
    heartsBroken: false,
    played: [],
    voids: emptyVoids(),
    handPoints: [0, 0, 0, 0],
    tricksWon: [0, 0, 0, 0],
  }
  const lead = holderOfTwoClubs(hands)
  n.leader = lead
  n.turn = lead
  return n
}

/** Exchanges the passed cards. passes[seat] must hold exactly 3 cards from that seat's hand. */
export function applyPasses(s: HeartsState, passes: readonly Card[][]): HeartsState {
  if (s.phase !== "passing") return s
  for (let seat = 0; seat < 4; seat++) {
    const p = passes[seat]
    if (!p || p.length !== 3) throw new Error(`Seat ${seat} must pass 3 cards`)
    for (const c of p) if (!s.hands[seat].some((h) => h.id === c.id)) throw new Error(`Seat ${seat} does not hold ${c.id}`)
  }
  const hands = s.hands.map((h) => h.slice())
  const received: Card[][] = [[], [], [], []]
  for (let seat = 0; seat < 4; seat++) {
    for (const c of passes[seat]) hands[seat] = removeCard(hands[seat], c)
  }
  for (let seat = 0; seat < 4; seat++) {
    const to = passTarget(seat, s.passDir)
    hands[to] = [...hands[to], ...passes[seat]]
    received[to] = passes[seat].slice()
  }
  const lead = holderOfTwoClubs(hands)
  return { ...s, hands, received, phase: "playing", leader: lead, turn: lead }
}

/** Plays a card for the seat whose turn it is. Throws on illegal moves (callers validate first). */
export function playCard(s: HeartsState, seat: number, card: Card): HeartsState {
  if (!isLegal(s, seat, card)) throw new Error(`Illegal play ${card.id} by seat ${seat}`)
  const hands = s.hands.slice()
  hands[seat] = removeCard(hands[seat], card)
  const play: TrickPlay = { seat, card }
  const trick = [...s.trick, play]
  const voids = s.voids.map((v) => ({ ...v }))
  if (trick.length > 1 && card.suit !== trick[0].card.suit) voids[seat][trick[0].card.suit] = true
  const n: HeartsState = {
    ...s,
    hands,
    trick,
    voids,
    played: [...s.played, play],
    heartsBroken: s.heartsBroken || card.suit === "H",
  }
  if (trick.length === 4) {
    n.phase = "trickDone"
    n.trickWinner = trickWinner(trick)
  } else {
    n.turn = nextSeat(seat)
  }
  return n
}

/** Gives the finished trick to its winner and starts the next trick (or ends the hand). */
export function collectTrick(s: HeartsState): HeartsState {
  if (s.phase !== "trickDone" || s.trickWinner == null) return s
  const winner = s.trickWinner
  const handPoints = s.handPoints.slice()
  handPoints[winner] += trickPoints(s.trick)
  const tricksWon = s.tricksWon.slice()
  tricksWon[winner] += 1
  const n: HeartsState = {
    ...s,
    handPoints,
    tricksWon,
    lastTrick: { plays: s.trick, winner },
    trick: [],
    trickWinner: null,
    trickNo: s.trickNo + 1,
    leader: winner,
    turn: winner,
    phase: "playing",
  }
  if (n.trickNo < 13) return n
  const record = scoreHand(handPoints)
  const scores = n.scores.map((v, i) => v + record.scored[i])
  return {
    ...n,
    scores,
    history: [...n.history, record],
    phase: scores.some((v) => v >= n.target) ? "gameOver" : "handDone",
  }
}

export function nextHand(s: HeartsState, rng: () => number): HeartsState {
  if (s.phase !== "handDone") return s
  return dealHand(s, s.handNo + 1, rng)
}

export function seatName(seat: number): string {
  return SEAT_NAMES[seat]
}

export function passLabel(dir: PassDir): string {
  return dir === "none" ? "No passing this hand" : `Pass to the ${dir}`
}

