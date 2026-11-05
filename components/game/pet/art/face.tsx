"use client"

// Shared, species-aware face: eyes (with blink + look-around), mouth,
// brows and blush. Only this component re-renders for idle life.

import { memo, useEffect, useState } from "react"
import type { PetMood } from "@/lib/game/types"
import { SPECIES, type Expression, type SpeciesId } from "../species"

export type EyeKind   = "open" | "sleep" | "happy" | "wide" | "dizzy" | "grumpy"
export type MouthKind = "smile" | "grin" | "frown" | "o" | "snore" | "wobble"
export type BrowKind  = "none" | "angry" | "up"

export interface FaceSpec {
  eyes:  EyeKind
  mouth: MouthKind
  brows: BrowKind
  blush: number
}

export function faceFor(mood: PetMood, expression: Expression | null | undefined): FaceSpec {
  switch (expression) {
    case "love":  return { eyes: "happy", mouth: "grin",   brows: "none", blush: 0.75 }
    case "cheer": return { eyes: "happy", mouth: "grin",   brows: "up",   blush: 0.6 }
    case "whee":  return { eyes: "wide",  mouth: "o",      brows: "up",   blush: 0.35 }
    case "dizzy": return { eyes: "dizzy", mouth: "wobble", brows: "none", blush: 0.3 }
  }
  switch (mood) {
    case "sleepy":   return { eyes: "sleep",  mouth: "snore", brows: "none",  blush: 0.3 }
    case "happy":    return { eyes: "open",   mouth: "grin",  brows: "none",  blush: 0.5 }
    case "ecstatic": return { eyes: "happy",  mouth: "grin",  brows: "up",    blush: 0.65 }
    case "grumpy":   return { eyes: "grumpy", mouth: "frown", brows: "angry", blush: 0 }
    default:         return { eyes: "open",   mouth: "smile", brows: "none",  blush: 0.35 }
  }
}

const PUPIL  = "#1b1530"
const MOUTH  = "#7c1d2c"
const TONGUE = "#fb7185"

// ─── Eyes ────────────────────────────────────────────────────

interface EyeProps {
  cx: number; cy: number; r: number
  kind: EyeKind
  blink: boolean
  look: number
  bead: boolean
  line: string
  lid: string
}

function Eye({ cx, cy, r, kind, blink, look, bead, line, lid }: EyeProps) {
  const stroke = { fill: "none", stroke: line, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

  if (kind === "sleep" || (blink && (kind === "open" || kind === "grumpy"))) {
    return <path d={`M${cx - r * 0.85} ${cy} Q${cx} ${cy + r * 0.62} ${cx + r * 0.85} ${cy}`} {...stroke} strokeWidth={2.1} />
  }
  if (kind === "happy") {
    return <path d={`M${cx - r * 0.85} ${cy + r * 0.3} Q${cx} ${cy - r * 0.85} ${cx + r * 0.85} ${cy + r * 0.3}`} {...stroke} strokeWidth={2.4} />
  }
  if (kind === "dizzy") {
    const a = r * 0.55, b = r * 0.4, c = r * 0.25
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="#ffffff" stroke={line} strokeWidth={1.6} />
        <path
          d={`M${cx - a} ${cy} A${a} ${a} 0 1 1 ${cx + a} ${cy} A${b} ${b} 0 1 1 ${cx - b + (a - b)} ${cy} A${c} ${c} 0 1 1 ${cx + c} ${cy}`}
          {...stroke}
          strokeWidth={1.5}
        />
      </g>
    )
  }

  const wide = kind === "wide"
  const R = wide ? r * 1.14 : r
  const pr = bead ? (wide ? R * 1.0 : R * 0.95) : wide ? R * 0.4 : R * 0.62
  const px = bead ? cx + look * R * 0.12 : cx + look * R * 0.28
  const py = bead ? cy : cy + (kind === "grumpy" ? R * 0.18 : R * 0.06)

  return (
    <g>
      {!bead && <circle cx={cx} cy={cy} r={R} fill="#ffffff" stroke={line} strokeWidth={1.6} />}
      <circle cx={px} cy={py} r={pr} fill={PUPIL} />
      <circle cx={px - pr * 0.36} cy={py - pr * 0.38} r={pr * (bead ? 0.34 : 0.36)} fill="#ffffff" />
      <circle cx={px + pr * 0.32} cy={py + pr * 0.32} r={pr * 0.15} fill="#ffffff" opacity={0.85} />
      {kind === "grumpy" && (
        <>
          <path
            d={`M${cx - R - 0.5} ${cy - R * 0.1} A${R + 0.5} ${R + 0.5} 0 0 1 ${cx + R + 0.5} ${cy - R * 0.1} Z`}
            fill={lid}
          />
          <path d={`M${cx - R - 0.3} ${cy - R * 0.1} L${cx + R + 0.3} ${cy - R * 0.1}`} {...stroke} strokeWidth={1.8} />
        </>
      )}
    </g>
  )
}

