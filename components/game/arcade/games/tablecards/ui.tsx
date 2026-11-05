"use client"

// Shared table UI for Blackjack, Hearts and Crazy Eights: the felt,
// animated cards (layout moves + flips), seat badges and fans.

import { useEffect, useState, type CSSProperties, type ReactNode, type Ref } from "react"
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "framer-motion"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { FELT, FELT_EDGE, PlayingCard, cardHeight } from "@/components/game/arcade/kit/cards"
import { ToolButton } from "@/components/game/arcade/kit/GameShell"
import type { Card } from "./common"

// ─── Measuring ────────────────────────────────────────────────

/** Width of an element, kept current with a ResizeObserver. */
export function useMeasuredWidth<T extends HTMLElement>(fallback = 800): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(Math.round(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, width]
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ─── Felt ─────────────────────────────────────────────────────

/** Card-table surface. Height defaults to fit the arcade dialog. */
export function Felt({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl border-[3px] text-white", className)}
      style={{ backgroundColor: FELT, borderColor: FELT_EDGE, ...style }}
    >
      {children}
    </div>
  )
}

/** Small caption printed on the felt, e.g. table rules. */
export function FeltPrint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("pointer-events-none select-none text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[11px]", className)}>
      {children}
    </p>
  )
}

/** Status line on the felt (results, prompts). */
export function FeltMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("max-w-[92%] rounded-md bg-black/35 px-3 py-1.5 text-center text-xs font-medium text-white sm:text-sm", className)}
      role="status"
    >
      {children}
    </motion.div>
  )
}

// ─── Seats ────────────────────────────────────────────────────

export function SeatBadge({ name, detail, active, className }: {
  name: string
  detail?: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs transition-colors duration-200",
        active ? "bg-white text-slate-900 shadow-sm" : "bg-black/30 text-white/90",
        className,
      )}
    >
      <span className="font-semibold">{name}</span>
      {detail != null && <span className={cn("tabular-nums", active ? "text-slate-600" : "text-white/70")}>{detail}</span>}
    </div>
  )
}

// ─── Animated card ────────────────────────────────────────────

const EASE: Transition["ease"] = [0.22, 0.8, 0.32, 1]

export interface TableCardProps {
  card:       Card
  faceUp:     boolean
  width:      number
  /** shared-layout id; defaults to the card id so cards fly between areas */
  layoutId?:  string
  /** start face down and flip over when mounted (card arriving from a hidden hand) */
  flipIn?:    boolean
  /** delay for the mount animation and the flip-in (staggered deals) */
  enterDelay?: number
  /** delay for shared-layout moves (staggered deals from a shoe) */
  moveDelay?: number
  initial?:   TargetAndTransition | false
  exit?:      TargetAndTransition
  selected?:  boolean
  highlight?: boolean
  disabled?:  boolean
  /** lift slightly on hover (playable cards) */
  hoverLift?: boolean
  /** raise the card by this many px (e.g. legal cards on your turn) */
  lift?:      number
  /** shade the face (e.g. cards you cannot play right now) */
  dim?:       boolean
  onClick?:   () => void
  label?:     string
  className?: string
  style?:     CSSProperties
  /** forwarded to the outer element (AnimatePresence popLayout needs it) */
  ref?:       Ref<HTMLDivElement>
}

export function TableCard({
  card, faceUp, width, layoutId, flipIn, enterDelay = 0, moveDelay = 0, initial, exit,
  selected, highlight, disabled, hoverLift, lift = 0, dim, onClick, label, className, style, ref,
}: TableCardProps) {
  const reduce = useReducedMotion()
  const base: Transition = { type: "tween", ease: EASE, duration: 0.38 }
  const move: Transition = reduce ? { duration: 0 } : { ...base, delay: moveDelay }
  const enter: Transition = reduce ? { duration: 0 } : { ...base, delay: enterDelay }
  const flip: Transition = reduce ? { duration: 0 } : {
    type: "tween", ease: "easeInOut", duration: 0.34, delay: flipIn ? Math.max(enterDelay, moveDelay) + 0.12 : 0,
  }
  const h = cardHeight(width)
  return (
    <motion.div
      ref={ref}
      layoutId={layoutId ?? card.id}
      layout
      initial={initial ?? false}
      animate={{ opacity: 1, x: 0, y: -lift, scale: 1 }}
      exit={exit}
      transition={{ layout: move, default: enter }}
      className={cn("relative shrink-0", className)}
      style={{ width, height: h, ...style }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d", transformPerspective: 900 }}
        initial={flipIn ? { rotateY: 180 } : false}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={flip}
      >
        {faceUp && (
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
            <PlayingCard
              card={card}
              faceUp
              width={width}
              selected={selected}
              highlight={highlight}
              disabled={disabled}
              onClick={onClick ? () => onClick() : undefined}
              label={label}
              className={cn(hoverLift && !disabled && !selected && "hover:-translate-y-1.5")}
            />
            {dim && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[7%] bg-slate-900/35" />}
          </div>
        )}
        <div
          aria-hidden={faceUp || undefined}
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <PlayingCard faceUp={false} width={width} label={faceUp ? undefined : label ?? "Face-down card"} />
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Fans ─────────────────────────────────────────────────────

/** Horizontal spacing so `count` cards of `cardW` fit in `maxW` (never wider than cardW + gap). */
export function fanStep(count: number, cardW: number, maxW: number, gap = 6): number {
  if (count <= 1) return cardW + gap
  return Math.min(cardW + gap, Math.max(8, (maxW - cardW) / (count - 1)))
}

/** Face-down hand of a computer player, horizontal or vertical. */
export function BackFan({ cards, width, step, vertical, label, initialFor, idPrefix = "" }: {
  cards:     readonly Card[]
  width:     number
  /** offset between cards in px */
  step:      number
  vertical?: boolean
  label:     string
  /** deal-in animation for freshly dealt cards (null = none) */
  initialFor?: TargetAndTransition | null
  /** prefix for layout ids (card ids repeat between deals) */
  idPrefix?: string
}) {
  const h = cardHeight(width)
  const n = cards.length
  const box = vertical
    ? { width, height: n ? h + (n - 1) * step : h }
    : { width: n ? width + (n - 1) * step : width, height: h }
  return (
    <div role="img" aria-label={`${label}: ${n} card${n === 1 ? "" : "s"}`} className="relative" style={box}>
      {cards.map((c, i) => (
        <TableCard
          key={idPrefix + c.id}
          layoutId={idPrefix + c.id}
          card={c}
          faceUp={false}
          width={width}
          initial={initialFor ?? false}
          enterDelay={initialFor ? i * 0.03 : 0}
          className="absolute"
          style={vertical ? { left: 0, top: i * step } : { top: 0, left: i * step }}
        />
      ))}
    </div>
  )
}

/** Plain-language count. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

// ─── Two-step quit ────────────────────────────────────────────

/** Toolbar button that asks for a second click before ending the run. */
export function QuitButton({ label = "Quit", confirmLabel = "Confirm quit", onQuit, disabled, title }: {
  label?:        string
  confirmLabel?: string
  onQuit:        () => void
  disabled?:     boolean
  title?:        string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(t)
  }, [armed])
  return (
    <ToolButton
      onClick={() => (armed ? onQuit() : setArmed(true))}
      disabled={disabled}
      title={title}
      className={cn(armed && "border-destructive/60 text-destructive hover:text-destructive")}
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {armed ? confirmLabel : label}
    </ToolButton>
  )
}
