"use client"

// Interactive chess board: click-to-move, drag-and-drop (pointer events, works
// on touch), legal-move dots / capture rings, last-move + check highlights,
// promotion picker and a roving-focus keyboard mode (arrows + Enter/Space).

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { motion } from "framer-motion"
import type { Square } from "chess.js"
import { PieceSvg, PIECE_NAMES, type PieceColor, type PieceType } from "./pieces"

export interface BoardPiece { type: PieceType; color: PieceColor }
export interface TargetMove { to: Square; promotion?: PieceType; capture: boolean }
export interface LastMove {
  from: Square
  to:   Square
  /** 1-based ply number of the move (used as animation key) */
  ply:  number
  /** rook hop for castling moves */
  rook?: { from: Square; to: Square }
}

// Board colours (classic brown) and overlays
const LIGHT = "#f0d9b5"
const DARK = "#b58863"
const HL_LAST = "rgba(155, 199, 0, 0.41)"
const HL_SELECTED = "rgba(20, 85, 30, 0.5)"
const HINT = "rgba(20, 85, 30, 0.45)"
const CHECK = "rgba(220, 38, 38, 0.72)"

const FILES = "abcdefgh"
const PROMO_ORDER: PieceType[] = ["q", "n", "r", "b"]

function toSquare(row: number, col: number, o: PieceColor): Square {
  const f = o === "w" ? col : 7 - col
  const r = o === "w" ? 8 - row : row + 1
  return `${FILES[f]}${r}` as Square
}

function toDisplay(sq: Square, o: PieceColor): [number, number] {
  const f = sq.charCodeAt(0) - 97
  const r = Number(sq[1])
  return o === "w" ? [8 - r, f] : [r - 1, 7 - f]
}

const isLightSquare = (sq: Square) => (sq.charCodeAt(0) - 97 + Number(sq[1])) % 2 === 0

interface DragState { from: Square; x: number; y: number; size: number; over: Square | null }
interface PressState { from: Square; sx: number; sy: number; wasSelected: boolean }

