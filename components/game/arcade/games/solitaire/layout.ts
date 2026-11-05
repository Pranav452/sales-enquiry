// ============================================================
// Solitaire engine — responsive table geometry (pure).
// Cards are sized from the available width (and capped by the
// height so a typical game fits), columns fan with offsets that
// compress automatically when a column gets tall.
// ============================================================

import { CARD_RATIO } from "@/components/game/arcade/kit/cards"
import type { Rect, SCard } from "./model"

export interface Grid {
  width:  number
  height: number
  cw:     number
  ch:     number
  gap:    number
  /** x of column i */
  colX:   (i: number) => number
  /** y of the top row (stock / foundations / cells) */
  topY:   number
  /** y where tableau columns start */
  tabY:   number
  /** bottom padding */
  pad:    number
}

/**
 * @param cols    number of tableau columns
 * @param maxW    largest card width allowed
 * @param hCards  card heights a typical column needs (top row included);
 *                caps the card size on short screens
 */
export function makeGrid(width: number, height: number, cols: number, maxW: number, hCards: number): Grid {
  const narrow = width < 560
  const ratio = narrow ? 0.07 : 0.14          // gap as a share of the card width
  const byWidth = width / (cols + (cols + 1) * ratio)
  const byHeight = (height - 36) / (hCards * CARD_RATIO)
  let cw = Math.max(22, Math.floor(Math.min(byWidth, byHeight, maxW)))
  let minGap = Math.max(3, Math.round(cw * ratio))
  // cards plus gaps (and both margins) must fit the width exactly
  while (cw > 22 && cols * cw + (cols + 1) * minGap > width) {
    cw--
    minGap = Math.max(3, Math.round(cw * ratio))
  }
  const ch = Math.round(cw * CARD_RATIO)
  // spread spare width into the gaps (up to a limit) so the table never looks cramped
  const gap = Math.max(minGap, Math.min(Math.round(cw * 0.3), Math.floor((width - cols * cw) / (cols + 1))))
  const total = cols * cw + (cols - 1) * gap
  const left = Math.round((width - total) / 2)
  const topY = Math.max(6, Math.min(16, Math.round(gap * 0.8)))
  const tabY = topY + ch + Math.max(8, Math.round(minGap * 1.6))
  return {
    width, height, cw, ch, gap, topY, tabY,
    pad: Math.max(6, Math.round(minGap)),
    colX: (i: number) => left + i * (cw + gap),
  }
}

/**
 * Y offsets (relative to the column top) for a fanned column. Face-down
 * cards use the tighter `down` step; offsets shrink to fit `avail` px.
 */
export function fanOffsets(cards: readonly Pick<SCard, "up">[], avail: number, ch: number, down: number, up: number): number[] {
  const n = cards.length
  if (!n) return []
  let downs = 0, ups = 0
  for (let i = 0; i < n - 1; i++) {
    if (cards[i].up) ups++
    else downs++
  }
  let d = down * ch, u = up * ch
  const room = Math.max(0, avail - ch)
  if (downs * d + ups * u > room) {
    const dMin = Math.max(2, ch * 0.05)
    if (downs) d = Math.max(dMin, Math.min(d, (room - ups * u) / downs))
    if (downs * d + ups * u > room && ups) {
      const uMin = ch * 0.11
      u = Math.max(uMin, (room - downs * d) / ups)
    }
    const used = downs * d + ups * u
    if (used > room && used > 0) {
      const k = room / used
      d *= k
      u *= k
    }
  }
  const out: number[] = new Array(n)
  let y = 0
  for (let i = 0; i < n; i++) {
    out[i] = Math.round(y)
    y += cards[i].up ? u : d
  }
  return out
}

export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

/** Overlapping area of two rectangles. */
export function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Height of the felt: fill most of the dialog (≈85vh) without
 * overflowing it, never shorter than a usable minimum.
 */
export function feltHeight(width: number, viewportH: number): number {
  const chrome = width < 560 ? 250 : 200   // dialog header, padding and toolbar
  const cap = width < 700 ? width * 1.3 : width * 0.74
  return Math.round(Math.max(330, Math.min(viewportH * 0.85 - chrome, cap, 860)))
}
