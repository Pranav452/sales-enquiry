// Staunton-style SVG chess pieces drawn for the arcade (45x45 viewBox).
// White pieces: white fill, dark outline. Black pieces: near-black fill
// with light seam lines so the parts stay readable on dark squares.

import { memo, type ReactNode } from "react"

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k"
export type PieceColor = "w" | "b"

interface Palette { fill: string; stroke: string; detail: string }

const PALETTE: Record<PieceColor, Palette> = {
  w: { fill: "#ffffff", stroke: "#1c1c1c", detail: "#1c1c1c" },
  b: { fill: "#2b2b2b", stroke: "#0b0b0b", detail: "#d9d9d9" },
}

// Shared plinth used by every piece except the pawn.
const PLINTH = "M9.5 39.5h26v-1.6a2.4 2.4 0 0 0-2.4-2.4H11.9a2.4 2.4 0 0 0-2.4 2.4z"

/** Light seam lines, only drawn on black pieces (white ones show seams via outlines). */
function Seams({ p, color, d }: { p: Palette; color: PieceColor; d: string }) {
  if (color === "w") return null
  return <path d={d} fill="none" stroke={p.detail} strokeWidth={1} />
}

const DRAW: Record<PieceType, (p: Palette, color: PieceColor) => ReactNode> = {
  p: (p, color) => (
    <>
      <path d="M15.5 36C16 30.8 18.4 27 20.4 24.6h4.2c2 2.4 4.4 6.2 4.9 11.4z" />
      <path d="M11 39.5h23v-1a3 3 0 0 0-3-3H14a3 3 0 0 0-3 3z" />
      <rect x="16.3" y="21.6" width="12.4" height="3.3" rx="1.65" />
      <circle cx="22.5" cy="15.6" r="5.6" />
      <Seams p={p} color={color} d="M14.5 37.2h16M18.6 23.25h7.8" />
    </>
  ),

  r: (p, color) => (
    <>
      <path d="M14.8 33L15.8 18.5h13.4L30.2 33z" />
      <rect x="12.5" y="31.8" width="20" height="3.9" rx="1" />
      <path d={PLINTH} />
      <rect x="13" y="15.2" width="19" height="3.6" rx="0.8" />
      <path d="M12.5 15.2V9.2h4.6v3h3V9.2h4.8v3h3V9.2h4.6v6z" />
      <Seams p={p} color={color} d="M17 20.2h11M16.4 30.3h12.2M13.5 37.4h18M14.6 13.6h15.8" />
    </>
  ),

  n: (p, color) => (
    <>
      <path d="M14.4 36c.1-4.7 2.2-8.4 4.9-11.4-2.2 1.6-4.6 2.8-7.2 3.1-1.9.2-3.5-.8-3.6-2.6-.1-1.4.4-2.7 1.1-3.8l4.6-6.6c.8-1.2 1.7-2.3 2.8-3.1l2.6-1.8.6-3.4 2.4 2.5c6.9.4 11.4 5.7 11.9 13.5.3 4.6-.2 9.4-.3 13.6z" />
      <path d={PLINTH} />
      <path d="M10.3 26.2c1-.2 1.9-.5 2.7-1" fill="none" stroke={p.detail} strokeWidth={1} />
      <ellipse cx="17.6" cy="15.6" rx="1.05" ry="1.55" transform="rotate(35 17.6 15.6)" fill={p.detail} stroke="none" />
      <circle cx="10.8" cy="22.6" r="0.75" fill={p.detail} stroke="none" />
      <path d="M25.6 13.4c3.6 2.2 5.4 6.8 5.4 11.6 0 3.2-.3 6.6-.4 9.2" fill="none" stroke={p.detail} strokeWidth={1} />
      <Seams p={p} color={color} d="M13.5 37.4h18" />
    </>
  ),

  b: (p, color) => (
    <>
      <path d="M15 36c.4-4.6 2.9-7.8 4.5-9.4h6c1.6 1.6 4.1 4.8 4.5 9.4z" />
      <path d={PLINTH} />
      <rect x="15.9" y="23.4" width="13.2" height="3.3" rx="1.65" />
      <path d="M22.5 9.6c-5.2 3.5-7.4 8.4-5.2 13.8h10.4c2.2-5.4 0-10.3-5.2-13.8z" />
      <circle cx="22.5" cy="7.6" r="2.3" />
      <path d="M24.8 13.6l-4.2 4.6" fill="none" stroke={p.detail} strokeWidth={1.3} />
      <Seams p={p} color={color} d="M13.5 37.4h18M18 25.05h9" />
    </>
  ),

  q: (p, color) => (
    <>
      <path d="M13 36c1-4.6 2.5-7.4 3-10.4h13c.5 3 2 5.8 3 10.4z" />
      <path d={PLINTH} />
      <rect x="14" y="22.6" width="17" height="3.3" rx="1.65" />
      <path d="M14.2 22.6L10.6 12.8l5.6 5.1.9-7.6 3.5 6.6 1.9-7.6 1.9 7.6 3.5-6.6.9 7.6 5.6-5.1-3.6 9.8z" />
      <circle cx="10.4" cy="11.6" r="1.9" />
      <circle cx="17" cy="9.4" r="1.9" />
      <circle cx="22.5" cy="8.2" r="1.9" />
      <circle cx="28" cy="9.4" r="1.9" />
      <circle cx="34.6" cy="11.6" r="1.9" />
      <Seams p={p} color={color} d="M13.5 37.4h18M16 24.25h13M15.6 20.9h13.8" />
    </>
  ),

  k: (p, color) => (
    <>
      <path d="M13.5 36c1-4.6 2.2-7.4 3-10.4h12c.8 3 2 5.8 3 10.4z" />
      <path d={PLINTH} />
      <path d="M21.2 4h2.6v2.8h2.8v2.6h-2.8v4.8h-2.6V9.4h-2.8V6.8h2.8z" />
      <rect x="14.5" y="22.6" width="16" height="3.3" rx="1.65" />
      <path d="M15.4 22.6c-3.9-4.4-2.2-10 2.6-9.8 2 .1 3.6 1.6 4.5 3.6.9-2 2.5-3.5 4.5-3.6 4.8-.2 6.5 5.4 2.6 9.8z" />
      <Seams p={p} color={color} d="M13.5 37.4h18M16.5 24.25h12M22.5 16.8v4.4" />
    </>
  ),
}

export const PIECE_NAMES: Record<PieceType, string> = {
  p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king",
}

export const PieceSvg = memo(function PieceSvg({ type, color, className }: {
  type: PieceType
  color: PieceColor
  className?: string
}) {
  const p = PALETTE[color]
  return (
    <svg viewBox="0 0 45 45" className={className} aria-hidden="true" focusable="false">
      <g fill={p.fill} stroke={p.stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round">
        {DRAW[type](p, color)}
      </g>
    </svg>
  )
})
