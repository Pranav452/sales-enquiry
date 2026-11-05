// ============================================================
// Procedural Hexagone pieces: container ships, the HQ flag and
// small effects (glow sprites, dust puffs).
// ============================================================

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { hash01 } from "@/lib/game/hexagone"

// ─── Shared glow sprite texture ───────────────────────────────

export function makeGlowTexture(): THREE.Texture {
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, "rgba(255,255,255,1)")
    g.addColorStop(0.25, "rgba(255,255,255,0.85)")
    g.addColorStop(0.6, "rgba(255,255,255,0.18)")
    g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Additive glow points (window lights, ship lights, beacons). */
export function makeGlowMaterial(tex: THREE.Texture, size: number): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
}

// ─── Container ships ──────────────────────────────────────────

export interface ShipKit {
  hull:        THREE.BufferGeometry
  band:        THREE.BufferGeometry
  bridge:      THREE.BufferGeometry
  funnel:      THREE.BufferGeometry
  wake:        THREE.BufferGeometry
  hullMat:     THREE.MeshStandardMaterial
  accentHullMat: THREE.MeshStandardMaterial
  bandMat:     THREE.MeshStandardMaterial
  whiteMat:    THREE.MeshStandardMaterial
  funnelMat:   THREE.MeshStandardMaterial
  containerMat: THREE.MeshStandardMaterial
  wakeMat:     THREE.MeshBasicMaterial
  dispose:     () => void
}

/** Hull outline seen from above: stern at -x, pointed bow at +x. */
function hullShape(len: number, beam: number): THREE.Shape {
  const h = len / 2, w = beam / 2
  const s = new THREE.Shape()
  s.moveTo(-h, -w * 0.92)
  s.lineTo(h * 0.55, -w)
  s.lineTo(h * 0.86, -w * 0.62)
  s.lineTo(h, 0)
  s.lineTo(h * 0.86, w * 0.62)
  s.lineTo(h * 0.55, w)
  s.lineTo(-h, w * 0.92)
  s.lineTo(-h, -w * 0.92)
  return s
}

function extrudeUp(shape: THREE.Shape, depth: number, y0: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)    // extrusion (+z) now points up (+y)
  g.translate(0, y0, 0)
  return g
}

export function makeShipKit(): ShipKit {
  const LEN = 18, BEAM = 4.4
  const hull = extrudeUp(hullShape(LEN, BEAM), 1.7, -0.3)
  const band = extrudeUp(hullShape(LEN * 1.01, BEAM * 1.03), 0.55, -0.55)
  const bridge = new THREE.BoxGeometry(2.6, 3.2, BEAM * 0.86)
  bridge.translate(-LEN / 2 + 2.2, 1.4 + 1.6, 0)
  const funnel = new THREE.CylinderGeometry(0.55, 0.7, 1.8, 6)
  funnel.translate(-LEN / 2 + 1.3, 1.4 + 3.2 + 0.7, 0)
  const wake = new THREE.BufferGeometry()
  wake.setAttribute("position", new THREE.Float32BufferAttribute([
    -LEN / 2, 0.05, -BEAM * 0.4,
    -LEN / 2 - 13, 0.05, -BEAM * 1.0,
    -LEN / 2 - 13, 0.05, BEAM * 1.0,
    -LEN / 2, 0.05, BEAM * 0.4,
  ], 3))
  wake.setIndex([0, 2, 1, 0, 3, 2])

  const hullMat = new THREE.MeshStandardMaterial({ color: "#1f2f46", roughness: 0.7, flatShading: true })
  const accentHullMat = new THREE.MeshStandardMaterial({ color: "#2a2414", roughness: 0.6, metalness: 0.2, flatShading: true })
  const bandMat = new THREE.MeshStandardMaterial({ color: "#9b2c2c", roughness: 0.8, flatShading: true })
  const whiteMat = new THREE.MeshStandardMaterial({ color: "#eef2f6", roughness: 0.6, flatShading: true })
  const funnelMat = new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.6, flatShading: true })
  const containerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, flatShading: true })
  const wakeMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })

  const geos = [hull, band, bridge, funnel, wake]
  const mats = [hullMat, accentHullMat, bandMat, whiteMat, funnelMat, containerMat, wakeMat]
  return {
    hull, band, bridge, funnel, wake, hullMat, accentHullMat, bandMat, whiteMat, funnelMat, containerMat, wakeMat,
    dispose: () => { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()) },
  }
}

const CONTAINER_COLOURS = ["#c2410c", "#1d4ed8", "#15803d", "#b45309", "#be123c", "#0e7490", "#6d28d9", "#64748b"]

