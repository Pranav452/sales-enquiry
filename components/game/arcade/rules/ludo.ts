import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective: "Race all four of your tokens once around the board, up your home column and into the centre before the computer players do.",
  setup: [
    "Choose 2 players (you against one computer, sitting opposite) or 4 players (you against three).",
    "Choose the difficulty. Easy computers move at random, Medium ones go for captures and get tokens out, Hard ones weigh up risk, safety and progress for every move.",
    "You play red, in the bottom-left corner, and roll first. Play goes clockwise: red, green, yellow, blue.",
  ],
  play: [
    "All tokens start in their base. You need a 6 to bring a token out onto your coloured start square.",
    "Tokens travel clockwise around the 52-square track, then turn into their own coloured home column and on to the centre.",
    "Rolling a 6 gives you another roll. Rolling three 6s in a row forfeits the turn: the third 6 is not played.",
    "Capturing a token or bringing a token home also earns another roll.",
    "Land exactly on a square held by an opponent and every opposing token there is captured and sent back to its base.",
    "Safe squares cannot be captured on: the four coloured start squares and the four star squares. Tokens of different colours can share them.",
    "You need the exact roll to reach the centre. If no token can move, the turn passes (after a 6 you still roll again).",
    "The first player to bring all four tokens home wins. The others keep playing for the next places; the game ends when you finish or only one player is left.",
  ],
  controls: [
    "Press Roll or the Space bar to roll.",
    "If more than one token can move, the movable tokens are ringed and numbered: click one, press its number key (1 to 4), or use the buttons beside the board. Hover over or focus a token to see where it will land.",
    "With only one possible move, your token moves by itself.",
    "Speed up makes the computer turns and the animations faster. Quit (click twice to confirm) ends the game early.",
  ],
  scoring: [
    "Finishing place: 1st 300 points plus 100 for each opponent (2 players 400, 4 players 600). 2nd of 4: 200. 3rd of 4: 100. Last: 0.",
    "Plus 25 points for every token you capture and 15 for every one of your tokens that reaches home.",
    "The total is multiplied by the difficulty: Easy x1, Medium x2, Hard x4.",
    "Quitting early keeps only the capture and home points, multiplied the same way.",
  ],
  tips: [
    "Park on star squares when an opponent is one to six squares behind you.",
    "Getting a second token out early gives you choices later, so you are less likely to waste a roll.",
    "Once a token is in its home column it is completely safe; there is no rush to move it.",
  ],
}

export default rules
