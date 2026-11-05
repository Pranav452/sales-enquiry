import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Finish the session with more chips than you started with. Each round, beat the dealer's total without going over 21.",
  setup: [
    "You start with 1,000 chips. A session lasts up to 20 rounds.",
    "Six decks are shuffled into one shoe. The shoe is reshuffled before a round once fewer than 78 cards remain (cut card at 75%).",
    "Before each deal choose a bet of 10, 25, 50 or 100. With fewer than 10 chips left you can bet everything that remains.",
  ],
  play: [
    "You and the dealer get two cards each. One dealer card stays face down (the hole card).",
    "Cards 2 to 10 count their face value and J, Q, K count 10. An Ace counts 11 unless that would take the hand over 21, then 1. A hand with an Ace counted as 11 is soft (shown as Soft 17), otherwise hard.",
    "An Ace and a 10-value card as your first two cards is a blackjack.",
    "If the dealer shows an Ace you are offered insurance: a side bet of half your bet (rounded down) that pays 2 to 1 if the dealer has blackjack.",
    "When showing an Ace or a 10-value card the dealer checks the hole card. A dealer blackjack ends the round at once: you lose your bet unless you also have blackjack, which is a push.",
    "On your turn: Hit takes a card, Stand keeps your total, Double down doubles the bet for exactly one more card, Split turns two cards of the same value into two hands with a second, equal bet.",
    "You can double on any first two cards, also after a split, and split again up to three hands. Split Aces get one card each and cannot be hit or split again. 21 on a split hand is 21, not blackjack.",
    "Going over 21 busts the hand and loses its bet straight away.",
    "The dealer then turns the hole card and draws until reaching 17 or more, standing on every 17 including soft 17. If all your hands are bust the dealer does not draw.",
    "Closer to 21 than the dealer wins, equal totals push (bet returned), and a dealer bust pays every hand still in play.",
  ],
  controls: [
    "Pick a bet, then Deal (or press Enter).",
    "Hit (H), Stand (S), Double down (D), Split (P). Buttons are disabled when an action is not allowed.",
    "Hint shows the basic-strategy play for the hand in front of you (6 decks, dealer stands on soft 17, double after split).",
    "Cash out ends the session between rounds and keeps your chips. Click it twice to confirm.",
  ],
  scoring: [
    "Wins pay 1 to 1, blackjack pays 3 to 2 (odd half chips are rounded down, so a 25 bet wins 37), insurance pays 2 to 1, and a push returns the bet.",
    "Score = your bankroll at the end of the session: after round 20, when you cash out, or 0 if you lose every chip.",
    "Ending with more than 1,000 chips counts as a win.",
    "Blackjack has no difficulty setting, so no multiplier applies.",
  ],
  tips: [
    "Skip insurance. Over time it loses money even when you hold a strong hand.",
    "Always split Aces and 8s. Never split 10s or 5s.",
    "Double 11 against anything except an Ace, and 10 against 2 to 9.",
    "Stand on hard 13 to 16 when the dealer shows 2 to 6 (hard 12 against 4 to 6). Hit them against 7 or higher.",
  ],
}

export default rules
