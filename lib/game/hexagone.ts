// ============================================================
// The Grand Voyage — "Hexagone" base-builder rules (pure)
// ------------------------------------------------------------
// Every rep owns a low-poly 3D France that grows with real sales
// milestones. This module decides WHAT is built and WHERE, purely
// from a GameProfile: same profile -> same France on every device.
//
// Positions are pre-computed for the fully built map (every slot
// of every category), so unlocking a new piece never moves an
// existing one. The 3D layer only snaps pieces to the ground.
//
// Coordinates are in model units of /models/hexagone.glb:
// north = +Z, east = -X, ~1.3 km per unit.
// ============================================================

import type { GameProfile, LifetimeStats } from "./types"

// ─── Geography ────────────────────────────────────────────────

/** Calibrated lon/lat -> terrain model coordinates (x, z). */
export function lonLatToModel(lon: number, lat: number): { x: number; z: number } {
  return {
    x: 364.2 - ((lon + 4.795) / 13.025) * 731.9,
    z: -379.3 + ((lat - 42.33) / 8.76) * 738,
  }
}

/** Rough geographic centre of mainland France (used to nudge pieces inland). */
export const FRANCE_CENTRE = lonLatToModel(2.4, 46.6)

// ─── Types ────────────────────────────────────────────────────

/** Props that exist as nodes in the GLB. */
export type HexPropKind =
  | "house1" | "house2" | "house3"
  | "oak" | "spruce" | "birch" | "poplar" | "palm" | "willow" | "linden" | "maple"
  | "rocks" | "factory" | "residence" | "bridge" | "market"
  | "keep" | "windmill" | "watchtower" | "tavern" | "lumberhut" | "cave"

/** Everything that can be placed: GLB props + procedural pieces. */
export type HexPieceKind = HexPropKind | "hq" | "ship"

export type HexCategory = "base" | "house" | "tree" | "factory" | "residence" | "ship" | "landmark"

export type ShipRoute = "channel" | "atlantic" | "mediterranean"

export interface HexPiece {
  /** Stable id, e.g. "house-3", "tree-17", "lm-windmill". */
  id:         string
  kind:       HexPieceKind
  category:   HexCategory
  /** Display name, e.g. "Cottage in Lyon". */
  name:       string
  /** Why it exists, e.g. "Unlocked by 150 lifetime activities". */
  unlockedBy: string
  /** Model-space position (ground height is resolved by the 3D layer). */
  x:          number
  z:          number
  /** Yaw in radians. */
  rotation:   number
  scale:      number
  /** Ships only: which loop they sail and where on it they start. */
  ship?:      { route: ShipRoute; phase: number; phoneDeal: boolean }
}

export interface HexBuild {
  id:          string
  category:    HexCategory
  name:        string
  /** e.g. "Lifetime activities" */
  requirement: string
  current:     number
  target:      number
  /** 0..1 progress toward this build (within the current step for repeating builds). */
  progress:    number
}

export type HexCountKey = "houses" | "trees" | "factories" | "residences" | "ships" | "landmarks"

export interface HexCount {
  key:   HexCountKey
  label: string
  built: number
  cap:   number
}

export interface HexagoneLayout {
  pieces: HexPiece[]
  counts: HexCount[]
  /** Next builds, closest to completion first (max 4). Secret builds are never listed. */
  yard:   HexBuild[]
  /** Pieces built by the profile (excludes the always-present base pieces). */
  builtCount: number
  /** Total possible pieces (excludes base pieces). */
  totalCount: number
}

/** Only the parts of a GameProfile the rules depend on. */
export type HexagoneInput = Pick<GameProfile, "lifetime" | "arenaIndex"> & Partial<Pick<GameProfile, "trophies">>

// ─── Rules (tune here) ────────────────────────────────────────

export const HEX_RULES = {
  activitiesPerHouse: 50,
  houseCap:           24,
  activeDaysPerTree:  2,
  treeCap:            80,
  factoryCap:         10,   // 1 per secured deal
  shipCap:            8,    // 1 per secured deal
  visitsPerResidence: 5,
  residenceCap:       6,
} as const

// ─── Deterministic randomness ─────────────────────────────────

