"use client"

// "How to play" content for an arcade game: used in a standalone dialog
// (from the game card) and as a side panel inside the game window.

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { BookOpen, X } from "lucide-react"
import type { ArcadeGameDef, GameRules } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { IconBox } from "@/components/game/ui/primitives"
import { GAME_RULES } from "./rules"
import { arcadeIcon } from "./gameIcons"

function Section({ title, items, ordered }: { title: string; items?: string[]; ordered?: boolean }) {
  if (!items?.length) return null
  const List = ordered ? "ol" : "ul"
  return (
    <section>
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <List className={ordered ? "mt-1.5 list-decimal space-y-1 pl-5 text-sm text-muted-foreground" : "mt-1.5 list-disc space-y-1 pl-5 text-sm text-muted-foreground"}>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </List>
    </section>
  )
}

export function RulesContent({ game, rules }: { game: ArcadeGameDef; rules?: GameRules }) {
  const r = rules ?? GAME_RULES[game.id]
  if (!r) return <p className="text-sm text-muted-foreground">Rules are not available for this game yet.</p>
  return (
    <div className="space-y-4">
      <section>
        <h4 className="text-xs font-semibold text-foreground">Objective</h4>
        <p className="mt-1.5 text-sm text-muted-foreground">{r.objective}</p>
      </section>
      <Section title="Setup" items={r.setup} />
      <Section title="How to play" items={r.play} ordered />
      <Section title="Controls" items={r.controls} />
      <Section title="Scoring" items={r.scoring} />
      <Section title="Tips" items={r.tips} />
      <p className="border-t border-border pt-3 text-xs text-muted-foreground">{game.players}</p>
    </div>
  )
}

/** Standalone "How to play" dialog. */
export function HowToPlayDialog({ game, onClose }: { game: ArcadeGameDef; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onClose() } }
    window.addEventListener("keydown", onKey)
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.() }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="howto-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-3">
          <IconBox icon={arcadeIcon(game.icon)} />
          <div className="min-w-0 flex-1">
            <h2 id="howto-title" className="text-sm font-semibold text-foreground">How to play {game.name}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{game.description}</p>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mr-1.5 h-8 w-8 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          <RulesContent game={game} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export { BookOpen as HowToPlayIcon }
