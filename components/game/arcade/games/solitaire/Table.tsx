"use client"

// ============================================================
// Solitaire engine — the felt table.
// Every card is one absolutely positioned element keyed by card
// id, so any state change animates the card from where it was to
// where it now belongs (moves, deals, undo, auto-complete).
// Drag-and-drop uses pointer events (mouse + touch): the grabbed
// cards follow the pointer through motion values (no re-render
// per frame), the best legal pile under them is highlighted, and
// an invalid drop animates the cards back.
// ============================================================

import {
  memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from "react"
import { animate, motion, useMotionValue, type MotionValue } from "framer-motion"
import { RotateCcw } from "lucide-react"
import { CardSlot, FELT, FELT_EDGE, PlayingCard, type Rank, type Suit } from "@/components/game/arcade/kit/cards"
import { cn } from "@/lib/utils"
import { overlap } from "./layout"
import type { FxMap, MoveRef, PileId, Placement, Rect, TableLayout } from "./model"

const EASE: [number, number, number, number] = [0.25, 0.8, 0.3, 1]
const MOVE_S = 0.3
const DRAG_SHADOW = "0 10px 22px rgba(0, 0, 0, 0.35)"
const DOUBLE_TAP_MS = 400

interface CardHandle {
  x:        MotionValue<number>
  y:        MotionValue<number>
  z:        MotionValue<number>
  el:       HTMLDivElement | null
  /** held by the pointer: z-index belongs to the drag */
  dragging: boolean
}

// ─── One card ─────────────────────────────────────────────────

interface SolCardProps {
  id:        string
  suit:      Suit
  rank:      Rank
  up:        boolean
  x:         number
  y:         number
  z:         number
  w:         number
  delay:     number
  fromX:     number
  fromY:     number
  selected:  boolean
  highlight: boolean
  clickable: boolean
  draggable: boolean
  label?:    string
  hop:       number | null
  lift:      number
  register:  (id: string, h: CardHandle | null) => void
  onDown:    (id: string, e: ReactPointerEvent<HTMLDivElement>) => void
  onTap:     (id: string) => void
}

const SolCard = memo(function SolCard({
  id, suit, rank, up, x, y, z, w, delay, fromX, fromY, selected, highlight, clickable, draggable, label,
  hop, lift, register, onDown, onTap,
}: SolCardProps) {
  const mx = useMotionValue(fromX)
  const my = useMotionValue(fromY)
  const mz = useMotionValue(z)
  const sx = useMotionValue(1)
  const el = useRef<HTMLDivElement>(null)
  const handle = useRef<CardHandle | null>(null)
  // the face shown lags `up` until the card sets off, so flips happen in flight
  // (cards dealt in from the stock start face down and turn over on the way)
  const [face, setFace] = useState(() => up && fromX === x && fromY === y)

  useEffect(() => {
    handle.current = { x: mx, y: my, z: mz, el: el.current, dragging: false }
    register(id, handle.current)
    return () => register(id, null)
  }, [id, register, mx, my, mz])

  // slide to the current position; while moving the card rides above the
  // table, and drops back to its pile's stacking order when it lands
  useEffect(() => {
    const settle = () => {
      if (!handle.current?.dragging) mz.set(z)
    }
    if (mx.get() === x && my.get() === y) {
      settle()
      return
    }
    mz.set(300 + z)
    const opts = { duration: MOVE_S, ease: EASE, delay }
    const ax = animate(mx, x, opts)
    const ay = animate(my, y, opts)
    const landed = window.setTimeout(settle, (delay + MOVE_S) * 1000 + 30)
    return () => {
      window.clearTimeout(landed)
      ax.stop()
      ay.stop()
    }
  }, [x, y, z, delay, mx, my, mz])

  // flip
  useEffect(() => {
    if (face === up) return
    const t = window.setTimeout(() => {
      setFace(up)
      sx.set(0.05)
      animate(sx, 1, { duration: 0.2, ease: "easeOut" })
    }, delay * 1000)
    return () => window.clearTimeout(t)
  }, [up, face, delay, sx])

  // win flourish: a small hop
  useEffect(() => {
    if (hop == null) return
    const t = window.setTimeout(() => {
      animate(my, [y, y - lift, y], { duration: 0.5, ease: "easeInOut" })
    }, hop * 1000)
    return () => window.clearTimeout(t)
  }, [hop, lift, y, my])

  const handleDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => onDown(id, e), [id, onDown])
  const handleClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onTap(id)
  }, [id, onTap])

  return (
    <motion.div
      ref={el}
      className="absolute left-0 top-0 rounded-[7%]"
      style={{ x: mx, y: my, zIndex: mz, scaleX: sx }}
    >
      <PlayingCard
        card={{ suit, rank }}
        faceUp={face}
        width={w}
        selected={selected}
        highlight={highlight}
        label={label}
        onClick={clickable ? handleClick : undefined}
        onPointerDown={draggable ? handleDown : undefined}
        className={cn(draggable && "cursor-grab")}
      />
    </motion.div>
  )
})

