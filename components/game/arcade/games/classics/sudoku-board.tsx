"use client"

// ============================================================
// Sudoku — presentational pieces: the 9x9 board (classic puzzle
// app palette) and the number pad. All game logic lives in
// ./sudoku.ts and ./sudoku-game.ts; interaction is delegated to
// ../sudoku.tsx through callbacks. Cells carry data-cell.
// ============================================================

import { memo } from "react"
import { motion } from "framer-motion"
import { Eraser, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOX, COL, ROW, maskDigits } from "./sudoku"

/**
 * Board palette as CSS variables scoped to the board frame. Light (and
 * pink) themes get the familiar white board with blue highlights; dark
 * theme uses a matching charcoal palette.
 */
const PALETTE = [
  "[--sd-frame:#344054] [--sd-line:#c9d0db] [--sd-cell:#ffffff] [--sd-peer:#e8eef6] [--sd-same:#c8daf2] [--sd-sel:#b0ccf3] [--sd-bad:#f8dcdc]",
  "[--sd-given:#1c2433] [--sd-user:#2563eb] [--sd-wrong:#dc2626] [--sd-note:#687183] [--sd-note-hi:#1d4ed8] [--sd-reveal:#9aa3b1] [--sd-flash:#9dbff0]",
  "dark:[--sd-frame:#8b95a7] dark:[--sd-line:#343b47] dark:[--sd-cell:#181b21] dark:[--sd-peer:#232934] dark:[--sd-same:#1f395b] dark:[--sd-sel:#2b4d7f] dark:[--sd-bad:#4a2026]",
  "dark:[--sd-given:#e7ebf1] dark:[--sd-user:#7cb0fc] dark:[--sd-wrong:#f87171] dark:[--sd-note:#9ba4b2] dark:[--sd-note-hi:#9cc5ff] dark:[--sd-reveal:#646d7b] dark:[--sd-flash:#3b67a6]",
].join(" ")

const THIN = 1
const THICK = 2
const FRAME = 2

/** Snaps a target board width to whole-pixel cells. */
export function boardMetrics(target: number) {
  const cell = Math.max(24, Math.floor((target - 2 * FRAME - 2 * THICK - 6 * THIN) / 9))
  const inner = 9 * cell + 2 * THICK + 6 * THIN
  return { cell, inner, total: inner + 2 * FRAME }
}

/** Left/top offset of column/row k inside the frame. */
function offset(k: number, cell: number): number {
  const thick = Math.floor(k / 3)
  return k * cell + (k - thick) * THIN + thick * THICK
}

export interface BoardEffects {
  id: number
  /** cell that just received a digit (pop-in) */
  pop: number
  /** cell that just received a wrong digit (shake) */
  shake: number
  /** cells to flash (completed row/column/box, or the whole board on a win) */
  flash: number[]
  /** where the flash wave starts */
  origin: number
}

export interface SudokuBoardProps {
  size:         number
  puzzle:       number[]
  solution:     number[]
  values:       number[]
  notes:        number[]
  hinted:       boolean[]
  conflicts:    boolean[]
  selected:     number
  /** game over: show the solution in empty / wrong cells, no highlights */
  revealed:     boolean
  interactive:  boolean
  effects:      BoardEffects | null
  reduceMotion: boolean
  onSelect:     (cell: number) => void
  gridRef:      React.Ref<HTMLDivElement>
  /** id of an element describing the keyboard controls */
  describedBy?: string
}

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export const SudokuBoard = memo(function SudokuBoard(props: SudokuBoardProps) {
  const { size, selected, revealed, interactive, effects, reduceMotion, onSelect, gridRef, describedBy } = props
  const { cell, inner, total } = boardMetrics(size)
  const selDigit = selected >= 0 && !revealed ? props.values[selected] : 0
  const flash = !reduceMotion && effects ? new Set(effects.flash) : null
  const digitFont = Math.round(cell * 0.56)
  const noteFont = Math.max(8, Math.round(cell * 0.24))

  return (
    <div
      className={cn("shrink-0 rounded-md bg-[color:var(--sd-frame)] select-none", PALETTE)}
      style={{ width: total, height: total, padding: FRAME }}
    >
      <div
        ref={gridRef}
        role="grid"
        aria-label="Sudoku board"
        aria-describedby={describedBy}
        aria-readonly={!interactive || undefined}
        className="relative bg-[color:var(--sd-line)]"
        style={{ width: inner, height: inner }}
      >
        {ROWS.map((r) => (
          <div key={r} role="row" className="flex" style={{ marginTop: r === 0 ? 0 : r % 3 === 0 ? THICK : THIN }}>
            {ROWS.map((c) => {
              const i = r * 9 + c
              return (
                <Cell
                  key={i}
                  i={i}
                  size={cell}
                  digitFont={digitFont}
                  noteFont={noteFont}
                  given={props.puzzle[i]}
                  value={props.values[i]}
                  answer={props.solution[i]}
                  notes={props.notes[i]}
                  hinted={props.hinted[i]}
                  conflict={props.conflicts[i]}
                  selected={!revealed && i === selected}
                  peer={!revealed && selected >= 0 && i !== selected && (ROW[i] === ROW[selected] || COL[i] === COL[selected] || BOX[i] === BOX[selected])}
                  selDigit={selDigit}
                  revealed={revealed}
                  interactive={interactive}
                  tabbable={i === (selected >= 0 ? selected : 0)}
                  effects={!reduceMotion && effects && (effects.pop === i || effects.shake === i) ? effects : null}
                  flashDelay={flash?.has(i) && effects ? Math.max(Math.abs(ROW[i] - ROW[effects.origin]), Math.abs(COL[i] - COL[effects.origin])) * 0.035 : -1}
                  flashId={effects?.id ?? 0}
                  onSelect={onSelect}
                />
              )
            })}
          </div>
        ))}
        {/* thick 3x3 box lines */}
        {[3, 6].map((k) => (
          <div key={`v${k}`} aria-hidden className="pointer-events-none absolute top-0 bottom-0 bg-[color:var(--sd-frame)]" style={{ left: offset(k, cell) - THICK, width: THICK }} />
        ))}
        {[3, 6].map((k) => (
          <div key={`h${k}`} aria-hidden className="pointer-events-none absolute left-0 right-0 bg-[color:var(--sd-frame)]" style={{ top: offset(k, cell) - THICK, height: THICK }} />
        ))}
      </div>
    </div>
  )
})

