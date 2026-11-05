"use client"

// Queue for game celebrations: toasts (stacked, short-lived) and modals
// (level-up / new-arena, shown one at a time).

import { create } from "zustand"

export interface CelebrationToast {
  id:      number
  kind:    "xp" | "quest" | "sweep" | "trophy" | "gate" | "prestige"
  title:   string
  detail?: string
  /** bonus XP shown as a chip */
  reward?: number
  /** lucide icon name (activity / quest icon; toasts fall back to an icon per kind) */
  icon:    string
  /** ms on screen */
  ttl:     number
}

export interface Unlock {
  kind:  "game" | "pet"
  label: string
  /** lucide icon name of the arcade game (pets use a paw icon) */
  icon:  string
}

export interface LevelModal {
  id:         number
  kind:       "level"
  fromLevel:  number
  toLevel:    number
  title:      string
  arenaIndex: number
  unlocks:    Unlock[]
}

export interface ArenaModal {
  id:        number
  kind:      "arena"
  fromArena: number
  toArena:   number
  level:     number
  title:     string
  gateName:  string | null
  bankedXp:  number
  unlocks:   Unlock[]
}

export type CelebrationModal = LevelModal | ArenaModal

export type NewToast = Omit<CelebrationToast, "id">
export type NewModal = Omit<LevelModal, "id"> | Omit<ArenaModal, "id">

interface CelebrationState {
  toasts:       CelebrationToast[]
  modals:       CelebrationModal[]
  pushToasts:   (t: NewToast[]) => void
  dismissToast: (id: number) => void
  pushModals:   (m: NewModal[]) => void
  shiftModal:   () => void
}

let seq = 0

export const useCelebrations = create<CelebrationState>((set) => ({
  toasts: [],
  modals: [],
  pushToasts: (t) => {
    if (t.length === 0) return
    set((s) => ({ toasts: [...s.toasts, ...t.map((x) => ({ ...x, id: ++seq }))].slice(-12) }))
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  pushModals: (m) => {
    if (m.length === 0) return
    set((s) => ({ modals: [...s.modals, ...m.map((x) => ({ ...x, id: ++seq }) as CelebrationModal)] }))
  },
  shiftModal: () => set((s) => ({ modals: s.modals.slice(1) })),
}))