// ─── Table ────────────────────────────────────────────────────

export interface TableProps {
  layout:            TableLayout
  fx:                FxMap | null
  selected:          ReadonlySet<string>
  hinted:            ReadonlySet<string>
  hintTarget:        PileId | null
  /** card id -> hop delay (s) for the win flourish */
  hops:              ReadonlyMap<string, number>
  disabled:          boolean
  getTargets:        (pile: PileId, index: number) => PileId[]
  onDrop:            (m: MoveRef) => boolean
  /** returns true when the click performed a move (cancels double-click pairing) */
  onCardClick:       (p: Placement) => boolean
  onCardDoubleClick: (p: Placement) => void
  onSlotClick:       (id: PileId) => void
  onBackgroundClick: () => void
  onDragStart:       () => void
  children?:         ReactNode
}

interface DragState {
  pointerId: number
  sx:        number
  sy:        number
  pile:      PileId
  index:     number
  started:   boolean
  ids:       string[]
  base:      { x: number; y: number }[]
  home:      { x: number; y: number; z: number }[]
  targets:   PileId[]
  hover:     PileId | null
  /** felt origin in client coordinates (for the pointer position) */
  ox:        number
  oy:        number
}

function Ring({ r, tone }: { r: Rect; tone: "drop" | "hint" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-[7%] ring-2",
        tone === "drop" ? "bg-amber-200/15 ring-amber-300" : "ring-amber-400",
      )}
      style={{ left: r.x, top: r.y, width: r.w, height: r.h, zIndex: 950 }}
    />
  )
}