/** Container stack for one ship, baked into a single vertex-coloured geometry. */
export function makeContainerStack(seed: number, accent: string | null): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const bays = 5, rows = 3
  const c = new THREE.Color()
  for (let b = 0; b < bays; b++) {
    const height = 1 + Math.floor(hash01(seed * 31 + b) * 3)
    for (let r = 0; r < rows; r++) {
      for (let lvl = 0; lvl < height; lvl++) {
        if (lvl > 0 && hash01(seed * 97 + b * 7 + r * 3 + lvl) < 0.2) continue
        const g = new THREE.BoxGeometry(2.3, 1.05, 1.15)
        g.translate(-3.2 + b * 2.45, 1.4 + 0.55 + lvl * 1.1, (r - 1) * 1.22)
        const pick = hash01(seed * 13 + b * 5 + r * 11 + lvl * 17)
        c.set(accent && pick < 0.45 ? accent : CONTAINER_COLOURS[Math.floor(pick * CONTAINER_COLOURS.length)])
        const n = g.getAttribute("position").count
        const cols = new Float32Array(n * 3)
        for (let i = 0; i < n; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b }
        g.setAttribute("color", new THREE.BufferAttribute(cols, 3))
        g.deleteAttribute("normal")
        g.deleteAttribute("uv")
        parts.push(g)
      }
    }
  }
  const merged = mergeGeometries(parts, false) ?? new THREE.BufferGeometry()
  parts.forEach((g) => g.dispose())
  return merged
}

export interface ShipObject {
  group:  THREE.Group
  /** Rocking / heading is applied to this inner group. */
  body:   THREE.Group
  wake:   THREE.Mesh
  owned:  THREE.BufferGeometry[]
}

export function makeShip(kit: ShipKit, seed: number, phoneDeal: boolean, accent: string, glowMat: THREE.PointsMaterial): ShipObject {
  const group = new THREE.Group()
  const body = new THREE.Group()
  group.add(body)

  const hull = new THREE.Mesh(kit.hull, phoneDeal ? kit.accentHullMat : kit.hullMat)
  const band = new THREE.Mesh(kit.band, phoneDeal ? kit.funnelMat : kit.bandMat)
  const bridge = new THREE.Mesh(kit.bridge, kit.whiteMat)
  const funnel = new THREE.Mesh(kit.funnel, phoneDeal ? kit.bandMat : kit.funnelMat)
  const stackGeo = makeContainerStack(seed, phoneDeal ? accent : null)
  const stack = new THREE.Mesh(stackGeo, kit.containerMat)
  for (const m of [hull, bridge, funnel, stack]) m.castShadow = true
  body.add(hull, band, bridge, funnel, stack)

  // Navigation + deck lights (white masthead, red port, green starboard, warm bridge windows).
  const lights = new THREE.BufferGeometry()
  lights.setAttribute("position", new THREE.Float32BufferAttribute([
    -6.8, 6.2, 0,     8.6, 2.2, 0,     -7.6, 3.6, -2.0,  -7.6, 3.6, 2.0,  -6.6, 3.4, 0,
  ], 3))
  lights.setAttribute("color", new THREE.Float32BufferAttribute([
    1, 1, 1,   1, 0.95, 0.85,   1, 0.25, 0.2,   0.25, 1, 0.45,   1, 0.75, 0.4,
  ], 3))
  const glow = new THREE.Points(lights, glowMat)
  glow.renderOrder = 2
  body.add(glow)

  const wake = new THREE.Mesh(kit.wake, kit.wakeMat)
  wake.renderOrder = 1
  group.add(wake)

  return { group, body, wake, owned: [stackGeo, lights] }
}

// ─── HQ: hex plinth, flag pole, waving flag, beacon ──────────

export interface HqObject {
  group:    THREE.Group
  flagMat:  THREE.MeshStandardMaterial
  ring:     THREE.Mesh
  beacon:   THREE.Mesh
  light:    THREE.PointLight
  /** Uniforms shared with the flag shader. */
  uniforms: { uTime: { value: number } }
  dispose:  () => void
}

