import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective: "Be the first to move your token from the start to square 100. Ladders carry you up, snakes send you back down.",
  setup: [
    "Choose 2, 3 or 4 players: you plus up to three computer players. You always roll first.",
    "Exact roll to finish (on by default): you must land on 100 exactly. A roll that would go past 100 is wasted and you stay put. With it off, any roll that reaches or passes 100 finishes.",
    "Six gives another roll (on by default): rolling a 6 gives the same player another roll straight away.",
  ],
  play: [
    "Every token starts off the board. On your turn roll the die and move that many squares; a roll of 4 from the start lands on square 4.",
    "The board winds back and forth: 1 to 10 left to right along the bottom row, 11 to 20 right to left above it, and so on up to 100 at the top-left.",
    "Land on the foot of a ladder and you climb to its top. Land on a snake's head and you slide down to its tail. Passing over them does nothing.",
    "Several tokens can share a square; there is no capturing.",
    "When someone reaches 100 they take that place and the rest keep playing for the next places. The game ends as soon as you finish, or when you are the only player left.",
  ],
  controls: [
    "Press Roll or the Space bar on your turn.",
    "Computer players roll by themselves. Turn on Speed up to make their turns and the animations faster.",
    "Quit (click twice to confirm) ends the game early with a partial score.",
  ],
  scoring: [
    "1st place: 300 points, plus 50 for each opponent beyond the first (3 players 350, 4 players 400).",
    "Speed bonus for 1st place: 5 points for every turn under 40 you took, up to 150. Bonus rolls after a 6 do not count as extra turns.",
    "2nd place: 120 points. 3rd place: 60 points. Last place: 20 points.",
    "Quitting early scores half the number of the square you reached (square 64 = 32 points).",
  ],
  tips: [
    "It is pure luck, so enjoy the ride. The long ladders from 28 and 80 are game changers.",
    "With exact finish on, the 90s are dangerous: snakes wait on 93 and 98, and you may need several tries to roll the exact number.",
  ],
}

export default rules
