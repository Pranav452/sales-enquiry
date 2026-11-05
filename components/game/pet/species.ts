// ============================================================
// The Grand Voyage — pet species, evolution stages, geometry.
// All art is drawn in a 100-unit-wide SVG space (feet at ~y96).
// ============================================================

export type SpeciesId = "crab" | "otter" | "octopus" | "parrot"
export type PetMode = "stay" | "follow" | "wander"

/** Short-lived face overrides layered on top of the mood. */
export type Expression = "love" | "whee" | "dizzy" | "cheer"

export interface SpeciesDef {
  id:          SpeciesId
  kind:        string   // "crab"
  defaultName: string
  blurb:       string
  /** Main fur/shell colour (used for eyelids and UI accents). */
  color:       string
  line:        string   // outline colour
  /** Where hats sit (centre of head top) and hat width in SVG units. */
  head:        { x: number; y: number; w: number }
  /** Neckerchief anchor, width and colour. */
  neck:        { x: number; y: number; w: number; color: string }
  eyes:        { lx: number; rx: number; y: number; r: number; bead: boolean }
  mouth:       { x: number; y: number; style: "plain" | "snout" | "beak" }
  cheeks:      { lx: number; rx: number; y: number }
  /** Verb for the victory dance, used in chatter. */
  dance:       string
}

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  crab: {
    id: "crab", kind: "crab", defaultName: "Barnacle",
    blurb: "Sideways walker, straight talker. Pinches pennies and procrastinators.",
    color: "#f05d3e", line: "#6b1d10",
    head:   { x: 50, y: 42, w: 34 },
    neck:   { x: 50, y: 79, w: 30, color: "#1e3a8a" },
    eyes:   { lx: 40, rx: 60, y: 60, r: 7.2, bead: false },
    mouth:  { x: 50, y: 71, style: "plain" },
    cheeks: { lx: 30.5, rx: 69.5, y: 68.5 },
    dance:  "victory scuttle",
  },
  otter: {
    id: "otter", kind: "sea otter", defaultName: "Skipper",
    blurb: "Floats on its back, never drifts from a follow-up. Keeps a lucky shell.",
    color: "#cfab84", line: "#3f2414",
    head:   { x: 50, y: 24.5, w: 34 },
    neck:   { x: 50, y: 69, w: 28, color: "#dc2626" },
    eyes:   { lx: 40, rx: 60, y: 44, r: 5.2, bead: true },
    mouth:  { x: 50, y: 57, style: "snout" },
    cheeks: { lx: 34, rx: 66, y: 53 },
    dance:  "happy barrel roll",
  },
  octopus: {
    id: "octopus", kind: "octopus", defaultName: "Inky",
    blurb: "Eight arms, three hearts, zero missed calls. Excellent at multitasking.",
    color: "#9877f0", line: "#37246e",
    head:   { x: 50, y: 19, w: 36 },
    neck:   { x: 50, y: 69, w: 34, color: "#0d9488" },
    eyes:   { lx: 40, rx: 60, y: 48, r: 7.6, bead: false },
    mouth:  { x: 50, y: 60, style: "plain" },
    cheeks: { lx: 30, rx: 70, y: 57 },
    dance:  "eight-armed wiggle",
  },
  parrot: {
    id: "parrot", kind: "parrot", defaultName: "Polly",
    blurb: "Repeats your best habits back to you. Loudly. Loves a good shanty.",
    color: "#2fb35a", line: "#14432a",
    head:   { x: 50, y: 20.5, w: 32 },
    neck:   { x: 50, y: 59.5, w: 26, color: "#dc2626" },
    eyes:   { lx: 41.5, rx: 58.5, y: 37, r: 6, bead: false },
    mouth:  { x: 50, y: 46, style: "beak" },
    cheeks: { lx: 34, rx: 66, y: 45.5 },
    dance:  "feathery shuffle",
  },
}

export const SPECIES_ORDER: SpeciesId[] = ["crab", "otter", "octopus", "parrot"]

export function isSpeciesId(v: unknown): v is SpeciesId {
  return typeof v === "string" && (SPECIES_ORDER as string[]).includes(v)
}

export function clampStage(stage: number | null | undefined): number {
  const s = Math.round(Number(stage) || 1)
  return Math.min(5, Math.max(1, s))
}

/** Size multiplier per stage — the pet grows a little each evolution. */
export const STAGE_SCALE = [0.84, 0.9, 0.96, 1.02, 1.1] as const

export const STAGE_LABELS = [
  "Hatchling",
  "Deck Cadet",
  "Able Sailor",
  "Captain",
  "Sovereign of the Seas",
] as const

export const STAGE_GEAR = [
  "nothing yet",
  "a sailor cap",
  "a neckerchief",
  "a gold-trimmed captain's hat",
  "a crown and a glowing aura",
] as const

/**
 * Vertical viewBox per stage. Hats and the crown poke above y=0, so later
 * stages get extra headroom; the feet stay on the bottom edge.
 */
export function stageViewBox(stage: number): { top: number; height: number } {
  const top = stage >= 5 ? -12 : stage >= 4 ? -4 : 0
  return { top, height: 100 - top }
}

/** Top of the head including gear, in SVG units (for clouds, Zzz, etc.). */
export function gearTop(species: SpeciesId, stage: number): number {
  const h = SPECIES[species].head
  const s = h.w / 34
  if (stage >= 5) return h.y - 28 * s
  if (stage >= 4) return h.y - 18.5 * s
  if (stage >= 2) return h.y - 11 * s
  return h.y
}
