// ============================================================
// Sudoku play state (pure TypeScript, no React).
// Every action returns a new GameState; undo/redo store cell-level
// diffs so a placement and the notes it cleared undo together.
// ============================================================

import {
  COL, DIFFICULTY_SPECS, PEERS, ROW, TECHNIQUE_NAMES,
  completedUnits, nextLogicalPlacements,
  type Difficulty, type GeneratedPuzzle, type TechniqueId,
} from "./sudoku"

export type Phase = "playing" | "won" | "lost" | "gaveup"

export const MISTAKE_LIMIT = 3

/** One cell's before/after (value + notes mask). */
interface CellChange {
  i:  number
  v0: number
  n0: number
  v1: number
  n1: number
}

export type GameEvent =
  | { kind: "placed"; cell: number; digit: number; correct: boolean; completed: number[] }
  | { kind: "erased"; cell: number }
  | { kind: "note"; cell: number; digit: number; on: boolean }
  | { kind: "hint"; cell: number; digit: number; technique: TechniqueId | null; completed: number[] }
  | { kind: "undo"; cell: number }
  | { kind: "redo"; cell: number }
  | { kind: "blocked"; message: string }
  | { kind: "gaveup" }

export interface GameState {
  difficulty:   Difficulty
  /** null when the mistake limit is off */
  mistakeLimit: number | null
  /** the givens (0 = empty) */
  puzzle:       number[]
  solution:     number[]
  /** current digits, givens included */
  values:       number[]
  /** pencil marks, 9-bit mask per cell */
  notes:        number[]
  /** cells revealed by a hint (locked like givens) */
  hinted:       boolean[]
  past:         CellChange[][]
  future:       CellChange[][]
  mistakes:     number
  hints:        number
  phase:        Phase
  event:        GameEvent | null
  /** increments on every event (animation keys) */
  eventId:      number
}

export function newGame(gen: GeneratedPuzzle, mistakeLimitOn: boolean): GameState {
  return {
    difficulty:   gen.difficulty,
    mistakeLimit: mistakeLimitOn ? MISTAKE_LIMIT : null,
    puzzle:       gen.puzzle.slice(),
    solution:     gen.solution.slice(),
    values:       gen.puzzle.slice(),
    notes:        new Array<number>(81).fill(0),
    hinted:       new Array<boolean>(81).fill(false),
    past:         [],
    future:       [],
    mistakes:     0,
    hints:        0,
    phase:        "playing",
    event:        null,
    eventId:      0,
  }
}

export function isLocked(s: GameState, i: number): boolean {
  return s.puzzle[i] !== 0 || s.hinted[i]
}

/** "row 3, column 5" (1-based) */
export function cellName(i: number): string {
  return `row ${ROW[i] + 1}, column ${COL[i] + 1}`
}

/** How many more of each digit can be placed (index 1-9). */
export function remainingCounts(values: readonly number[]): number[] {
  const left = new Array<number>(10).fill(9)
  left[0] = 0
  for (const v of values) if (v) left[v]--
  return left.map((n) => Math.max(0, n))
}

/** Share of the originally empty cells the player filled correctly (hints excluded). */
export function correctFraction(s: GameState): number {
  let empty = 0
  let right = 0
  for (let i = 0; i < 81; i++) {
    if (s.puzzle[i]) continue
    empty++
    if (!s.hinted[i] && s.values[i] === s.solution[i]) right++
  }
  return empty ? right / empty : 0
}

function isSolved(s: GameState): boolean {
  for (let i = 0; i < 81; i++) if (s.values[i] !== s.solution[i]) return false
  return true
}

function withEvent(s: GameState, event: GameEvent): GameState {
  return { ...s, event, eventId: s.eventId + 1 }
}

function blocked(s: GameState, message: string): GameState {
  return withEvent(s, { kind: "blocked", message })
}

/**
 * Placing digit d at i: the cell itself plus, when `clearPeers`, every peer
 * note of d (only for correct digits, so erasing a wrong one keeps notes).
 */
