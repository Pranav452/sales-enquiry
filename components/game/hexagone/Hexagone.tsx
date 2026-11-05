"use client"

// Hexagone: each rep's own low-poly map of France that grows with real
// sales milestones. Rules live in lib/game/hexagone.ts; the 3D stage is
// loaded on demand so three.js never ships unless this tab is opened.

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Hexagon, Loader2, X } from "lucide-react"
import type { GameProfile } from "@/lib/game/types"
import { ARENAS } from "@/lib/game/levels"
import { buildHexagone, type HexPiece } from "@/lib/game/hexagone"
import { EmptyState, ProgressBar, SectionCard } from "@/components/game/ui/primitives"
import { ConstructionYard, HexagoneCounts, HexagoneRules, PanelHeading, YardHeading } from "./HexagonePanel"
import { CATEGORY_ICON } from "./icons"
import type { FocusRequest } from "./HexagoneStage"

const DESCRIPTION = "Your map of France. Buildings are added as you reach sales milestones."

const HexagoneStage = dynamic(() => import("./HexagoneStage"), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      Loading map...
    </div>
  ),
})

function arenaAt(index: number) {
  return ARENAS[Math.max(0, Math.min(ARENAS.length - 1, index))]
}

// ─── "Seen" snapshot: which pieces this browser has already shown ───

const SEEN_KEY = "voyage.hexagone.seen.v1"

interface SeenSnapshot { v: 1; person: string; ids: string[] }

function readSeen(person: string): Set<string> | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<SeenSnapshot>
    if (s?.v !== 1 || s.person !== person || !Array.isArray(s.ids)) return null
    return new Set(s.ids.filter((x): x is string => typeof x === "string"))
  } catch {
    return null
  }
}

function writeSeen(person: string, ids: string[]) {
  try {
    const snap: SeenSnapshot = { v: 1, person, ids }
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(snap))
  } catch {
    // Storage full or blocked: new pieces will simply rise again next time.
  }
}

// ─── Tab ───────────────────────────────────────────────────────

export interface HexagoneProps {
  me: GameProfile | null
  /** Force an IST hour for the lighting (previews / testing). */
  hourOverride?: number | null
}

export function Hexagone({ me, hourOverride = null }: HexagoneProps) {
  if (!me) return <HexagoneEmpty />
  return <HexagoneBoard key={me.person} me={me} hourOverride={hourOverride} />
}

function HexagoneBoard({ me, hourOverride }: { me: GameProfile; hourOverride: number | null }) {
  const reducedMotion = useReducedMotion() ?? false
  const arena = arenaAt(me.arenaIndex)
  const layout = useMemo(() => buildHexagone(me), [me])

  // Pieces this browser saw last time. Null on the very first visit: that visit only seeds.
  const [baseline] = useState(() => readSeen(me.person))
  const [bannerOpen, setBannerOpen] = useState(true)
  const [focus, setFocus] = useState<FocusRequest | null>(null)

  const newPieces = useMemo<HexPiece[]>(
    () => (baseline ? layout.pieces.filter((p) => p.category !== "base" && !baseline.has(p.id)) : []),
    [baseline, layout],
  )
  const newIds = useMemo(() => new Set(newPieces.map((p) => p.id)), [newPieces])

  useEffect(() => {
    writeSeen(me.person, layout.pieces.map((p) => p.id))
  }, [me.person, layout])

  // The banner steps aside on its own after a while; the new pieces stay hoverable.
  useEffect(() => {
    if (newPieces.length === 0) return
    const t = window.setTimeout(() => setBannerOpen(false), 15_000)
    return () => window.clearTimeout(t)
  }, [newPieces.length])

  const overall = layout.totalCount ? layout.builtCount / layout.totalCount : 0

  return (
    <SectionCard
      title="Hexagone"
      description={DESCRIPTION}
      icon={Hexagon}
      actions={
        <div className="hidden w-44 sm:block">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Buildings</span>
            <span className="font-medium tabular-nums text-foreground">
              {layout.builtCount} / {layout.totalCount}
            </span>
          </div>
          <ProgressBar value={overall} label="Buildings completed" className="mt-1" />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* ── 3D stage ── */}
        <div className="relative h-[420px] overflow-hidden rounded-lg border border-border bg-muted sm:h-[520px] lg:h-auto lg:min-h-[620px]">
          <HexagoneStage
            pieces={layout.pieces}
            newIds={newIds}
            palette={arena.palette}
            reducedMotion={reducedMotion}
            hourOverride={hourOverride}
            focus={focus}
            className="absolute inset-0"
          />
          <AnimatePresence>
            {bannerOpen && newPieces.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, delay: 0.3 }}
                role="status"
                className="absolute left-1/2 top-14 z-30 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setBannerOpen(false)}
                  aria-label="Dismiss"
                  className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
                <p className="pr-6 text-sm font-semibold text-foreground">New construction</p>
                <p className="text-xs text-muted-foreground">
                  {newPieces.length === 1 ? "1 building added since your last visit" : `${newPieces.length} buildings added since your last visit`}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {newPieces.slice(0, 6).map((p) => {
                    const Icon = CATEGORY_ICON[p.category]
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setFocus({ id: p.id, nonce: Date.now() })}
                          className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title={p.unlockedBy}
                        >
                          <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
                          {p.name}
                        </button>
                      </li>
                    )
                  })}
                  {newPieces.length > 6 && (
                    <li className="px-1 py-0.5 text-xs text-muted-foreground">and {newPieces.length - 6} more</li>
                  )}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Panel ── */}
        <aside className="space-y-5">
          <div className="space-y-2 sm:hidden">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Buildings completed</span>
              <span className="font-medium tabular-nums text-foreground">
                {layout.builtCount} / {layout.totalCount}
              </span>
            </div>
            <ProgressBar value={overall} label="Buildings completed" />
          </div>
          <div className="space-y-2">
            <PanelHeading>Built so far</PanelHeading>
            <HexagoneCounts counts={layout.counts} />
          </div>
          <div className="space-y-2">
            <YardHeading />
            <ConstructionYard yard={layout.yard} />
          </div>
          <details className="group rounded-lg border border-border bg-background px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              How buildings are added
            </summary>
            <HexagoneRules className="mt-2" />
          </details>
        </aside>
      </div>
    </SectionCard>
  )
}

function HexagoneEmpty() {
  return (
    <SectionCard title="Hexagone" description={DESCRIPTION} icon={Hexagon}>
      <EmptyState
        title="No activity linked to you yet"
        body="Your map appears here once activities are logged under your name."
      />
      <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-3">
        <PanelHeading>How buildings are added</PanelHeading>
        <HexagoneRules className="mt-2" />
      </div>
    </SectionCard>
  )
}
