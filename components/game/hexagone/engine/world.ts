// ============================================================
// HexWorld — the three.js side of the Hexagone tab.
// Owns renderer, scene, camera, controls and every GPU resource;
// React only talks to it through this small imperative API.
// ============================================================

import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  SHIP_ROUTES, fitHexagoneSlots, hash01, lonLatToModel,
  type GroundFit, type HexCategory, type HexPiece, type HexPropKind, type ShipRoute,
} from "@/lib/game/hexagone"
import type { ArenaPalette } from "@/lib/game/levels"
import { loadHexAssets, type HexAssets } from "./assets"
import { daylightAt, istHour, type DaylightState } from "./daylight"
import { SEA_LEVEL, makeSea, makeSky, type Sea, type Sky } from "./environment"
import {
  makeGlowMaterial, makeGlowTexture, makeHq, makePuff, makeShip, makeShipKit, stepPuff,
  type HqObject, type Puff, type ShipKit, type ShipObject,
} from "./procedural"

export interface HoverInfo {
  id:         string
  name:       string
  unlockedBy: string
  category:   HexCategory
  /** Pointer position relative to the container (px). */
  x:          number
  y:          number
  /** Container size (px), so the tooltip can stay inside it. */
  width:      number
  height:     number
}

export interface WorldOptions {
  container:     HTMLElement
  palette:       ArenaPalette
  reducedMotion: boolean
  /** Force an IST hour (0..24) instead of the real clock. */
  hourOverride:  number | null
  onProgress:    (fraction: number) => void
  onReady:       () => void
  onError:       (message: string) => void
  onHover:       (info: HoverInfo | null) => void
  onSelect:      (piece: HexPiece | null) => void
  onDaylight?:   (d: DaylightState) => void
}

interface InstanceRef {
  mesh:  THREE.InstancedMesh
  index: number
  part:  THREE.Matrix4
}

interface PieceRuntime {
  piece:  HexPiece
  fit:    GroundFit
  height: number
  refs:   InstanceRef[]
  rise:   { start: number; dur: number } | null
}

interface ShipRuntime {
  piece:  HexPiece
  obj:    ShipObject
  curve:  THREE.CatmullRomCurve3
  length: number
  phase:  number
  seed:   number
  rise:   { start: number; dur: number } | null
}

const BUILDING_KINDS = new Set<HexPropKind>(["house1", "house2", "house3", "tavern", "residence", "factory", "keep", "market", "windmill", "lumberhut"])

/** Footprint radius at scale 1 (mirrors lib/game/hexagone.ts) for hover rings. */
const RING_RADIUS: Partial<Record<HexPropKind | "hq" | "ship", number>> = {
  house1: 5, house2: 5, house3: 6, rocks: 7, factory: 10, residence: 13, bridge: 4, market: 12,
  keep: 11, windmill: 9, watchtower: 12, tavern: 11, lumberhut: 14, cave: 10, hq: 8, ship: 11,
}

const DEFAULT_TARGET = new THREE.Vector3(-6, 10, -30)
const SHIP_SCALE = 2
const HQ_SCALE = 2.2
const BOUNDS = { minX: -340, maxX: 340, minZ: -360, maxZ: 340 }

