"use client"

// ============================================================
// Shared UI primitives for the Grand Voyage screens.
// Same visual language as the rest of the CRM: app theme
// tokens only (works in light / dark / pink), flat surfaces,
// no glows, gradients, textures or decorative motion.
// ============================================================

import type { ComponentType, ReactNode } from "react"
import { Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

type IconType = ComponentType<{ className?: string }>

/** Locale-formatted integer (en-IN groups like the rest of the app). */
export function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN")
}

// ─── Card with a header row ───────────────────────────────────

export function SectionCard({
  title, description, icon: Icon, actions, children, className, bodyClassName,
}: {
  title:          ReactNode
  description?:   ReactNode
  icon?:          IconType
  actions?:       ReactNode
  children:       ReactNode
  className?:     string
  bodyClassName?: string
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-sm", className)}>
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────

export function StatTile({
  label, value, sub, icon: Icon, className,
}: {
  label:      ReactNode
  value:      ReactNode
  sub?:       ReactNode
  icon?:      IconType
  className?: string
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-background px-3 py-2.5", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold leading-tight tabular-nums text-foreground">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────

export type Tone = "primary" | "success" | "warning" | "muted"

const FILL: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-green-600",
  warning: "bg-amber-500",
  muted:   "bg-muted-foreground/40",
}

export function ProgressBar({
  value, tone = "primary", size = "sm", label, className,
}: {
  /** 0..1 */
  value:      number
  tone?:      Tone
  size?:      "sm" | "md"
  /** accessible label, e.g. "Field visits" */
  label?:     string
  className?: string
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn("w-full overflow-hidden rounded-full bg-muted", size === "sm" ? "h-1.5" : "h-2", className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-300", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** "current / target" line with a bar underneath. */
export function MeterRow({
  label, current, target, tone, hint,
}: {
  label:   ReactNode
  current: number
  target:  number
  tone?:   Tone
  hint?:   ReactNode
}) {
  const done = current >= target
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 text-foreground">
          {done
            ? <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
            : <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" aria-hidden />}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {fmt(Math.min(current, target))} / {fmt(target)}
        </span>
      </div>
      <ProgressBar value={target ? current / target : 0} tone={tone ?? (done ? "success" : "primary")} label={typeof label === "string" ? label : undefined} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────

export type Status = "done" | "current" | "locked" | "warning" | "neutral"

const STATUS_CLASS: Record<Status, string> = {
  done:    "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300",
  current: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  locked:  "bg-muted text-muted-foreground",
  neutral: "bg-secondary text-secondary-foreground",
}

export function StatusPill({ status, children, className }: { status: Status; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", STATUS_CLASS[status], className)}>
      {status === "locked" && <Lock className="h-3 w-3" aria-hidden />}
      {status === "done" && <Check className="h-3 w-3" aria-hidden />}
      {children}
    </span>
  )
}

// ─── Arena colour marker (the only place arena colour appears) ─

export function ArenaDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} aria-hidden />
}

// ─── Icon box (muted square) ──────────────────────────────────

export function IconBox({ icon: Icon, className, muted }: { icon: IconType; className?: string; muted?: boolean }) {
  return (
    <span className={cn(
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
      muted ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
      className,
    )}>
      <Icon className="h-4 w-4" />
    </span>
  )
}

// ─── Empty / message state ────────────────────────────────────

export function EmptyState({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && <p className="max-w-md text-xs text-muted-foreground">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
