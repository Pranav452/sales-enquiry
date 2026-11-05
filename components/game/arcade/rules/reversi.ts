import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Finish with more discs of your colour on the board than the computer. Discs change colour when they are outflanked, so the lead can swing many times before the end.",
  setup: [
    "The 8x8 board starts with four discs in the centre: white on d4 and e5, black on d5 and e4.",
    "Choose a difficulty and a colour. Black always moves first, so choosing White lets the computer open.",
  ],
  play: [
    "On your turn place one disc on an empty square so that at least one straight line (across, up and down, or diagonal) of the computer's discs lies between the new disc and another of yours, with no gaps. Those discs are outflanked.",
    "Every outflanked disc flips to your colour, in all eight directions at once. A single move can flip several lines.",
    "Discs are only flipped by the move just played: discs that change colour do not set off further flips.",
    "A move is only legal if it flips at least one disc. If you have no legal move you must pass, and the computer moves again. A Pass button appears when this happens.",
    "If the computer has no legal move it passes and you move again; the status line tells you when it has passed.",
    "The game ends when neither side can move, usually because the board is full. The side with more discs wins; equal counts are a draw. Empty squares are not counted.",
    "Resigning ends the game at once as a loss.",
  ],
  controls: [
    "Click or tap an empty square to place a disc there.",
    "Hints shows your legal moves as small dots. Point at one (or focus it with the keyboard) to see a faded disc and a dot on every disc it would flip. Hints start on for Easy and Medium and off for Hard; toggle them at any time.",
    "The small red dot marks the most recent move.",
    "Keyboard: Tab to the board, use the arrow keys (Home and End jump along the row) to move between squares, then Enter or Space to play.",
    "Undo (Easy and Medium only) takes back your last move together with the computer's reply. There is no undo on Hard.",
    "Resign asks for a second click to confirm.",
  ],
  scoring: [
    "Difficulty multiplier: Easy x1, Medium x2, Hard x4.",
    "Win: multiplier x (100 + 3 for every disc you finish ahead). Example: beating Hard 38-26 scores 4 x (100 + 36) = 544.",
    "Draw: multiplier x 40.",
    "Loss or resignation: multiplier x half your disc count (rounded down). Example: losing to Medium 26-38 scores 2 x 13 = 26.",
    "Each undo costs 20 points. The score never goes below 0.",
  ],
  tips: [
    "Corners can never be flipped. Take them when you can, and discs anchored to a corner along an edge become permanent too.",
    "Avoid the squares diagonally next to an empty corner (b2, g2, b7, g7) and, early on, the edge squares beside it: they usually hand the corner to your opponent.",
    "Early in the game, fewer discs is often better. Aim to keep many moves available for yourself and few for the computer.",
    "Prefer quiet moves that flip few discs and do not open new empty squares next to your discs.",
    "Forcing the computer to pass, or leaving it only bad moves, is often worth more than a big flip.",
  ],
}

export default rules
