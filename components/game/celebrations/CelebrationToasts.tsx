"use client"

// Game notifications (XP gained, quests, trophies, gates): standard
// notification cards stacked top-right, just below the app header.

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCheck, Footprints, Handshake, ListChecks, Lock, Phone, PhoneCall, PhoneIncoming, Ship, Star,
  Trophy, X, Zap, type LucideIcon,
} from "lucide-react"
import { IconBox } from "@/components/game/ui/primitives"
import { useCelebrations, type CelebrationToast } from "./celebrationStore"

// Activity icons used by XP toasts; every other kind has one fixed icon.
const XP_ICONS: Record<string, LucideIcon> = { PhoneCall, Phone, PhoneIncoming, Footprints, Handshake, Ship }

const KIND_ICON: Record<CelebrationToast["kind"], LucideIcon> = {
  xp: Zap, quest: ListChecks, sweep: CheckCheck, trophy: Trophy, gate: Lock, prestige: Star,
}

const SUCCESS_BOX = "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
const WARNING_BOX = "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"

function boxClass(kind: CelebrationToast["kind"]): string | undefined {
  if (kind === "quest" || kind === "sweep") return SUCCESS_BOX
  if (kind === "gate") return WARNING_BOX
  return undefined
}

function Toast({ t }: { t: CelebrationToast }) {
  const dismiss = useCelebrations((s) => s.dismissToast)

  useEffect(() => {
    const id = window.setTimeout(() => dismiss(t.id), t.ttl)
    return () => window.clearTimeout(id)
  }, [t.id, t.ttl, dismiss])

  const icon = t.kind === "xp" ? XP_ICONS[t.icon] ?? Zap : KIND_ICON[t.kind]
  const reward = t.kind !== "xp" && t.reward != null && t.reward > 0 ? t.reward : null

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pointer-events-auto relative flex items-start gap-3 rounded-lg border border-border bg-card py-3 pl-3 pr-9 text-card-foreground shadow-md"
    >
      <IconBox icon={icon} className={boxClass(t.kind)} />
      <div className="min-w-0 flex-1">
        {t.kind === "xp" ? (
          <>
            <p className="text-sm font-semibold text-foreground">
              <span className="tabular-nums">+{t.reward ?? 0} XP</span>
              <span className="font-normal text-muted-foreground"> · </span>
              {t.title}
            </p>
            <p className="text-xs text-muted-foreground">Activity logged</p>
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">{t.title}</p>
              {reward != null && (
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">+{reward} XP</span>
              )}
            </div>
            {t.detail && <p className="line-clamp-2 text-xs text-muted-foreground">{t.detail}</p>}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </motion.li>
  )
}

export function CelebrationToasts({ toasts }: { toasts: CelebrationToast[] }) {
  return (
    <ol
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 top-16 z-[120] flex w-[min(calc(100vw-2rem),360px)] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => <Toast key={t.id} t={t} />)}
      </AnimatePresence>
    </ol>
  )
}
