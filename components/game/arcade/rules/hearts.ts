import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Take as few points as possible. When anyone reaches the target score (50 or 100) at the end of a hand, the game ends and the lowest score wins.",
  setup: [
    "Four players with 13 cards each: you (South) and three computer players, West, North and East. Play goes clockwise: you, West, North, East.",
    "Choose the computer level (Easy, Medium or Hard) and whether to play to 50 or 100 points.",
  ],
  play: [
    "Before each hand everyone passes three cards. The direction rotates: left, right, across, then no passing, and repeats.",
    "The player holding the 2 of clubs leads it to the first trick.",
    "Follow the suit that was led if you can; otherwise play any card. The highest card of the led suit wins the trick (Ace is high) and the winner leads the next one.",
    "No points on the first trick: if you cannot follow clubs you may not play a heart or the Queen of Spades unless you hold nothing else.",
    "Hearts cannot be led until a heart has been played on an earlier trick (hearts are broken), unless you hold only hearts. The Queen of Spades can be led at any time and does not break hearts.",
    "Every heart you take is 1 point and the Queen of Spades is 13, so each hand has 26 points.",
    "Shooting the moon: take all 26 points in one hand and you score 0 while every other player gets 26.",
  ],
  controls: [
    "Passing: click three cards to select them (click again to deselect), then Pass cards.",
    "Playing: click a card on your turn. Cards you are not allowed to play are shaded and the playable ones are raised.",
    "Cards you received in the pass are outlined during the first trick.",
    "The score table lists every hand. On wide screens the last trick is shown below it.",
    "Quit ends the game early with a partial score. Click it twice to confirm.",
  ],
  scoring: [
    "Finished game: a place bonus (1st 300, 2nd 150, 3rd 50, 4th 0) plus 10 for every point you finish below the opponents' average score.",
    "The total is multiplied by difficulty: Easy x1, Medium x2, Hard x4.",
    "You win if you finish with the lowest score. A tie for lowest also counts as a win.",
    "Quitting early scores 5 for every point you are below the opponents' average (no place bonus), multiplied by difficulty.",
  ],
  tips: [
    "Pass the Queen of Spades unless you hold at least four lower spades to protect it. With few spades, pass the Ace and King of Spades too.",
    "Use the pass to empty a short suit, so you can discard hearts and high cards when that suit is led.",
    "If you do not hold the Queen, lead low spades to force it out.",
    "Hard computer players count cards, remember who is out of a suit and sometimes try to shoot the moon. If one player is taking every point, win a heart trick yourself to stop them.",
  ],
}

export default rules
