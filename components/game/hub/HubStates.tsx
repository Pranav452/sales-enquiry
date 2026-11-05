"use client"

// Loading / error / empty states for the Activity Tracker progress row.

import { AlertTriangle, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/game/ui/primitives"

function SkeletonCard({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-3 p-4">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="h-16 w-full rounded-lg bg-muted/60" />
        <p className="text-xs text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function HubSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]", className)} aria-busy="true" aria-label="Loading progress">
      <SkeletonCard title="Your progress" />
      <SkeletonCard title="Quests" />
    </div>
  )
}

export function HubError({ message, onRetry }: { message: string; onRetry: () => void; onLogActivity?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">Progress could not be loaded</p>
        <p className="text-xs text-muted-foreground">{message}. Activities can still be logged.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden /> Retry
      </Button>
    </div>
  )
}

export function HubEmpty({ onLogActivity }: { onLogActivity: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <EmptyState
        title="No progress yet"
        body="Log a call or visit to start earning XP and completing quests."
        action={
          <Button size="sm" onClick={onLogActivity}>
            <Plus className="h-4 w-4" aria-hidden /> Log Activity
          </Button>
        }
      />
    </div>
  )
}

export function PanelMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <EmptyState title={title} body={body} />
    </div>
  )
}
