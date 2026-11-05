"use client"

// ============================================================
// Common chrome for every arcade game so they all look and
// behave the same: a setup screen (mode / difficulty), a
// toolbar (status + actions) and a run-once game-over guard.
// Uses app theme tokens; the board/table itself is drawn by
// each game.
// ============================================================

import { useCallback, useRef, useState, type ReactNode } from "react"
import { Play } from "lucide-react"
import type { ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Game-over guard ──────────────────────────────────────────

/** Wraps onGameOver so it fires at most once per mounted game. */
export function useGameOverOnce(onGameOver: (r: ArcadeGameResult) => void) {
  const done = useRef(false)
  return useCallback((r: ArcadeGameResult) => {
    if (done.current) return
    done.current = true
    onGameOver(r)
  }, [onGameOver])
}

// ─── Setup screen ─────────────────────────────────────────────

export interface SetupChoice<V extends string = string> {
  value: V
  label: string
  hint?: string
}

export interface SetupOption<V extends string = string> {
  id:      string
  label:   string
  choices: SetupChoice<V>[]
}

/**
 * Pre-game screen: pick options (difficulty, players, draw mode…) then Start.
 * `defaults` maps option id -> choice value.
 */
export function SetupScreen({
  title, description, options, defaults, startLabel = "Start game", onStart, children,
}: {
  title:        string
  description?: ReactNode
  options:      SetupOption[]
  defaults:     Record<string, string>
  startLabel?:  string
  onStart:      (values: Record<string, string>) => void
  /** extra content under the options, e.g. a short rules reminder */
  children?:    ReactNode
}) {
  const [values, setValues] = useState<Record<string, string>>(defaults)
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-6">
      <div className="text-center">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>

      {options.map((opt) => (
        <fieldset key={opt.id} className="space-y-2">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">{opt.label}</legend>
          <div role="radiogroup" aria-label={opt.label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(opt.choices.length, 4)}, minmax(0, 1fr))` }}>
            {opt.choices.map((c) => {
              const active = values[opt.id] === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValues((v) => ({ ...v, [opt.id]: c.value }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary! bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-input! hover:text-foreground",
                  )}
                >
                  <span className="block text-sm font-medium">{c.label}</span>
                  {c.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{c.hint}</span>}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}

      {children}

      <Button onClick={() => onStart(values)} className="w-full">
        <Play className="h-4 w-4" aria-hidden />
        {startLabel}
      </Button>
    </div>
  )
}

// ─── Toolbar ──────────────────────────────────────────────────

/** Bar above the board: status on the left, actions on the right. */
export function GameToolbar({ status, stats, actions, className }: {
  /** e.g. "Your move" / "Computer is thinking..." */
  status?:  ReactNode
  /** small key/value stats: [{ label: "Moves", value: 12 }] */
  stats?:   { label: string; value: ReactNode }[]
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
        {status && <p className="text-sm font-medium text-foreground" aria-live="polite">{status}</p>}
        {stats?.map((s) => (
          <span key={s.label} className="text-xs text-muted-foreground">
            {s.label} <span className="font-medium tabular-nums text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Small outline button for toolbars (Undo, Hint, New game, Resign…). */
export function ToolButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 px-2.5 text-xs", className)} {...props}>
      {children}
    </Button>
  )
}

/** Scoring helper: difficulty multiplier used by most vs-computer games. */
export const DIFFICULTY_MULTIPLIER: Record<string, number> = { easy: 1, medium: 2, hard: 4 }
