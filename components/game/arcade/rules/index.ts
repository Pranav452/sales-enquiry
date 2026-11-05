// "How to play" content per game id (static text, safe to import eagerly).

import type { GameRules } from "@/lib/game/arcade"
import snakes_ladders from "./snakes-ladders"
import connect_four from "./connect-four"
import reversi from "./reversi"
import checkers from "./checkers"
import ludo from "./ludo"
import chess from "./chess"
import klondike from "./klondike"
import blackjack from "./blackjack"
import crazy_eights from "./crazy-eights"
import freecell from "./freecell"
import spider from "./spider"
import hearts from "./hearts"
import minesweeper from "./minesweeper"
import sudoku from "./sudoku"

export const GAME_RULES: Record<string, GameRules> = {
  "snakes-ladders": snakes_ladders,
  "connect-four": connect_four,
  "reversi": reversi,
  "checkers": checkers,
  "ludo": ludo,
  "chess": chess,
  "klondike": klondike,
  "blackjack": blackjack,
  "crazy-eights": crazy_eights,
  "freecell": freecell,
  "spider": spider,
  "hearts": hearts,
  "minesweeper": minesweeper,
  "sudoku": sudoku,
}
