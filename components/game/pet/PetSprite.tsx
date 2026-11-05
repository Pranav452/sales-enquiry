"use client"

// Assembles a pet: aura, body, gear, face and mood weather.
// Pure SVG; idle motion comes from SMIL + CSS so React stays quiet.

import { memo, useId } from "react"
import type { PetMood } from "@/lib/game/types"
import { BODIES } from "./art/bodies"
import { Face, faceFor } from "./art/face"
import { CaptainHat, Crown, Neckerchief, SailorCap } from "./art/gear"
import type { Energy } from "./art/Sway"
import { SPECIES, clampStage, gearTop, stageViewBox, type Expression, type SpeciesId } from "./species"

export interface PetSpriteProps {
  species:      SpeciesId
  stage:        number
  mood:         PetMood
  expression?:  Expression | null
  walking?:     boolean
  /** Pupils point "forward" (the walking direction). */
  lookForward?: boolean
  /** Idle animations (blink, limbs, weather). Off for reduced motion. */
  animated?:    boolean
  /** New value per speech bubble — flaps the mouth briefly. */
  talkKey?:     number | null
  /** Arena glow colour for the stage-5 aura. */
  glow?:        string
  /** Pixel width; height follows the stage's viewBox. */
  size:         number
  /** Draw a soft ground shadow (previews; the companion draws its own). */
  shadow?:      boolean
  className?:   string
}

function energyFor(mood: PetMood, expression: Expression | null | undefined): Energy {
  if (expression === "love" || expression === "cheer" || expression === "whee") return "wild"
  if (expression === "dizzy") return "calm"
  switch (mood) {
    case "sleepy":   return "still"
    case "grumpy":   return "droop"
    case "happy":    return "lively"
    case "ecstatic": return "wild"
    default:         return "calm"
  }
}

export function petBoxSize(size: number, stage: number): { w: number; h: number } {
  const vb = stageViewBox(clampStage(stage))
  return { w: size, h: Math.round((size * vb.height) / 100) }
}

// ─── Mood weather ────────────────────────────────────────────

function Zzz({ x, y, animated }: { x: number; y: number; animated: boolean }) {
  const letters = [
    { s: 8,  dx: 0,  dy: 0,   delay: 0 },
    { s: 10, dx: 6,  dy: -8,  delay: 0.9 },
    { s: 12, dx: 13, dy: -17, delay: 1.8 },
  ]
  return (
    <g pointerEvents="none" fontFamily="ui-rounded, system-ui, sans-serif" fontWeight={800} fill="#7c8db5">
      {letters.map((l, i) =>
        animated ? (
          <text key={i} x={x} y={y} fontSize={l.s} opacity={0}>
            z
            <animateTransform attributeName="transform" type="translate" values="0 0;14 -20" dur="2.7s" begin={`${-l.delay}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.7;1" dur="2.7s" begin={`${-l.delay}s`} repeatCount="indefinite" />
          </text>
        ) : (
          <text key={i} x={x + l.dx} y={y + l.dy} fontSize={l.s} opacity={1 - i * 0.25}>z</text>
        ),
      )}
    </g>
  )
}

function RainCloud({ x, y, animated }: { x: number; y: number; animated: boolean }) {
  const puffs: [number, number, number][] = [[-6.5, 0, 5], [0, -3, 6.5], [6.5, 0, 5]]
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <g>
        {animated && (
          <animateTransform attributeName="transform" type="translate" values="-1.5 0;1.5 0;-1.5 0" dur="3.2s" repeatCount="indefinite" />
        )}
        {[-5, 0, 5].map((dx, i) => (
          <line key={dx} x1={dx} y1={6} x2={dx - 0.8} y2={9} stroke="#60a5fa" strokeWidth={1.6} strokeLinecap="round" opacity={animated ? 0 : 0.8}>
            {animated && (
              <>
                <animateTransform attributeName="transform" type="translate" values="0 0;-1.5 9" dur="0.9s" begin={`${-i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;0" dur="0.9s" begin={`${-i * 0.3}s`} repeatCount="indefinite" />
              </>
            )}
          </line>
        ))}
        {puffs.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r + 1.3} fill="#64748b" />)}
        <rect x={-6.5} y={-0.5} width={13} height={6.3} fill="#64748b" rx={2} />
        {puffs.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill="#a8b4c4" />)}
        <rect x={-6.5} y={0} width={13} height={5} fill="#a8b4c4" rx={2} />
      </g>
    </g>
  )
}

