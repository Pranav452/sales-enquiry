"use client"

// ============================================================
// Minesweeper — presentational board pieces: classic palette,
// cell button, mine / flag glyphs. All interaction is delegated
// to the grid in ../minesweeper.tsx (cells carry data-cell).
// ============================================================

import { memo, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CellView } from "./minesweeper"

/**
 * Classic Windows palette as CSS variables, scoped to the board frame.
 * Dark theme keeps the same raised-grey look, one step darker.
 */
export const BOARD_PALETTE = [
  // light (also pink): classic #c0c0c0 board
  "[--ms-frame:#c0c0c0] [--ms-hi:#ffffff] [--ms-lo:#808080] [--ms-face:#c0c0c0] [--ms-face-hover:#cacaca]",
  "[--ms-open:#d6d6d6] [--ms-grid:#a3a3a3] [--ms-boom:#f03030] [--ms-mine:#141414] [--ms-flag:#e00000] [--ms-focus:#1d4ed8]",
  "[--ms-n1:#0000f0] [--ms-n2:#007800] [--ms-n3:#e00000] [--ms-n4:#000080] [--ms-n5:#800000] [--ms-n6:#007878] [--ms-n7:#000000] [--ms-n8:#666666]",
  // dark: same look, darker greys
  "dark:[--ms-frame:#7c7f86] dark:[--ms-hi:#a9acb2] dark:[--ms-lo:#45484e] dark:[--ms-face:#8a8d93] dark:[--ms-face-hover:#93969c]",
  "dark:[--ms-open:#a2a5aa] dark:[--ms-grid:#74777d] dark:[--ms-boom:#e03131] dark:[--ms-mine:#0f0f10] dark:[--ms-flag:#c80000] dark:[--ms-focus:#facc15]",
  "dark:[--ms-n1:#0000c8] dark:[--ms-n2:#005f00] dark:[--ms-n3:#b00000] dark:[--ms-n4:#000068] dark:[--ms-n5:#680000] dark:[--ms-n6:#005a5a] dark:[--ms-n7:#000000] dark:[--ms-n8:#3f3f3f]",
].join(" ")

// Border colours carry "!" because app/globals.css has an unlayered
// `* { border-color }` rule that beats every layered border-colour utility.

/** Raised panel (light top/left, dark bottom/right). */
export const RAISED_FRAME =
  "border-[3px] border-t-[color:var(--ms-hi)]! border-l-[color:var(--ms-hi)]! border-b-[color:var(--ms-lo)]! border-r-[color:var(--ms-lo)]! bg-[color:var(--ms-frame)]"
/** Sunken well around the grid. */
export const SUNKEN_FRAME =
  "border-[3px] border-t-[color:var(--ms-lo)]! border-l-[color:var(--ms-lo)]! border-b-[color:var(--ms-hi)]! border-r-[color:var(--ms-hi)]!"
/** Horizontal space taken by the two frames + padding (px), for sizing. */
export const FRAME_PX = 2 * (3 + 6 + 3)

const CELL_BASE =
  "relative flex shrink-0 items-center justify-center p-0 select-none " +
  "h-[var(--ms-cell)] w-[var(--ms-cell)] text-[length:var(--ms-font)] leading-none font-extrabold " +
  "outline-hidden focus-visible:z-10 focus-visible:outline-solid focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] " +
  "focus-visible:outline-[color:var(--ms-focus)] [-webkit-tap-highlight-color:transparent]"

const RAISED =
  "border-2 border-t-[color:var(--ms-hi)]! border-l-[color:var(--ms-hi)]! border-b-[color:var(--ms-lo)]! border-r-[color:var(--ms-lo)]! bg-[color:var(--ms-face)]"
const FLAT = "border-l border-t border-[color:var(--ms-grid)]! bg-[color:var(--ms-open)]"
const BOOM = "border-l border-t border-[color:var(--ms-grid)]! bg-[color:var(--ms-boom)]"

export function MineGlyph({ crossed = false, className }: { crossed?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("text-[color:var(--ms-mine)]", className)} aria-hidden focusable="false">
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="8" y1="1.6" x2="8" y2="14.4" />
        <line x1="1.6" y1="8" x2="14.4" y2="8" />
        <line x1="3.5" y1="3.5" x2="12.5" y2="12.5" />
        <line x1="12.5" y1="3.5" x2="3.5" y2="12.5" />
      </g>
      <circle cx="8" cy="8" r="4.7" fill="currentColor" />
      <rect x="5.5" y="5.5" width="2.2" height="2.2" fill="#ffffff" />
      {crossed && (
        <path d="M2 2 L14 14 M14 2 L2 14" stroke="var(--ms-flag)" strokeWidth="1.9" strokeLinecap="round" />
      )}
    </svg>
  )
}

function FlagGlyph({ animate }: { animate: boolean }) {
  return (
    <motion.span
      className="flex h-[64%] w-[64%] items-center justify-center"
      initial={animate ? { scale: 0.55, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      <Flag className="h-full w-full text-[color:var(--ms-flag)]" fill="currentColor" strokeWidth={2.4} aria-hidden />
    </motion.span>
  )
}

export function describeCell(view: CellView): string {
  switch (view.kind) {
    case "hidden":     return "hidden"
    case "flag":       return "flagged"
    case "wrong-flag": return "flagged, no mine"
    case "mine":       return "mine"
    case "exploded":   return "exploded mine"
    case "open":
      return view.count === 0 ? "empty" : `${view.count} mine${view.count === 1 ? "" : "s"} nearby`
  }
}

export interface CellProps {
  index:    number
  row:      number
  col:      number
  kind:     CellView["kind"]
  count:    number
  pressed:  boolean
  tabbable: boolean
  /** hover lightening only while the game is live */
  live:     boolean
  animate:  boolean
}

export const Cell = memo(function Cell({ index, row, col, kind, count, pressed, tabbable, live, animate }: CellProps) {
  const view: CellView = kind === "open" ? { kind, count } : { kind }
  const raised = (kind === "hidden" && !pressed) || kind === "flag"
  const look =
    kind === "exploded" ? BOOM
    : raised ? cn(RAISED, live && "hover:bg-[color:var(--ms-face-hover)]")
    : FLAT

  let content: ReactNode = null
  if (kind === "flag") content = <FlagGlyph animate={animate} />
  else if (kind === "mine" || kind === "exploded") content = <MineGlyph className="h-[68%] w-[68%]" />
  else if (kind === "wrong-flag") content = <MineGlyph crossed className="h-[68%] w-[68%]" />
  else if (kind === "open" && count > 0) {
    content = <span aria-hidden style={{ color: `var(--ms-n${count})` }}>{count}</span>
  }

  return (
    <button
      type="button"
      role="gridcell"
      data-cell={index}
      tabIndex={tabbable ? 0 : -1}
      aria-label={`Row ${row + 1}, column ${col + 1}, ${describeCell(view)}`}
      className={cn(CELL_BASE, look)}
    >
      {content}
    </button>
  )
})
