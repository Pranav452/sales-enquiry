import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective: "Build eight complete runs from King down to Ace in a single suit. Each finished run leaves the table; clear all eight to win.",
  setup: [
    "Two decks (104 cards) are dealt into ten columns: the first four get 6 cards, the rest 5. Only the top card of each column is face up.",
    "The other 50 cards form the stock: five deals of ten cards.",
    "Choose 1 suit (Spades only), 2 suits (Spades and Hearts) or 4 suits.",
  ],
  play: [
    "Place a card on any card one rank higher, regardless of suit, for example any 7 on any 8.",
    "Only a run of the same suit in descending order can be moved as one unit; mixed-suit stacks must be taken apart card by card.",
    "Any card or same-suit run can go into an empty column.",
    "A face-down card turns over automatically when the card on it is moved away.",
    "Click the stock to deal one new face-up card onto every column. You can only deal when no column is empty (unless fewer than ten cards are left on the table).",
    "When a column ends in a complete King-to-Ace run of one suit, the run is removed to the foundation automatically.",
    "With the stock empty and every card face up, Auto-complete appears when the game can finish itself.",
    "If no useful move is left the game tells you, and you can undo or end the game.",
  ],
  controls: [
    "Drag a card or a same-suit run onto another column. Legal targets light up as you drag; an illegal drop slides back.",
    "Or click a card to select it (with the cards on top of it), then click the destination column.",
    "Double-click (double-tap on touch) a card to move it to the best column: a same-suit card first, then any card one rank higher, then an empty column.",
    "Click the stock in the top-left corner to deal a new row.",
    "Undo takes back moves one at a time, as far back as you like. Hint highlights a move or tells you to deal. End game stops the game.",
    "Cards are buttons: Tab to a card and press Enter or Space to select it, then Enter on the destination.",
  ],
  scoring: [
    "You start with 500 points.",
    "Every move costs 1 point, and dealing a row counts as a move.",
    "Each completed King-to-Ace run earns 100 points.",
    "Undo takes the move back (including any run bonus it earned) and costs 2 points, so a move plus its undo costs 2 points in total.",
    "The score never drops below 0.",
    "Winning adds a difficulty bonus (1 suit +500, 2 suits +1,500, 4 suits +4,000) and a speed bonus of 2 points for every second under 20 minutes.",
    "Ending the game early scores 100 points per completed run only.",
  ],
  tips: [
    "Turning over face-down cards matters most; empty columns are the next most valuable thing you can make.",
    "Build in suit whenever you can choose: only same-suit runs move as one piece.",
    "Make every useful move before dealing; a new row covers all ten columns.",
    "Use an empty column to untangle a mixed-suit stack, then fill it again before you deal.",
  ],
}

export default rules
