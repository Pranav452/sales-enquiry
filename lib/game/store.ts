"use client"

// ============================================================
// Client store for The Grand Voyage — one fetch shared by the
// activities hub, the home card, the pet and celebrations.
// ============================================================

import { create } from "zustand"
import type { GameApiResponse } from "./types"
import { onActivityLogged } from "./events"

interface GameStore {
  data:        GameApiResponse | null
  loading:     boolean
  error:       string | null
  lastFetched: number
  /** Fetch if never fetched or older than `maxAgeMs` (default 60s). */
  ensure:      (maxAgeMs?: number) => Promise<void>
  /** Always refetch. */
  refresh:     () => Promise<void>
}

let inflight: Promise<void> | null = null

export const useGameStore = create<GameStore>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: 0,

  ensure: async (maxAgeMs = 60_000) => {
    const { lastFetched, data } = get()
    if (data && Date.now() - lastFetched < maxAgeMs) return
    await get().refresh()
  },

  refresh: async () => {
    if (inflight) return inflight
    set({ loading: true })
    inflight = (async () => {
      try {
        const res = await fetch("/api/game", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? "Failed to load game")
        set({ data: json as GameApiResponse, error: null, lastFetched: Date.now() })
      } catch (e) {
        set({ error: e instanceof Error ? e.message : "Failed to load game" })
      } finally {
        set({ loading: false })
        inflight = null
      }
    })()
    return inflight
  },
}))

// Refresh automatically whenever an activity is logged anywhere in the app.
if (typeof window !== "undefined") {
  onActivityLogged(() => { void useGameStore.getState().refresh() })
}

/** Convenience selector for the viewer's profile. */
export function useMyGameProfile() {
  return useGameStore((s) => s.data?.me ?? null)
}