export function ChessBoard({
  pieces, orientation, movable, targetsFrom, onMove, lastMove, animatePly, checkSquare, children,
}: {
  pieces:      Partial<Record<Square, BoardPiece>>
  orientation: PieceColor
  /** colour the user may move now; null locks the board */
  movable:     PieceColor | null
  targetsFrom: (sq: Square) => TargetMove[]
  onMove:      (from: Square, to: Square, promotion: PieceType | undefined, animate: boolean) => void
  lastMove:    LastMove | null
  /** ply of lastMove that should slide into place (-1: none) */
  animatePly:  number
  checkSquare: Square | null
  /** overlays rendered above the board (e.g. result banner) */
  children?:   ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pressRef = useRef<PressState | null>(null)
  const [selectedRaw, setSelected] = useState<Square | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [promo, setPromo] = useState<{ from: Square; to: Square; animate: boolean } | null>(null)
  const [cursor, setCursor] = useState<Square>(orientation === "w" ? "e2" : "e7")

  // Selection is only meaningful while the user may move that piece.
  const selected = selectedRaw && movable && pieces[selectedRaw]?.color === movable ? selectedRaw : null
  const activePromo = promo && movable && pieces[promo.from]?.color === movable ? promo : null
  const targets = useMemo(() => (selected ? targetsFrom(selected) : []), [selected, targetsFrom])
  const targetSet = useMemo(() => {
    const m = new Map<Square, boolean>()
    for (const t of targets) m.set(t.to, t.capture)
    return m
  }, [targets])

  function squareAt(clientX: number, clientY: number): Square | null {
    const el = rootRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    const col = Math.floor(((clientX - r.left) / r.width) * 8)
    const row = Math.floor(((clientY - r.top) / r.height) * 8)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    return toSquare(row, col, orientation)
  }

  /** Attempts from→to; opens the promotion picker when needed. */
  function tryMove(from: Square, to: Square, animate: boolean): boolean {
    const options = targetsFrom(from).filter((t) => t.to === to)
    if (options.length === 0) return false
    setSelected(null)
    if (options.some((t) => t.promotion)) {
      setPromo({ from, to, animate })
      return true
    }
    onMove(from, to, undefined, animate)
    return true
  }

  function focusSquare(sq: Square) {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-square="${sq}"]`)
    el?.focus()
  }

  // ─── Pointer (mouse / touch / pen) ──────────────────────────

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (activePromo) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    const sq = squareAt(e.clientX, e.clientY)
    if (!sq) return
    setCursor(sq)
    if (selected && selected !== sq && tryMove(selected, sq, true)) return
    const pc = pieces[sq]
    if (movable && pc && pc.color === movable) {
      e.preventDefault()
      rootRef.current?.setPointerCapture(e.pointerId)
      pressRef.current = { from: sq, sx: e.clientX, sy: e.clientY, wasSelected: selected === sq }
      setSelected(sq)
      return
    }
    setSelected(null)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = pressRef.current
    const el = rootRef.current
    if (!p || !el) return
    if (!drag && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 4) return
    const r = el.getBoundingClientRect()
    setDrag({ from: p.from, x: e.clientX - r.left, y: e.clientY - r.top, size: r.width / 8, over: squareAt(e.clientX, e.clientY) })
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = pressRef.current
    pressRef.current = null
    if (!p) return
    if (drag) {
      setDrag(null)
      const sq = squareAt(e.clientX, e.clientY)
      if (sq && sq !== p.from) tryMove(p.from, sq, false)
      return
    }
    if (p.wasSelected) setSelected(null)
  }

  function onPointerCancel() {
    pressRef.current = null
    setDrag(null)
  }

  // ─── Keyboard ───────────────────────────────────────────────

  function activate(sq: Square) {
    if (selected && selected !== sq && tryMove(selected, sq, true)) return
    const pc = pieces[sq]
    if (movable && pc && pc.color === movable) setSelected(selected === sq ? null : sq)
    else setSelected(null)
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (activePromo) return
    const [row, col] = toDisplay(cursor, orientation)
    let next: [number, number] | null = null
    switch (e.key) {
      case "ArrowUp":    next = [Math.max(0, row - 1), col]; break
      case "ArrowDown":  next = [Math.min(7, row + 1), col]; break
      case "ArrowLeft":  next = [row, Math.max(0, col - 1)]; break
      case "ArrowRight": next = [row, Math.min(7, col + 1)]; break
      case "Enter":
      case " ":
        e.preventDefault()
        activate(cursor)
        return
      case "Escape":
        if (selected) {
          e.preventDefault()
          e.stopPropagation()
          setSelected(null)
        }
        return
      default:
        return
    }
    e.preventDefault()
    const sq = toSquare(next[0], next[1], orientation)
    setCursor(sq)
    focusSquare(sq)
  }

  // ─── Render ─────────────────────────────────────────────────

  const hoverSq = drag?.over ?? null

  const rows: ReactNode[] = []
  for (let row = 0; row < 8; row++) {
    const cells: ReactNode[] = []
    for (let col = 0; col < 8; col++) {
      const sq = toSquare(row, col, orientation)
      const light = isLightSquare(sq)
      const pc = pieces[sq]
      const isTarget = targetSet.has(sq)
      const isCapture = targetSet.get(sq) === true
      const isLast = lastMove != null && (lastMove.from === sq || lastMove.to === sq)
      const hidden = drag?.from === sq
      const animating = lastMove != null && lastMove.ply === animatePly &&
        (lastMove.to === sq || lastMove.rook?.to === sq)
      let offset: [number, number] | null = null
      if (animating && lastMove) {
        const fromSq = lastMove.to === sq ? lastMove.from : lastMove.rook!.from
        const [fr, fc] = toDisplay(fromSq, orientation)
        offset = [fc - col, fr - row]
      }
      const coordColor = light ? DARK : LIGHT
      const label = `${sq}${pc ? `, ${pc.color === "w" ? "white" : "black"} ${PIECE_NAMES[pc.type]}` : ""}` +
        `${selected === sq ? ", selected" : ""}${isTarget ? (isCapture ? ", capture" : ", legal move") : ""}` +
        `${checkSquare === sq ? ", in check" : ""}`

      cells.push(
        <div
          key={sq}
          role="gridcell"
          data-square={sq}
          tabIndex={sq === cursor ? 0 : -1}
          aria-label={label}
          aria-selected={selected === sq}
          onFocus={() => { if (sq !== cursor) setCursor(sq) }}
          className={`relative outline-none focus-visible:z-20 focus-visible:shadow-[inset_0_0_0_3px_#2563eb] ${animating ? "z-10" : ""}`}
          style={{ background: light ? LIGHT : DARK }}
        >
          {isLast && <div className="absolute inset-0" style={{ background: HL_LAST }} />}
          {selected === sq && <div className="absolute inset-0" style={{ background: HL_SELECTED }} />}
          {checkSquare === sq && <div className="absolute inset-0" style={{ background: CHECK }} />}
          {hoverSq === sq && isTarget && <div className="absolute inset-0 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.75)]" />}

          {col === 0 && (
            <span className="pointer-events-none absolute left-[4%] top-[2%] font-semibold leading-none" style={{ color: coordColor }}>
              {sq[1]}
            </span>
          )}
          {row === 7 && (
            <span className="pointer-events-none absolute bottom-[3%] right-[5%] font-semibold leading-none" style={{ color: coordColor }}>
              {sq[0]}
            </span>
          )}

          {pc && !hidden && (
            offset ? (
              <motion.div
                key={`a${animatePly}`}
                className="absolute inset-0"
                initial={{ x: `${offset[0] * 100}%`, y: `${offset[1] * 100}%` }}
                animate={{ x: "0%", y: "0%" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <PieceSvg type={pc.type} color={pc.color} className="h-full w-full" />
              </motion.div>
            ) : (
              <div className={`absolute inset-0 ${movable && pc.color === movable ? "cursor-grab" : ""}`}>
                <PieceSvg type={pc.type} color={pc.color} className="h-full w-full" />
              </div>
            )
          )}

          {isTarget && !isCapture && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: HINT }} />
          )}
          {isTarget && isCapture && (
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke={HINT} strokeWidth="9" />
            </svg>
          )}
        </div>,
      )
    }
    rows.push(<div key={row} role="row" className="contents">{cells}</div>)
  }

  return (
    <div
      ref={rootRef}
      className="relative aspect-square w-full touch-none select-none"
      style={{ fontSize: "clamp(9px, 2.3cqw, 12px)", WebkitUserSelect: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        role="grid"
        aria-label={`Chess board, ${orientation === "w" ? "white" : "black"} at the bottom. Use arrow keys to move, Enter to pick up or drop a piece.`}
        className="grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-md shadow-sm ring-1 ring-black/15"
        onKeyDown={onKeyDown}
      >
        {rows}
      </div>

      {drag && pieces[drag.from] && (
        <div
          className="pointer-events-none absolute left-0 top-0 z-30 cursor-grabbing"
          style={{
            width: drag.size, height: drag.size,
            transform: `translate(${drag.x - drag.size / 2}px, ${drag.y - drag.size / 2}px) scale(1.12)`,
          }}
        >
          <PieceSvg type={pieces[drag.from]!.type} color={pieces[drag.from]!.color} className="h-full w-full drop-shadow-md" />
        </div>
      )}

      {activePromo && (
        <PromotionPicker
          to={activePromo.to}
          color={pieces[activePromo.from]!.color}
          orientation={orientation}
          onPick={(t) => { const p = activePromo; setPromo(null); onMove(p.from, p.to, t, p.animate) }}
          onCancel={() => setPromo(null)}
        />
      )}

      {children}
    </div>
  )
}

function PromotionPicker({ to, color, orientation, onPick, onCancel }: {
  to: Square
  color: PieceColor
  orientation: PieceColor
  onPick: (t: PieceType) => void
  onCancel: () => void
}) {
  const [row, col] = toDisplay(to, orientation)
  const down = row === 0
  return (
    <div
      className="absolute inset-0 z-40 rounded-md bg-black/40"
      onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onCancel() }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel() } }}
      role="dialog"
      aria-label="Choose promotion piece"
    >
      {PROMO_ORDER.map((t, i) => {
        const r = down ? row + i : row - i
        return (
          <button
            key={t}
            type="button"
            autoFocus={i === 0}
            aria-label={`Promote to ${PIECE_NAMES[t]}`}
            onClick={() => onPick(t)}
            className="absolute flex items-center justify-center rounded-full bg-white/90 shadow-md ring-1 ring-black/20 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-600"
            style={{ left: `${col * 12.5 + 0.6}%`, top: `${r * 12.5 + 0.6}%`, width: "11.3%", height: "11.3%" }}
          >
            <PieceSvg type={t} color={color} className="h-[92%] w-[92%]" />
          </button>
        )
      })}
    </div>
  )
}
