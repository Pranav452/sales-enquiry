// ============================================================
// Hexagone asset loading: the GLB (terrain + prop library) and a
// fast ground-height lookup built from the terrain triangles.
// ============================================================

import * as THREE from "three"
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import type { HexPropKind } from "@/lib/game/hexagone"

export const HEXAGONE_MODEL_URL = "/models/hexagone.glb"

export const PROP_KINDS: HexPropKind[] = [
  "house1", "house2", "house3",
  "oak", "spruce", "birch", "poplar", "palm", "willow", "linden", "maple",
  "rocks", "factory", "residence", "bridge", "market",
  "keep", "windmill", "watchtower", "tavern", "lumberhut", "cave",
]

/** One drawable part of a prop: shared geometry + material + its local transform. */
export interface PropPart {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  matrix:   THREE.Matrix4
}

export interface PropDef {
  parts: PropPart[]
  /** Local bounds of the whole prop at scale 1 (base at y = 0). */
  box:   THREE.Box3
}

export interface HexAssets {
  terrain: THREE.Mesh
  props:   Map<HexPropKind, PropDef>
  heightAt: (x: number, z: number) => number | null
  /** Everything owned by the assets, for disposal. */
  dispose: () => void
}

// ─── Two-tone material for the plain "Presentation" props ─────

/**
 * Walls one colour, up-facing faces (roofs, flat tops) another. Works with
 * flat shading: the face normal is rebuilt from screen-space derivatives.
 */
