import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective: "Move all 52 cards to the four foundations, building each one up in suit from Ace to King.",
  setup: [
    "All 52 cards are dealt face up into eight columns (four of 7 cards, four of 6).",
    "Above them are four free cells (top left) and four foundations (top right).",
    "Every deal has a number, shown as \"Deal #12345\". Numbers match the classic Microsoft FreeCell deals, so you can replay one by entering its number before you deal. Leave it blank for a random deal.",
  ],
  play: [
    "Build columns down in alternating colours, for example a red 6 on a black 7.",
    "Each free cell holds one card of any kind. Any card can go into an empty column.",
    "Runs in order (alternating colours, descending) can be moved together, up to (1 + empty free cells) x 2 to the power of the number of empty columns. Moving into an empty column, that column itself does not count.",
    "Cards on a foundation stay there.",
    "Cards that are no longer needed on the tableau (no lower card of the opposite colour is still in play) move to the foundations automatically.",
    "When every column is in descending order, Auto-complete plays the rest home.",
    "If no legal move is left the game tells you, and you can undo or end the game.",
  ],
  controls: [
    "Drag a card or a run onto a column, free cell or foundation. Legal targets light up as you drag; an illegal drop slides back.",
    "Or click a card to select it, then click the destination.",
    "Double-click (double-tap on touch) a card to send it to a foundation, otherwise onto a column, otherwise to a free cell.",
    "Undo takes back moves one at a time, as far back as you like. Hint shows the next move of a full solution when one can be found. End game stops the game and keeps your score.",
    "Cards are buttons: Tab to a card and press Enter or Space to select it, then Enter on the destination.",
  ],
  scoring: [
    "+10 points for every card that reaches a foundation, including automatic plays.",
    "Undo: the move is taken back (including any foundation points it earned) and each undo costs a further 10 points.",
    "The score never drops below 0.",
    "Winning adds 1,000 points plus a speed bonus of 5 points for every second under 10 minutes.",
    "Ending the game early keeps your current score.",
  ],
  tips: [
    "Free cells are precious: keep at least one empty whenever you can.",
    "An empty column is worth more than a free cell, because it doubles how many cards you can move at once.",
    "Look for the Aces and 2s first and work out what is covering them.",
    "Plan a few moves ahead before filling the last free cell.",
  ],
}

export default rules