// ─── Mouths ──────────────────────────────────────────────────

function Beak({ x, y, open, line }: { x: number; y: number; open: boolean; line: string }) {
  const dy = open ? -1.5 : 0
  return (
    <g>
      {open && <BeakLower x={x} y={y} line={line} />}
      <path
        d={`M${x - 6.5} ${y - 1.5 + dy} Q${x} ${y - 7 + dy} ${x + 6.5} ${y - 1.5 + dy} Q${x + 5.5} ${y + 5 + dy} ${x} ${y + 9.5 + dy} Q${x - 5.5} ${y + 5 + dy} ${x - 6.5} ${y - 1.5 + dy} Z`}
        fill="#ffae2b"
        stroke={line}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <ellipse cx={x - 2.8} cy={y + 0.6 + dy} rx={1.5} ry={0.9} fill="#ffffff" opacity={0.55} />
      <circle cx={x - 2.6} cy={y - 2.4 + dy} r={0.8} fill={line} opacity={0.6} />
      <circle cx={x + 2.6} cy={y - 2.4 + dy} r={0.8} fill={line} opacity={0.6} />
    </g>
  )
}

function BeakLower({ x, y, line }: { x: number; y: number; line: string }) {
  return (
    <g>
      <path d={`M${x - 6} ${y + 2} Q${x} ${y + 24} ${x + 6} ${y + 2} Z`} fill="#e08a12" stroke={line} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={`M${x - 4.2} ${y + 3} Q${x} ${y + 17} ${x + 4.2} ${y + 3} Z`} fill={MOUTH} />
      <ellipse cx={x} cy={y + 8.4} rx={2} ry={1.3} fill={TONGUE} />
    </g>
  )
}

function OpenMouth({ x, y, line }: { x: number; y: number; line: string }) {
  return <ellipse cx={x} cy={y + 1.2} rx={2.8} ry={3.3} fill={MOUTH} stroke={line} strokeWidth={1.4} />
}

