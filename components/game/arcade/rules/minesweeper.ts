import type { GameRules } from "@/lib/game/arcade"

// Keep in sync with components/game/arcade/games/classics/minesweeper.ts
// (LEVELS base/par, winScore, partialScore).
const rules: GameRules = {
  objective:
    "Open every square that does not hide a mine. A number on an opened square tells you how many of its eight neighbours are mines.",
  setup: [
    "Pick a level: Beginner (9x9, 10 mines), Intermediate (16x16, 40 mines) or Expert (30x16, 99 mines).",
    "Mines are placed after your first click, never on that square or the eight around it, so the first click always opens an area.",
    "You can switch level before opening the first square. After that the board is yours until you clear it, hit a mine or give up.",
  ],
  play: [
    "Open a square to see what is underneath. Squares with no neighbouring mines open their neighbours automatically.",
    "Plant a flag on a square you are sure hides a mine. Flagged squares cannot be opened by accident; flag again to remove it.",
    "Chording: click an opened number whose mines are all flagged to open every remaining square around it. If one of those flags is wrong, a mine goes off.",
    "Opening a mine ends the game. All mines are shown, the one that went off is red, and wrong flags are crossed out.",
    "Open every safe square to win. The remaining mines are flagged for you.",
    "The timer starts with the first opened square. The mine counter shows mines minus flags and can go below zero.",
  ],
  controls: [
    "Mouse: left-click opens, right-click (or Ctrl+click) flags. Left+right together or middle-click on a number chords; pressing and releasing on a different square opens the square you release on.",
    "Touch: tap does the current mode (Reveal or Flag in the toolbar); long-press does the other one.",
    "Keyboard: arrow keys move, Home/End jump along a row, Page Up/Down along a column. Space or Enter opens (or chords on a number), F toggles a flag.",
    "Give up ends the run at once and scores the partial amount.",
  ],
  scoring: [
    "Win: base points plus a time bonus. Base is 300 (Beginner), 1200 (Intermediate) or 4000 (Expert).",
    "Time bonus = base x (par - seconds) / par, using whole seconds on the clock, rounded down and never below zero. Par is 120 s (Beginner), 360 s (Intermediate) or 900 s (Expert), so a very fast clear approaches double the base.",
    "Example: Expert cleared in 3:42 (222 s) scores 4000 + 4000 x 678 / 900 = 7013.",
    "Loss or give up: 25% of the base multiplied by the share of safe squares you opened, rounded down. Opening half of an Intermediate board before hitting a mine scores 150.",
  ],
  tips: [
    "Start in the middle: the opening area is usually larger there.",
    "A 1 touching exactly one unopened square means that square is a mine.",
    "Look for 1-2-1 and 1-2-2-1 patterns along walls of opened squares; they pin mines down without guessing.",
    "Flag only what you need for chording; on Expert, chording saves a lot of clicks and time.",
    "When you must guess, pick a square that would open the most information if safe, such as a corner of an unopened area.",
  ],
}

export default rules
