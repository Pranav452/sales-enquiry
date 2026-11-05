import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Checkmate the computer's king: attack it so that it has no legal way to escape. You win the moment the computer is checkmated.",
  setup: [
    "Pick a difficulty (Easy, Medium or Hard) and your colour (White, Black or Random). White always moves first.",
    "Your pieces start at the bottom of the board. Use Flip board at any time to view it from the other side.",
  ],
  play: [
    "Players take turns moving one piece. You may never make a move that leaves your own king in check.",
    "King: one square in any direction. Queen: any distance in a straight line or diagonal. Rook: any distance along a rank or file. Bishop: any distance diagonally. Knight: an L-shape (two squares one way, one square sideways) and it can jump over pieces.",
    "Pawn: moves one square straight forward (two from its starting square) and captures one square diagonally forward. Pawns never move backwards.",
    "Capture by moving onto a square occupied by an enemy piece; the captured piece leaves the board.",
    "Check: a king under attack must be rescued at once, by moving the king, blocking the attack or capturing the attacker. Checkmate: the king is in check and no move can rescue it. The game ends.",
    "Castling: once per game, move the king two squares towards a rook and the rook jumps to the square the king crossed. Allowed only if neither piece has moved, the squares between them are empty, and the king is not in check, does not pass through check and does not land in check.",
    "En passant: if an enemy pawn moves two squares and lands right beside your pawn, your pawn may capture it as if it had moved only one square. This is only possible on the very next move.",
    "Promotion: a pawn that reaches the far end of the board becomes a queen, rook, bishop or knight of your choice.",
    "Draws: stalemate (the side to move is not in check but has no legal move), threefold repetition of the same position, 50 moves by each side with no capture or pawn move, insufficient material to checkmate, or a draw offer the computer accepts.",
  ],
  controls: [
    "Click a piece to see its legal moves (dots for moves, rings for captures), then click the destination square.",
    "Or drag a piece and drop it on its destination. Dragging works with a mouse, pen or finger.",
    "When a pawn promotes, choose the new piece from the picker. Click outside it to cancel.",
    "Keyboard: Tab to the board, use the arrow keys to move around, Enter or Space to pick up and drop a piece, Escape to cancel.",
    "Undo takes back your last move and the computer's reply (Easy and Medium only).",
    "Offer draw (from your 10th move) asks the computer to agree a draw. It accepts only if it thinks it is clearly worse, by about half a pawn or more. After a refusal you must play 3 more moves before offering again.",
    "Resign ends the game as a loss. Click it twice to confirm.",
  ],
  scoring: [
    "Win by checkmate: 300 × difficulty (Easy 1, Medium 2, Hard 4), so 300, 600 or 1,200 points.",
    "Speed bonus on a win: +200 if you mate within 20 of your moves, dropping steadily to 0 at 70 moves.",
    "Draw (by any rule or agreement): 100 × difficulty, so 100, 200 or 400 points.",
    "Each undo costs 25 points from a win or a draw (the score never goes below 0).",
    "Loss by checkmate or resignation: 0 points.",
  ],
  tips: [
    "Develop knights and bishops early, castle to keep your king safe, and fight for the centre.",
    "Before every move, check what the computer's last move attacks.",
    "Trading pieces when you are ahead in material makes the win easier.",
    "Easy is a good place to practise. Hard rarely drops a piece, so play solid moves.",
  ],
}

export default rules
