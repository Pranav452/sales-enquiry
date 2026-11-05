"use client"

// ============================================================
// Shared pieces for the dice board games (Snakes & Ladders, Ludo):
// a cancellable sleep, the dice tray, player list, event log and
// a two-step quit button. Everything outside the board uses the
// app theme tokens.
// ============================================================

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Flag, Gauge } from "lucide-react"
import { Die } from "@/components/game/arcade/kit/dice"
import { ToolButton } from "@/components/game/arcade/kit/GameShell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Timing ───────────────────────────────────────────────────

export class Cancelled extends Error {
  constructor() { super("cancelled") }
}

/**
 * Returns a `wait(ms)` that rejects with Cancelled once the component
 * unmounts (or `cancelAll` is called), so async turn scripts stop cleanly.
 */
export function useCancellableWait() {
  const alive = useRef(true)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  useEffect(() => {
    alive.current = true
    const set = timers.current
    return () => {
      alive.current = false
      set.forEach(clearTimeout)
      set.clear()
    }
  }, [])
  return useCallback((ms: number) => new Promise<void>((resolve, reject) => {
    if (!alive.current) { reject(new Cancelled()); return }
    const t = setTimeout(() => {
      timers.current.delete(t)
      if (alive.current) resolve()
      else reject(new Cancelled())
    }, ms)
    timers.current.add(t)
  }), [])
}

// ─── Token motion ─────────────────────────────────────────────

/** Keyframes a board token follows (board units, seconds). */
export interface TokenMotion {
  xs:   number[]
  ys:   number[]
  dur:  number
  ease: "linear" | "easeOut" | "easeInOut"
}

/** A short hop from a to b along a parabola `height` units high. */
export function hopMotion(a: { x: number; y: number }, b: { x: number; y: number }, dur: number, height: number): TokenMotion {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= 4; i++) {
    const t = i / 4
    xs.push(a.x + (b.x - a.x) * t)
    ys.push(a.y + (b.y - a.y) * t - height * 4 * t * (1 - t))
  }
  return { xs, ys, dur, ease: "linear" }
}

// ─── Layout ───────────────────────────────────────────────────

/**
 * Square board with a side panel. Side-by-side when the container is at
 * least 42rem wide, stacked (board first) below that. The board also
 * shrinks to fit the dialog height.
 */
export function BoardLayout({ board, side }: { board: ReactNode; side: ReactNode }) {
  return (
    <div className="@container">
      <div className="flex flex-col gap-3 @2xl:flex-row">
        <div className="mx-auto w-full max-w-[min(100%,calc(85vh_-_190px))] shrink-0 @2xl:mx-0 @2xl:w-[min(calc(100%_-_256px),calc(85vh_-_190px))] @2xl:max-w-none">
          <div className="aspect-square w-full">{board}</div>
        </div>
        <div className="relative min-w-0 @2xl:flex-1">
          <div className="flex flex-col gap-2.5 @2xl:absolute @2xl:inset-0">{side}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Log ──────────────────────────────────────────────────────

export interface LogEntry {
  id:    number
  color: string
  text:  string
}

export function EventLog({ entries, className }: { entries: LogEntry[]; className?: string }) {
  return (
    <div className={cn("flex min-h-0 flex-col rounded-lg border border-border bg-background", className)}>
      <p className="border-b border-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Game log
      </p>
      <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2 text-xs" aria-label="Game log">
        {entries.length === 0 && <li className="text-muted-foreground">No moves yet.</li>}
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2 leading-snug text-foreground">
            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} aria-hidden />
            <span>{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Players ──────────────────────────────────────────────────

export interface PanelPlayer {
  key:     string
  name:    string
  color:   string
  detail:  ReactNode
  active:  boolean
  place?:  number | null
  human?:  boolean
}

export function PlayerList({ players }: { players: PanelPlayer[] }) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 @2xl:grid-cols-1" aria-label="Players">
      {players.map((p) => (
        <li
          key={p.key}
          aria-current={p.active ? "true" : undefined}
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
            p.active ? "border-foreground/40 bg-accent" : "border-border bg-background",
          )}
        >
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30"
            style={{ backgroundColor: p.color }}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground">
              {p.name}
              {p.active && <span className="sr-only"> (playing now)</span>}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{p.detail}</span>
          </span>
          {p.place != null ? (
            <span className="shrink-0 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background">
              {ordinalShort(p.place)}
            </span>
          ) : p.active ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ordinalShort(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`
}

// ─── Dice tray ────────────────────────────────────────────────

/** Die that flickers through faces while rolling, plus the roll button. */
export function DiceTray({
  value, rolling, canRoll, onRoll, accent, caption, rollLabel = "Roll",
}: {
  value:    number
  rolling:  boolean
  canRoll:  boolean
  onRoll:   () => void
  /** current player's colour, shown as a stripe beside the die */
  accent:   string
  caption:  ReactNode
  rollLabel?: string
}) {
  const [face, setFace] = useState(value)
  useEffect(() => {
    if (!rolling) return
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 90)
    return () => clearInterval(t)
  }, [rolling])
  const shown = rolling ? face : value

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
      <div className="relative shrink-0">
        <span className="absolute -left-2.5 top-1 bottom-1 w-1 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        <Die value={shown} rolling={rolling} size={52} label={rolling ? "Rolling die" : `Die shows ${value}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1.5 truncate text-xs text-muted-foreground">{caption}</p>
        <Button
          size="sm"
          className="w-full"
          onClick={onRoll}
          disabled={!canRoll}
          aria-keyshortcuts="Space"
        >
          {rollLabel}
          <kbd className="ml-1 hidden rounded border border-current/30 px-1 text-[10px] font-normal opacity-80 sm:inline">Space</kbd>
        </Button>
      </div>
    </div>
  )
}

// ─── Toolbar buttons ──────────────────────────────────────────

export function SpeedToggle({ fast, onToggle }: { fast: boolean; onToggle: () => void }) {
  return (
    <ToolButton
      onClick={onToggle}
      aria-pressed={fast}
      title="Speed up computer turns and animations"
      className={cn(fast && "border-primary bg-primary/10 text-foreground")}
    >
      <Gauge className="h-3.5 w-3.5" aria-hidden />
      Speed up
    </ToolButton>
  )
}

/** Quit needs a second click within a few seconds. */
export function QuitButton({ onQuit, disabled }: { onQuit: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <ToolButton
      onClick={() => (armed ? onQuit() : setArmed(true))}
      disabled={disabled}
      className={cn(armed && "border-destructive text-destructive hover:text-destructive")}
    >
      <Flag className="h-3.5 w-3.5" aria-hidden />
      {armed ? "Confirm quit" : "Quit"}
    </ToolButton>
  )
}

// ─── Misc ─────────────────────────────────────────────────────

export const BOT_NAMES = ["Priya", "Arjun", "Kavya", "Rohan", "Meera", "Vikram", "Ananya", "Kabir"] as const

/** True when a keyboard event comes from something that handles Space itself. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON"
    || target.isContentEditable || target.getAttribute("role") === "button"
    || target.getAttribute("role") === "radio"
}
