import type { GameRules } from "@/lib/game/arcade"

// Matches components/game/arcade/games/connect-four.tsx and classics/connect-four.ts.
const rules: GameRules = {
  objective:
    "Be the first to line up four of your red discs in a row: across, up and down, or diagonally. The computer plays yellow.",
  setup: [
    "The board stands upright with 7 columns and 6 rows.",
    "Pick a difficulty and who drops the first disc.",
    "Easy makes mistakes and lets you undo. Medium looks about six moves ahead. Hard searches much deeper and never misses a win or a block.",
  ],
  play: [
    "On your turn, drop one disc into any column that is not full. It falls to the lowest empty space.",
    "You and the computer take turns.",
    "Four or more in a straight line wins at once. The winning discs are ringed in white.",
    "If all 42 spaces fill up with no line of four, the game is a draw.",
  ],
  controls: [
    "Click or tap a column to drop a disc. With a mouse, a preview shows where it will land.",
    "Keys 1 to 7 drop a disc into that column.",
    "Left and Right arrows move between columns. Enter or Space drops.",
    "Undo (Easy only) takes back your last disc and the computer's reply.",
    "Resign ends the game. Click it twice to confirm.",
  ],
  scoring: [
    "Difficulty multiplier: Easy x1, Medium x2, Hard x4.",
    "Win: multiplier x (100 + 5 for every disc under 21 that you used). Beating Hard with 10 discs scores 4 x 155 = 620.",
    "Draw: multiplier x 40.",
    "Loss or resign: multiplier x 1 for each disc you played.",
    "Each undo costs 10 points. The score never goes below 0.",
  ],
  tips: [
    "The centre column is part of the most lines. Start there and keep control of it.",
    "Watch the computer's lines of three. Block the square that would finish them, but check what playing there lets it drop on top.",
    "Never drop into the space directly below a square where the computer would win. You hand it that square.",
    "Aim for two threats at once, such as an open three with both ends empty. Your opponent can only block one.",
    "The first player usually wants threats on odd rows (1, 3, 5 from the bottom). The second player wants them on even rows.",
  ],
}

export default rules