interface CellProps {
  i:           number
  size:        number
  digitFont:   number
  noteFont:    number
  given:       number
  value:       number
  answer:      number
  notes:       number
  hinted:      boolean
  conflict:    boolean
  selected:    boolean
  peer:        boolean
  selDigit:    number
  revealed:    boolean
  interactive: boolean
  tabbable:    boolean
  effects:     BoardEffects | null
  flashDelay:  number
  flashId:     number
  onSelect:    (cell: number) => void
}

const NOTE_SLOTS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const Cell = memo(function Cell(p: CellProps) {
  const r = ROW[p.i]
  const c = COL[p.i]
  const wrong = !p.given && p.value !== 0 && p.value !== p.answer
  const showAnswer = p.revealed && (p.value === 0 || wrong)
  const digit = showAnswer ? p.answer : p.value
  const same = !p.selected && p.selDigit !== 0 && p.value === p.selDigit

  let bg = "bg-[color:var(--sd-cell)]"
  if (p.revealed) {
    if (wrong) bg = "bg-[color:var(--sd-bad)]"
  } else if (p.selected) bg = "bg-[color:var(--sd-sel)]"
  else if (p.conflict) bg = "bg-[color:var(--sd-bad)]"
  else if (same) bg = "bg-[color:var(--sd-same)]"
  else if (p.peer) bg = "bg-[color:var(--sd-peer)]"

  const color = showAnswer
    ? "text-[color:var(--sd-reveal)] font-normal"
    : p.given
      ? "text-[color:var(--sd-given)] font-semibold"
      : wrong
        ? "text-[color:var(--sd-wrong)] font-medium"
        : "text-[color:var(--sd-user)] font-medium"

  const noteDigits = !digit && p.notes ? maskDigits(p.notes) : []
  let label = `Row ${r + 1}, column ${c + 1}, `
  if (showAnswer) label += `${digit}, ${wrong ? `revealed, you had ${p.value}` : "revealed"}`
  else if (digit) {
    label += String(digit)
    if (p.given) label += ", given"
    else if (p.hinted) label += ", hint"
    if (wrong) label += ", incorrect"
    if (p.conflict) label += ", conflict"
  } else label += noteDigits.length ? `empty, notes ${noteDigits.join(" ")}` : "empty"

  const fx = p.effects
  const pop = fx && fx.pop === p.i
  const shake = fx && fx.shake === p.i

  return (
    <div
      role="gridcell"
      data-cell={p.i}
      tabIndex={p.tabbable ? 0 : -1}
      aria-label={label}
      aria-selected={p.selected}
      onClick={p.interactive ? () => p.onSelect(p.i) : undefined}
      onFocus={p.interactive ? () => p.onSelect(p.i) : undefined}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden outline-none transition-colors duration-100",
        "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        "[-webkit-tap-highlight-color:transparent]",
        p.interactive ? "cursor-pointer" : "cursor-default",
        bg,
      )}
      style={{ width: p.size, height: p.size, marginLeft: c === 0 ? 0 : c % 3 === 0 ? THICK : THIN }}
    >
      {p.flashDelay >= 0 && (
        <motion.span
          key={p.flashId}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[color:var(--sd-flash)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.65, 0] }}
          transition={{ duration: 0.55, delay: p.flashDelay, ease: "easeOut" }}
        />
      )}
      {digit ? (
        pop || shake ? (
          <motion.span
            key={`${digit}-${fx?.id}`}
            aria-hidden
            className={cn("relative leading-none tabular-nums", color)}
            style={{ fontSize: p.digitFont }}
            initial={{ scale: 0.55, opacity: 0 }}
            animate={shake ? { scale: 1, opacity: 1, x: [0, -4, 4, -3, 3, 0] } : { scale: 1, opacity: 1 }}
            transition={shake ? { duration: 0.36, x: { duration: 0.36, delay: 0.05 } } : { duration: 0.16, ease: "easeOut" }}
          >
            {digit}
          </motion.span>
        ) : (
          <span aria-hidden className={cn("relative leading-none tabular-nums", color)} style={{ fontSize: p.digitFont }}>
            {digit}
          </span>
        )
      ) : noteDigits.length ? (
        <span aria-hidden className="relative grid h-full w-full grid-cols-3 grid-rows-3" style={{ padding: Math.max(1, Math.round(p.size * 0.05)) }}>
          {NOTE_SLOTS.map((d) => {
            const on = (p.notes & (1 << (d - 1))) !== 0
            const hi = on && d === p.selDigit
            return (
              <span
                key={d}
                className={cn(
                  "flex items-center justify-center leading-none tabular-nums",
                  hi ? "font-bold text-[color:var(--sd-note-hi)]" : "text-[color:var(--sd-note)]",
                )}
                style={{ fontSize: p.noteFont }}
              >
                {on ? d : ""}
              </span>
            )
          })}
        </span>
      ) : null}
    </div>
  )
})