export function makeHq(accent: string, glow: string): HqObject {
  const group = new THREE.Group()
  const geos: THREE.BufferGeometry[] = []
  const mats: THREE.Material[] = []
  const add = <T extends THREE.BufferGeometry>(g: T) => { geos.push(g); return g }
  const mat = <T extends THREE.Material>(m: T) => { mats.push(m); return m }

  const stone = mat(new THREE.MeshStandardMaterial({ color: "#cdbf9f", roughness: 0.9, flatShading: true }))
  const accentMat = mat(new THREE.MeshStandardMaterial({ color: accent, roughness: 0.6, flatShading: true }))
  const metal = mat(new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: 0.35, metalness: 0.6, flatShading: true }))
  const gold = mat(new THREE.MeshStandardMaterial({ color: "#f5c542", emissive: "#f5c542", emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.7, flatShading: true }))

  // Two stacked hexagonal tiles: the "Hexagone" seal.
  const base = new THREE.Mesh(add(new THREE.CylinderGeometry(6.2, 6.8, 2.2, 6)), stone)
  base.position.y = 1.1
  const top = new THREE.Mesh(add(new THREE.CylinderGeometry(4.4, 4.6, 1.1, 6)), accentMat)
  top.position.y = 2.75
  const pole = new THREE.Mesh(add(new THREE.CylinderGeometry(0.32, 0.42, 26, 8)), metal)
  pole.position.y = 3.3 + 13
  const finial = new THREE.Mesh(add(new THREE.OctahedronGeometry(0.9)), gold)
  finial.position.y = 3.3 + 26.6
  for (const m of [base, top, pole, finial]) m.castShadow = true
  base.receiveShadow = true
  top.receiveShadow = true
  group.add(base, top, pole, finial)

  // Flag: accent field with a light band near the hoist; waves in the vertex shader.
  const W = 10, H = 6
  const flagGeo = add(new THREE.PlaneGeometry(W, H, 12, 6))
  flagGeo.translate(W / 2, 0, 0)
  const pos = flagGeo.getAttribute("position")
  const cols = new Float32Array(pos.count * 3)
  const ca = new THREE.Color(accent), cg = new THREE.Color("#f8fafc")
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const c = x > W * 0.22 && x < W * 0.36 ? cg : ca
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b
  }
  flagGeo.setAttribute("color", new THREE.BufferAttribute(cols, 3))
  flagGeo.deleteAttribute("normal")
  const uniforms = { uTime: { value: 0 } }
  const flagMat = mat(new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.75, side: THREE.DoubleSide, flatShading: true }))
  flagMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float fly = position.x / ${W.toFixed(1)};
        transformed.z += sin(position.x * 0.9 - uTime * 3.2) * 0.75 * fly;
        transformed.y -= fly * fly * 0.6;`,
      )
  }
  flagMat.customProgramCacheKey = () => "hex-flag"
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(0.3, 3.3 + 26 - H / 2 - 0.3, 0)
  flag.castShadow = true
  group.add(flag)

  // Beacon ring on the ground + lantern + night light.
  const ringMat = mat(new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }))
  const ring = new THREE.Mesh(add(new THREE.RingGeometry(7.4, 8.2, 6)), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.4
  group.add(ring)

  const beaconMat = mat(new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.0 }))
  const beacon = new THREE.Mesh(add(new THREE.SphereGeometry(1.4, 8, 6)), beaconMat)
  beacon.position.y = 3.3 + 26.6
  group.add(beacon)

  const light = new THREE.PointLight("#ffd29a", 0, 90, 1.6)
  light.position.y = 14
  group.add(light)

  return {
    group, flagMat, ring, beacon, light, uniforms,
    dispose: () => { geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose()) },
  }
}

// ─── Dust puff (a short-lived burst of points) ────────────────

export interface Puff {
  points: THREE.Points
  start:  number
  dur:    number
  vel:    Float32Array
  base:   Float32Array
}

export function makePuff(at: THREE.Vector3, radius: number, color: string, tex: THREE.Texture, start: number, seed: number): Puff {
  const n = 18
  const base = new Float32Array(n * 3)
  const vel = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const a = hash01(seed * 7 + i) * Math.PI * 2
    const r = radius * (0.4 + hash01(seed * 11 + i) * 0.6)
    base[i * 3] = at.x + Math.cos(a) * r * 0.5
    base[i * 3 + 1] = at.y + 0.4
    base[i * 3 + 2] = at.z + Math.sin(a) * r * 0.5
    vel[i * 3] = Math.cos(a) * r * 1.2
    vel[i * 3 + 1] = 1.5 + hash01(seed * 13 + i) * 3
    vel[i * 3 + 2] = Math.sin(a) * r * 1.2
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3))
  const mat = new THREE.PointsMaterial({
    size: Math.max(3, radius * 0.9), map: tex, color, transparent: true, opacity: 0,
    depthWrite: false, sizeAttenuation: true,
  })
  const points = new THREE.Points(geo, mat)
  points.renderOrder = 3
  points.frustumCulled = false
  return { points, start, dur: 1.5, vel, base }
}

/** Advance a puff; returns false once finished (caller disposes). */
export function stepPuff(p: Puff, now: number): boolean {
  const t = (now - p.start) / p.dur
  const mat = p.points.material as THREE.PointsMaterial
  if (t < 0) { mat.opacity = 0; return true }
  if (t >= 1) return false
  const e = 1 - Math.pow(1 - t, 3)
  const pos = p.points.geometry.getAttribute("position") as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, p.base[i * 3] + p.vel[i * 3] * e, p.base[i * 3 + 1] + p.vel[i * 3 + 1] * e, p.base[i * 3 + 2] + p.vel[i * 3 + 2] * e)
  }
  pos.needsUpdate = true
  mat.opacity = 0.75 * (1 - t) * Math.min(1, t * 6)
  return true
}