export function SolitaireTable(props: TableProps) {
  const { layout, fx, selected, hinted, hintTarget, hops, children } = props
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  const handles = useRef(new Map<string, CardHandle>())
  const drag = useRef<DragState | null>(null)
  const feltRef = useRef<HTMLDivElement>(null)
  const suppressUntil = useRef(0)
  const lastTap = useRef<{ id: string; t: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState<PileId | null>(null)

  const register = useCallback((id: string, h: CardHandle | null) => {
    if (h) handles.current.set(id, h)
    else handles.current.delete(id)
  }, [])

  const onDown = useCallback((id: string, e: ReactPointerEvent<HTMLDivElement>) => {
    const L = latest.current
    if (L.disabled || drag.current || (e.pointerType === "mouse" && e.button !== 0)) return
    const p = L.layout.cards.find((c) => c.id === id)
    if (!p?.draggable) return
    drag.current = {
      pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, pile: p.pile, index: p.index,
      started: false, ids: [], base: [], home: [], targets: [], hover: null, ox: 0, oy: 0,
    }
  }, [])

  const onTap = useCallback((id: string) => {
    const now = performance.now()
    if (now < suppressUntil.current) return
    const L = latest.current
    if (L.disabled) return
    const p = L.layout.cards.find((c) => c.id === id)
    if (!p) return
    const prev = lastTap.current
    if (prev && prev.id === id && now - prev.t < DOUBLE_TAP_MS) {
      lastTap.current = null
      L.onCardDoubleClick(p)
      return
    }
    const moved = L.onCardClick(p)
    lastTap.current = moved ? null : { id, t: now }
  }, [])

  // Pointer tracking on the window so a drag survives leaving the card.
  useEffect(() => {
    const H = handles.current

    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy
      const L = latest.current
      if (!d.started) {
        if (Math.hypot(dx, dy) < (e.pointerType === "mouse" ? 4 : 7)) return
        const stack = L.layout.cards.filter((c) => c.pile === d.pile && c.index >= d.index).sort((a, b) => a.index - b.index)
        if (!stack.length || L.disabled) {
          drag.current = null
          return
        }
        d.started = true
        d.ids = stack.map((c) => c.id)
        d.home = stack.map((c) => ({ x: c.x, y: c.y, z: c.z }))
        d.base = d.ids.map((id, i) => {
          const h = H.get(id)
          return h ? { x: h.x.get(), y: h.y.get() } : { x: d.home[i].x, y: d.home[i].y }
        })
        d.targets = L.getTargets(d.pile, d.index)
        const felt = feltRef.current?.getBoundingClientRect()
        d.ox = felt?.left ?? 0
        d.oy = felt?.top ?? 0
        d.ids.forEach((id, i) => {
          const h = H.get(id)
          if (!h) return
          h.dragging = true
          h.x.stop()
          h.y.stop()
          h.z.set(1000 + i)
          if (h.el) h.el.style.boxShadow = DRAG_SHADOW
        })
        lastTap.current = null
        L.onDragStart()
        setDragging(true)
      }
      d.ids.forEach((id, i) => {
        const h = H.get(id)
        if (!h) return
        h.x.set(d.base[i].x + dx)
        h.y.set(d.base[i].y + dy)
      })
      // the pile under the pointer wins; otherwise the one the cards overlap most
      const lead: Rect = { x: d.base[0].x + dx, y: d.base[0].y + dy, w: L.layout.cw, h: L.layout.ch }
      const px = e.clientX - d.ox, py = e.clientY - d.oy
      let best: PileId | null = null
      let bestScore = 0
      for (const t of d.targets) {
        const slot = L.layout.slots.find((s) => s.id === t)
        if (!slot?.drop) continue
        const r = slot.drop
        const under = px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
        const score = overlap(lead, r) + (under ? 1e7 : 0)
        if (score > bestScore) {
          bestScore = score
          best = t
        }
      }
      if (best !== d.hover) {
        d.hover = best
        setHover(best)
      }
    }

    const finish = (e: PointerEvent, cancelled: boolean) => {
      const d = drag.current
      if (!d || e.pointerId !== d.pointerId) return
      drag.current = null
      if (!d.started) return
      suppressUntil.current = performance.now() + 350
      setDragging(false)
      setHover(null)
      d.ids.forEach((id, i) => {
        const h = H.get(id)
        if (!h) return
        h.dragging = false
        if (h.el) h.el.style.boxShadow = ""
        h.z.set(300 + i)           // stay above the table until landed
      })
      const L = latest.current
      const ok = !cancelled && d.hover != null && L.onDrop({ from: d.pile, index: d.index, to: d.hover })
      if (ok) return
      d.ids.forEach((id, i) => {
        const h = H.get(id)
        if (!h) return
        const o = d.home[i]
        animate(h.x, o.x, { duration: 0.24, ease: EASE })
        animate(h.y, o.y, { duration: 0.24, ease: EASE })
        window.setTimeout(() => { if (!h.dragging) h.z.set(o.z) }, 270)
      })
    }

    const up = (e: PointerEvent) => finish(e, false)
    const cancel = (e: PointerEvent) => finish(e, true)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", cancel)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", cancel)
    }
  }, [])

  // stable DOM order (z-index does the stacking)
  const cards = useMemo(() => layout.cards.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), [layout.cards])
  const hoverSlot = hover ? layout.slots.find((s) => s.id === hover) : undefined
  const hintSlot = hintTarget ? layout.slots.find((s) => s.id === hintTarget) : undefined
  const { cw, ch } = layout
  const textSize = Math.max(10, Math.round(cw * 0.3))
  const iconSize = Math.max(12, Math.round(cw * 0.34))

  return (
    <div
      ref={feltRef}
      className={cn("relative mx-auto select-none overflow-hidden rounded-lg", dragging && "cursor-grabbing")}
      style={{ width: layout.width, height: layout.height, backgroundColor: FELT, boxShadow: `inset 0 0 0 1px ${FELT_EDGE}` }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onBackgroundClick()
      }}
    >
      {layout.slots.filter((s) => s.outline).map((s) => (
        <div key={s.id} className="absolute" style={{ left: s.x, top: s.y }}>
          <CardSlot
            width={cw}
            label={s.ariaLabel}
            onClick={s.clickable ? () => props.onSlotClick(s.id) : undefined}
            className={s.faint ? "border-white/20! bg-black/5 text-white/25" : "border-white/35! bg-black/10 text-white/40"}
          >
            {s.icon === "recycle" ? (
              <RotateCcw aria-hidden style={{ width: iconSize, height: iconSize }} className="text-white/60" />
            ) : s.text ? (
              <span aria-hidden className="font-semibold leading-none" style={{ fontSize: textSize }}>{s.text}</span>
            ) : null}
          </CardSlot>
        </div>
      ))}

      {cards.map((c) => (
        <SolCard
          key={c.id}
          id={c.id}
          suit={c.suit}
          rank={c.rank}
          up={c.up}
          x={c.x}
          y={c.y}
          z={c.z}
          w={cw}
          delay={fx?.[c.id] ?? 0}
          fromX={layout.dealFrom.x}
          fromY={layout.dealFrom.y}
          selected={selected.has(c.id)}
          highlight={hinted.has(c.id)}
          clickable={c.clickable}
          draggable={c.draggable}
          label={c.label}
          hop={hops.get(c.id) ?? null}
          lift={Math.round(ch * 0.14)}
          register={register}
          onDown={onDown}
          onTap={onTap}
        />
      ))}

      {hintSlot && <Ring r={hintSlot.target} tone="hint" />}
      {hoverSlot && <Ring r={hoverSlot.target} tone="drop" />}
      {children}
    </div>
  )
}
