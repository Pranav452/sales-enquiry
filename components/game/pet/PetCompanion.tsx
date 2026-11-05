"use client"

// ============================================================
// The Grand Voyage — draggable pet companion.
// Mount once in the protected layout; it persists across pages.
//
// Layering (outer → inner) inside the fixed, click-through overlay:
//   position (x/y motion values) → drag tilt → hop + spin
//   → squash → facing flip → CSS mood bob → SVG sprite
// Only the pet's own box (and its menu/cards) take pointer events.
// ============================================================

import {
  AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform,
} from "framer-motion"
import { PawPrint, Settings2 } from "lucide-react"
import {
  useCallback, useEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent,
} from "react"
import { onActivityLogged, type ActivityLoggedDetail } from "@/lib/game/events"
import { ARENAS } from "@/lib/game/levels"
import { useGameStore } from "@/lib/game/store"
import type { PetMood } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { AdoptCard } from "./AdoptCard"
import { useMediaQuery, useModalOpen, usePageVisible, usePrefersReducedMotion } from "./hooks"
import {
  activityLine, adoptLine, dropLine, evolveLine, greetingLine, pickLine, trickLine, type LineContext,
} from "./lines"
import { HeartBursts, XpPops, makeHearts, type HeartBurst, type XpPop } from "./PetEffects"
import { PetMenu, type MenuAnchor } from "./PetMenu"
import { PetSprite, petBoxSize } from "./PetSprite"
import { PET_CSS } from "./petStyles"
import { loadPetPosition, savePetPosition, usePetStore } from "./petStore"
import { SpeechBubble } from "./SpeechBubble"
import {
  SPECIES, STAGE_SCALE, clampStage, gearTop, stageViewBox, type Expression, type PetMode, type SpeciesId,
} from "./species"
import { SIDEBAR_GUTTER, clamp, usePetLocomotion, viewportBounds } from "./usePetLocomotion"

const BASE_SIZE = 84     // px at stage 4 ~ 86px, stage 5 ~ 92px
const NARROW_SIZE = 66   // phones (<640px)

let idSeq = 0
const nextId = () => ++idSeq

// ─── Public component ────────────────────────────────────────

