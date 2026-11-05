import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Capture all of the computer's pieces or leave it without a legal move. Played to English draughts rules: an 8x8 board, men move forward only, kings move one square at a time in any diagonal direction.",
  setup: [
    "Each side starts with 12 men on the dark squares of the three rows nearest to it. Only the dark squares are used.",
    "Choose a difficulty and a colour. Black always moves first. Your pieces are always at the bottom of the board.",
  ],
  play: [
    "A man moves one square diagonally forward onto an empty dark square.",
    "Capture by jumping diagonally over an adjacent enemy piece onto the empty square directly beyond it. Men capture forward only; kings capture in all four diagonal directions.",
    "Captures are compulsory. If any capture is available you must make one, but you may choose which capture to play: it does not have to be the longest.",
    "After a jump, if the same piece can jump again it must keep jumping until no jump is left (a multi-jump).",
    "A man that reaches the far row is crowned a king and its move ends there, even if it could keep jumping as a king.",
    "Kings move and capture one square at a time, forwards or backwards (no flying kings).",
    "You lose when you have no pieces left, or no legal move on your turn.",
    "Draw: 40 moves by each side (80 moves in total) with no capture and no man moved, or the same position with the same player to move occurring three times. A draw counter appears once 20 such moves by each side have passed.",
    "Resigning ends the game at once as a loss.",
  ],
  controls: [
    "Pieces that can move sit on a lighter square. Click or tap one to select it; dots mark the squares it can move to, and clicking a dot moves there.",
    "A gold outline means a capture is compulsory and shows which pieces can make it. A red ring marks an enemy piece the selected move will capture.",
    "Or drag a piece and drop it on a legal square. Dropping it anywhere else puts it back.",
    "Multi-jumps: click each landing square in turn (the path so far stays marked and you cannot switch pieces mid-jump), or click the final landing square, shown as a hollow ring, when only one route leads there.",
    "Keyboard: Tab to the board, use the arrow keys to move between dark squares, Enter or Space to select and move, Escape to clear the selection.",
    "Undo (Easy and Medium only) takes back your last move together with the computer's reply. There is no undo on Hard.",
    "Resign asks for a second click to confirm.",
  ],
  scoring: [
    "Difficulty multiplier: Easy x1, Medium x2, Hard x4.",
    "Win: multiplier x (100 + 10 for each of your pieces still on the board + 2 for every move under 60 you needed). Example: beating Hard in 40 moves with 5 pieces left scores 4 x (100 + 50 + 40) = 760.",
    "Draw: multiplier x (30 + 3 for each enemy piece you captured).",
    "Loss or resignation: multiplier x 2 for each enemy piece you captured.",
    "Each undo costs 20 points. The score never goes below 0.",
  ],
  tips: [
    "Keep your back-row men on c1 and g1 (b8 and f8 when you play White) for as long as you can: together they stop most attempts to crown a king.",
    "Control the centre. Pieces on the edge have fewer moves and are easier to trap.",
    "Because captures are compulsory, offering one piece can force an enemy man onto a square where you take two in return.",
    "When you are ahead, trade pieces: every exchange makes your extra piece count for more.",
    "Defending with a king, head for a double corner (a7-b8 or g1-h2), where it is hardest to trap.",
  ],
}

export default rules
