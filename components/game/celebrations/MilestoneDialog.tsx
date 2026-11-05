"use client"

// Level-up / new-arena dialog: a plain centred dialog with the new rank and
// a short list of what unlocked. A new arena adds one short, small confetti
// burst (skipped for reduced motion).

import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import Confetti from "react-confetti"
import { ChevronsUp, Flag, PawPrint, type LucideIcon } from "lucide-react"
import { ARENAS } from "@/lib/game/levels"
import { Button } from "@/components/ui/button"
import { ArenaDot, IconBox, StatusPill, fmt } from "@/components/game/ui/primitives"
import { arcadeIcon } from "@/components/game/arcade/gameIcons"
import type { CelebrationModal, Unlock } from "./celebrationStore"

function arenaAt(index: number) {
  return ARENAS[Math.max(0, Math.min(ARENAS.length - 1, index))]
}

function unlockIcon(u: Unlock): LucideIcon {
  return u.kind === "pet" ? PawPrint : arcadeIcon(u.icon)
}

// ─── One short burst in theme colours ─────────────────────────

function readThemeColors(): string[] {
  const css = getComputedStyle(document.documentElement)
  return ["--primary", "--chart-2", "--chart-3", "--chart-4"]
    .map((v) => css.getPropertyValue(v).trim())
    .filter(Boolean)
    .map((v) => `hsl(${v})`)
}

function ArenaBurst() {
  const [size] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const [colors] = useState(readThemeColors)
  return (
    <Confetti
      width={size.w}
      height={size.h}
      colors={colors.length ? colors : undefined}
      numberOfPieces={70}
      recycle={false}
      gravity={0.3}
      initialVelocityX={6}
      initialVelocityY={12}
      tweenDuration={1500}
      confettiSource={{ x: size.w / 2 - 120, y: size.h * 0.3, w: 240, h: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 111, pointerEvents: "none" }}
    />
  )
}

// ─── Dialog ───────────────────────────────────────────────────

export function MilestoneDialog({ m, onClose }: { m: CelebrationModal; onClose: () => void }) {
  const reduced = useReducedMotion()
  const okRef = useRef<HTMLButtonElement>(null)
  const isArena = m.kind === "arena"
  const arena = arenaAt(isArena ? m.toArena : m.arenaIndex)
  const level = isArena ? m.level : m.toLevel
  const gained = isArena ? 0 : m.toLevel - m.fromLevel

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    okRef.current?.focus({ preventScroll: true })
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      prevFocus?.focus?.({ preventScroll: true })
    }
  }, [onClose])

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="milestone-title"
          aria-describedby="milestone-desc"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg"
        >
          <div className="p-5">
            <div className="flex items-start gap-3">
              <IconBox icon={isArena ? Flag : ChevronsUp} />
              <div className="min-w-0">
                <h2 id="milestone-title" className="text-lg font-semibold leading-tight text-foreground">
                  {isArena ? `New arena: ${arena.name}` : `Level ${level} reached`}
                </h2>
                <p id="milestone-desc" className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArenaDot color={arena.palette.accent} />
                  <span className="truncate">
                    {m.title} · {isArena ? `Level ${level}` : arena.name}
                  </span>
                </p>
              </div>
            </div>

            {gained > 1 && (
              <p className="mt-4 text-sm text-muted-foreground">You moved up {gained} levels.</p>
            )}

            {isArena && m.gateName && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusPill status="done">{m.gateName} cleared</StatusPill>
                {m.bankedXp > 0 && (
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">{fmt(m.bankedXp)}</span> held XP added
                  </span>
                )}
              </div>
            )}

            {m.unlocks.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">Unlocked</p>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {m.unlocks.map((u) => {
                    const Icon = unlockIcon(u)
                    return (
                      <li key={u.label} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        {u.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-border bg-muted/40 px-5 py-3">
            <Button ref={okRef} size="sm" onClick={onClose} className="min-w-20">
              OK
            </Button>
          </div>
        </motion.div>
      </motion.div>
      {isArena && !reduced && <ArenaBurst />}
    </>
  )
}