function placementChanges(values: readonly number[], notes: readonly number[], i: number, d: number, clearPeers: boolean): CellChange[] {
  const bit = 1 << (d - 1)
  const changes: CellChange[] = [{ i, v0: values[i], n0: notes[i], v1: d, n1: 0 }]
  if (!clearPeers) return changes
  for (const p of PEERS[i]) {
    if (!values[p] && notes[p] & bit) changes.push({ i: p, v0: 0, n0: notes[p], v1: 0, n1: notes[p] & ~bit })
  }
  return changes
}

function apply(s: GameState, changes: CellChange[], forward: boolean): { values: number[]; notes: number[] } {
  const values = s.values.slice()
  const notes = s.notes.slice()
  for (const c of changes) {
    if (isLocked(s, c.i)) continue
    values[c.i] = forward ? c.v1 : c.v0
    notes[c.i] = forward ? c.n1 : c.n0
  }
  return { values, notes }
}

/** Puts a digit (or toggles a note) in the given cell. */
export function inputDigit(s: GameState, cell: number, digit: number, asNote: boolean): GameState {
  if (s.phase !== "playing") return s
  if (cell < 0) return blocked(s, "Select a cell first")
  if (s.puzzle[cell]) return blocked(s, `The ${s.values[cell]} at ${cellName(cell)} is a given`)
  if (s.hinted[cell]) return blocked(s, `The ${s.values[cell]} at ${cellName(cell)} was revealed by a hint`)

  const left = remainingCounts(s.values)

  if (asNote) {
    const bit = 1 << (digit - 1)
    if (!s.values[cell] && left[digit] === 0) return blocked(s, `All nine ${digit}s are placed`)
    const n1 = s.values[cell] ? bit : s.notes[cell] ^ bit
    const change: CellChange = { i: cell, v0: s.values[cell], n0: s.notes[cell], v1: 0, n1 }
    const next = apply(s, [change], true)
    return withEvent(
      { ...s, ...next, past: [...s.past, [change]], future: [] },
      { kind: "note", cell, digit, on: (n1 & bit) !== 0 },
    )
  }

  if (s.values[cell] === digit) return s
  if (left[digit] === 0) return blocked(s, `All nine ${digit}s are placed`)

  const correct = digit === s.solution[cell]
  const changes = placementChanges(s.values, s.notes, cell, digit, correct)
  const next = apply(s, changes, true)
  const mistakes = s.mistakes + (correct ? 0 : 1)
  let state: GameState = { ...s, ...next, past: [...s.past, changes], future: [], mistakes }
  const completed = correct ? completedUnits(state.values, state.solution, cell) : []
  state = withEvent(state, { kind: "placed", cell, digit, correct, completed })
  if (isSolved(state)) return { ...state, phase: "won" }
  if (state.mistakeLimit !== null && mistakes >= state.mistakeLimit) return { ...state, phase: "lost" }
  return state
}

export function erase(s: GameState, cell: number): GameState {
  if (s.phase !== "playing") return s
  if (cell < 0) return blocked(s, "Select a cell first")
  if (s.puzzle[cell]) return blocked(s, `The ${s.values[cell]} at ${cellName(cell)} is a given`)
  if (s.hinted[cell]) return blocked(s, `The ${s.values[cell]} at ${cellName(cell)} was revealed by a hint`)
  if (!s.values[cell] && !s.notes[cell]) return s
  const change: CellChange = { i: cell, v0: s.values[cell], n0: s.notes[cell], v1: 0, n1: 0 }
  const next = apply(s, [change], true)
  return withEvent({ ...s, ...next, past: [...s.past, [change]], future: [] }, { kind: "erased", cell })
}

export function undo(s: GameState): GameState {
  if (s.phase !== "playing" || !s.past.length) return s
  const changes = s.past[s.past.length - 1]
  const next = apply(s, changes, false)
  return withEvent(
    { ...s, ...next, past: s.past.slice(0, -1), future: [...s.future, changes] },
    { kind: "undo", cell: changes[0].i },
  )
}

