"use client"

import { motion } from "framer-motion"
import { Anchor, Check, EyeOff, Footprints, MessageCircle, MousePointer2, Volume2, VolumeX, X } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type FormEvent } from "react"
import type { PetMood } from "@/lib/game/types"
import { cn } from "@/lib/utils"
import { PetSprite } from "./PetSprite"
import { MAX_NAME_LENGTH, cleanName, usePetStore } from "./petStore"
import { SPECIES, SPECIES_ORDER, STAGE_LABELS, type PetMode, type SpeciesId } from "./species"

export interface MenuAnchor { x: number; y: number; w: number; h: number }

interface PetMenuProps {
  anchor:          MenuAnchor
  species:         SpeciesId
  name:            string
  mode:            PetMode
  muted:           boolean
  stage:           number
  mood:            PetMood
  glow:            string
  canFollow:       boolean
  reducedMotion:   boolean
  onClose:         () => void
  onSay:           () => void
  onSpeciesChange: (species: SpeciesId) => void
}

const MODES: { key: PetMode; label: string; icon: ComponentType<{ className?: string }>; hint: string }[] = [
  { key: "stay",   label: "Stay",   icon: Anchor,        hint: "Stays where you place it" },
  { key: "follow", label: "Follow", icon: MousePointer2, hint: "Follows your cursor" },
  { key: "wander", label: "Wander", icon: Footprints,    hint: "Walks along the bottom of the screen" },
]

const MOOD_LABEL: Record<PetMood, string> = {
  sleepy: "Sleepy", content: "Content", happy: "Happy", ecstatic: "Ecstatic", grumpy: "Grumpy",
}

const MENU_W = 272

export function PetMenu({
  anchor, species, name, mode, muted, stage, mood, glow, canFollow, reducedMotion,
  onClose, onSay, onSpeciesChange,
}: PetMenuProps) {
  const posRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(name)
  const [prevName, setPrevName] = useState(name)
  if (name !== prevName) {
    // name changed elsewhere (species switch) — refresh the field
    setPrevName(name)
    setDraft(name)
  }
  const sp = SPECIES[species]

  // Place beside the pet, clamped to the viewport.
  useLayoutEffect(() => {
    const el = posRef.current
    if (!el) return
    const place = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const mh = el.offsetHeight
      let left = anchor.x + anchor.w + 10
      if (left + MENU_W > vw - 8) left = anchor.x - MENU_W - 10
      left = Math.max(8, Math.min(vw - MENU_W - 8, left))
      const top = Math.max(8, Math.min(vh - mh - 8, anchor.y + anchor.h - mh))
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [anchor])

  // Move focus into the menu so keyboard users land in it.
  useEffect(() => {
    dialogRef.current?.focus({ preventScroll: true })
  }, [])

  // Close on outside press / Escape. Pressing the pet itself is handled by the pet.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (posRef.current?.contains(t)) return
      if (t.closest?.("[data-pet-body]") || t.closest?.("[data-pet-gear]")) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("pointerdown", onDown, true)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown, true)
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  const update = usePetStore.getState().update

  function saveName(e?: FormEvent) {
    e?.preventDefault()
    const next = cleanName(draft, species)
    setDraft(next)
    if (next !== name) update({ name: next })
  }

  const hint = reducedMotion
    ? "Reduced motion is on, so the pet stays in place."
    : !canFollow
      ? "Follow needs a mouse. Use Stay or Wander on this device."
      : MODES.find((m) => m.key === mode)?.hint

  return (
    <div
      ref={posRef}
      data-pet-menu=""
      className="pointer-events-auto absolute left-0 top-0"
      style={{ width: MENU_W, transform: "translate(-9999px, -9999px)" }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-label={`${name} settings`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="space-y-3 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 shrink-0 items-end justify-center overflow-visible rounded-lg bg-muted pb-0.5">
            <PetSprite species={species} stage={stage} mood={mood} glow={glow} size={34} animated={false} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {STAGE_LABELS[stage - 1]} {sp.kind} · {MOOD_LABEL[mood]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close pet menu"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode */}
        <section>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Movement</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {MODES.map(({ key, label, icon: Icon }) => {
              const disabled = reducedMotion ? key !== "stay" : key === "follow" && !canFollow
              const active = mode === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => update({ mode: key })}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-xs font-medium transition-colors",
                    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </section>

        {/* Species */}
        <section>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Character</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SPECIES_ORDER.map((id) => {
              const active = id === species
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  title={`${SPECIES[id].defaultName} the ${SPECIES[id].kind}`}
                  onClick={() => { if (!active) onSpeciesChange(id) }}
                  className={cn(
                    "flex flex-col items-center rounded-lg border px-1 pb-1 pt-1.5 transition-colors",
                    active ? "border-primary bg-primary/10" : "border-border hover:bg-accent",
                  )}
                >
                  <span className="flex h-11 items-end">
                    <PetSprite species={id} stage={stage} mood="content" glow={glow} size={38} animated={false} />
                  </span>
                  <span className={cn("mt-0.5 text-[11px] font-medium capitalize", active ? "text-foreground" : "text-muted-foreground")}>
                    {SPECIES[id].kind.replace("sea ", "")}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Rename */}
        <form onSubmit={saveName}>
          <label htmlFor="pet-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Name
          </label>
          <div className="flex gap-1.5">
            <input
              id="pet-name"
              value={draft}
              maxLength={MAX_NAME_LENGTH}
              placeholder={sp.defaultName}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => saveName()}
              className="h-8 min-w-0 flex-1 rounded-md border border-input bg-input-bg px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              aria-label="Save name"
              className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Chatter + actions */}
        <div className="grid grid-cols-3 gap-1.5 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => update({ muted: !muted })}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-xs font-medium transition-colors hover:bg-accent",
              muted ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            onClick={() => { onSay(); onClose() }}
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Talk
          </button>
          <button
            type="button"
            onClick={() => { update({ hidden: true }); onClose() }}
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <EyeOff className="h-4 w-4" />
            Hide pet
          </button>
        </div>
      </motion.div>
    </div>
  )
}
