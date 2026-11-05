// Score + summary for a finished chess game.

import type { ArcadeGameResult } from "@/lib/game/arcade"
import { DIFFICULTY_MULTIPLIER } from "../../kit/GameShell"
import type { ChessLevel } from "./protocol"

export type EndReason =
  | "checkmate" | "stalemate" | "threefold" | "fifty" | "insufficient" | "agreement" | "resign"

export interface Outcome {
  /** "w" / "b" for a decisive result, null for a draw */
  winner: "w" | "b" | null
  reason: EndReason
}

export const LEVEL_LABEL: Record<ChessLevel, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }

export const WIN_BASE = 300
export const DRAW_BASE = 100
export const SPEED_BONUS_MAX = 200
export const UNDO_PENALTY = 25
/** Wins in this many of your moves or fewer get the full speed bonus... */
export const FAST_MOVES = 20
/** ...falling linearly to nothing at this many moves. */
export const SLOW_MOVES = 70

export function speedBonus(playerMoves: number): number {
  const t = (SLOW_MOVES - playerMoves) / (SLOW_MOVES - FAST_MOVES)
  return Math.round((SPEED_BONUS_MAX * Math.min(1, Math.max(0, t))) / 5) * 5
}

const DRAW_TEXT: Record<Exclude<EndReason, "checkmate" | "resign">, string> = {
  stalemate:    "Draw by stalemate",
  threefold:    "Draw by threefold repetition",
  fifty:        "Draw by the 50-move rule",
  insufficient: "Draw by insufficient material",
  agreement:    "Draw agreed",
}

export function outcomeTitle(o: Outcome, player: "w" | "b"): { title: string; detail: string } {
  const winnerName = o.winner === "w" ? "White" : "Black"
  if (o.winner === null) {
    return { title: "Draw", detail: DRAW_TEXT[o.reason as keyof typeof DRAW_TEXT] ?? "Draw" }
  }
  const youWon = o.winner === player
  if (o.reason === "resign") return { title: "You resigned", detail: `${winnerName} wins by resignation` }
  return { title: youWon ? "Checkmate. You win" : "Checkmate. Computer wins", detail: `${winnerName} wins by checkmate` }
}

export function chessResult({ outcome, player, level, playerMoves, undos }: {
  outcome:     Outcome
  player:      "w" | "b"
  level:       ChessLevel
  playerMoves: number
  undos:       number
}): ArcadeGameResult {
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const tail = ` · ${LEVEL_LABEL[level]}${undos > 0 ? ` · ${undos} undo${undos === 1 ? "" : "s"}` : ""}`
  const movesText = `${playerMoves} move${playerMoves === 1 ? "" : "s"}`

  if (outcome.winner === null) {
    const score = Math.max(0, DRAW_BASE * mult - UNDO_PENALTY * undos)
    const text = outcome.reason === "agreement" ? `Draw agreed after ${movesText}` : DRAW_TEXT[outcome.reason as keyof typeof DRAW_TEXT]
    return { score, summary: text + tail }
  }
  if (outcome.winner === player) {
    const score = Math.max(0, WIN_BASE * mult + speedBonus(playerMoves) - UNDO_PENALTY * undos)
    return { score, won: true, summary: `Checkmate in ${movesText}${tail}` }
  }
  const text = outcome.reason === "resign" ? `Resigned after ${movesText}` : `Checkmated after ${movesText}`
  return { score: 0, won: false, summary: text + tail }
}
