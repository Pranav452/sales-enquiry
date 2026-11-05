"use client"

// The 3D stage of the Hexagone tab. Loaded with next/dynamic (ssr: false)
// so three.js only ships when the tab is opened.

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  LocateFixed, Loader2, Moon, Pause, RefreshCw, RotateCw, Sun, Sunrise, Sunset, TriangleAlert, X,
  type LucideIcon,
} from "lucide-react"
import type { HexCategory, HexPiece } from "@/lib/game/hexagone"
import type { ArenaPalette } from "@/lib/game/levels"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconBox, ProgressBar } from "@/components/game/ui/primitives"
import { createHexWorld, type HexWorld, type HoverInfo } from "./engine/world"
import type { DayPhase, DaylightState } from "./engine/daylight"
import { CATEGORY_ICON, CATEGORY_LABEL } from "./icons"

export interface FocusRequest { id: string; nonce: number }

export interface HexagoneStageProps {
  pieces:        HexPiece[]
  newIds:        ReadonlySet<string>
  palette:       ArenaPalette
  reducedMotion: boolean
  hourOverride?: number | null
  focus?:        FocusRequest | null
  className?:    string
}

const PHASE_ICON: Record<DayPhase, LucideIcon> = { dawn: Sunrise, day: Sun, golden: Sunset, night: Moon }

function hhmm(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

type Status = "loading" | "ready" | "error"

export default function HexagoneStage({
  pieces, newIds, palette, reducedMotion, hourOverride = null, focus = null, className,
}: HexagoneStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HexWorld | null>(null)
  const latest = useRef({ pieces, newIds, palette, hourOverride })
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<Status>("loading")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [selected, setSelected] = useState<HexPiece | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [daylight, setDaylight] = useState<Pick<DaylightState, "phase" | "label" | "hour"> | null>(null)

  useEffect(() => {
    latest.current = { pieces, newIds, palette, hourOverride }
  })

  // Create / destroy the world. Recreated on retry or when reduced motion flips.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const init = latest.current
    const world = createHexWorld({
      container: el,
      palette: init.palette,
      reducedMotion,
      hourOverride: init.hourOverride,
      onProgress: (f) => setProgress(f),
      onReady: () => setStatus("ready"),
      onError: (m) => { setError(m); setStatus("error") },
      onHover: (h) => setHover(h),
      onSelect: (p) => setSelected(p),
      onDaylight: (d) => setDaylight({ phase: d.phase, label: d.label, hour: d.hour }),
    })
    worldRef.current = world
    world?.setPieces(init.pieces, init.newIds)
    return () => {
      world?.dispose()
      worldRef.current = null
    }
  }, [attempt, reducedMotion])

  useEffect(() => { worldRef.current?.setPieces(pieces, newIds) }, [pieces, newIds])
  useEffect(() => { worldRef.current?.setPalette(palette) }, [palette])
  useEffect(() => { worldRef.current?.setHourOverride(hourOverride) }, [hourOverride])
  useEffect(() => { if (focus) worldRef.current?.focus(focus.id) }, [focus])
  useEffect(() => { worldRef.current?.setAutoRotate(autoRotate) }, [autoRotate])

  const retry = () => {
    setError(null)
    setProgress(0)
    setStatus("loading")
    setAutoRotate(true)
    setAttempt((a) => a + 1)
  }

  const PhaseIcon = daylight ? PHASE_ICON[daylight.phase] : Sun
  const tipLeft = hover ? Math.min(hover.x + 16, Math.max(8, hover.width - 248)) : 0
  const tipTop = hover ? (hover.y > hover.height - 110 ? hover.y - 92 : hover.y + 18) : 0

  return (
    <div className={cn("relative isolate overflow-hidden bg-muted", className)}>
      <div ref={containerRef} key={attempt} className="absolute inset-0" />

      {/* ── Loading ── */}
      <AnimatePresence>
        {status === "loading" && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <p className="text-sm text-foreground">Loading map...</p>
            <ProgressBar value={progress} label="Map download" className="w-56" />
            <p className="text-xs tabular-nums">{Math.round(progress * 100)}% downloaded</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      {status === "error" && (
        <div role="alert" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
          <IconBox icon={TriangleAlert} className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">The 3D map could not be loaded</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {error ?? "Something went wrong while loading the map."} Your progress is saved, and the counts beside the map are up to date.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Try again
          </Button>
        </div>
      )}

      {status === "ready" && (
        <>
          {/* ── Time of day ── */}
          {daylight && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-card/95 px-2 py-1 text-xs text-foreground shadow-sm">
              <PhaseIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <span className="font-medium">{daylight.label}</span>
              <span className="tabular-nums text-muted-foreground">{hhmm(daylight.hour)} IST</span>
            </div>
          )}

          {/* ── View controls ── */}
          <div className="absolute right-3 top-3 z-10 flex gap-1.5">
            {!reducedMotion && (
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                aria-pressed={autoRotate}
                aria-label={autoRotate ? "Stop rotating the map" : "Rotate the map slowly"}
                title={autoRotate ? "Stop rotating" : "Rotate slowly"}
                className={CONTROL_CLASS}
              >
                {autoRotate ? <Pause className="h-4 w-4" aria-hidden /> : <RotateCw className="h-4 w-4" aria-hidden />}
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSelected(null); worldRef.current?.resetView() }}
              aria-label="Reset the view to all of France"
              title="Reset view"
              className={CONTROL_CLASS}
            >
              <LocateFixed className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* ── Hint ── */}
          {!selected && (
            <p className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-md border border-border bg-card/95 px-2 py-1 text-xs text-muted-foreground shadow-sm">
              <span className="hidden sm:inline">Drag to rotate · Scroll to zoom · Right-drag to pan · Click a building</span>
              <span className="sm:hidden">Drag to rotate · Pinch to zoom · Tap a building</span>
            </p>
          )}

          {/* ── Hover tooltip ── */}
          {hover && (!selected || selected.id !== hover.id) && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-20 w-60 rounded-lg border border-border bg-popover p-2.5 text-left text-popover-foreground shadow-md"
              style={{ left: tipLeft, top: tipTop }}
            >
              <TooltipBody name={hover.name} unlockedBy={hover.unlockedBy} category={hover.category} />
            </div>
          )}

          {/* ── Selected piece ── */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-3 left-3 z-20 w-[min(20rem,calc(100%-1.5rem))] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-md"
                aria-live="polite"
              >
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
                <TooltipBody name={selected.name} unlockedBy={selected.unlockedBy} category={selected.category} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

const CONTROL_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:text-foreground"

function TooltipBody({ name, unlockedBy, category }: { name: string; unlockedBy: string; category: HexCategory }) {
  return (
    <div className="flex gap-2.5 pr-5">
      <IconBox icon={CATEGORY_ICON[category]} muted />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[category]}</p>
        <p className="text-sm font-semibold leading-snug text-foreground">{name}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{unlockedBy}</p>
      </div>
    </div>
  )
}