export function twoToneMaterial(wall: string, roof: string, roughness = 0.85): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: wall, roughness, metalness: 0, flatShading: true })
  const roofColor = new THREE.Color(roof)
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRoof = { value: roofColor }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRoof;")
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          vec3 upView = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          float up = dot(normal, upView);
          diffuseColor.rgb = mix(diffuseColor.rgb, uRoof, smoothstep(0.45, 0.6, up));
        }`,
      )
  }
  m.customProgramCacheKey = () => `two-tone-${wall}-${roof}`
  return m
}

/** Hand-picked colours for the props that ship with a plain material. */
const PRESENTATION_LOOK: Partial<Record<HexPropKind, [string, string]>> = {
  factory:   ["#a3553a", "#4b5563"],   // brick + slate
  residence: ["#e9dfc8", "#5b6b82"],   // Haussmann stone + zinc roofs
  bridge:    ["#d8c7a3", "#b9a47c"],   // pale limestone
  watchtower: ["#8a7f70", "#8c3b2c"],  // weathered stone + red tiles (reads against snow)
}

// ─── Height lookup ────────────────────────────────────────────

function buildHeightField(mesh: THREE.Mesh): (x: number, z: number) => number | null {
  mesh.updateMatrixWorld(true)
  const pos = mesh.geometry.getAttribute("position")
  const index = mesh.geometry.getIndex()
  const n = pos.count
  const P = new Float32Array(n * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z
  }
  const triCount = index ? index.count / 3 : n / 3
  const I = new Uint32Array(triCount * 3)
  for (let k = 0; k < triCount * 3; k++) I[k] = index ? index.getX(k) : k

  const box = new THREE.Box3().setFromBufferAttribute(new THREE.BufferAttribute(P, 3))
  const G = 72
  const minX = box.min.x - 1, minZ = box.min.z - 1
  const cw = (box.max.x + 1 - minX) / G
  const ch = (box.max.z + 1 - minZ) / G
  const buckets: number[][] = Array.from({ length: G * G }, () => [])
  for (let k = 0; k < triCount; k++) {
    const a = I[k * 3], b = I[k * 3 + 1], c = I[k * 3 + 2]
    const x0 = Math.min(P[a * 3], P[b * 3], P[c * 3]), x1 = Math.max(P[a * 3], P[b * 3], P[c * 3])
    const z0 = Math.min(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2]), z1 = Math.max(P[a * 3 + 2], P[b * 3 + 2], P[c * 3 + 2])
    const gx0 = Math.max(0, Math.floor((x0 - minX) / cw)), gx1 = Math.min(G - 1, Math.floor((x1 - minX) / cw))
    const gz0 = Math.max(0, Math.floor((z0 - minZ) / ch)), gz1 = Math.min(G - 1, Math.floor((z1 - minZ) / ch))
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) buckets[gz * G + gx].push(k)
  }

  // Equivalent to a downward raycast: the highest triangle under (x, z), or null over the sea.
  return (x: number, z: number) => {
    const gx = Math.floor((x - minX) / cw), gz = Math.floor((z - minZ) / ch)
    if (gx < 0 || gz < 0 || gx >= G || gz >= G) return null
    let best: number | null = null
    for (const k of buckets[gz * G + gx]) {
      const a = I[k * 3], b = I[k * 3 + 1], c = I[k * 3 + 2]
      const ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2]
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz)
      if (Math.abs(d) < 1e-9) continue
      const w1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d
      const w2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d
      const w3 = 1 - w1 - w2
      if (w1 < -1e-5 || w2 < -1e-5 || w3 < -1e-5) continue
      const y = w1 * P[a * 3 + 1] + w2 * P[b * 3 + 1] + w3 * P[c * 3 + 1]
      if (best === null || y > best) best = y
    }
    return best
  }
}

// ─── Disposal helpers ─────────────────────────────────────────

export function disposeMaterial(m: THREE.Material) {
  for (const value of Object.values(m)) {
    if (value instanceof THREE.Texture) {
      const data: unknown = value.source?.data
      value.dispose()
      if (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) data.close()
    }
  }
  m.dispose()
}

// ─── Loader ───────────────────────────────────────────────────

export function loadHexAssets(onProgress: (fraction: number) => void): Promise<HexAssets> {
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
  return new Promise<HexAssets>((resolve, reject) => {
    loader.load(
      HEXAGONE_MODEL_URL,
      (gltf) => {
        try {
          resolve(extract(gltf))
        } catch (e) {
          reject(e instanceof Error ? e : new Error("Could not read the Hexagone model"))
        }
      },
      (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total))
      },
      (err) => reject(err instanceof Error ? err : new Error("Could not download the Hexagone model")),
    )
  })
}

function extract(gltf: GLTF): HexAssets {
  const root = gltf.scene
  root.updateMatrixWorld(true)

  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  // Terrain keeps its baked texture; it just needs flat shading (normals were stripped).
  const terrainNode = root.getObjectByName("terrain")
  let terrain: THREE.Mesh | null = null
  terrainNode?.traverse((o) => { if (!terrain && (o as THREE.Mesh).isMesh) terrain = o as THREE.Mesh })
  if (!terrain) throw new Error("The Hexagone model has no terrain")
  const terrainMesh: THREE.Mesh = terrain
  const tm = terrainMesh.material as THREE.MeshStandardMaterial
  tm.flatShading = true
  tm.roughness = 0.95
  tm.metalness = 0
  // A few terrain faces sample the black gutter of the baked atlas; show them as stone.
  tm.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      if (max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) < 0.035) diffuseColor.rgb = vec3(0.34, 0.31, 0.27);`,
    )
  }
  tm.customProgramCacheKey = () => "hex-terrain"
  tm.needsUpdate = true
  // Bake the node transform into the mesh's own matrix and detach it.
  terrainMesh.updateMatrixWorld(true)
  const terrainWorld = terrainMesh.matrixWorld.clone()
  terrainMesh.removeFromParent()
  terrainWorld.decompose(terrainMesh.position, terrainMesh.quaternion, terrainMesh.scale)
  terrainMesh.updateMatrixWorld(true)
  terrainMesh.receiveShadow = true
  terrainMesh.castShadow = false
  geometries.add(terrainMesh.geometry)
  materials.add(tm)

  const props = new Map<HexPropKind, PropDef>()
  for (const kind of PROP_KINDS) {
    const node = root.getObjectByName(kind)
    if (!node) continue
    const look = PRESENTATION_LOOK[kind]
    const override = look ? twoToneMaterial(look[0], look[1]) : null
    if (override) materials.add(override)
    const parts: PropPart[] = []
    const box = new THREE.Box3()
    node.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        let material: THREE.Material = mat
        if (override) {
          material = override
          materials.add(mat)
        } else {
          const std = mat as THREE.MeshStandardMaterial
          std.flatShading = true
          std.needsUpdate = true
          materials.add(mat)
        }
        parts.push({ geometry: mesh.geometry, material, matrix: mesh.matrixWorld.clone() })
      }
      geometries.add(mesh.geometry)
      mesh.geometry.computeBoundingBox()
      if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld))
    })
    if (parts.length) props.set(kind, { parts, box })
  }

  // Anything else in the file (unused nodes) is collected so it can be freed.
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    geometries.add(mesh.geometry)
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((m) => materials.add(m))
  })

  return {
    terrain: terrainMesh,
    props,
    heightAt: buildHeightField(terrainMesh),
    dispose: () => {
      geometries.forEach((g) => g.dispose())
      materials.forEach((m) => disposeMaterial(m))
    },
  }
}