function Mouth({ x, y, kind, style, line, animated }: {
  x: number; y: number; kind: MouthKind; style: "plain" | "snout" | "beak"; line: string; animated: boolean
}) {
  const stroke = { fill: "none", stroke: line, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

  if (style === "beak") {
    return <Beak x={x} y={y} open={kind === "grin" || kind === "o"} line={line} />
  }

  const philtrum = style === "snout" ? <path d={`M${x} ${y - 2.6} L${x} ${y - 0.6}`} {...stroke} strokeWidth={1.5} /> : null

  switch (kind) {
    case "smile":
      return (
        <g>
          {philtrum}
          {style === "snout"
            ? <path d={`M${x - 5} ${y - 0.6} Q${x - 2.5} ${y + 3} ${x} ${y - 0.6} Q${x + 2.5} ${y + 3} ${x + 5} ${y - 0.6}`} {...stroke} strokeWidth={1.7} />
            : <path d={`M${x - 5} ${y - 0.5} Q${x} ${y + 4.5} ${x + 5} ${y - 0.5}`} {...stroke} />}
        </g>
      )
    case "grin":
      return (
        <g>
          {philtrum}
          <path d={`M${x - 6.5} ${y - 1.5} Q${x} ${y + 10} ${x + 6.5} ${y - 1.5} Z`} fill={MOUTH} stroke={line} strokeWidth={1.7} strokeLinejoin="round" />
          <ellipse cx={x} cy={y + 2.6} rx={2.8} ry={1.4} fill={TONGUE} />
        </g>
      )
    case "frown":
      return (
        <g>
          {philtrum}
          <path d={`M${x - 4.5} ${y + 2.5} Q${x} ${y - 2.5} ${x + 4.5} ${y + 2.5}`} {...stroke} />
        </g>
      )
    case "o":
      return <g>{philtrum}<OpenMouth x={x} y={y} line={line} /></g>
    case "snore":
      return (
        <g>
          {philtrum}
          <ellipse cx={x} cy={y + 1} rx={1.8} ry={2} fill={MOUTH}>
            {animated && <animate attributeName="ry" values="1.4;2.6;1.4" dur="3.4s" repeatCount="indefinite" />}
          </ellipse>
        </g>
      )
    case "wobble":
      return (
        <g>
          {philtrum}
          <path d={`M${x - 5} ${y} Q${x - 2.5} ${y - 2.5} ${x} ${y} Q${x + 2.5} ${y + 2.5} ${x + 5} ${y}`} {...stroke} />
        </g>
      )
  }
}

// ─── Face ────────────────────────────────────────────────────

interface FaceProps {
  species:     SpeciesId
  stage:       number
  spec:        FaceSpec
  animated:    boolean
  lookForward: boolean
  /** Changes on every new speech bubble — remounts the mouth flap. */
  talkKey:     number | null
}

export const Face = memo(function Face({ species, stage, spec, animated, lookForward, talkKey }: FaceProps) {
  const sp = SPECIES[species]
  const [blink, setBlink] = useState(false)
  const [look, setLook] = useState(0)

  // Idle life: random blinks (sometimes double) and glances.
  useEffect(() => {
    if (!animated) return
    let tBlink = 0
    let tLook = 0
    const blinkOnce = (then: () => void) => {
      setBlink(true)
      tBlink = window.setTimeout(() => { setBlink(false); then() }, 120)
    }
    const scheduleBlink = () => {
      tBlink = window.setTimeout(() => {
        blinkOnce(() => {
          if (Math.random() < 0.2) tBlink = window.setTimeout(() => blinkOnce(scheduleBlink), 160)
          else scheduleBlink()
        })
      }, 2200 + Math.random() * 3800)
    }
    const scheduleLook = () => {
      tLook = window.setTimeout(() => {
        setLook(Math.random() < 0.5 ? -1 : 1)
        tLook = window.setTimeout(() => { setLook(0); scheduleLook() }, 900 + Math.random() * 1400)
      }, 4500 + Math.random() * 6500)
    }
    scheduleBlink()
    scheduleLook()
    return () => { window.clearTimeout(tBlink); window.clearTimeout(tLook) }
  }, [animated])

  const e = sp.eyes
  const r = stage <= 1 ? e.r * 1.12 : e.r
  const eyeLook = lookForward ? -1 : animated ? look : 0
  const isBlink = animated && blink
  const m = sp.mouth
  const mouthClosed = spec.mouth !== "grin" && spec.mouth !== "o"
  const browY = e.y - r - 3

  return (
    <g>
      {spec.blush > 0 && (
        <g opacity={spec.blush}>
          <ellipse cx={sp.cheeks.lx} cy={sp.cheeks.y} rx={4.4} ry={2.6} fill="#fb7185" />
          <ellipse cx={sp.cheeks.rx} cy={sp.cheeks.y} rx={4.4} ry={2.6} fill="#fb7185" />
        </g>
      )}
      <Eye cx={e.lx} cy={e.y} r={r} kind={spec.eyes} blink={isBlink} look={eyeLook} bead={e.bead} line={sp.line} lid={sp.color} />
      <Eye cx={e.rx} cy={e.y} r={r} kind={spec.eyes} blink={isBlink} look={eyeLook} bead={e.bead} line={sp.line} lid={sp.color} />
      {spec.brows === "angry" && (
        <path
          d={`M${e.lx - 5.5} ${browY - 1.5} L${e.lx + 4.5} ${browY + 1.5} M${e.rx + 5.5} ${browY - 1.5} L${e.rx - 4.5} ${browY + 1.5}`}
          fill="none" stroke={sp.line} strokeWidth={2.2} strokeLinecap="round"
        />
      )}
      {spec.brows === "up" && (
        <path
          d={`M${e.lx - 4} ${browY} Q${e.lx} ${browY - 3.5} ${e.lx + 4} ${browY} M${e.rx - 4} ${browY} Q${e.rx} ${browY - 3.5} ${e.rx + 4} ${browY}`}
          fill="none" stroke={sp.line} strokeWidth={1.8} strokeLinecap="round"
        />
      )}
      {/* a beak's lower jaw flaps *behind* the upper beak */}
      {talkKey != null && mouthClosed && m.style === "beak" && (
        <g key={`t${talkKey}`} className="pet-talk"><BeakLower x={m.x} y={m.y} line={sp.line} /></g>
      )}
      <Mouth x={m.x} y={m.y} kind={spec.mouth} style={m.style} line={sp.line} animated={animated} />
      {talkKey != null && mouthClosed && m.style !== "beak" && (
        <g key={`t${talkKey}`} className="pet-talk"><OpenMouth x={m.x} y={m.y} line={sp.line} /></g>
      )}
    </g>
  )
})