export function redo(s: GameState): GameState {
  if (s.phase !== "playing" || !s.future.length) return s
  const changes = s.future[s.future.length - 1]
  const next = apply(s, changes, true)
  const state = withEvent(
    { ...s, ...next, past: [...s.past, changes], future: s.future.slice(0, -1) },
    { kind: "redo", cell: changes[0].i },
  )
  return isSolved(state) ? { ...state, phase: "won" } : state
}

/**
 * Reveals one cell. Prefers a cell that logic can fill next (the selected one
 * if it qualifies, otherwise the closest to it); falls back to the selected
 * cell, then any unsolved cell. Hints are permanent (not undoable).
 */
export function hint(s: GameState, selected: number): GameState {
  if (s.phase !== "playing") return s
  const known = s.values.map((v, i) => (v === s.solution[i] ? v : 0))
  const options = nextLogicalPlacements(known).filter((p) => s.values[p.cell] !== s.solution[p.cell])

  let cell = -1
  let technique: TechniqueId | null = null
  if (options.length) {
    let best = options[0]
    if (selected >= 0) {
      let bestDist = Infinity
      for (const o of options) {
        const dist = o.cell === selected ? -1 : Math.abs(ROW[o.cell] - ROW[selected]) + Math.abs(COL[o.cell] - COL[selected])
        if (dist < bestDist) {
          bestDist = dist
          best = o
        }
      }
    }
    cell = best.cell
    technique = best.after ?? best.via
  } else if (selected >= 0 && !isLocked(s, selected) && s.values[selected] !== s.solution[selected]) {
    cell = selected
  } else {
    cell = s.values.findIndex((v, i) => v !== s.solution[i])
  }
  if (cell < 0) return s

  const digit = s.solution[cell]
  const changes = placementChanges(s.values, s.notes, cell, digit, true)
  const next = apply(s, changes, true)
  const hinted = s.hinted.slice()
  hinted[cell] = true
  let state: GameState = { ...s, ...next, hinted, hints: s.hints + 1 }
  state = withEvent(state, { kind: "hint", cell, digit, technique, completed: completedUnits(state.values, state.solution, cell) })
  return isSolved(state) ? { ...state, phase: "won" } : state
}

export function giveUp(s: GameState): GameState {
  if (s.phase !== "playing") return s
  return withEvent({ ...s, phase: "gaveup" }, { kind: "gaveup" })
}

// ─── Text ─────────────────────────────────────────────────────

export function unitName(u: number): string {
  if (u < 9) return `Row ${u + 1}`
  if (u < 18) return `Column ${u - 8}`
  return `Box ${u - 17}`
}

function joinUnits(units: number[]): string {
  const names = units.map(unitName)
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1].toLowerCase()}` : names[0]
}

/** Status line for the toolbar (aria-live). */
export function describe(s: GameState, notesMode: boolean): string {
  const label = DIFFICULTY_SPECS[s.difficulty].label
  if (s.phase === "won") return `Solved! ${label} puzzle complete`
  if (s.phase === "lost") return "Out of mistakes. Solution shown"
  if (s.phase === "gaveup") return "Gave up. Solution shown"
  const e = s.event
  if (e) {
    switch (e.kind) {
      case "blocked":
        return e.message
      case "placed":
        if (!e.correct) return `${e.digit} does not belong at ${cellName(e.cell)}`
        if (e.completed.length) return `${joinUnits(e.completed)} complete`
        break
      case "hint": {
        const how = e.technique ? ` (${TECHNIQUE_NAMES[e.technique].toLowerCase()})` : ""
        return `Hint: ${e.digit} at ${cellName(e.cell)}${how}`
      }
      case "undo":
        return `Undid move at ${cellName(e.cell)}`
      case "redo":
        return `Redid move at ${cellName(e.cell)}`
      default:
        break
    }
  }
  return notesMode ? `${label} puzzle · notes on` : `${label} puzzle`
}

