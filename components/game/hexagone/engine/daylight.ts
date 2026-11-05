// ============================================================
// Hexagone lighting by the real clock in Asia/Kolkata.
// Keyframed sun / sky / sea colours, blended continuously.
// ============================================================

import * as THREE from "three"

export type DayPhase = "dawn" | "day" | "golden" | "night"

export interface DaylightState {
  hour:          number        // 0..24 IST
  phase:         DayPhase
  label:         string        // "Golden hour"
  sunColor:      THREE.Color
  sunIntensity:  number
  sunDir:        THREE.Vector3 // unit vector pointing FROM the scene TO the light
  hemiSky:       THREE.Color
  hemiGround:    THREE.Color
  hemiIntensity: number
  skyTop:        THREE.Color
  skyHorizon:    THREE.Color
  sea:           THREE.Color
  /** 0 = full day, 1 = deep night (drives window glow, stars, ship lights) */
  night:         number
  exposure:      number
}

interface Key {
  h: number
  sun: string; sunI: number
  sky: string; ground: string; hemiI: number
  top: string; horizon: string
  sea: string
  night: number
  exposure: number
}

// Hours are IST. Sunrise ~06:15, sunset ~18:00 (Kolkata-ish, all year).
const KEYS: Key[] = [
  { h: 0,     sun: "#9fb4ff", sunI: 0.75, sky: "#4a62a0", ground: "#1a2035", hemiI: 0.95, top: "#050a1a", horizon: "#182748", sea: "#12355e", night: 1,    exposure: 1.15 },
  { h: 4.8,   sun: "#9fb4ff", sunI: 0.75, sky: "#4a62a0", ground: "#1a2035", hemiI: 0.95, top: "#060c1e", horizon: "#1d2d50", sea: "#13385f", night: 1,    exposure: 1.15 },
  { h: 5.9,   sun: "#ffb48a", sunI: 1.6,  sky: "#e2b3c2", ground: "#4a3c4c", hemiI: 1.0,  top: "#3b4f86", horizon: "#f2a98c", sea: "#2d6a96", night: 0.45, exposure: 1.05 },
  { h: 7.2,   sun: "#ffe2c0", sunI: 2.2,  sky: "#b9d8f2", ground: "#5d5a48", hemiI: 0.95, top: "#5b9bd6", horizon: "#cfe4f2", sea: "#1f8bc4", night: 0,    exposure: 1.0 },
  { h: 15.6,  sun: "#fff4e2", sunI: 2.4,  sky: "#bfe0fa", ground: "#5d5a48", hemiI: 0.95, top: "#4f95d8", horizon: "#d4e9f7", sea: "#1d88c6", night: 0,    exposure: 1.0 },
  { h: 17.0,  sun: "#ffc27a", sunI: 2.6,  sky: "#f6d3b0", ground: "#6a5238", hemiI: 1.05, top: "#5b84c4", horizon: "#f7c48e", sea: "#2f78a6", night: 0.05, exposure: 1.05 },
  { h: 18.1,  sun: "#ff8a5c", sunI: 1.8,  sky: "#d39ab3", ground: "#4a3542", hemiI: 0.95, top: "#3a4a85", horizon: "#f08a6a", sea: "#285f8c", night: 0.45, exposure: 1.08 },
  { h: 19.2,  sun: "#9fb4ff", sunI: 0.8,  sky: "#4a62a0", ground: "#1c2238", hemiI: 0.95, top: "#0a1230", horizon: "#24305a", sea: "#143a62", night: 0.95, exposure: 1.15 },
  { h: 24,    sun: "#9fb4ff", sunI: 0.75, sky: "#4a62a0", ground: "#1a2035", hemiI: 0.95, top: "#050a1a", horizon: "#182748", sea: "#12355e", night: 1,    exposure: 1.15 },
]

const IST_OFFSET_H = 5.5

/** Current hour (fractional) in Asia/Kolkata. */
export function istHour(now: number = Date.now()): number {
  const h = ((now / 3_600_000) + IST_OFFSET_H) % 24
  return h < 0 ? h + 24 : h
}

export function phaseFor(hour: number): DayPhase {
  if (hour >= 5.5 && hour < 7.2) return "dawn"
  if (hour >= 7.2 && hour < 16.6) return "day"
  if (hour >= 16.6 && hour < 18.6) return "golden"
  return "night"
}

export const PHASE_LABEL: Record<DayPhase, string> = {
  dawn: "Dawn", day: "Daylight", golden: "Golden hour", night: "Night",
}

const ca = new THREE.Color()
const cb = new THREE.Color()
function mixHex(a: string, b: string, t: number): THREE.Color {
  ca.set(a); cb.set(b)
  return ca.clone().lerp(cb, t)
}

export function daylightAt(hour: number, tint: { bg: string; accent: string }): DaylightState {
  let i = 0
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++
  const a = KEYS[i], b = KEYS[i + 1]
  const t = Math.max(0, Math.min(1, (hour - a.h) / (b.h - a.h || 1)))
  const s = t * t * (3 - 2 * t)
  const lerp = (x: number, y: number) => x + (y - x) * s

  // Sun path: rises in the east (-X), noon from the south (-Z), sets in the west (+X).
  // At night the moon hangs high in the south-west.
  const night = lerp(a.night, b.night)
  const dayT = Math.max(0, Math.min(1, (hour - 6) / 12.2))
  const az = Math.PI * dayT                         // 0 = east, PI = west
  const elev = Math.max(0.3, Math.sin(Math.PI * dayT) * 1.05)
  const sunDir = new THREE.Vector3(-Math.cos(az) * Math.cos(elev), Math.sin(elev), -Math.sin(az) * Math.cos(elev) - 0.25).normalize()
  const moonDir = new THREE.Vector3(0.45, 0.85, -0.35).normalize()
  const dir = sunDir.lerp(moonDir, Math.min(1, Math.max(0, (night - 0.4) / 0.5))).normalize()

  const sea = mixHex(a.sea, b.sea, s)
  sea.lerp(new THREE.Color(tint.accent), 0.05 * (1 - night))
  sea.lerp(new THREE.Color(tint.bg), 0.25 * night)
  const top = mixHex(a.top, b.top, s).lerp(new THREE.Color(tint.bg), 0.35 * night)

  const phase = phaseFor(hour)
  return {
    hour,
    phase,
    label: PHASE_LABEL[phase],
    sunColor: mixHex(a.sun, b.sun, s),
    sunIntensity: lerp(a.sunI, b.sunI),
    sunDir: dir,
    hemiSky: mixHex(a.sky, b.sky, s),
    hemiGround: mixHex(a.ground, b.ground, s),
    hemiIntensity: lerp(a.hemiI, b.hemiI),
    skyTop: top,
    skyHorizon: mixHex(a.horizon, b.horizon, s),
    sea,
    night,
    exposure: lerp(a.exposure, b.exposure),
  }
}
