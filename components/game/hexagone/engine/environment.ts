// ============================================================
// Hexagone environment: animated low-poly sea, sky dome, stars.
// ============================================================

import * as THREE from "three"
import { hash01 } from "@/lib/game/hexagone"

export const SEA_LEVEL = 3.2

export interface Sea {
  mesh:     THREE.Mesh
  uniforms: {
    uTime:    { value: number }
    uAmp:     { value: number }
    uDeep:    { value: THREE.Color }
    uShallow: { value: THREE.Color }
    /** Self-lit share of the water colour, so the sea never goes muddy at dusk. */
    uGlow:    { value: number }
  }
  dispose:  () => void
}

/** A faceted sea that ripples in the vertex shader; deeper colour away from the coast. */
export function makeSea(segments: number): Sea {
  const SIZE = 2800
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, segments, segments)
  geo.deleteAttribute("normal")
  geo.deleteAttribute("uv")
  const uniforms = {
    uTime:    { value: 0 },
    uAmp:     { value: 1 },
    uDeep:    { value: new THREE.Color("#0b2a4a") },
    uShallow: { value: new THREE.Color("#2f7fae") },
    uGlow:    { value: 0.1 },
  }
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.38, metalness: 0.05, flatShading: true })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uAmp;\nvarying vec2 vSeaXY;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vSeaXY = position.xy;
        float w = sin(position.x * 0.035 + uTime * 0.8) * 0.55
                + sin(position.y * 0.05 - uTime * 0.65) * 0.45
                + sin((position.x + position.y) * 0.022 + uTime * 0.5) * 0.5;
        transformed.z += w * uAmp;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uDeep;\nuniform vec3 uShallow;\nuniform float uGlow;\nvarying vec2 vSeaXY;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float d = length(vSeaXY - vec2(0.0, 10.0));
        diffuseColor.rgb = mix(uShallow, uDeep, smoothstep(330.0, 900.0, d));`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * uGlow;`,
      )
  }
  mat.customProgramCacheKey = () => "hex-sea"
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = SEA_LEVEL
  mesh.receiveShadow = true
  return { mesh, uniforms, dispose: () => { geo.dispose(); mat.dispose() } }
}

export interface Sky {
  dome:     THREE.Mesh
  stars:    THREE.Points
  uniforms: { uTop: { value: THREE.Color }; uHorizon: { value: THREE.Color } }
  dispose:  () => void
}

export function makeSky(glowTex: THREE.Texture): Sky {
  const uniforms = { uTop: { value: new THREE.Color("#4f95d8") }, uHorizon: { value: new THREE.Color("#d4e9f7") } }
  const geo = new THREE.SphereGeometry(4200, 32, 16)
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      varying vec3 vDir;
      void main() {
        float t = smoothstep(-0.05, 0.55, vDir.y);
        gl_FragColor = vec4(mix(uHorizon, uTop, t), 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const dome = new THREE.Mesh(geo, mat)
  dome.renderOrder = -1
  dome.frustumCulled = false

  // Stars on the upper hemisphere; faded in at night.
  const n = 420
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const a = hash01(i * 3 + 1) * Math.PI * 2
    const y = 0.12 + hash01(i * 3 + 2) * 0.88
    const r = Math.sqrt(1 - y * y)
    pos[i * 3] = Math.cos(a) * r * 3900
    pos[i * 3 + 1] = y * 3900
    pos[i * 3 + 2] = Math.sin(a) * r * 3900
    const b = 0.55 + hash01(i * 3 + 3) * 0.45
    col[i * 3] = b; col[i * 3 + 1] = b; col[i * 3 + 2] = Math.min(1, b + 0.1)
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  sg.setAttribute("color", new THREE.BufferAttribute(col, 3))
  const sm = new THREE.PointsMaterial({
    size: 2.6, sizeAttenuation: false, map: glowTex, vertexColors: true, transparent: true,
    opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  })
  const stars = new THREE.Points(sg, sm)
  stars.frustumCulled = false

  return {
    dome, stars, uniforms,
    dispose: () => { geo.dispose(); mat.dispose(); sg.dispose(); sm.dispose() },
  }
}
