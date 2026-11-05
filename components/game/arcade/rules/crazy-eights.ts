import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Be the first to play all your cards. Over the match, keep your penalty total lower than everyone else's.",
  setup: [
    "Play against 1 computer (7 cards each) or 3 computers (5 cards each), at Easy, Medium or Hard.",
    "The next card is turned up to start the discard pile. If it is an eight it goes back into the stock and another card is turned.",
    "A match lasts 3 rounds, or ends sooner as soon as anyone reaches 100 penalty points. The first player moves one seat each round; you start round 1.",
  ],
  play: [
    "On your turn play one card that matches the suit or the rank of the top card of the discard pile.",
    "Eights are wild: play one on anything and name the suit the next player must follow. After an eight only that suit, or another eight, can be played.",
    "If you cannot play you must draw from the stock, one card at a time, until you draw a card you can play, and then play. You may not draw while you hold a playable card.",
    "When the stock runs out the discard pile, except its top card, is shuffled into a new stock. If there is nothing left to draw and you cannot play, you pass.",
    "The round ends when someone plays their last card. If every player passes in a row the round is blocked and ends.",
    "Everyone then takes penalty points for the cards left in hand: eight 50, King, Queen and Jack 10, Ace 1, other cards their face value.",
  ],
  controls: [
    "Click a playable card to play it. Playable cards are raised and the rest are shaded.",
    "After playing an eight, choose the next suit in the picker. Cancel takes the eight back.",
    "With no playable card the stock is outlined: click it to draw a card.",
    "Pass only appears when you cannot play and there is nothing left to draw.",
    "Quit ends the match early. Click it twice to confirm.",
  ],
  scoring: [
    "Each round you go out earns 50 points plus the penalty points left in the other players' hands.",
    "Winning the match (lowest penalty total, ties included) adds 150 points.",
    "The total is multiplied by difficulty: Easy x1, Medium x2, Hard x4.",
    "Quitting early keeps the points from rounds you already won, multiplied the same way, but not the match bonus.",
  ],
  tips: [
    "Hold your eights until nothing else plays, but do not get caught with one: it costs 50.",
    "Get rid of face cards and tens early. They count 10 each if someone else goes out.",
    "When an opponent is down to one or two cards, switch to a suit they could not follow earlier.",
    "When you play an eight, name the suit you hold the most of. Hard computer players track which suits you lack and play the same way.",
  ],
}

export default rules
