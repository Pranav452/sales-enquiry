"use client"

// ============================================================
// Pet preferences (localStorage) + transient pet UI state.
// Hydrated on the client after mount so SSR markup never differs.
// ============================================================

import { create } from "zustand"
import { SPECIES, isSpeciesId, type PetMode, type SpeciesId } from "./species"

export const PET_PREFS_KEY = "grand-voyage:pet:v1"
export const PET_POS_KEY   = "grand-voyage:pet:pos:v1"

export interface PetPrefs {
  species:        SpeciesId | null
  name:           string
  mode:           PetMode
  muted:          boolean
  hidden:         boolean
  adoptDismissed: boolean
  /** Last evolution stage the player has seen celebrated (0 = never). */
  seenStage:      number
}

const DEFAULT_PREFS: PetPrefs = {
  species: null,
  name: "",
  mode: "stay",
  muted: false,
  hidden: false,
  adoptDismissed: false,
  seenStage: 0,
}

export const MAX_NAME_LENGTH = 18

export function cleanName(name: string, species: SpeciesId | null): string {
  const n = name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH)
  if (n) return n
  return species ? SPECIES[species].defaultName : ""
}

function sanitize(raw: unknown): PetPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS
  const r = raw as Record<string, unknown>
  const species = isSpeciesId(r.species) ? r.species : null
  const mode: PetMode = r.mode === "follow" || r.mode === "wander" ? r.mode : "stay"
  return {
    species,
    name: typeof r.name === "string" ? cleanName(r.name, species) : cleanName("", species),
    mode,
    muted: r.muted === true,
    hidden: r.hidden === true,
    adoptDismissed: r.adoptDismissed === true,
    seenStage: typeof r.seenStage === "number" && Number.isFinite(r.seenStage) ? r.seenStage : 0,
  }
}

function readPrefs(): PetPrefs {
  try {
    const raw = window.localStorage.getItem(PET_PREFS_KEY)
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

function pickPrefs(s: PetPrefs): PetPrefs {
  return {
    species: s.species, name: s.name, mode: s.mode, muted: s.muted,
    hidden: s.hidden, adoptDismissed: s.adoptDismissed, seenStage: s.seenStage,
  }
}

function writePrefs(p: PetPrefs) {
  try {
    window.localStorage.setItem(PET_PREFS_KEY, JSON.stringify(pickPrefs(p)))
  } catch {
    // storage full or blocked — the pet still works for this session
  }
}

// ─── Position (separate key, written on drop / rest) ─────────

export function loadPetPosition(): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(PET_POS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { x?: unknown; y?: unknown }
    if (typeof p.x !== "number" || typeof p.y !== "number") return null
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
    return { x: p.x, y: p.y }
  } catch {
    return null
  }
}

export function savePetPosition(x: number, y: number) {
  try {
    window.localStorage.setItem(PET_POS_KEY, JSON.stringify({ x: Math.round(x), y: Math.round(y) }))
  } catch {
    // ignore
  }
}

// ─── Store ───────────────────────────────────────────────────

/** Something the pet should say as soon as it appears. */
export type PetCue = "adopt" | "summon" | null

interface PetStore extends PetPrefs {
  hydrated:  boolean
  adoptOpen: boolean
  cue:       PetCue
  hydrate:      () => void
  update:       (patch: Partial<PetPrefs>) => void
  adopt:        (species: SpeciesId, name: string) => void
  setSpecies:   (species: SpeciesId) => void
  dismissAdopt: () => void
  /** Summon tab: un-hide the pet, or re-open the adoption card. */
  summon:       () => void
  takeCue:      () => PetCue
}

let storageListenerAttached = false

export const usePetStore = create<PetStore>((set, get) => ({
  ...DEFAULT_PREFS,
  hydrated: false,
  adoptOpen: false,
  cue: null,

  hydrate: () => {
    if (get().hydrated) return
    const prefs = readPrefs()
    set({
      ...prefs,
      hydrated: true,
      adoptOpen: !prefs.species && !prefs.adoptDismissed,
    })
    // Keep multiple tabs in sync.
    if (!storageListenerAttached) {
      storageListenerAttached = true
      window.addEventListener("storage", (e) => {
        if (e.key !== PET_PREFS_KEY) return
        const next = readPrefs()
        set({ ...next, adoptOpen: get().adoptOpen && !next.species })
      })
    }
  },

  update: (patch) => {
    const next = { ...pickPrefs(get()), ...patch }
    set(patch)
    writePrefs(next)
  },

  adopt: (species, name) => {
    set({ adoptOpen: false, cue: "adopt" })
    get().update({ species, name: cleanName(name, species), hidden: false, adoptDismissed: true })
  },

  setSpecies: (species) => {
    const { species: current, name } = get()
    const keepName = current ? name !== SPECIES[current].defaultName : false
    get().update({ species, name: keepName ? name : SPECIES[species].defaultName })
  },

  dismissAdopt: () => {
    get().update({ adoptDismissed: true })
    set({ adoptOpen: false })
  },

  summon: () => {
    const { species } = get()
    if (!species) {
      set({ adoptOpen: true })
      return
    }
    set({ cue: "summon" })
    get().update({ hidden: false })
  },

  takeCue: () => {
    const cue = get().cue
    if (cue) set({ cue: null })
    return cue
  },
}))