// ─── Number pad ───────────────────────────────────────────────

export interface NumberPadProps {
  layout:        "side" | "bottom"
  width:         number
  /** digit button height */
  digitHeight:   number
  remaining:     number[]
  notesMode:     boolean
  disabled:      boolean
  onDigit:       (d: number) => void
  onErase:       () => void
  onToggleNotes: () => void
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function NumberPad({ layout, width, digitHeight, remaining, notesMode, disabled, onDigit, onErase, onToggleNotes }: NumberPadProps) {
  const side = layout === "side"
  const digitFont = side ? Math.round(Math.min(30, digitHeight * 0.42)) : Math.round(Math.min(24, width / 9 * 0.5))
  const tool = cn(
    "flex items-center justify-center rounded-lg border text-xs font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
    side ? "h-14 flex-col gap-1" : "h-9 gap-1.5",
  )

  return (
    <div className={cn("flex flex-col", side ? "gap-3" : "gap-2")} style={{ width }}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={notesMode}
          disabled={disabled}
          onClick={onToggleNotes}
          title="Notes (N)"
          className={cn(
            tool,
            notesMode
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          <span>
            Notes{" "}
            <span className={cn("rounded px-1 py-px text-[10px] font-semibold uppercase", notesMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {notesMode ? "On" : "Off"}
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onErase}
          title="Erase (Backspace)"
          className={cn(tool, "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground")}
        >
          <Eraser className="h-4 w-4" aria-hidden />
          <span>Erase</span>
        </button>
      </div>

      <div className={cn("grid", side ? "grid-cols-3 gap-2" : "grid-cols-9 gap-1")}>
        {DIGITS.map((d) => {
          const left = remaining[d] ?? 0
          const done = left === 0
          return (
            <button
              key={d}
              type="button"
              disabled={disabled || done}
              onClick={() => onDigit(d)}
              aria-label={done ? `${d}, all placed` : notesMode ? `Note ${d}` : `${d}, ${left} left`}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border border-border bg-card transition-colors",
                "hover:bg-muted active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none",
                done && "opacity-35",
                disabled && !done && "opacity-60",
              )}
              style={{ height: digitHeight }}
            >
              <span
                className={cn(
                  "font-semibold leading-none tabular-nums",
                  notesMode ? "text-muted-foreground" : "text-primary",
                )}
                style={{ fontSize: notesMode ? Math.round(digitFont * 0.72) : digitFont }}
              >
                {d}
              </span>
              <span className={cn("mt-1 text-[10px] leading-none tabular-nums text-muted-foreground", done && "invisible")} aria-hidden>
                {left}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