/** Integer-hash -> [0, 1). Pure and stable across platforms. */
export function hash01(seed: number): number {
  let t = (Math.imul(seed | 0, 0x9e3779b1) + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const TAU = Math.PI * 2

// ─── Places ───────────────────────────────────────────────────

interface Place { name: string; lon: number; lat: number }

/** Village order: one house per city, in this order. */
const VILLAGES: Place[] = [
  { name: "Paris",            lon: 2.3522,  lat: 48.8566 },
  { name: "Lyon",             lon: 4.8357,  lat: 45.7640 },
  { name: "Lille",            lon: 3.0573,  lat: 50.6292 },
  { name: "Nantes",           lon: -1.5536, lat: 47.2184 },
  { name: "Bordeaux",         lon: -0.5792, lat: 44.8378 },
  { name: "Toulouse",         lon: 1.4442,  lat: 43.6047 },
  { name: "Strasbourg",       lon: 7.7521,  lat: 48.5734 },
  { name: "Rouen",            lon: 1.0993,  lat: 49.4432 },
  { name: "Reims",            lon: 4.0317,  lat: 49.2583 },
  { name: "Dijon",            lon: 5.0415,  lat: 47.3220 },
  { name: "Orleans",          lon: 1.9093,  lat: 47.9030 },
  { name: "Tours",            lon: 0.6848,  lat: 47.3941 },
  { name: "Rennes",           lon: -1.6778, lat: 48.1173 },
  { name: "Limoges",          lon: 1.2611,  lat: 45.8336 },
  { name: "Clermont-Ferrand", lon: 3.0870,  lat: 45.7772 },
  { name: "Grenoble",         lon: 5.7245,  lat: 45.1885 },
  { name: "Montpellier",      lon: 3.8767,  lat: 43.6108 },
  { name: "Nancy",            lon: 6.1844,  lat: 48.6921 },
  { name: "Metz",             lon: 6.1757,  lat: 49.1193 },
  { name: "Caen",             lon: -0.3707, lat: 49.1829 },
  { name: "Amiens",           lon: 2.2957,  lat: 49.8941 },
  { name: "Poitiers",         lon: 0.3404,  lat: 46.5802 },
  { name: "Besancon",         lon: 6.0241,  lat: 47.2378 },
  { name: "Le Mans",          lon: 0.1996,  lat: 48.0061 },
]

const HOUSE_STYLES: { kind: "house1" | "house2" | "house3"; label: string }[] = [
  { kind: "house1", label: "Timber house" },
  { kind: "house2", label: "Cottage" },
  { kind: "house3", label: "Long house" },
]

/** Port order for industry: one factory per secured deal. */
const PORTS: Place[] = [
  { name: "Le Havre",       lon: 0.18,    lat: 49.48 },
  { name: "Marseille-Fos",  lon: 4.94,    lat: 43.46 },
  { name: "Dunkirk",        lon: 2.38,    lat: 51.00 },
  { name: "Saint-Nazaire",  lon: -2.18,   lat: 47.29 },
  { name: "Bordeaux",       lon: -0.55,   lat: 44.88 },
  { name: "La Rochelle",    lon: -1.12,   lat: 46.18 },
  { name: "Rouen",          lon: 1.04,    lat: 49.43 },
  { name: "Sete",           lon: 3.67,    lat: 43.42 },
  { name: "Calais",         lon: 1.88,    lat: 50.93 },
  { name: "Brest",          lon: -4.44,   lat: 48.40 },
]

/** Residence blocks alternate between Paris and Lyon suburbs. */
const RESIDENCE_SITES: Place[] = [
  { name: "La Defense, Paris",       lon: 2.17, lat: 48.89 },
  { name: "Villeurbanne, Lyon",      lon: 4.95, lat: 45.79 },
  { name: "Saint-Denis, Paris",      lon: 2.40, lat: 48.97 },
  { name: "Venissieux, Lyon",        lon: 4.84, lat: 45.66 },
  { name: "Ivry-sur-Seine, Paris",   lon: 2.45, lat: 48.78 },
  { name: "Ecully, Lyon",            lon: 4.72, lat: 45.80 },
]

type TreeKind = "oak" | "spruce" | "birch" | "poplar" | "palm" | "willow" | "linden" | "maple"

interface Forest {
  name:  string
  kinds: TreeKind[]
  /** Either a centre + radius (model units) ... */
  lon?:  number
  lat?:  number
  r?:    number
  /** ... or a river polyline the trees line up along. */
  path?: [number, number][]
}

/** Regional forests. Trees are dealt round-robin so the map greens evenly. */
const FORESTS: Forest[] = [
  { name: "the Alps",           kinds: ["spruce"],                    lon: 6.45,  lat: 45.20, r: 26 },
  { name: "the Landes",         kinds: ["poplar", "birch"],           lon: -0.80, lat: 44.20, r: 26 },
  { name: "the Loire valley",   kinds: ["willow"],                    path: [[1.91, 47.86], [1.34, 47.56], [0.69, 47.36], [-0.08, 47.24], [-0.60, 47.36]] },
  { name: "the Vosges",         kinds: ["spruce"],                    lon: 6.95,  lat: 48.10, r: 19 },
  { name: "the Riviera",        kinds: ["palm"],                      lon: 6.80,  lat: 43.68, r: 14 },
  { name: "the Morvan",         kinds: ["oak", "linden"],             lon: 4.05,  lat: 47.15, r: 20 },
  { name: "Normandy",           kinds: ["oak", "maple", "linden"],    lon: -0.70, lat: 48.80, r: 22 },
  { name: "the Jura",           kinds: ["spruce"],                    lon: 5.95,  lat: 46.60, r: 19 },
  { name: "the Perigord",       kinds: ["oak", "maple"],              lon: 0.90,  lat: 45.05, r: 22 },
  { name: "the Ardennes",       kinds: ["oak", "birch"],              lon: 4.62,  lat: 49.68, r: 15 },
  { name: "Brittany",           kinds: ["oak", "maple"],              lon: -3.00, lat: 48.20, r: 20 },
  { name: "Fontainebleau",      kinds: ["oak", "birch"],              lon: 2.65,  lat: 48.40, r: 15 },
  { name: "the Massif Central", kinds: ["birch", "linden"],           lon: 2.55,  lat: 45.35, r: 17 },
]

const TREE_LABEL: Record<TreeKind, string> = {
  oak: "Oak", spruce: "Spruce", birch: "Birch", poplar: "Poplar",
  palm: "Palm", willow: "Willow", linden: "Linden", maple: "Maple",
}

const HQ: Place = { name: "Lille", lon: 3.0573, lat: 50.6292 }

const ROCKS: Place[] = [
  { name: "Chaine des Puys", lon: 2.90, lat: 45.72 },
  { name: "Monts du Cantal", lon: 2.75, lat: 45.10 },
  { name: "Aubrac",          lon: 3.05, lat: 44.68 },
]

// ─── Landmarks ────────────────────────────────────────────────

interface LandmarkDef {
  id:          string
  kind:        HexPropKind
  name:        string
  place:       Place
  rotation:    number
  scale:       number
  requirement: string
  unlockedBy:  string
  secret?:     boolean
  metric:      (p: HexagoneInput) => number
  target:      number
}

function trophyEarned(p: HexagoneInput, id: string, fallback: number, target: number): number {
  const t = p.trophies?.find((x) => x.id === id)
  if (t) return t.earned ? target : Math.min(t.current, target - 1)
  return fallback
}

export const LANDMARKS: LandmarkDef[] = [
  {
    id: "lm-windmill", kind: "windmill", name: "Flanders windmill",
    place: { name: "near Lille", lon: 2.78, lat: 50.50 }, rotation: 0.6, scale: 1.6,
    requirement: "Best streak (Iron Chain trophy)", unlockedBy: "Unlocked by the Iron Chain trophy: a 7-day streak",
    metric: (p) => trophyEarned(p, "t_streak7", p.lifetime.bestStreak, 7), target: 7,
  },
  {
    id: "lm-keep", kind: "keep", name: "La Rochelle keep",
    place: { name: "La Rochelle", lon: -1.05, lat: 46.20 }, rotation: 2.2, scale: 1.8,
    requirement: "Arena reached (Spice Route is III)", unlockedBy: "Unlocked by reaching Arena III, the Spice Route",
    metric: (p) => p.arenaIndex + 1, target: 3,
  },
  {
    id: "lm-watchtower", kind: "watchtower", name: "Mont Blanc watchtower",
    place: { name: "near Mont Blanc", lon: 6.62, lat: 45.84 }, rotation: 1.1, scale: 1.8,
    requirement: "Best streak (working days)", unlockedBy: "Unlocked by a 21-day best streak",
    metric: (p) => p.lifetime.bestStreak, target: 21,
  },
  {
    id: "lm-tavern", kind: "tavern", name: "Lille tavern",
    place: { name: "Lille", lon: 2.97, lat: 50.57 }, rotation: 3.6, scale: 1.25,
    requirement: "Daily quests completed", unlockedBy: "Unlocked by completing 25 daily quests",
    metric: (p) => p.lifetime.questsDone, target: 25,
  },
  {
    id: "lm-market", kind: "market", name: "Paris market",
    place: { name: "Paris", lon: 2.30, lat: 48.80 }, rotation: 0.3, scale: 2.4,
    requirement: "Weekly quests completed", unlockedBy: "Unlocked by completing 5 weekly quests",
    metric: (p) => p.lifetime.weekliesDone, target: 5,
  },
  {
    id: "lm-lumberhut", kind: "lumberhut", name: "Landes lumber hut",
    place: { name: "the Landes", lon: -0.55, lat: 44.02 }, rotation: 1.9, scale: 1.5,
    requirement: "Lifetime calls", unlockedBy: "Unlocked by making 500 calls",
    metric: (p) => p.lifetime.calls, target: 500,
  },
  {
    id: "lm-cave", kind: "cave", name: "Pyrenean cave",
    place: { name: "the Pyrenees", lon: 0.62, lat: 42.92 }, rotation: 3.3, scale: 1.8,
    requirement: "A secret", unlockedBy: "Unlocked by the secret Sunday Sailor trophy",
    secret: true,
    metric: (p) => trophyEarned(p, "t_sunday", p.lifetime.sundayDays, 1), target: 1,
  },
  {
    id: "lm-bridge-tours", kind: "bridge", name: "Loire bridge at Tours",
    // Sits on the old river crossing baked into the terrain, aligned with it.
    place: { name: "Tours", lon: 1.097, lat: 47.149 }, rotation: -0.59, scale: 5.2,
    requirement: "Field visits", unlockedBy: "Unlocked by 10 field visits",
    metric: (p) => p.lifetime.fieldVisits, target: 10,
  },
  {
    id: "lm-bridge-lyon", kind: "bridge", name: "Rhone bridge at Lyon",
    // Spans the open river channel on the west side of Lyon (the river runs north-south there).
    place: { name: "Lyon", lon: 4.418, lat: 45.744 }, rotation: 0, scale: 5.2,
    requirement: "Field visits", unlockedBy: "Unlocked by 25 field visits",
    metric: (p) => p.lifetime.fieldVisits, target: 25,
  },
]

// ─── Ship routes (offshore loops, lon/lat) ───────────────────

export const SHIP_ROUTES: Record<ShipRoute, { name: string; points: [number, number][] }> = {
  channel: {
    name: "the Channel",
    points: [[-5.6, 49.0], [-3.6, 49.25], [-1.6, 49.92], [0.4, 50.15], [1.15, 50.55], [0.6, 50.62], [-1.2, 50.25], [-3.4, 49.6], [-5.1, 49.4]],
  },
  atlantic: {
    name: "the Bay of Biscay",
    points: [[-5.4, 47.9], [-3.6, 47.15], [-2.7, 46.4], [-1.95, 45.6], [-1.75, 44.4], [-2.3, 43.75], [-3.4, 44.3], [-4.0, 45.6], [-4.9, 46.9]],
  },
  mediterranean: {
    name: "the Mediterranean",
    points: [[3.35, 43.0], [4.3, 43.15], [5.35, 43.0], [6.4, 42.85], [7.5, 43.3], [7.2, 42.75], [5.8, 42.5], [4.3, 42.55], [3.5, 42.7]],
  },
}

const ROUTE_ORDER: ShipRoute[] = ["channel", "mediterranean", "atlantic"]

// ─── HexSlot geometry (computed once for the fully built map) ───

/** Footprint radius at scale 1 (model units), used to keep pieces apart. */
const FOOTPRINT: Record<HexPieceKind, number> = {
  house1: 4.6, house2: 4.6, house3: 5.6,
  oak: 4.5, spruce: 3.2, birch: 3, poplar: 2.6, palm: 3.6, willow: 4.2, linden: 3.6, maple: 3.4,
  rocks: 6.5, factory: 9.5, residence: 12.5, bridge: 3, market: 12,
  keep: 10, windmill: 8.5, watchtower: 11, tavern: 10, lumberhut: 13, cave: 9.5,
  hq: 3, ship: 0,
}

export const HEX_SCALE = {
  house:     2.4,
  tree:      2.0,
  factory:   2.0,
  residence: 1.55,
  rocks:     2.0,
} as const

export interface HexSlot {
  id:       string
  kind:     HexPieceKind
  x:        number
  z:        number
  rotation: number
  scale:    number
  place:    string
}

function footprint(s: { kind: HexPieceKind; scale: number }): number {
  return FOOTPRINT[s.kind] * s.scale
}

/** Push a slot away from already-placed slots along a seeded spiral. */
function settle(slot: HexSlot, placed: HexSlot[], seed: number, margin = 1): HexSlot {
  const r = footprint(slot)
  const clear = (x: number, z: number) =>
    placed.every((o) => Math.hypot(o.x - x, o.z - z) >= r + footprint(o) + margin)
  if (clear(slot.x, slot.z)) return slot
  const a0 = hash01(seed) * TAU
  for (let k = 1; k <= 80; k++) {
    const a = a0 + k * 2.399963   // golden angle
    const d = 1.5 * Math.sqrt(k) * Math.max(2, r * 0.6)
    const x = slot.x + Math.cos(a) * d
    const z = slot.z + Math.sin(a) * d
    if (clear(x, z)) return { ...slot, x, z }
  }
  return slot
}

interface SlotTable {
  hq:         HexSlot
  rocks:      HexSlot[]
  landmarks:  Map<string, HexSlot>
  factories:  HexSlot[]
  residences: HexSlot[]
  houses:     HexSlot[]
  trees:      (HexSlot & { forest: string })[]
}

let slotCache: SlotTable | null = null

function forestPoint(f: Forest, k: number, seed: number): { x: number; z: number } {
  if (f.path) {
    // Spread along the river polyline, alternating banks.
    const segs = f.path.length - 1
    const t = (hash01(seed) * 0.6 + (k * 0.618034) % 1) % 1
    const fi = t * segs
    const i = Math.min(segs - 1, Math.floor(fi))
    const u = fi - i
    const a = lonLatToModel(f.path[i][0], f.path[i][1])
    const b = lonLatToModel(f.path[i + 1][0], f.path[i + 1][1])
    const dx = b.x - a.x, dz = b.z - a.z
    const len = Math.hypot(dx, dz) || 1
    const side = k % 2 === 0 ? 1 : -1
    const off = side * (5 + hash01(seed + 7) * 7)
    return { x: a.x + dx * u + (-dz / len) * off, z: a.z + dz * u + (dx / len) * off }
  }
  const c = lonLatToModel(f.lon ?? 0, f.lat ?? 0)
  const ang = hash01(seed) * TAU
  const rad = (f.r ?? 10) * Math.sqrt(0.08 + hash01(seed + 3) * 0.92)
  return { x: c.x + Math.cos(ang) * rad, z: c.z + Math.sin(ang) * rad }
}

function buildSlots(): SlotTable {
  if (slotCache) return slotCache
  const placed: HexSlot[] = []
  const add = (s: HexSlot, seed: number, margin?: number) => {
    const settled = settle(s, placed, seed, margin)
    placed.push(settled)
    return settled
  }

  const hqPos = lonLatToModel(HQ.lon, HQ.lat)
  const hq = add({ id: "hq", kind: "hq", ...hqPos, rotation: 0, scale: 1, place: HQ.name }, 1)

  const rocks = ROCKS.map((p, i) =>
    add({ id: `rocks-${i}`, kind: "rocks", ...lonLatToModel(p.lon, p.lat), rotation: hash01(900 + i) * TAU, scale: HEX_SCALE.rocks, place: p.name }, 900 + i),
  )

  const landmarks = new Map<string, HexSlot>()
  LANDMARKS.forEach((l, i) => {
    landmarks.set(l.id, add({
      id: l.id, kind: l.kind, ...lonLatToModel(l.place.lon, l.place.lat),
      rotation: l.rotation, scale: l.scale, place: l.place.name,
    }, 1000 + i, l.kind === "bridge" ? 0.5 : 1.5))
  })

  const factories = PORTS.map((p, i) =>
    add({ id: `factory-${i}`, kind: "factory", ...lonLatToModel(p.lon, p.lat), rotation: hash01(2000 + i) * TAU, scale: HEX_SCALE.factory, place: p.name }, 2000 + i),
  )

  const residences = RESIDENCE_SITES.map((p, i) =>
    add({ id: `residence-${i}`, kind: "residence", ...lonLatToModel(p.lon, p.lat), rotation: hash01(3000 + i) * TAU, scale: HEX_SCALE.residence, place: p.name }, 3000 + i),
  )

  const houses = VILLAGES.slice(0, HEX_RULES.houseCap).map((p, i) => {
    const style = HOUSE_STYLES[i % HOUSE_STYLES.length]
    return add({ id: `house-${i}`, kind: style.kind, ...lonLatToModel(p.lon, p.lat), rotation: hash01(4000 + i) * TAU, scale: HEX_SCALE.house, place: p.name }, 4000 + i)
  })

  const trees: (HexSlot & { forest: string })[] = []
  for (let i = 0; i < HEX_RULES.treeCap; i++) {
    const f = FORESTS[i % FORESTS.length]
    const k = Math.floor(i / FORESTS.length)
    const seed = 5000 + i * 13
    const kind = f.kinds[(k + i) % f.kinds.length]
    const pos = forestPoint(f, k, seed)
    const s = add({ id: `tree-${i}`, kind, ...pos, rotation: hash01(seed + 11) * TAU, scale: HEX_SCALE.tree * (0.85 + hash01(seed + 17) * 0.3), place: f.name }, seed, 0.2)
    trees.push({ ...s, forest: f.name })
  }

  slotCache = { hq, rocks, landmarks, factories, residences, houses, trees }
  return slotCache
}

// ─── Public API ───────────────────────────────────────────────

function pluralise(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`
}

function nth(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

/** How many of each repeating category a profile has earned. */
export function hexagoneTallies(life: LifetimeStats) {
  return {
    houses:     Math.min(HEX_RULES.houseCap, Math.floor(life.activities / HEX_RULES.activitiesPerHouse)),
    trees:      Math.min(HEX_RULES.treeCap, Math.floor(life.activeDays / HEX_RULES.activeDaysPerTree)),
    factories:  Math.min(HEX_RULES.factoryCap, life.secured),
    ships:      Math.min(HEX_RULES.shipCap, life.secured),
    residences: Math.min(HEX_RULES.residenceCap, Math.floor(life.fieldVisits / HEX_RULES.visitsPerResidence)),
  }
}

/** Build the full Hexagone layout for a profile. Pure and deterministic. */
export function buildHexagone(p: HexagoneInput): HexagoneLayout {
  const slots = buildSlots()
  const life = p.lifetime
  const t = hexagoneTallies(life)
  const pieces: HexPiece[] = []

  // ── Always: HQ + Massif Central rocks ──
  pieces.push({
    id: "hq", kind: "hq", category: "base", name: "MP Cargo France HQ",
    unlockedBy: "Home port in Lille. Every voyage starts here.",
    x: slots.hq.x, z: slots.hq.z, rotation: 0, scale: 1,
  })
  slots.rocks.forEach((s) => {
    pieces.push({
      id: s.id, kind: "rocks", category: "base", name: `Rocks of ${s.place}`,
      unlockedBy: "Part of the land. The Massif Central was here first.",
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  })

  // ── Villages ──
  for (let i = 0; i < t.houses; i++) {
    const s = slots.houses[i]
    const style = HOUSE_STYLES[i % HOUSE_STYLES.length]
    pieces.push({
      id: s.id, kind: s.kind, category: "house", name: `${style.label} in ${s.place}`,
      unlockedBy: `Unlocked by ${pluralise((i + 1) * HEX_RULES.activitiesPerHouse, "lifetime activity", "lifetime activities")}`,
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  }

  // ── Forests ──
  for (let i = 0; i < t.trees; i++) {
    const s = slots.trees[i]
    const kind = s.kind as TreeKind
    pieces.push({
      id: s.id, kind, category: "tree", name: `${TREE_LABEL[kind]} in ${s.forest}`,
      unlockedBy: `Unlocked by ${pluralise((i + 1) * HEX_RULES.activeDaysPerTree, "active day")}`,
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  }

  // ── Port industry ──
  for (let i = 0; i < t.factories; i++) {
    const s = slots.factories[i]
    pieces.push({
      id: s.id, kind: "factory", category: "factory", name: `Port works at ${s.place}`,
      unlockedBy: `Unlocked by your ${nth(i + 1)} secured deal`,
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  }

  // ── Residence blocks ──
  for (let i = 0; i < t.residences; i++) {
    const s = slots.residences[i]
    pieces.push({
      id: s.id, kind: "residence", category: "residence", name: `Residence block, ${s.place}`,
      unlockedBy: `Unlocked by ${pluralise((i + 1) * HEX_RULES.visitsPerResidence, "field visit")}`,
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  }

  // ── Ships ──
  const perRoute = Math.ceil(HEX_RULES.shipCap / ROUTE_ORDER.length)
  for (let i = 0; i < t.ships; i++) {
    const route = ROUTE_ORDER[i % ROUTE_ORDER.length]
    const k = Math.floor(i / ROUTE_ORDER.length)
    const phoneDeal = i < life.callSecured
    const start = lonLatToModel(...SHIP_ROUTES[route].points[0])
    pieces.push({
      id: `ship-${i}`, kind: "ship", category: "ship",
      name: `${phoneDeal ? "Phone-closed freighter" : "Container ship"} in ${SHIP_ROUTES[route].name}`,
      unlockedBy: `Launched by your ${nth(i + 1)} secured deal${phoneDeal ? ", closed over the phone" : ""}`,
      x: start.x, z: start.z, rotation: 0, scale: 1,
      ship: { route, phase: (k / perRoute + hash01(6000 + i) * 0.08) % 1, phoneDeal },
    })
  }

  // ── Landmarks ──
  let landmarksBuilt = 0
  for (const l of LANDMARKS) {
    if (l.metric(p) < l.target) continue
    landmarksBuilt++
    const s = slots.landmarks.get(l.id)!
    pieces.push({
      id: l.id, kind: l.kind, category: "landmark", name: l.name,
      unlockedBy: l.unlockedBy,
      x: s.x, z: s.z, rotation: s.rotation, scale: s.scale,
    })
  }

  const counts: HexCount[] = [
    { key: "houses",     label: "Houses",     built: t.houses,     cap: HEX_RULES.houseCap },
    { key: "trees",      label: "Trees",      built: t.trees,      cap: HEX_RULES.treeCap },
    { key: "factories",  label: "Factories",  built: t.factories,  cap: HEX_RULES.factoryCap },
    { key: "residences", label: "Residences", built: t.residences, cap: HEX_RULES.residenceCap },
    { key: "ships",      label: "Ships",      built: t.ships,      cap: HEX_RULES.shipCap },
    { key: "landmarks",  label: "Landmarks",  built: landmarksBuilt, cap: LANDMARKS.length },
  ]

  const builtCount = counts.reduce((s, c) => s + c.built, 0)
  const totalCount = counts.reduce((s, c) => s + c.cap, 0)

  return { pieces, counts, yard: constructionYard(p, t), builtCount, totalCount }
}

/** Next builds, closest to completion first. */
function constructionYard(p: HexagoneInput, t: ReturnType<typeof hexagoneTallies>): HexBuild[] {
  const life = p.lifetime
  const slots = buildSlots()
  const out: { build: HexBuild; priority: number }[] = []

  const stepBuild = (
    id: string, category: HexCategory, name: string, requirement: string,
    current: number, built: number, step: number, priority: number,
  ) => {
    const target = (built + 1) * step
    const floor = built * step
    out.push({ build: { id, category, name, requirement, current, target, progress: Math.max(0, Math.min(1, (current - floor) / step)) }, priority })
  }

  if (t.houses < HEX_RULES.houseCap) {
    const s = slots.houses[t.houses]
    stepBuild(s.id, "house", `${HOUSE_STYLES[t.houses % HOUSE_STYLES.length].label} in ${s.place}`, "Lifetime activities",
      life.activities, t.houses, HEX_RULES.activitiesPerHouse, 1)
  }
  if (t.trees < HEX_RULES.treeCap) {
    const s = slots.trees[t.trees]
    stepBuild(s.id, "tree", `${TREE_LABEL[s.kind as TreeKind]} in ${s.forest}`, "Active days",
      life.activeDays, t.trees, HEX_RULES.activeDaysPerTree, 3)
  }
  if (t.factories < HEX_RULES.factoryCap || t.ships < HEX_RULES.shipCap) {
    const parts: string[] = []
    if (t.factories < HEX_RULES.factoryCap) parts.push(`Port works at ${slots.factories[t.factories].place}`)
    if (t.ships < HEX_RULES.shipCap) parts.push(parts.length ? "a container ship" : "Container ship")
    stepBuild(t.factories < HEX_RULES.factoryCap ? slots.factories[t.factories].id : `ship-${t.ships}`,
      t.factories < HEX_RULES.factoryCap ? "factory" : "ship", parts.join(" + "), "Secured deals",
      life.secured, Math.min(t.factories, t.ships), 1, 0)
  }
  if (t.residences < HEX_RULES.residenceCap) {
    const s = slots.residences[t.residences]
    stepBuild(s.id, "residence", `Residence block, ${s.place}`, "Field visits",
      life.fieldVisits, t.residences, HEX_RULES.visitsPerResidence, 2)
  }

  LANDMARKS.forEach((l, i) => {
    if (l.secret) return
    const current = l.metric(p)
    if (current >= l.target) return
    out.push({
      build: {
        id: l.id, category: "landmark", name: l.name, requirement: l.requirement,
        current: Math.max(0, current), target: l.target,
        progress: Math.max(0, Math.min(1, current / l.target)),
      },
      priority: 10 + i,
    })
  })

  return out
    .sort((a, b) => b.build.progress - a.build.progress || a.priority - b.priority)
    .slice(0, 4)
    .map((o) => o.build)
}

/** Every slot a fully built map could contain, in placement-priority order. */
export function allHexagoneSlots(): readonly HexSlot[] {
  const s = buildSlots()
  return [s.hq, ...s.rocks, ...s.landmarks.values(), ...s.factories, ...s.residences, ...s.houses, ...s.trees]
}

// ─── Ground fitting (pure; the 3D layer supplies the terrain) ─

export interface GroundFit {
  x: number
  y: number
  z: number
  /** Height difference across the footprint after fitting. */
  spread: number
}

const TREE_KINDS = new Set<HexPieceKind>(["oak", "spruce", "birch", "poplar", "palm", "willow", "linden", "maple"])

/**
 * Snap every slot onto the terrain: pieces that land in the sea are walked
 * inland, then each settles on the flattest nearby spot that does not crowd
 * an earlier piece. Depends only on the terrain, never on the profile, so a
 * fitted position is stable for the life of the asset.
 */
export function fitHexagoneSlots(heightAt: (x: number, z: number) => number | null): Map<string, GroundFit> {
  const out = new Map<string, GroundFit>()
  const done: { x: number; z: number; r: number }[] = []

  for (const s of allHexagoneSlots()) {
    const r = footprint(s)
    const isTree = TREE_KINDS.has(s.kind)
    const isBridge = s.kind === "bridge"
    const sampleR = isTree ? Math.max(1, r * 0.35) : Math.max(1.5, r * 0.8)
    const offsets: [number, number][] = isTree
      ? [[0, 0], [sampleR, 0], [-sampleR, 0], [0, sampleR], [0, -sampleR]]
      : [[0, 0], [sampleR, 0], [-sampleR, 0], [0, sampleR], [0, -sampleR],
         [sampleR * 0.7, sampleR * 0.7], [-sampleR * 0.7, sampleR * 0.7], [sampleR * 0.7, -sampleR * 0.7], [-sampleR * 0.7, -sampleR * 0.7]]

    const probe = (x: number, z: number) => {
      let min = Infinity, max = -Infinity, centre = 0
      for (let i = 0; i < offsets.length; i++) {
        const h = heightAt(x + offsets[i][0], z + offsets[i][1])
        if (h == null) return null
        if (i === 0) centre = h
        if (h < min) min = h
        if (h > max) max = h
      }
      return { min, max, centre }
    }

    // 1) Walk inland (toward the centre of France) until the footprint is on land.
    let bx = s.x, bz = s.z
    if (!probe(bx, bz)) {
      const dx = FRANCE_CENTRE.x - bx, dz = FRANCE_CENTRE.z - bz
      const len = Math.hypot(dx, dz) || 1
      for (let k = 1; k <= 120; k++) {
        const x = s.x + (dx / len) * k * 1.25
        const z = s.z + (dz / len) * k * 1.25
        if (probe(x, z)) { bx = x; bz = z; break }
      }
    }

    // 2) Flattest uncrowded spot nearby.
    const searchR = isBridge ? 0 : isTree ? 5 : Math.max(8, r * 1.1)
    let best: { x: number; z: number; score: number; p: { min: number; max: number; centre: number } } | null = null
    for (let k = 0; k <= (searchR > 0 ? 36 : 0); k++) {
      const a = k * 2.399963 + hash01(s.x * 13 + s.z) * TAU
      const d = k === 0 ? 0 : searchR * Math.sqrt(k / 36)
      const x = bx + Math.cos(a) * d
      const z = bz + Math.sin(a) * d
      const p = probe(x, z)
      if (!p) continue
      let crowd = 0
      for (const o of done) {
        const gap = r + o.r + (isTree ? 0.3 : 1) - Math.hypot(o.x - x, o.z - z)
        if (gap > 0) crowd += gap
      }
      // Bridges want the valley floor (the river); everything else wants flat ground.
      const shape = isBridge ? p.centre * 0.5 : (p.max - p.min) * (isTree ? 0.6 : 1.4)
      const score = shape + crowd * 3 + Math.hypot(x - s.x, z - s.z) * (isBridge ? 0.4 : 0.12)
      if (!best || score < best.score) best = { x, z, score, p }
    }

    if (!best) {
      // Nowhere on land nearby: leave it at its slot at sea level (should not happen).
      out.set(s.id, { x: s.x, y: 0, z: s.z, spread: 0 })
      continue
    }
    const spread = best.p.max - best.p.min
    // Sit slightly into the slope: the uphill edge sinks a little, the downhill
    // edge never floats by more than half the spread.
    const y = isTree || isBridge
      ? best.p.min - 0.2
      : Math.min(best.p.centre, (best.p.min + best.p.centre) / 2 + 0.1) - 0.15
    out.set(s.id, { x: best.x, y, z: best.z, spread })
    done.push({ x: best.x, z: best.z, r })
  }
  return out
}
