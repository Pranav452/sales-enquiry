"use client"

// ============================================================
// Playing-card kit shared by every card game.
// Cards are drawn as SVG (suits are paths, not font glyphs) so
// they look identical on every OS and never render as emoji.
// ============================================================

import { memo, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { shuffle } from "./random"

export type Suit = "S" | "H" | "D" | "C"
/** 1 = Ace … 11 = Jack, 12 = Queen, 13 = King */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export interface PlayingCardData {
  /** unique within a game, e.g. "H12" or "H12-b" for a second deck */
  id:   string
  suit: Suit
  rank: Rank
}

export const SUITS: Suit[] = ["S", "H", "D", "C"]
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
export const SUIT_NAME: Record<Suit, string> = { S: "Spades", H: "Hearts", D: "Diamonds", C: "Clubs" }

export function isRed(suit: Suit): boolean {
  return suit === "H" || suit === "D"
}

export function rankLabel(rank: Rank): string {
  return rank === 1 ? "A" : rank === 11 ? "J" : rank === 12 ? "Q" : rank === 13 ? "K" : String(rank)
}

export function rankName(rank: Rank): string {
  return rank === 1 ? "Ace" : rank === 11 ? "Jack" : rank === 12 ? "Queen" : rank === 13 ? "King" : String(rank)
}

/** "Queen of Hearts" — use for aria labels. */
export function cardName(c: Pick<PlayingCardData, "rank" | "suit">): string {
  return `${rankName(c.rank)} of ${SUIT_NAME[c.suit]}`
}

/** One or more 52-card decks. `suits` lets Spider use 1 or 2 suits. */
export function makeDeck(decks = 1, suits: Suit[] = SUITS): PlayingCardData[] {
  const out: PlayingCardData[] = []
  const copiesPerSuit = (decks * 4) / suits.length
  for (let copy = 0; copy < copiesPerSuit; copy++) {
    for (const suit of suits) {
      for (const rank of RANKS) out.push({ id: `${suit}${rank}${copy ? `-${copy}` : ""}`, suit, rank })
    }
  }
  return out
}

export function shuffledDeck(rng: () => number, decks = 1, suits: Suit[] = SUITS): PlayingCardData[] {
  return shuffle(makeDeck(decks, suits), rng)
}

// ─── Suit artwork (100x100 boxes) ─────────────────────────────

const SUIT_PATH: Record<Suit, string> = {
  D: "M50 3 L90 50 L50 97 L10 50 Z",
  H: "M50 93 C20 71 4 53 4 32 C4 16 16 4 30 4 C40 4 47 10 50 19 C53 10 60 4 70 4 C84 4 96 16 96 32 C96 53 80 71 50 93 Z",
  S: "M50 3 C80 28 96 44 96 62 C96 76 85 86 72 86 C63 86 56 82 53 76 C54 84 57 90 65 97 L35 97 C43 90 46 84 47 76 C44 82 37 86 28 86 C15 86 4 76 4 62 C4 44 20 28 50 3 Z",
  C: "M46 60 C46 77 42 89 33 97 L67 97 C58 89 54 77 54 60 Z",   // stem; lobes are circles (see SuitShape)
}

/** Suit drawing inside a 100x100 box. */
function SuitShape({ suit, fill }: { suit: Suit; fill: string }) {
  if (suit === "C") {
    return (
      <g fill={fill}>
        <circle cx={50} cy={27} r={21} />
        <circle cx={27} cy={58} r={21} />
        <circle cx={73} cy={58} r={21} />
        <circle cx={50} cy={52} r={14} />
        <path d={SUIT_PATH.C} />
      </g>
    )
  }
  return <path d={SUIT_PATH[suit]} fill={fill} />
}

const RED = "#c62828"
const BLACK = "#1f2937"

export function SuitIcon({ suit, size = 16, className, color }: { suit: Suit; size?: number; className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden>
      <SuitShape suit={suit} fill={color ?? (isRed(suit) ? RED : BLACK)} />
    </svg>
  )
}

// Pip layouts on a 250x350 face (x, y); pips below the middle are drawn upside down.
const L = 72, M = 125, R = 178
const PIPS: Record<number, [number, number][]> = {
  2:  [[M, 72], [M, 278]],
  3:  [[M, 72], [M, 175], [M, 278]],
  4:  [[L, 72], [R, 72], [L, 278], [R, 278]],
  5:  [[L, 72], [R, 72], [M, 175], [L, 278], [R, 278]],
  6:  [[L, 72], [R, 72], [L, 175], [R, 175], [L, 278], [R, 278]],
  7:  [[L, 72], [R, 72], [M, 123], [L, 175], [R, 175], [L, 278], [R, 278]],
  8:  [[L, 72], [R, 72], [M, 123], [L, 175], [R, 175], [M, 227], [L, 278], [R, 278]],
  9:  [[L, 72], [R, 72], [L, 140], [R, 140], [M, 175], [L, 210], [R, 210], [L, 278], [R, 278]],
  10: [[L, 72], [R, 72], [M, 106], [L, 140], [R, 140], [L, 210], [R, 210], [M, 244], [L, 278], [R, 278]],
}

function Pip({ suit, x, y, size }: { suit: Suit; x: number; y: number; size: number }) {
  const flip = y > 180
  return (
    <g transform={`translate(${x - size / 2} ${y - size / 2})${flip ? ` rotate(180 ${size / 2} ${size / 2})` : ""}`}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <SuitShape suit={suit} fill={isRed(suit) ? RED : BLACK} />
      </svg>
    </g>
  )
}

const CardFaceSvg = memo(function CardFaceSvg({ suit, rank }: { suit: Suit; rank: Rank }) {
  const color = isRed(suit) ? RED : BLACK
  const label = rankLabel(rank)
  const corner = (
    <g>
      <text x={24} y={56} fontSize={label === "10" ? 46 : 52} fontWeight={700} fill={color}
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
        textAnchor="middle" letterSpacing={label === "10" ? -3 : 0}>{label}</text>
      <g transform="translate(9 66)">
        <svg viewBox="0 0 100 100" width={30} height={30}><SuitShape suit={suit} fill={color} /></svg>
      </g>
    </g>
  )
  return (
    <svg viewBox="0 0 250 350" className="block h-full w-full" aria-hidden>
      <rect x={1.5} y={1.5} width={247} height={347} rx={18} fill="#ffffff" stroke="#cbd5e1" strokeWidth={3} />
      {corner}
      <g transform="rotate(180 125 175)">{corner}</g>
      {rank === 1 && (
        <g transform="translate(70 120)">
          <svg viewBox="0 0 100 100" width={110} height={110}><SuitShape suit={suit} fill={color} /></svg>
        </g>
      )}
      {rank >= 2 && rank <= 10 && PIPS[rank].map(([x, y], i) => <Pip key={i} suit={suit} x={x} y={y} size={46} />)}
      {rank >= 11 && (
        <g>
          <rect x={52} y={52} width={146} height={246} rx={10} fill={isRed(suit) ? "#fdecec" : "#eef1f5"} stroke={color} strokeWidth={3} />
          <text x={125} y={190} fontSize={120} fontWeight={700} fill={color} textAnchor="middle"
            fontFamily="Georgia, 'Times New Roman', serif">{label}</text>
          <g transform="translate(103 205)">
            <svg viewBox="0 0 100 100" width={44} height={44}><SuitShape suit={suit} fill={color} /></svg>
          </g>
          <g transform="translate(103 70)">
            <svg viewBox="0 0 100 100" width={44} height={44}><SuitShape suit={suit} fill={color} /></svg>
          </g>
        </g>
      )}
    </svg>
  )
})

const CardBackSvg = memo(function CardBackSvg() {
  return (
    <svg viewBox="0 0 250 350" className="block h-full w-full" aria-hidden>
      <defs>
        <pattern id="card-back-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="#1e3a8a" />
          <line x1="0" y1="0" x2="0" y2="16" stroke="#3b5bb5" strokeWidth="5" />
        </pattern>
      </defs>
      <rect x={1.5} y={1.5} width={247} height={347} rx={18} fill="#ffffff" stroke="#cbd5e1" strokeWidth={3} />
      <rect x={14} y={14} width={222} height={322} rx={10} fill="url(#card-back-hatch)" />
    </svg>
  )
})

// ─── <PlayingCard /> ──────────────────────────────────────────

export interface PlayingCardProps {
  card?:      Pick<PlayingCardData, "suit" | "rank"> | null
  faceUp?:    boolean
  /** rendered width in px; height follows the 5:7 ratio */
  width?:     number
  selected?:  boolean
  /** soft highlight, e.g. a legal target or hint */
  highlight?: boolean
  disabled?:  boolean
  className?: string
  style?:     CSSProperties
  onClick?:   (e: MouseEvent<HTMLDivElement>) => void
  onDoubleClick?: (e: MouseEvent<HTMLDivElement>) => void
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void
  /** aria label override; defaults to the card name or "Face-down card" */
  label?:     string
}

export const CARD_RATIO = 350 / 250

export function cardHeight(width: number): number {
  return Math.round(width * CARD_RATIO)
}

export function PlayingCard({
  card, faceUp = true, width = 72, selected, highlight, disabled, className, style,
  onClick, onDoubleClick, onPointerDown, label,
}: PlayingCardProps) {
  const interactive = !!(onClick || onDoubleClick || onPointerDown) && !disabled
  const name = label ?? (card && faceUp ? cardName(card) : "Face-down card")
  return (
    <div
      role={interactive ? "button" : "img"}
      tabIndex={interactive ? 0 : undefined}
      aria-label={name}
      aria-pressed={interactive && selected != null ? selected : undefined}
      onClick={disabled ? undefined : onClick}
      onDoubleClick={disabled ? undefined : onDoubleClick}
      onPointerDown={disabled ? undefined : onPointerDown}
      onKeyDown={interactive && onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e as unknown as MouseEvent<HTMLDivElement>) }
      } : undefined}
      className={cn(
        "relative shrink-0 select-none rounded-[7%] shadow-sm transition-[transform,box-shadow] duration-150",
        interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected && "-translate-y-2 ring-2 ring-primary",
        highlight && !selected && "ring-2 ring-amber-400",
        disabled && "opacity-60",
        className,
      )}
      style={{ width, height: cardHeight(width), touchAction: onPointerDown ? "none" : undefined, ...style }}
    >
      {card && faceUp ? <CardFaceSvg suit={card.suit} rank={card.rank} /> : <CardBackSvg />}
    </div>
  )
}

/** Empty pile outline (foundation, free cell, empty column). */
export function CardSlot({
  width = 72, label, highlight, className, onClick, children,
}: {
  width?: number; label?: string; highlight?: boolean; className?: string
  onClick?: () => void; children?: ReactNode
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick() } } : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[7%] border-2 border-dashed border-white/35! bg-black/10 text-white/50",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        highlight && "border-amber-300! bg-amber-200/10",
        className,
      )}
      style={{ width, height: cardHeight(width) }}
    >
      {children}
    </div>
  )
}

/** Conventional green felt for card tables (fixed colour, theme independent). */
export const FELT = "#1f5c45"
export const FELT_EDGE = "#174a37"
