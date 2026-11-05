"use client"

// ============================================================
// GameCelebrations — mounted once in the protected layout.
// - ensures game data is loaded on every page
// - XP toast for every activity logged (replaces the old PointsToast)
// - diffs the profile against a localStorage snapshot and queues
//   level-up / new-arena dialogs, trophy + quest toasts
// Dialogs show one at a time; toasts wait while a dialog is open.
// ============================================================

import { useEffect } from "react"
import { AnimatePresence, MotionConfig } from "framer-motion"
import { useGameStore } from "@/lib/game/store"
import { onActivityLogged } from "@/lib/game/events"
import type { GameProfile } from "@/lib/game/types"
import { ACTIVITY_TYPE_MAP } from "@/lib/constants/activities"
import { useCelebrations } from "./celebrationStore"
import { diffSnapshot, readSnapshot, snapshotOf, writeSnapshot } from "./snapshot"
import { CelebrationToasts } from "./CelebrationToasts"
import { MilestoneDialog } from "./MilestoneDialog"

const XP_ICON: Record<string, string> = {
  COLD_CALL: "PhoneCall",
  WARM_CALL: "Phone",
  CALL_SECURED: "PhoneIncoming",
  CLIENT_VISIT: "Footprints",
  VISIT_SECURED: "Handshake",
  SHIPPING_LINE_VISIT: "Ship",
}

function checkProfile(me: GameProfile | null) {
  if (!me) return
  const prev = readSnapshot()
  const next = snapshotOf(me)
  // First load (or a different person on this browser): seed silently.
  if (!prev || prev.person !== me.person) {
    writeSnapshot(next)
    return
  }
  const { toasts, modals } = diffSnapshot(prev, me)
  writeSnapshot(next)
  const q = useCelebrations.getState()
  q.pushToasts(toasts)
  q.pushModals(modals)
}

export function GameCelebrations() {
  const ensure = useGameStore((s) => s.ensure)
  const toasts = useCelebrations((s) => s.toasts)
  const modal = useCelebrations((s) => s.modals[0] ?? null)
  const shiftModal = useCelebrations((s) => s.shiftModal)

  // Make sure game data exists on every page.
  useEffect(() => { void ensure() }, [ensure])

  // Instant XP feedback when an activity is saved anywhere in the app.
  useEffect(() => onActivityLogged((d) => {
    const def = ACTIVITY_TYPE_MAP[d.activityType]
    useCelebrations.getState().pushToasts([{
      kind: "xp",
      title: def?.label ?? "Activity logged",
      reward: d.points,
      icon: XP_ICON[d.activityType] ?? "Zap",
      ttl: 3200,
    }])
  }), [])

  // Diff every fresh profile against what the player has already seen.
  useEffect(() => {
    checkProfile(useGameStore.getState().data?.me ?? null)
    return useGameStore.subscribe((s, prev) => {
      const me = s.data?.me ?? null
      if (me && me !== (prev.data?.me ?? null)) checkProfile(me)
    })
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <CelebrationToasts toasts={modal ? [] : toasts.slice(0, 3)} />
      <AnimatePresence mode="wait">
        {modal && <MilestoneDialog key={modal.id} m={modal} onClose={shiftModal} />}
      </AnimatePresence>
    </MotionConfig>
  )
}