export function PetCompanion() {
  const hydrated = usePetStore((s) => s.hydrated)

  useEffect(() => { usePetStore.getState().hydrate() }, [])

  // Keep the shared game profile fresh. ensure() is a no-op when recent,
  // and swallows API errors — the pet falls back to stage 1 / content.
  useEffect(() => {
    void useGameStore.getState().ensure()
    const tick = () => {
      if (document.visibilityState !== "hidden") void useGameStore.getState().ensure(4 * 60_000)
    }
    const id = window.setInterval(tick, 5 * 60_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])

  if (!hydrated) return null
  return <PetLayer />
}

// ─── Overlay ─────────────────────────────────────────────────

function PetLayer() {
  const species = usePetStore((s) => s.species)
  const hidden = usePetStore((s) => s.hidden)
  const adoptOpen = usePetStore((s) => s.adoptOpen)
  const modalOpen = useModalOpen()
  const reduced = usePrefersReducedMotion()

  return (
    <div
      data-pet-root=""
      className="pointer-events-none fixed inset-0 overflow-hidden"
      // above page content + chat dock (z-50); ducks under open dialogs
      style={{ zIndex: modalOpen ? 40 : 60 }}
    >
      <style>{PET_CSS}</style>
      {species && !hidden && <Pet species={species} ducked={modalOpen} reduced={reduced} />}
      <AnimatePresence>
        {adoptOpen && !species && <AdoptCard key="adopt" reducedMotion={reduced} />}
      </AnimatePresence>
      {(hidden || (!species && !adoptOpen)) && <SummonTab />}
    </div>
  )
}

function SummonTab() {
  const species = usePetStore((s) => s.species)
  const name = usePetStore((s) => s.name)
  const label = species ? `Summon ${name}` : "Adopt a crewmate"
  return (
    <button
      type="button"
      onClick={() => usePetStore.getState().summon()}
      title={label}
      aria-label={label}
      className={cn(
        "pet-summon pointer-events-auto absolute bottom-0 flex h-7 items-center gap-1.5 rounded-t-xl",
        "border border-b-0 border-border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground shadow-md",
        "transition-[color,height] hover:h-8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      style={{ left: SIDEBAR_GUTTER }}
    >
      <PawPrint className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{species ? name : "Adopt"}</span>
    </button>
  )
}

// ─── The pet ─────────────────────────────────────────────────

interface DragState {
  id:       number
  sx:       number
  sy:       number
  ox:       number
  oy:       number
  lx:       number
  lt:       number
  active:   boolean
  /** Long-press opened the menu — don't treat the release as a tap. */
  consumed: boolean
}

function initialPosition(w: number, h: number): { x: number; y: number } {
  const b = viewportBounds(w, h)
  const saved = loadPetPosition()
  if (saved) return { x: clamp(saved.x, 0, b.maxX), y: clamp(saved.y, 0, b.maxY) }
  // Bottom-left, clear of the sidebar; calculator + chat live bottom-right.
  return { x: clamp(SIDEBAR_GUTTER + 12, 0, b.maxX), y: clamp(window.innerHeight - h - 20, 0, b.maxY) }
}

interface PetProps {
  species: SpeciesId
  ducked:  boolean
  reduced: boolean
}

function Pet({ species, ducked, reduced }: PetProps) {
  const name = usePetStore((s) => s.name)
  const mode = usePetStore((s) => s.mode)
  const muted = usePetStore((s) => s.muted)
  const seenStage = usePetStore((s) => s.seenStage)

  // Narrow selectors: the pet re-renders only when these change.
  const rawMood = useGameStore((s) => s.data?.me?.petMood)
  const rawStage = useGameStore((s) => s.data?.me?.petStage)
  const arenaIndex = useGameStore((s) => s.data?.me?.arenaIndex ?? 0)
  const hasMe = useGameStore((s) => s.data?.me != null)

  const mood: PetMood = rawMood ?? "content"
  const stage = clampStage(rawStage)
  const glow = ARENAS[clamp(Math.round(arenaIndex), 0, ARENAS.length - 1)].palette.glow

  const narrow = useMediaQuery("(max-width: 639px)")
  const finePointer = useMediaQuery("(pointer: fine)")
  const pageVisible = usePageVisible()
  const canFollow = finePointer && !narrow
  const effectiveMode: PetMode = reduced ? "stay" : mode === "follow" && !canFollow ? "stay" : mode

  const size = Math.round((narrow ? NARROW_SIZE : BASE_SIZE) * STAGE_SCALE[stage - 1])
  const { w: boxW, h: boxH } = petBoxSize(size, stage)
  const vb = stageViewBox(stage)
  const headTopPx = Math.max(0, ((gearTop(species, stage) - vb.top) / vb.height) * boxH)

  // ── Motion values: position + reactions, never React state per frame ──
  const [start] = useState(() => initialPosition(boxW, boxH))
  const x = useMotionValue(start.x)
  const y = useMotionValue(start.y)
  const hopY = useMotionValue(0)
  const spin = useMotionValue(0)
  const sqX = useMotionValue(1)
  const sqY = useMotionValue(1)
  const facing = useMotionValue(1)
  const tiltTarget = useMotionValue(0)
  const tilt = useSpring(tiltTarget, { stiffness: 260, damping: 13 })
  const shadowScale = useTransform(hopY, [-60, 0], [0.45, 1])
  const shadowOpacity = useTransform(hopY, [-60, 0], [0.35, 1])

  // ── React state (human-speed changes only) ──
  const [expression, setExpression] = useState<Expression | null>(null)
  const [dragging, setDragging] = useState(false)
  const [walking, setWalking] = useState(false)
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null)
  const [bursts, setBursts] = useState<HeartBurst[]>([])
  const [pops, setPops] = useState<XpPop[]>([])
  const [menu, setMenu] = useState<MenuAnchor | null>(null)
  const menuShown = menu != null && !ducked

  const hitRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)
  const recent = useRef<string[]>([])
  const lastSpoke = useRef(0)
  const tm = useRef({ bubble: 0, expr: 0, click: 0, long: 0, tilt: 0, all: new Set<number>() })
  const live = useRef({ species, name, mood, muted, reduced, dragging, menuOpen: false, bubble: false, ducked, pageVisible })

  useEffect(() => {
    live.current = { species, name, mood, muted, reduced, dragging, menuOpen: menuShown, bubble: bubble != null, ducked, pageVisible }
  })

  useEffect(() => {
    const bag = tm.current
    return () => {
      for (const id of [bag.bubble, bag.expr, bag.click, bag.long, bag.tilt]) window.clearTimeout(id)
      bag.all.forEach((id) => window.clearTimeout(id))
      bag.all.clear()
    }
  }, [])

  // ── Small helpers ──
  const later = useCallback((fn: () => void, ms: number) => {
    const bag = tm.current
    const id = window.setTimeout(() => { bag.all.delete(id); fn() }, ms)
    bag.all.add(id)
  }, [])

  const ctx = useCallback((): LineContext => ({
    me: useGameStore.getState().data?.me ?? null,
    species: live.current.species,
    name: live.current.name,
  }), [])

  const say = useCallback((text: string) => {
    const bag = tm.current
    window.clearTimeout(bag.bubble)
    setBubble({ id: nextId(), text })
    lastSpoke.current = Date.now()
    recent.current = [text, ...recent.current.filter((t) => t !== text)].slice(0, 16)
    bag.bubble = window.setTimeout(() => setBubble(null), clamp(2400 + text.length * 50, 3200, 9500))
  }, [])

  const flash = useCallback((e: Expression, ms: number) => {
    const bag = tm.current
    window.clearTimeout(bag.expr)
    setExpression(e)
    bag.expr = window.setTimeout(() => setExpression(null), ms)
  }, [])

  const squash = useCallback((sx: number[], sy: number[], duration: number) => {
    if (live.current.reduced) return
    animate(sqX, sx, { duration, ease: "easeOut" })
    animate(sqY, sy, { duration, ease: "easeOut" })
  }, [sqX, sqY])

  const land = useCallback(() => {
    squash([1.28, 0.9, 1.04, 1], [0.7, 1.12, 0.96, 1], 0.45)
  }, [squash])

  const jump = useCallback((height: number) => {
    if (live.current.reduced) return
    animate(hopY, [0, -height, 0], { duration: 0.56, times: [0, 0.42, 1], ease: ["easeOut", "easeIn"] })
    squash([1, 1.16, 0.9, 1, 1.14, 1], [1, 0.82, 1.12, 1, 0.86, 1], 0.7)
  }, [hopY, squash])

  const burstHearts = useCallback(() => {
    if (live.current.reduced) return
    const id = nextId()
    setBursts((b) => [...b.slice(-3), { id, hearts: makeHearts(6) }])
    later(() => setBursts((b) => b.filter((v) => v.id !== id)), 1400)
  }, [later])

  const popXp = useCallback((text: string) => {
    const id = nextId()
    setPops((p) => [...p.slice(-3), { id, text }])
    later(() => setPops((p) => p.filter((v) => v.id !== id)), 1700)
  }, [later])

  const trick = useCallback(() => {
    say(trickLine())
    if (live.current.reduced) { flash("love", 1200); return }
    const r = Math.random()
    let dur: number
    if (r < 0.45) {
      // backflip
      dur = 0.72
      animate(hopY, [0, -50, 0], { duration: dur, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] })
      animate(spin, [0, -360], { duration: dur, ease: "easeInOut" }).then(() => spin.set(0))
    } else if (r < 0.8) {
      // pirouette
      dur = 0.95
      animate(spin, [0, 720], { duration: dur, ease: [0.3, 0, 0.2, 1] }).then(() => spin.set(0))
    } else {
      // paper-turn twirl
      dur = 0.8
      const f = facing.get() >= 0 ? 1 : -1
      animate(facing, [f, -f, f, -f, f], { duration: dur, ease: "easeInOut" })
      animate(hopY, [0, -14, 0, -14, 0], { duration: dur, ease: "easeOut" })
    }
    later(() => { land(); flash("dizzy", 1400) }, dur * 1000)
  }, [facing, flash, hopY, land, later, say, spin])

  const openMenu = useCallback((force?: boolean) => {
    setBubble(null)
    setMenu((m) => (m && !force ? null : { x: x.get(), y: y.get(), w: boxW, h: boxH }))
  }, [x, y, boxW, boxH])

  const closeMenu = useCallback(() => {
    const active = document.activeElement
    const hadFocus = !!active?.closest?.("[data-pet-menu]")
    setMenu(null)
    if (hadFocus) hitRef.current?.focus({ preventScroll: true })
  }, [])

  const handleTap = useCallback(() => {
    const bag = tm.current
    // With the menu open, a tap on the pet just closes it.
    if (live.current.menuOpen) {
      closeMenu()
      return
    }
    if (bag.click) {
      window.clearTimeout(bag.click)
      bag.click = 0
      trick()
      return
    }
    burstHearts()
    flash("love", 900)
    bag.click = window.setTimeout(() => {
      bag.click = 0
      say(pickLine(ctx(), live.current.mood, recent.current, "click"))
    }, 280)
  }, [burstHearts, closeMenu, ctx, flash, say, trick])

  const sayRandom = useCallback(() => {
    say(pickLine(ctx(), live.current.mood, recent.current, "click"))
  }, [ctx, say])

  const changeSpecies = useCallback((next: SpeciesId) => {
    usePetStore.getState().setSpecies(next)
    later(() => {
      jump(28)
      flash("love", 1000)
      const st = usePetStore.getState()
      say(`${st.name} the ${SPECIES[next].kind}, reporting for duty!`)
    }, 150)
  }, [flash, jump, later, say])

  // ── Activity logged anywhere → celebrate ──
  const onActivity = useCallback((d: ActivityLoggedDetail) => {
    jump(42)
    flash("cheer", 1800)
    const pts = Number(d?.points)
    if (pts > 0) popXp(`+${pts} XP`)
    if (!live.current.muted) later(() => say(activityLine(ctx(), String(d?.activityType ?? ""))), 250)
  }, [ctx, flash, jump, later, popXp, say])

  const onActivityRef = useRef(onActivity)
  useEffect(() => { onActivityRef.current = onActivity })
  useEffect(() => onActivityLogged((d) => onActivityRef.current(d)), [])

  // ── Movement modes ──
  usePetLocomotion({
    mode: effectiveMode,
    paused: dragging || menuShown || !pageVisible || ducked,
    x, y, w: boxW, h: boxH,
    callbacks: {
      onWalking: setWalking,
      onFacing: (f) => { if (!live.current.reduced) animate(facing, f, { duration: 0.22 }) },
      onLand: land,
      onHop: () => jump(16),
      onRest: (px, py) => savePetPosition(px, py),
    },
  })

  // ── Keep inside the viewport; grow around the feet when evolving ──
  const prevBox = useRef({ w: boxW, h: boxH })
  useEffect(() => {
    const prev = prevBox.current
    if (prev.w !== boxW || prev.h !== boxH) {
      x.set(x.get() - (boxW - prev.w) / 2)
      y.set(y.get() - (boxH - prev.h))
      prevBox.current = { w: boxW, h: boxH }
    }
    const fit = () => {
      const b = viewportBounds(boxW, boxH)
      x.set(clamp(x.get(), 0, b.maxX))
      y.set(clamp(y.get(), 0, b.maxY))
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [boxW, boxH, x, y])

  // ── First words after adopting / summoning (StrictMode-safe) ──
  useEffect(() => {
    if (!usePetStore.getState().cue) return
    const id = window.setTimeout(() => {
      const cue = usePetStore.getState().takeCue()
      if (!cue) return
      jump(30)
      flash("love", 1200)
      say(cue === "adopt" ? adoptLine(ctx()) : greetingLine(ctx()))
    }, 450)
    return () => window.clearTimeout(id)
  }, [ctx, flash, jump, say])

  // ── Evolution celebration when petStage rises ──
  useEffect(() => {
    if (!hasMe) return
    if (seenStage === 0 || stage < seenStage) {
      usePetStore.getState().update({ seenStage: stage })
      return
    }
    if (stage === seenStage) return
    const id = window.setTimeout(() => {
      usePetStore.getState().update({ seenStage: stage })
      jump(50)
      if (!live.current.reduced) animate(spin, [0, 360], { duration: 0.8, ease: "easeInOut" }).then(() => spin.set(0))
      flash("cheer", 2600)
      say(evolveLine(ctx(), stage))
    }, 800)
    return () => window.clearTimeout(id)
  }, [hasMe, stage, seenStage, ctx, flash, jump, say, spin])

  // ── Unprompted chatter: at most every ~2 minutes ──
  useEffect(() => {
    let t = 0
    const tick = () => {
      const s = live.current
      const busy = s.muted || s.dragging || s.menuOpen || s.bubble || s.ducked || !s.pageVisible
      if (busy || Date.now() - lastSpoke.current < 75_000) {
        t = window.setTimeout(tick, 30_000 + Math.random() * 30_000)
        return
      }
      say(pickLine(ctx(), s.mood, recent.current, "auto"))
      t = window.setTimeout(tick, 120_000 + Math.random() * 90_000)
    }
    t = window.setTimeout(tick, 30_000 + Math.random() * 25_000)
    return () => window.clearTimeout(t)
  }, [ctx, say])

  // ── Pointer: drag (mouse + touch), tap, double-tap, long-press ──
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* not capturable */ }
    drag.current = {
      id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x.get(), oy: y.get(),
      lx: e.clientX, lt: e.timeStamp, active: false, consumed: false,
    }
    if (e.pointerType !== "mouse") {
      const bag = tm.current
      window.clearTimeout(bag.long)
      bag.long = window.setTimeout(() => {
        const d = drag.current
        if (d && !d.active) { d.consumed = true; openMenu(true) }
      }, 520)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.sx
    const dy = e.clientY - d.sy
    if (!d.active) {
      if (d.consumed || Math.hypot(dx, dy) < 5) return
      d.active = true
      window.clearTimeout(tm.current.long)
      setDragging(true)
      setMenu(null)
    }
    const b = viewportBounds(boxW, boxH)
    x.set(clamp(d.ox + dx, 0, b.maxX))
    y.set(clamp(d.oy + dy, 0, b.maxY))
    if (!live.current.reduced) {
      // dangle: swing opposite to the drag direction, settle when still
      const dt = Math.max(8, e.timeStamp - d.lt)
      tiltTarget.set(clamp(((e.clientX - d.lx) / dt) * -16, -30, 30))
      const bag = tm.current
      window.clearTimeout(bag.tilt)
      bag.tilt = window.setTimeout(() => tiltTarget.set(0), 70)
    }
    d.lx = e.clientX
    d.lt = e.timeStamp
  }

  const endPointer = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    window.clearTimeout(tm.current.long)
    const el = e.currentTarget
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    if (d.active) {
      setDragging(false)
      tiltTarget.set(0)
      land()
      savePetPosition(x.get(), y.get())
      if (!live.current.muted && Math.random() < 0.2) later(() => say(dropLine()), 200)
    } else if (!cancelled && !d.consumed) {
      handleTap()
    }
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTap(); return }
    if (e.key === "m" || e.key === "M" || e.key === "ContextMenu" || (e.key === "F10" && e.shiftKey)) {
      e.preventDefault()
      openMenu(true)
      return
    }
    const step = e.shiftKey ? 64 : 16
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    }
    const d = delta[e.key]
    if (!d) return
    e.preventDefault()
    const b = viewportBounds(boxW, boxH)
    const nx = clamp(x.get() + d[0], 0, b.maxX)
    const ny = clamp(y.get() + d[1], 0, b.maxY)
    x.set(nx)
    y.set(ny)
    savePetPosition(nx, ny)
  }

  // ── Render ──
  const shownExpression: Expression | null = dragging ? "whee" : expression
  const bobClass = walking
    ? "pet-bob-walk"
    : dragging
      ? ""
      : shownExpression === "cheer" || shownExpression === "love"
        ? "pet-bob-ecstatic"
        : `pet-bob-${mood}`
  const kind = SPECIES[species].kind

  return (
    <>
      <motion.div className="group pointer-events-none absolute left-0 top-0" style={{ x, y, width: boxW, height: boxH }}>
        <div
          ref={hitRef}
          data-pet-body=""
          role="button"
          tabIndex={0}
          aria-label={`${name} the ${kind}, your Grand Voyage crewmate. Enter to pet, M for the menu, arrow keys to move.`}
          aria-haspopup="dialog"
          aria-expanded={menuShown}
          className={cn(
            "pointer-events-auto absolute inset-0 touch-none select-none rounded-2xl outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={{ WebkitTouchCallout: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, false)}
          onPointerCancel={(e) => endPointer(e, true)}
          onLostPointerCapture={(e) => endPointer(e, true)}
          onContextMenu={(e) => { e.preventDefault(); openMenu(true) }}
          onKeyDown={onKeyDown}
        >
          {/* ground shadow stays put while the pet hops */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/2 h-[7px] rounded-[50%] bg-foreground/15"
            style={{ width: Math.round(boxW * 0.58), x: "-50%", scale: shadowScale, opacity: shadowOpacity }}
          />
          <motion.div className="absolute inset-0" style={{ rotate: tilt, transformOrigin: "50% 12%" }}>
            <motion.div className="absolute inset-0" style={{ y: hopY, rotate: spin, transformOrigin: "50% 58%" }}>
              <motion.div className="absolute inset-0" style={{ scaleX: sqX, scaleY: sqY, transformOrigin: "50% 100%" }}>
                <motion.div className="absolute inset-0" style={{ scaleX: facing }}>
                  <div
                    className={cn(
                      "pet-spin absolute inset-0",
                      mood === "ecstatic" && !walking && !dragging && !expression && "pet-spin-ecstatic",
                    )}
                  >
                    <div className={cn("pet-bob absolute inset-0", bobClass)}>
                      <PetSprite
                        species={species}
                        stage={stage}
                        mood={mood}
                        expression={shownExpression}
                        walking={walking}
                        lookForward={walking}
                        animated={!reduced}
                        talkKey={bubble?.id ?? null}
                        glow={glow}
                        size={size}
                      />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
              <HeartBursts bursts={bursts} top={headTopPx} />
              <XpPops pops={pops} top={headTopPx - 6} />
            </motion.div>
          </motion.div>
        </div>

        {/* hover-revealed gear (also: right-click, long-press, or M) */}
        <button
          type="button"
          data-pet-gear=""
          aria-label={`Open ${name}'s menu`}
          onClick={() => openMenu()}
          className={cn(
            "pointer-events-auto absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full",
            "border border-border bg-card text-muted-foreground shadow-md transition-[opacity,transform,color] duration-150",
            "hover:text-primary focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging && "hidden",
            menuShown ? "scale-100 opacity-100 text-primary" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100",
          )}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </motion.div>

      <AnimatePresence>
        {bubble && !menuShown && (
          <SpeechBubble key={bubble.id} text={bubble.text} name={name} petX={x} petY={y} boxW={boxW} boxH={boxH} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuShown && menu && (
          <PetMenu
            key="menu"
            anchor={menu}
            species={species}
            name={name}
            mode={mode}
            muted={muted}
            stage={stage}
            mood={mood}
            glow={glow}
            canFollow={canFollow}
            reducedMotion={reduced}
            onClose={closeMenu}
            onSay={sayRandom}
            onSpeciesChange={changeSpecies}
          />
        )}
      </AnimatePresence>
    </>
  )
}
