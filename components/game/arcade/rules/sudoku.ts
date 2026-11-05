import type { GameRules } from "@/lib/game/arcade"

const rules: GameRules = {
  objective:
    "Fill the 9x9 grid so that every row, every column and every 3x3 box contains each digit from 1 to 9 exactly once.",
  setup: [
    "Choose a difficulty. Every puzzle has exactly one solution and is graded by the hardest technique it needs, not just by how many digits are given.",
    "Easy (36-40 givens): naked and hidden singles are enough.",
    "Medium (30-34 givens): needs pointing pairs, box/line reduction or naked pairs.",
    "Hard (26-30 givens): needs hidden pairs, naked triples or hidden triples.",
    "Expert (22-26 givens): needs X-Wing, XY-Wing, XYZ-Wing, Swordfish or similar.",
    "Choose the mistake limit: with 3 mistakes on, the third wrong digit ends the game; with it off you can make any number of mistakes, but each one costs points.",
  ],
  play: [
    "Select a cell, then pick a digit on the number pad or type it. Given digits (dark) cannot be changed; your digits are blue.",
    "A digit that does not match the solution counts as a mistake and is shown in red. Repeated digits in a row, column or box are highlighted in red.",
    "Turn on Notes to pencil in candidates; each cell shows up to nine small digits. Placing a correct digit removes it from the notes of every cell in its row, column and box (one Undo brings them back).",
    "The selected cell's row, column and box are lightly shaded, and every cell holding the same digit is shaded more strongly.",
    "The number pad shows how many of each digit are still to be placed; a digit is disabled once all nine are on the board.",
    "Undo and Redo step through your digit, note and erase moves (a placement and the notes it cleared undo together).",
    "Hint reveals one cell: the selected cell if logic can fill it next, otherwise the nearest cell that can be. Hinted cells are locked and cannot be undone.",
    "The puzzle is solved when every cell matches the solution. Give up (click twice to confirm) ends the game and shows the solution.",
    "The clock pauses while the browser tab is hidden.",
  ],
  controls: [
    "Click or tap a cell to select it; arrow keys move the selection.",
    "1-9: enter a digit (or toggle a note while Notes is on). Shift + 1-9 always toggles a note.",
    "Backspace, Delete or 0: erase the selected cell.",
    "N: turn Notes on or off.",
    "Ctrl+Z: undo. Ctrl+Y or Ctrl+Shift+Z: redo.",
  ],
  scoring: [
    "Win: base points + time bonus - hint penalties - mistake penalties, never less than 10% of base.",
    "Time bonus = maximum bonus x (1 - seconds taken / bonus window), rounded, never below 0.",
    "Easy: base 1000, time bonus up to 500 (window 10:00), -100 per hint, -50 per mistake, minimum 100.",
    "Medium: base 2000, time bonus up to 1000 (window 15:00), -200 per hint, -100 per mistake, minimum 200.",
    "Hard: base 3500, time bonus up to 1750 (window 25:00), -350 per hint, -175 per mistake, minimum 350.",
    "Expert: base 5000, time bonus up to 2500 (window 35:00), -500 per hint, -250 per mistake, minimum 500.",
    "Out of mistakes or Give up: 10% of base x the share of originally empty cells you filled correctly yourself (hinted cells do not count), rounded.",
  ],
  tips: [
    "Start with the digits that already appear most often; the number pad counts show which ones are nearly done.",
    "Scan each box for a digit that can only go in one cell (a hidden single) before looking at rows and columns.",
    "On Medium and harder, fill in notes: when a digit's notes in a box sit in one row or column, that digit can be removed from the rest of that line.",
    "Two cells in a unit holding the same two candidates (a naked pair) lock those digits away from the rest of the unit.",
    "Leave hints for when you are truly stuck: each one costs 10% of the base score.",
  ],
}

export default rules