const easeOutBack = (t: number) => {
  const c1 = 1.5, c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpS = new THREE.Vector3()
const tmpP = new THREE.Vector3()
const UP = new THREE.Vector3(0, 1, 0)

export class HexWorld {
  private opts: WorldOptions
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private shadows: boolean
  private small: boolean

  private sun: THREE.DirectionalLight
  private hemi: THREE.HemisphereLight
  private sea: Sea
  private outerSea: THREE.Mesh
  private sky: Sky
  private glowTex: THREE.Texture
  private windowMat: THREE.PointsMaterial
  private shipLightMat: THREE.PointsMaterial
  private windowGlow: THREE.Points | null = null
  private glowDirty = false
  private hoverRing: THREE.Mesh
  private daylight: DaylightState

  private assets: HexAssets | null = null
  private fit: Map<string, GroundFit> | null = null
  private shipKit: ShipKit | null = null
  private hq: HqObject | null = null

  private pieces: HexPiece[] = []
  private newIds: ReadonlySet<string> = new Set()
  private runtime = new Map<string, PieceRuntime>()
  private ships = new Map<string, ShipRuntime>()
  private batches: THREE.InstancedMesh[] = []
  private everBuilt = new Set<string>()
  private puffs: Puff[] = []

  private disposed = false
  private ready = false
  private inView = true
  private pageVisible = true
  private raf = 0
  private frames = 2
  private start = performance.now()
  private lastTime = 0
  private dayTimer = 0

  private pointer = new THREE.Vector2()
  private pointerClient = { x: 0, y: 0 }
  private pointerInside = false
  private pointerDirty = false
  private hoveredId: string | null = null
  private downAt: { x: number; y: number; t: number } | null = null
  private raycaster = new THREE.Raycaster()
  private fly: { fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; dur: number } | null = null
  private autoRotate = true

  private ro: ResizeObserver
  private io: IntersectionObserver

  constructor(opts: WorldOptions) {
    this.opts = opts
    const { container } = opts
    const width = container.clientWidth || 800
    this.small = width < 640 || window.matchMedia("(pointer: coarse)").matches
    this.shadows = !this.small

    // May throw when WebGL is unavailable; the caller turns that into an error state.
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.shadowMap.enabled = this.shadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const canvas = this.renderer.domElement
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.touchAction = "none"
    canvas.setAttribute("aria-hidden", "true")
    container.appendChild(canvas)
    canvas.addEventListener("webglcontextlost", this.onContextLost)

    this.camera = new THREE.PerspectiveCamera(38, 1, 2, 30000)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = !opts.reducedMotion
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 40
    this.controls.maxDistance = 1700
    this.controls.minPolarAngle = 0.06
    this.controls.maxPolarAngle = 1.22
    this.controls.screenSpacePanning = false
    this.controls.zoomToCursor = true
    this.controls.autoRotateSpeed = 0.35
    this.autoRotate = !opts.reducedMotion
    this.controls.autoRotate = this.autoRotate
    this.controls.addEventListener("change", this.onControlsChange)
    this.controls.addEventListener("start", this.onControlsStart)

    // ── Environment ──
    this.glowTex = makeGlowTexture()
    this.windowMat = makeGlowMaterial(this.glowTex, 15)
    this.shipLightMat = makeGlowMaterial(this.glowTex, 9)
    this.sky = makeSky(this.glowTex)
    this.scene.add(this.sky.dome, this.sky.stars)
    this.sea = makeSea(this.small ? 90 : 150)
    this.scene.add(this.sea.mesh)
    this.outerSea = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000, 1, 1), this.sea.mesh.material)
    this.outerSea.rotation.x = -Math.PI / 2
    this.outerSea.position.y = SEA_LEVEL - 1.6
    this.scene.add(this.outerSea)
    this.scene.fog = new THREE.Fog("#cfe4f2", 1200, 3600)

    this.hemi = new THREE.HemisphereLight("#bfe0fa", "#5d5a48", 0.9)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight("#ffffff", 2.2)
    this.sun.castShadow = this.shadows
    if (this.shadows) {
      this.sun.shadow.mapSize.set(2048, 2048)
      const cam = this.sun.shadow.camera
      cam.left = -440; cam.right = 440; cam.top = 440; cam.bottom = -440
      cam.near = 50; cam.far = 2400
      this.sun.shadow.bias = -0.0008
      this.sun.shadow.radius = 3
    }
    this.scene.add(this.sun, this.sun.target)

    const ringGeo = new THREE.RingGeometry(1, 1.16, 6)
    ringGeo.rotateX(-Math.PI / 2)
    this.hoverRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: opts.palette.glow, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false,
    }))
    this.hoverRing.renderOrder = 10
    this.hoverRing.visible = false
    this.scene.add(this.hoverRing)

    this.daylight = daylightAt(opts.hourOverride ?? istHour(), opts.palette)
    this.applyDaylight()
    this.resize()
    this.resetView(true)

    // ── Observers + input ──
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.io = new IntersectionObserver((entries) => {
      this.inView = entries.some((e) => e.isIntersecting)
      this.kick()
    })
    this.io.observe(container)
    document.addEventListener("visibilitychange", this.onVisibility)
    canvas.addEventListener("pointermove", this.onPointerMove)
    canvas.addEventListener("pointerleave", this.onPointerLeave)
    canvas.addEventListener("pointerdown", this.onPointerDown)
    canvas.addEventListener("pointerup", this.onPointerUp)
    this.dayTimer = window.setInterval(() => {
      this.daylight = daylightAt(this.opts.hourOverride ?? istHour(), this.opts.palette)
      this.applyDaylight()
      this.requestRender()
    }, 60_000)

    this.resize()
    this.kick()

    loadHexAssets((f) => { if (!this.disposed) opts.onProgress(f) })
      .then((assets) => {
        if (this.disposed) { assets.dispose(); return }
        this.assets = assets
        this.scene.add(assets.terrain)
        this.fit = fitHexagoneSlots(assets.heightAt)
        this.shipKit = makeShipKit()
        this.ready = true
        this.rebuild()
        opts.onReady()
        this.requestRender()
      })
      .catch(() => {
        if (this.disposed) return
        opts.onError("The map of France could not be downloaded. Check your connection and try again.")
      })
  }

  // ─── Public API ──────────────────────────────────────────────

  setPieces(pieces: HexPiece[], newIds: ReadonlySet<string>) {
    this.pieces = pieces
    this.newIds = newIds
    if (this.ready) this.rebuild()
  }

  setPalette(p: ArenaPalette) {
    this.opts = { ...this.opts, palette: p }
    ;(this.hoverRing.material as THREE.MeshBasicMaterial).color.set(p.glow)
    this.daylight = daylightAt(this.opts.hourOverride ?? istHour(), p)
    this.applyDaylight()
    if (this.ready) this.rebuildHq()
    this.requestRender()
  }

  setHourOverride(hour: number | null) {
    this.opts = { ...this.opts, hourOverride: hour }
    this.daylight = daylightAt(hour ?? istHour(), this.opts.palette)
    this.applyDaylight()
    this.requestRender()
  }

  setAutoRotate(on: boolean) {
    this.autoRotate = on && !this.opts.reducedMotion
    this.controls.autoRotate = this.autoRotate
    this.kick()
  }

  /** Back to the overview. */
  resetView(instant = false) {
    const aspect = this.camera.aspect || 1.6
    const dist = Math.min(1650, 960 * Math.pow(Math.max(1, 1.5 / aspect), 0.75))
    const s = new THREE.Spherical(dist, 0.6, Math.PI)
    const pos = new THREE.Vector3().setFromSpherical(s).add(DEFAULT_TARGET)
    this.flyTo(pos, DEFAULT_TARGET.clone(), instant)
  }

  focus(id: string) {
    const target = this.positionOf(id)
    const piece = this.runtime.get(id)?.piece ?? this.ships.get(id)?.piece
    if (!target || !piece) return
    const dist = piece.category === "tree" ? 85 : piece.category === "ship" ? 150 : piece.category === "landmark" || piece.kind === "hq" ? 150 : 120
    const offset = this.camera.position.clone().sub(this.controls.target)
    const s = new THREE.Spherical().setFromVector3(offset)
    s.radius = dist
    s.phi = Math.min(1.0, Math.max(0.45, s.phi))
    const pos = new THREE.Vector3().setFromSpherical(s).add(target)
    this.flyTo(pos, target, this.opts.reducedMotion)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.raf = 0
    window.clearInterval(this.dayTimer)
    this.ro.disconnect()
    this.io.disconnect()
    document.removeEventListener("visibilitychange", this.onVisibility)
    const canvas = this.renderer.domElement
    canvas.removeEventListener("pointermove", this.onPointerMove)
    canvas.removeEventListener("pointerleave", this.onPointerLeave)
    canvas.removeEventListener("pointerdown", this.onPointerDown)
    canvas.removeEventListener("pointerup", this.onPointerUp)
    canvas.removeEventListener("webglcontextlost", this.onContextLost)
    this.controls.removeEventListener("change", this.onControlsChange)
    this.controls.removeEventListener("start", this.onControlsStart)
    this.controls.dispose()

    this.clearBatches()
    this.clearShips()
    this.puffs.forEach((p) => this.disposePuff(p))
    this.puffs = []
    if (this.windowGlow) { this.windowGlow.geometry.dispose(); this.windowGlow = null }
    this.hq?.dispose()
    this.shipKit?.dispose()
    this.assets?.dispose()
    this.sea.dispose()
    this.outerSea.geometry.dispose()
    this.sky.dispose()
    this.sun.dispose()
    this.hoverRing.geometry.dispose()
    ;(this.hoverRing.material as THREE.Material).dispose()
    this.windowMat.dispose()
    this.shipLightMat.dispose()
    this.glowTex.dispose()
    this.scene.clear()
    this.renderer.renderLists.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
    canvas.remove()
  }

  // ─── Scene building ──────────────────────────────────────────

  private rebuild() {
    if (!this.assets || !this.fit) return
    const now = this.elapsed()
    const fresh = this.pieces.filter((p) => !this.everBuilt.has(p.id) && this.newIds.has(p.id))
    const order: Record<HexCategory, number> = { base: 0, landmark: 1, factory: 2, residence: 3, house: 4, ship: 5, tree: 6 }
    fresh.sort((a, b) => order[a.category] - order[b.category])
    const stagger = fresh.length > 1 ? Math.min(0.32, 5 / fresh.length) : 0
    const riseAt = new Map<string, number>()
    if (!this.opts.reducedMotion) fresh.forEach((p, i) => riseAt.set(p.id, now + 0.7 + i * stagger))
    // Keep rises that are still playing from a previous build.
    const carry = new Map<string, { start: number; dur: number }>()
    for (const [id, r] of this.runtime) if (r.rise) carry.set(id, r.rise)
    for (const [id, s] of this.ships) if (s.rise) carry.set(id, s.rise)

    this.clearBatches()
    this.runtime.clear()

    // Group prop pieces by kind -> one InstancedMesh per part.
    const byKind = new Map<HexPropKind, HexPiece[]>()
    for (const p of this.pieces) {
      if (p.kind === "hq" || p.kind === "ship") continue
      const list = byKind.get(p.kind) ?? []
      list.push(p)
      byKind.set(p.kind, list)
    }
    for (const [kind, list] of byKind) {
      const def = this.assets.props.get(kind)
      if (!def) continue
      const height = def.box.max.y - def.box.min.y
      const meshes = def.parts.map((part) => {
        const mesh = new THREE.InstancedMesh(part.geometry, part.material, list.length)
        mesh.castShadow = this.shadows
        mesh.receiveShadow = false
        mesh.frustumCulled = false
        mesh.userData.ids = list.map((p) => p.id)
        this.scene.add(mesh)
        this.batches.push(mesh)
        return { mesh, part: part.matrix }
      })
      list.forEach((p, index) => {
        const fit = this.fit!.get(p.id) ?? { x: p.x, y: SEA_LEVEL, z: p.z, spread: 0 }
        const at = riseAt.get(p.id)
        const rise = at != null ? { start: at, dur: 1.2 } : carry.get(p.id) ?? null
        const rt: PieceRuntime = { piece: p, fit, height: height * p.scale, refs: meshes.map((m) => ({ mesh: m.mesh, index, part: m.part })), rise }
        this.runtime.set(p.id, rt)
        this.writeMatrices(rt, now)
        if (at != null) this.spawnPuff(rt, at)
      })
    }
    for (const b of this.batches) { b.instanceMatrix.needsUpdate = true; b.computeBoundingSphere() }

    this.rebuildHq()
    this.rebuildShips(riseAt, carry)
    for (const p of this.pieces) this.everBuilt.add(p.id)
    this.glowDirty = true
    this.requestRender()
  }

  private rebuildHq() {
    const hqPiece = this.pieces.find((p) => p.kind === "hq")
    if (this.hq) { this.hq.group.removeFromParent(); this.hq.dispose(); this.hq = null }
    if (!hqPiece || !this.fit) return
    const f = this.fit.get(hqPiece.id) ?? { x: hqPiece.x, y: SEA_LEVEL, z: hqPiece.z, spread: 0 }
    this.hq = makeHq(this.opts.palette.accent, this.opts.palette.glow)
    this.hq.group.position.set(f.x, f.y, f.z)
    this.hq.group.rotation.y = 0.5
    this.hq.group.scale.setScalar(HQ_SCALE)
    this.hq.group.userData.pieceId = hqPiece.id
    this.hq.group.traverse((o) => { o.userData.pieceId = hqPiece.id })
    this.runtime.set(hqPiece.id, { piece: hqPiece, fit: f, height: 30 * HQ_SCALE, refs: [], rise: null })
    this.scene.add(this.hq.group)
    this.applyNightToHq()
  }

  private rebuildShips(riseAt: Map<string, number>, carry: Map<string, { start: number; dur: number }>) {
    this.clearShips()
    if (!this.shipKit) return
    const shipPieces = this.pieces.filter((p) => p.kind === "ship" && p.ship)
    const curves = new Map<ShipRoute, { curve: THREE.CatmullRomCurve3; length: number }>()
    for (const p of shipPieces) {
      const route = p.ship!.route
      if (!curves.has(route)) {
        const pts = SHIP_ROUTES[route].points.map(([lon, lat]) => {
          const m = lonLatToModel(lon, lat)
          return new THREE.Vector3(m.x, SEA_LEVEL, m.z)
        })
        const curve = new THREE.CatmullRomCurve3(pts, true, "centripetal")
        curves.set(route, { curve, length: curve.getLength() })
      }
      const c = curves.get(route)!
      const seed = Number(p.id.replace(/\D/g, "")) || 0
      const obj = makeShip(this.shipKit, seed + 1, p.ship!.phoneDeal, this.opts.palette.accent, this.shipLightMat)
      obj.group.traverse((o) => { o.userData.pieceId = p.id })
      obj.wake.userData.noPick = true
      obj.group.scale.setScalar(SHIP_SCALE)
      this.scene.add(obj.group)
      const at = riseAt.get(p.id)
      const rise = at != null ? { start: at, dur: 1.4 } : carry.get(p.id) ?? null
      this.ships.set(p.id, { piece: p, obj, curve: c.curve, length: c.length, phase: p.ship!.phase, seed, rise })
    }
    this.updateShips(this.elapsed())
  }

  private clearBatches() {
    for (const b of this.batches) { b.removeFromParent(); b.dispose() }
    this.batches = []
  }

  private clearShips() {
    for (const s of this.ships.values()) {
      s.obj.group.removeFromParent()
      s.obj.owned.forEach((g) => g.dispose())
    }
    this.ships.clear()
  }

  /** Instance matrices for one piece, including its rise offset. */
  private writeMatrices(rt: PieceRuntime, now: number) {
    let yOff = 0
    let sMul = 1
    if (rt.rise) {
      const t = (now - rt.rise.start) / rt.rise.dur
      if (t >= 1) { rt.rise = null; this.glowDirty = true }
      else {
        const e = t <= 0 ? 0 : easeOutBack(t)
        yOff = -(rt.height + 3) * (1 - e)
        sMul = t <= 0 ? 0.001 : 0.6 + 0.4 * Math.min(1, e)
      }
    }
    const p = rt.piece
    tmpP.set(rt.fit.x, rt.fit.y + yOff, rt.fit.z)
    tmpQ.setFromAxisAngle(UP, p.rotation)
    tmpS.setScalar(p.scale * sMul)
    tmpM.compose(tmpP, tmpQ, tmpS)
    for (const ref of rt.refs) {
      const m = new THREE.Matrix4().multiplyMatrices(tmpM, ref.part)
      ref.mesh.setMatrixAt(ref.index, m)
    }
  }

  private spawnPuff(rt: PieceRuntime, at: number) {
    const ring = (RING_RADIUS[rt.piece.kind] ?? 4) * rt.piece.scale
    const puff = makePuff(new THREE.Vector3(rt.fit.x, rt.fit.y, rt.fit.z), ring, "#d6c7a8", this.glowTex, at, hash01(rt.fit.x * 7 + rt.fit.z) * 1000)
    this.scene.add(puff.points)
    this.puffs.push(puff)
  }

  private disposePuff(p: Puff) {
    p.points.removeFromParent()
    p.points.geometry.dispose()
    ;(p.points.material as THREE.Material).dispose()
  }

  /** Warm window lights on buildings (visible from dusk to dawn). */
  private rebuildWindowGlow() {
    this.glowDirty = false
    if (this.windowGlow) { this.windowGlow.removeFromParent(); this.windowGlow.geometry.dispose(); this.windowGlow = null }
    if (!this.assets) return
    const pos: number[] = []
    const col: number[] = []
    const v = new THREE.Vector3()
    const m = new THREE.Matrix4()
    for (const rt of this.runtime.values()) {
      const kind = rt.piece.kind
      if (rt.rise || kind === "hq" || kind === "ship" || !BUILDING_KINDS.has(kind as HexPropKind)) continue
      const def = this.assets.props.get(kind as HexPropKind)
      if (!def) continue
      const b = def.box
      const h = b.max.y - b.min.y
      const seed = hash01(rt.fit.x * 3 + rt.fit.z * 5)
      const spots: [number, number, number][] = kind === "residence"
        ? [[b.min.x * 0.5, h * 0.55, b.max.z + 0.4], [b.max.x * 0.5, h * 0.4, b.max.z + 0.4], [b.max.x + 0.4, h * 0.5, b.min.z * 0.4], [b.min.x - 0.4, h * 0.6, b.max.z * 0.3], [0, h * 0.5, b.min.z - 0.4]]
        : kind === "factory"
          ? [[b.max.x + 0.4, h * 0.35, 0], [b.min.x - 0.4, h * 0.35, b.max.z * 0.5], [0, h * 0.4, b.max.z + 0.4]]
          : [[0, h * 0.32, b.max.z + 0.35], [b.max.x + 0.35, h * 0.32, b.min.z * 0.3], [b.min.x - 0.35, h * 0.3, b.max.z * 0.3]]
      tmpQ.setFromAxisAngle(UP, rt.piece.rotation)
      m.compose(tmpP.set(rt.fit.x, rt.fit.y, rt.fit.z), tmpQ, tmpS.setScalar(rt.piece.scale))
      spots.forEach(([x, y, z], i) => {
        v.set(x, y, z).applyMatrix4(m)
        pos.push(v.x, v.y, v.z)
        const k = 0.85 + hash01(seed * 100 + i) * 0.15
        col.push(1 * k, 0.62 * k, 0.22 * k)
      })
    }
    if (!pos.length) return
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
    this.windowGlow = new THREE.Points(g, this.windowMat)
    this.windowGlow.renderOrder = 2
    this.windowGlow.frustumCulled = false
    this.windowGlow.visible = this.daylight.night > 0.05
    this.scene.add(this.windowGlow)
  }

  // ─── Lighting ────────────────────────────────────────────────

  private applyDaylight() {
    const d = this.daylight
    this.sun.color.copy(d.sunColor)
    this.sun.intensity = d.sunIntensity
    this.sun.position.copy(d.sunDir).multiplyScalar(1000)
    this.sun.target.position.set(0, 0, 0)
    this.hemi.color.copy(d.hemiSky)
    this.hemi.groundColor.copy(d.hemiGround)
    this.hemi.intensity = d.hemiIntensity
    this.sky.uniforms.uTop.value.copy(d.skyTop)
    this.sky.uniforms.uHorizon.value.copy(d.skyHorizon)
    ;(this.sky.stars.material as THREE.PointsMaterial).opacity = Math.max(0, (d.night - 0.3) / 0.7)
    this.sky.stars.visible = d.night > 0.3
    ;(this.scene.fog as THREE.Fog).color.copy(d.skyHorizon)
    this.sea.uniforms.uShallow.value.copy(d.sea)
    this.sea.uniforms.uDeep.value.copy(d.sea).multiplyScalar(0.68).lerp(d.skyHorizon, 0.06)
    const direct = d.sunIntensity * Math.max(0, d.sunDir.y)
    this.sea.uniforms.uGlow.value = 0.06 + 0.32 * (1 - Math.min(1, direct / 1.8))
    this.renderer.toneMappingExposure = d.exposure
    this.windowMat.opacity = Math.min(1, d.night * 1.1)
    this.shipLightMat.opacity = Math.min(1, d.night * 1.2)
    if (this.windowGlow) this.windowGlow.visible = d.night > 0.05
    this.applyNightToHq()
    this.opts.onDaylight?.(d)
  }

  private applyNightToHq() {
    if (!this.hq) return
    const n = this.daylight.night
    this.hq.light.intensity = n * 260
    ;(this.hq.beacon.material as THREE.MeshBasicMaterial).opacity = 0.25 + n * 0.75
  }

  // ─── Camera ──────────────────────────────────────────────────

  private flyTo(pos: THREE.Vector3, target: THREE.Vector3, instant: boolean) {
    if (instant) {
      this.fly = null
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      this.controls.update()
      this.requestRender()
      return
    }
    this.fly = {
      fromPos: this.camera.position.clone(), toPos: pos,
      fromTarget: this.controls.target.clone(), toTarget: target,
      start: this.elapsed(), dur: 1.15,
    }
    this.controls.autoRotate = false
    this.kick()
  }

  private positionOf(id: string): THREE.Vector3 | null {
    const rt = this.runtime.get(id)
    if (rt) return new THREE.Vector3(rt.fit.x, rt.fit.y + Math.min(14, rt.height * 0.4), rt.fit.z)
    const s = this.ships.get(id)
    if (s) return s.obj.group.position.clone().setY(SEA_LEVEL + 6)
    return null
  }

  private resize() {
    const { container } = this.opts
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.requestRender()
  }

  // ─── Input ───────────────────────────────────────────────────

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointerClient = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    this.pointer.set((this.pointerClient.x / rect.width) * 2 - 1, -(this.pointerClient.y / rect.height) * 2 + 1)
    this.pointerInside = true
    this.pointerDirty = true
    if (e.pointerType === "mouse") this.requestRender()
  }

  private onPointerLeave = () => {
    this.pointerInside = false
    this.setHovered(null)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  private onPointerUp = (e: PointerEvent) => {
    const d = this.downAt
    this.downAt = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    const id = this.pick()
    const piece = id ? (this.runtime.get(id)?.piece ?? this.ships.get(id)?.piece ?? null) : null
    this.opts.onSelect(piece)
    if (id) this.focus(id)
  }

  private onControlsChange = () => { this.requestRender() }

  private onControlsStart = () => {
    this.fly = null
    this.controls.autoRotate = this.autoRotate
  }

  private onVisibility = () => {
    this.pageVisible = document.visibilityState === "visible"
    this.kick()
  }

  private onContextLost = (e: Event) => {
    e.preventDefault()
    if (!this.disposed) this.opts.onError("The 3D view lost its graphics context. Reload the tab to try again.")
  }

  private pick(): string | null {
    const targets: THREE.Object3D[] = [...this.batches]
    if (this.hq) targets.push(this.hq.group)
    for (const s of this.ships.values()) targets.push(s.obj.body)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(targets, true)
    for (const h of hits) {
      if ((h.object as THREE.Points).isPoints || h.object.userData.noPick) continue
      const ids = h.object.userData.ids as string[] | undefined
      if (ids && h.instanceId != null) return ids[h.instanceId] ?? null
      let o: THREE.Object3D | null = h.object
      while (o) {
        if (typeof o.userData.pieceId === "string") return o.userData.pieceId
        o = o.parent
      }
    }
    return null
  }

  private setHovered(id: string | null) {
    if (id === this.hoveredId) {
      if (id) this.emitHover(id)
      return
    }
    this.hoveredId = id
    this.renderer.domElement.style.cursor = id ? "pointer" : ""
    if (!id) {
      this.hoverRing.visible = false
      this.opts.onHover(null)
      this.requestRender()
      return
    }
    this.emitHover(id)
    this.requestRender()
  }

  private emitHover(id: string) {
    const piece = this.runtime.get(id)?.piece ?? this.ships.get(id)?.piece
    if (!piece) return
    this.opts.onHover({
      id, name: piece.name, unlockedBy: piece.unlockedBy, category: piece.category,
      x: this.pointerClient.x, y: this.pointerClient.y,
      width: this.renderer.domElement.clientWidth, height: this.renderer.domElement.clientHeight,
    })
  }

  private placeHoverRing(now: number) {
    if (!this.hoveredId) return
    const rt = this.runtime.get(this.hoveredId)
    const ship = this.ships.get(this.hoveredId)
    const kind = rt?.piece.kind ?? ship?.piece.kind
    if (!kind) return
    const scale = kind === "hq" ? HQ_SCALE : kind === "ship" ? SHIP_SCALE : rt?.piece.scale ?? 1
    const base = (RING_RADIUS[kind] ?? 4) * scale
    const pulse = this.opts.reducedMotion ? 1 : 1 + Math.sin(now * 4) * 0.05
    if (rt) this.hoverRing.position.set(rt.fit.x, rt.fit.y + 0.6, rt.fit.z)
    else if (ship) this.hoverRing.position.set(ship.obj.group.position.x, SEA_LEVEL + 0.8, ship.obj.group.position.z)
    this.hoverRing.scale.setScalar(base * pulse)
    this.hoverRing.visible = true
  }

  // ─── Loop ────────────────────────────────────────────────────

  private elapsed() { return (performance.now() - this.start) / 1000 }

  private get running() { return !this.disposed && this.inView && this.pageVisible }

  /** Make sure a frame is scheduled (continuous mode) or render once (reduced motion). */
  private kick() {
    if (!this.running || this.raf) return
    this.raf = requestAnimationFrame(this.tick)
  }

  private requestRender() {
    this.frames = Math.max(this.frames, 2)
    this.kick()
  }

  private get animating(): boolean {
    if (this.fly || this.puffs.length) return true
    for (const r of this.runtime.values()) if (r.rise) return true
    for (const s of this.ships.values()) if (s.rise) return true
    if (this.opts.reducedMotion) return false
    return true   // sea, flag, ships and auto-rotate keep moving
  }

  private tick = () => {
    this.raf = 0
    if (!this.running) return
    const now = this.elapsed()
    const dt = Math.min(0.1, now - this.lastTime)
    this.lastTime = now
    const motion = !this.opts.reducedMotion

    // Camera flight
    if (this.fly) {
      const t = Math.min(1, (now - this.fly.start) / this.fly.dur)
      const e = easeInOutCubic(t)
      this.camera.position.lerpVectors(this.fly.fromPos, this.fly.toPos, e)
      this.controls.target.lerpVectors(this.fly.fromTarget, this.fly.toTarget, e)
      if (t >= 1) { this.fly = null; this.controls.autoRotate = this.autoRotate }
    }
    this.controls.update(dt)
    this.clampTarget()

    // Rising pieces
    let touched = false
    for (const rt of this.runtime.values()) {
      if (!rt.rise) continue
      this.writeMatrices(rt, now)
      touched = true
    }
    if (touched) for (const b of this.batches) { b.instanceMatrix.needsUpdate = true; b.computeBoundingSphere() }
    if (this.glowDirty) this.rebuildWindowGlow()

    // Puffs
    if (this.puffs.length) {
      this.puffs = this.puffs.filter((p) => {
        const alive = stepPuff(p, now)
        if (!alive) this.disposePuff(p)
        return alive
      })
    }

    // Sea, flag, ships
    if (motion) {
      this.sea.uniforms.uTime.value = now
      if (this.hq) this.hq.uniforms.uTime.value = now
    }
    this.updateShips(now)
    if (this.hq) {
      const pulse = motion ? 1 + (Math.sin(now * 2) * 0.5 + 0.5) * 0.18 : 1
      this.hq.ring.scale.setScalar(pulse)
    }

    // Sky follows the camera so the horizon never parallaxes.
    this.sky.dome.position.copy(this.camera.position)
    this.sky.stars.position.copy(this.camera.position)
    const dist = this.camera.position.distanceTo(this.controls.target)
    const fog = this.scene.fog as THREE.Fog
    fog.near = dist * 1.05 + 250
    fog.far = dist + 2300

    // Hover picking (once per frame at most)
    if (this.pointerDirty && this.pointerInside && !this.fly) {
      this.pointerDirty = false
      this.setHovered(this.pick())
    }
    this.placeHoverRing(now)

    this.renderer.render(this.scene, this.camera)

    if (this.frames > 0) this.frames--
    if (this.animating || this.frames > 0 || (this.controls.enableDamping && this.controls.autoRotate)) this.kick()
  }

  private clampTarget() {
    // Never let the camera dip into a mountain or under the waves.
    const cam = this.camera.position
    const ground = this.assets?.heightAt(cam.x, cam.z) ?? null
    const floor = Math.max(SEA_LEVEL, ground ?? SEA_LEVEL) + 8
    if (cam.y < floor) cam.y = floor
    const t = this.controls.target
    const cx = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, t.x))
    const cz = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, t.z))
    const cy = Math.min(80, Math.max(0, t.y))
    if (cx !== t.x || cz !== t.z || cy !== t.y) {
      const dx = cx - t.x, dy = cy - t.y, dz = cz - t.z
      t.set(cx, cy, cz)
      this.camera.position.x += dx
      this.camera.position.y += dy
      this.camera.position.z += dz
    }
  }

  private updateShips(now: number) {
    const motion = !this.opts.reducedMotion
    for (const s of this.ships.values()) {
      const speed = 4.2 // units per second
      const u = ((s.phase + (motion ? (now * speed) / s.length : 0)) % 1 + 1) % 1
      const p = s.curve.getPointAt(u)
      const tan = s.curve.getTangentAt(u)
      s.obj.group.position.set(p.x, SEA_LEVEL, p.z)
      s.obj.group.rotation.y = Math.atan2(-tan.z, tan.x)
      if (motion) {
        s.obj.body.position.y = Math.sin(now * 1.3 + s.seed) * 0.25
        s.obj.body.rotation.x = Math.sin(now * 0.9 + s.seed * 2) * 0.05
        s.obj.wake.scale.set(1, 1, 1 + Math.sin(now * 2.2 + s.seed) * 0.08)
      }
      let scale = SHIP_SCALE
      if (s.rise) {
        const t = (now - s.rise.start) / s.rise.dur
        if (t >= 1) s.rise = null
        else if (t <= 0) scale = 0.001
        else {
          scale = SHIP_SCALE * Math.max(0.001, easeOutBack(t))
          if (t < 0.05 && !s.obj.group.userData.splashed) {
            s.obj.group.userData.splashed = true
            const puff = makePuff(new THREE.Vector3(p.x, SEA_LEVEL, p.z), 18, "#f8fafc", this.glowTex, now, s.seed + 77)
            this.scene.add(puff.points)
            this.puffs.push(puff)
          }
        }
      }
      s.obj.group.scale.setScalar(scale)
    }
  }
}

/** Create a world, or report why WebGL is unavailable. */
export function createHexWorld(opts: WorldOptions): HexWorld | null {
  try {
    const probe = document.createElement("canvas")
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl")
    if (!gl) throw new Error("no webgl")
    gl.getExtension("WEBGL_lose_context")?.loseContext()
  } catch {
    opts.onError("Your browser or device does not support WebGL, which the 3D Hexagone needs.")
    return null
  }
  try {
    return new HexWorld(opts)
  } catch {
    opts.onError("The 3D view could not start on this device.")
    return null
  }
}
