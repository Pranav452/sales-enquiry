import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective: "Move all 52 cards to the four foundations, building each one up in suit from Ace to King.",
  setup: [
    "Seven tableau columns are dealt with 1 to 7 cards; only the top card of each column is face up.",
    "The remaining 24 cards form the stock in the top-left corner.",
    "Choose Draw 1 (one card at a time, unlimited passes through the stock) or Draw 3 (three cards at a time, three passes).",
  ],
  play: [
    "Build tableau columns down in alternating colours, for example a red 9 on a black 10.",
    "You can move any face-up run that is in order (alternating colours, descending) as one unit.",
    "Only a King, or a run headed by a King, can be placed in an empty column.",
    "When you move the last face-up card off a column, the card beneath turns over automatically.",
    "Click the stock to deal to the waste. In Draw 3 the top three cards are fanned and only the top one can be played.",
    "When the stock is empty, click its outline to turn the waste back over. Draw 3 allows three passes in total.",
    "The top card of a foundation can be moved back onto the tableau if you need it.",
    "Once every tableau card is face up and the rest can be played home, Auto-complete finishes the game.",
    "If no useful move is left the game tells you, and you can undo or end the game.",
  ],
  controls: [
    "Drag a card or a run and drop it on a column or foundation. Legal targets light up as you drag; an illegal drop slides back.",
    "Or click a card to select it, then click where it should go.",
    "Double-click (double-tap on touch) a card to send it to a foundation, or to the best column if it cannot go home.",
    "Click the stock to draw; click the empty stock outline to turn the waste over.",
    "Undo takes back moves one at a time, as far back as you like. Hint highlights a move. End game stops the game and keeps your score.",
    "Cards are buttons: Tab to a card and press Enter or Space to select it, then Enter on the destination.",
  ],
  scoring: [
    "Standard Windows scoring: waste to tableau +5, waste or tableau to a foundation +10, each tableau card turned over +5.",
    "Foundation back to the tableau -15.",
    "Turning the waste over onto the stock -100 in Draw 1. Draw 3 has no penalty but is limited to three passes.",
    "Time: -2 points for every 10 seconds of play. The clock starts with your first move.",
    "Undo: the move's points are taken back and each undo costs a further 15 points.",
    "The score never drops below 0.",
    "Winning adds a time bonus of 700,000 divided by your time in seconds (counted as at least 30 seconds), so faster wins score far more.",
    "Ending the game early keeps your current score, with no time bonus.",
  ],
  tips: [
    "Turn over face-down cards first, starting with the tallest columns.",
    "Don't empty a column unless a King is ready to fill it.",
    "Play low cards (Aces and 2s) home straight away, but keep middle cards on the tableau while you still need them to build on.",
    "In Draw 3, think before playing from the waste: it changes which cards you will see on the next pass.",
  ],
}

export default rules