const SPARKLE = "M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z"

function Sparkles({ animated, color }: { animated: boolean; color: string }) {
  const spots: [number, number, number, string][] = [
    [6, 34, 1, "#facc15"], [94, 26, 0.85, color], [95, 72, 0.9, "#facc15"], [5, 78, 0.7, color],
  ]
  return (
    <g pointerEvents="none">
      {spots.map(([x, y, s, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
          <path d={SPARKLE} fill={c} stroke="#ffffff" strokeWidth={0.6}>
            {animated && (
              <animateTransform attributeName="transform" type="scale" values="0;1;0;0" keyTimes="0;0.3;0.6;1" dur="1.8s" begin={`${-i * 0.45}s`} repeatCount="indefinite" />
            )}
          </path>
        </g>
      ))}
    </g>
  )
}

function Aura({ id, glow, animated }: { id: string; glow: string; animated: boolean }) {
  const gid = `pet-aura-${id}`
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={gid}>
          <stop offset="0%" stopColor={glow} stopOpacity={0.8} />
          <stop offset="55%" stopColor={glow} stopOpacity={0.3} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={50} cy={58} r={60} fill={`url(#${gid})`} className={animated ? "pet-aura" : undefined} />
      <g>
        {animated && (
          <animateTransform attributeName="transform" type="rotate" values="0 50 58;360 50 58" dur="10s" repeatCount="indefinite" />
        )}
        {([[50, -2], [102, 88], [-2, 88]] as const).map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={2.6} fill={glow} opacity={0.9} />
            <circle cx={cx} cy={cy} r={1.1} fill="#ffffff" />
          </g>
        ))}
      </g>
    </g>
  )
}

// ─── Sprite ──────────────────────────────────────────────────

export const PetSprite = memo(function PetSprite({
  species, stage: rawStage, mood, expression = null, walking = false, lookForward = false,
  animated = true, talkKey = null, glow = "#9ad8f0", size, shadow = false, className,
}: PetSpriteProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const stage = clampStage(rawStage)
  const sp = SPECIES[species]
  const vb = stageViewBox(stage)
  const box = petBoxSize(size, stage)
  const Body = BODIES[species]
  const energy = energyFor(mood, expression)
  const spec = faceFor(mood, expression)
  const top = gearTop(species, stage)
  const showWeather = !expression

  return (
    <svg
      width={box.w}
      height={box.h}
      viewBox={`0 ${vb.top} 100 ${vb.height}`}
      className={className}
      style={{ overflow: "visible" }}
      aria-hidden="true"
      focusable="false"
    >
      {stage >= 5 && <Aura id={uid} glow={glow} animated={animated} />}
      {shadow && <ellipse cx={50} cy={97} rx={27} ry={3.4} fill="currentColor" opacity={0.14} />}
      <Body energy={energy} walking={walking} animated={animated} />
      {stage >= 3 && <Neckerchief x={sp.neck.x} y={sp.neck.y} w={sp.neck.w} color={sp.neck.color} />}
      <Face species={species} stage={stage} spec={spec} animated={animated} lookForward={lookForward} talkKey={talkKey} />
      {stage >= 2 && stage < 4 && <SailorCap x={sp.head.x} y={sp.head.y} w={sp.head.w} />}
      {stage >= 4 && <CaptainHat x={sp.head.x} y={sp.head.y} w={sp.head.w} />}
      {stage >= 5 && <Crown x={sp.head.x} y={sp.head.y} w={sp.head.w} animated={animated} />}
      {showWeather && mood === "sleepy" && <Zzz x={sp.head.x + 16} y={top + 4} animated={animated} />}
      {showWeather && mood === "grumpy" && <RainCloud x={sp.head.x + 3} y={top - 10} animated={animated} />}
      {(mood === "ecstatic" || expression === "cheer") && <Sparkles animated={animated} color={glow} />}
    </svg>
  )
})
