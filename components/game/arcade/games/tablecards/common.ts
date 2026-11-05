// Shared, framework-free helpers for the table card games
// (Blackjack, Hearts, Crazy Eights).

import type { PlayingCardData, Rank, Suit } from "@/components/game/arcade/kit/cards"

export type Card = PlayingCardData
export type Level = "easy" | "medium" | "hard"

export const LEVELS: Level[] = ["easy", "medium", "hard"]

export function isLevel(v: string | undefined): v is Level {
  return v === "easy" || v === "medium" || v === "hard"
}

/** Ace-high rank used by trick-taking games: 2..10, J=11, Q=12, K=13, A=14. */
export function highRank(rank: Rank): number {
  return rank === 1 ? 14 : rank
}

/** Suit order used when sorting a hand on screen (alternating colours). */
export const DISPLAY_SUIT_ORDER: Suit[] = ["C", "D", "S", "H"]

/** Sorts a hand for display: by suit (C, D, S, H), then rank. */
export function sortHand(cards: readonly Card[], aceHigh: boolean): Card[] {
  return cards.slice().sort((a, b) => {
    const s = DISPLAY_SUIT_ORDER.indexOf(a.suit) - DISPLAY_SUIT_ORDER.indexOf(b.suit)
    if (s !== 0) return s
    return aceHigh ? highRank(a.rank) - highRank(b.rank) : a.rank - b.rank
  })
}

export function sameCard(a: Pick<Card, "id">, b: Pick<Card, "id">): boolean {
  return a.id === b.id
}

export function removeCard(cards: readonly Card[], card: Pick<Card, "id">): Card[] {
  const i = cards.findIndex((c) => c.id === card.id)
  if (i < 0) return cards.slice()
  return [...cards.slice(0, i), ...cards.slice(i + 1)]
}

export function countSuit(cards: readonly Card[], suit: Suit): number {
  let n = 0
  for (const c of cards) if (c.suit === suit) n++
  return n
}

/** Compact debug label, e.g. "QS" or "10H". Use cardName() for anything user-facing. */
export function shortCard(c: Pick<Card, "rank" | "suit">): string {
  const r = c.rank === 1 ? "A" : c.rank === 11 ? "J" : c.rank === 12 ? "Q" : c.rank === 13 ? "K" : String(c.rank)
  return `${r}${c.suit}`
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US")
}
