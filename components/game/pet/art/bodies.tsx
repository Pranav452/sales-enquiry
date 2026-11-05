// Species bodies (no faces). Each is drawn facing slightly left; the
// companion mirrors the whole sprite when it walks to the right.

import { memo, type ComponentType } from "react"
import type { SpeciesId } from "../species"
import { Limb, Mirror, Sway, type Energy } from "./Sway"

export interface BodyProps {
  energy:   Energy
  walking:  boolean
  animated: boolean
}

interface SwingSpec { base: number; amp: number; dur: number }

function swing(energy: Energy, table: Record<Energy, SwingSpec>): SwingSpec {
  return table[energy]
}

// ─── Crab "Barnacle" ─────────────────────────────────────────

const CRAB = { body: "#f05d3e", dark: "#cf4429", light: "#ffb8a0", line: "#6b1d10" }
const CRAB_LEGS = ["M31 76 Q20 76 14 86", "M33 82 Q24 85 20 93", "M38 86 Q33 91 31 96"]
const CRAB_LEG_PIVOTS: [number, number][] = [[31, 76], [33, 82], [38, 86]]
const CRAB_CLAW: Record<Energy, SwingSpec> = {
  still:  { base: -14, amp: 0,  dur: 1 },
  droop:  { base: -22, amp: 2,  dur: 4 },
  calm:   { base: 0,   amp: 3,  dur: 3.2 },
  lively: { base: 2,   amp: 10, dur: 0.9 },
  wild:   { base: 6,   amp: 16, dur: 0.5 },
}

function CrabHalf({ energy, walking, animated, side }: BodyProps & { side: 0 | 1 }) {
  const claw = swing(energy, CRAB_CLAW)
  return (
    <>
      {CRAB_LEGS.map((d, i) => (
        <Sway
          key={d}
          pivot={CRAB_LEG_PIVOTS[i]}
          on={animated && (walking || energy === "wild")}
          amp={walking ? 14 : 6}
          dur={walking ? 0.32 : 0.5}
          phase={(i % 2) * 0.5 + side * 0.25}
        >
          <Limb d={d} color={CRAB.dark} line={CRAB.line} width={4.4} />
        </Sway>
      ))}
      <Sway pivot={[26, 68]} on={animated} base={claw.base} amp={claw.amp} dur={claw.dur} phase={side * 0.5}>
        <Limb d="M26 68 Q16 65 14 54" color={CRAB.body} line={CRAB.line} width={5} />
        <path
          d="M13 47 L21.2 39.6 A11 11 0 1 1 11.5 36.1 Z"
          fill={CRAB.body}
          stroke={CRAB.line}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <ellipse cx={8.5} cy={47} rx={2.6} ry={1.8} fill="#ffffff" opacity={0.35} />
      </Sway>
    </>
  )
}

const CrabBody = memo(function CrabBody(p: BodyProps) {
  return (
    <g>
      <CrabHalf {...p} side={0} />
      <Mirror><CrabHalf {...p} side={1} /></Mirror>
      <path
        d="M18 70 C18 50 32 41 50 41 C68 41 82 50 82 70 C82 84 67 91 50 91 C33 91 18 84 18 70 Z"
        fill={CRAB.body}
        stroke={CRAB.line}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <ellipse cx={50} cy={81} rx={21} ry={7.5} fill={CRAB.light} opacity={0.75} />
      <ellipse cx={33} cy={52} rx={6} ry={3} transform="rotate(-28 33 52)" fill="#ffffff" opacity={0.35} />
      {/* the namesake barnacle */}
      <path d="M68 56 L70 50.5 L74.5 50.5 L76.5 56 Z" fill="#e9dfcf" stroke={CRAB.line} strokeWidth={1.3} strokeLinejoin="round" />
      <ellipse cx={72.2} cy={50.6} rx={2.2} ry={0.9} fill="#8b7d6b" />
      <circle cx={63} cy={48} r={1.5} fill={CRAB.light} opacity={0.8} />
    </g>
  )
})

// ─── Sea otter "Skipper" ─────────────────────────────────────

// Sea otters have a dark body and a pale, grizzled head — that contrast
// (plus tiny low ears and whiskers) is what stops it reading as a bear.
const OTTER = {
  fur: "#7a4b2e", dark: "#5c3820", head: "#cfab84", cream: "#f5e8d6",
  nose: "#2e1a10", line: "#3f2414", clam: "#f9a8c0",
}
const OTTER_TAIL: Record<Energy, SwingSpec> = {
  still:  { base: 6,  amp: 0,  dur: 1 },
  droop:  { base: 10, amp: 2,  dur: 4 },
  calm:   { base: 0,  amp: 4,  dur: 2.6 },
  lively: { base: -2, amp: 10, dur: 0.8 },
  wild:   { base: -4, amp: 14, dur: 0.45 },
}

const OtterBody = memo(function OtterBody({ energy, walking, animated }: BodyProps) {
  const tail = swing(energy, OTTER_TAIL)
  return (
    <g>
      <Sway pivot={[66, 82]} on={animated} base={tail.base} amp={tail.amp} dur={tail.dur}>
        <path d="M63 86 C78 90 90 86 93 76 C88 79 80 81 66 79 Z" fill={OTTER.dark} stroke={OTTER.line} strokeWidth={2} strokeLinejoin="round" />
      </Sway>
      {([[39, 0], [61, 0.5]] as const).map(([fx, ph]) => (
        <Sway key={fx} pivot={[fx, 91]} on={animated && walking} amp={12} dur={0.36} phase={ph}>
          <ellipse cx={fx} cy={94} rx={7} ry={3.6} fill={OTTER.dark} stroke={OTTER.line} strokeWidth={1.8} />
        </Sway>
      ))}
      <ellipse cx={50} cy={79} rx={23} ry={17} fill={OTTER.fur} stroke={OTTER.line} strokeWidth={2.2} />
      <ellipse cx={50} cy={82} rx={15} ry={11} fill={OTTER.cream} />
      {/* lucky clam held on the belly */}
      <path d="M42.5 90 Q50 78.5 57.5 90 Z" fill={OTTER.clam} stroke={OTTER.line} strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M50 81 L50 89.5 M46.4 83 L45.4 89.5 M53.6 83 L54.6 89.5" stroke={OTTER.line} strokeWidth={0.9} opacity={0.45} />
      <ellipse cx={42.5} cy={87} rx={4.6} ry={3.6} fill={OTTER.fur} stroke={OTTER.line} strokeWidth={1.6} />
      <ellipse cx={57.5} cy={87} rx={4.6} ry={3.6} fill={OTTER.fur} stroke={OTTER.line} strokeWidth={1.6} />
      {/* small, low-set ears */}
      <circle cx={26.5} cy={39} r={4.6} fill={OTTER.fur} stroke={OTTER.line} strokeWidth={1.9} />
      <circle cx={73.5} cy={39} r={4.6} fill={OTTER.fur} stroke={OTTER.line} strokeWidth={1.9} />
      {/* wide, pale head */}
      <ellipse cx={50} cy={47} rx={25.5} ry={23} fill={OTTER.head} stroke={OTTER.line} strokeWidth={2.2} />
      <path d="M33 33 Q50 26 67 33" fill="none" stroke={OTTER.fur} strokeWidth={1.2} strokeLinecap="round" opacity={0.25} />
      <ellipse cx={50} cy={54} rx={17} ry={11.5} fill={OTTER.cream} />
      <ellipse cx={37} cy={33} rx={5} ry={2.6} transform="rotate(-25 37 33)" fill="#ffffff" opacity={0.3} />
      {/* nose + whiskers */}
      <path d="M45.5 50.5 Q50 48 54.5 50.5 Q53 54.5 50 54.5 Q47 54.5 45.5 50.5 Z" fill={OTTER.nose} />
      <ellipse cx={48.4} cy={50.4} rx={1.3} ry={0.7} fill="#ffffff" opacity={0.5} />
      <path d="M41 55 L30.5 53.2 M41 57.6 L31 59.4 M59 55 L69.5 53.2 M59 57.6 L69 59.4" stroke={OTTER.line} strokeWidth={0.9} strokeLinecap="round" opacity={0.55} />
    </g>
  )
})

// ─── Octopus "Inky" ──────────────────────────────────────────

const OCTO = { body: "#9877f0", dark: "#7655d8", spots: "#c8b6fb", line: "#37246e" }
const OCTO_ARMS: { d: string; pivot: [number, number]; tip: [number, number] }[] = [
  { d: "M33 64 C26 72 16 76 13 84 C11 90 16 94 20 90", pivot: [33, 64], tip: [17, 90] },
  { d: "M40 68 C38 78 30 85 30 91 C30 96 36 96 36 92", pivot: [40, 68], tip: [32.5, 93] },
  { d: "M47 70 C47 80 44 88 46 94 C47 97 51 96 50 93", pivot: [47, 70], tip: [47.5, 94.5] },
]
const OCTO_ARM: Record<Energy, SwingSpec> = {
  still:  { base: 6, amp: 0,  dur: 1 },
  droop:  { base: 0, amp: 2,  dur: 4 },
  calm:   { base: 0, amp: 5,  dur: 2.4 },
  lively: { base: 2, amp: 9,  dur: 1.2 },
  wild:   { base: 4, amp: 14, dur: 0.7 },
}

function OctoHalf({ energy, walking, animated, side }: BodyProps & { side: 0 | 1 }) {
  const arm = swing(energy, OCTO_ARM)
  return (
    <>
      {OCTO_ARMS.map((a, i) => (
        <Sway
          key={a.d}
          pivot={a.pivot}
          on={animated}
          base={arm.base}
          amp={walking ? 12 : arm.amp}
          dur={walking ? 0.5 : arm.dur}
          phase={i * 0.17 + side * 0.33}
        >
          <Limb d={a.d} color={OCTO.body} line={OCTO.line} width={7.5} />
          <circle cx={a.tip[0]} cy={a.tip[1]} r={1.2} fill={OCTO.spots} />
        </Sway>
      ))}
    </>
  )
}

const OctopusBody = memo(function OctopusBody(p: BodyProps) {
  return (
    <g>
      <OctoHalf {...p} side={0} />
      <Mirror><OctoHalf {...p} side={1} /></Mirror>
      <path
        d="M50 18 C71 18 80 34 80 48 C80 62 68 72 50 72 C32 72 20 62 20 48 C20 34 29 18 50 18 Z"
        fill={OCTO.body}
        stroke={OCTO.line}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <ellipse cx={35} cy={31} rx={6} ry={3.4} transform="rotate(-35 35 31)" fill="#ffffff" opacity={0.3} />
      <circle cx={63} cy={27} r={2.6} fill={OCTO.spots} />
      <circle cx={70} cy={36} r={1.8} fill={OCTO.spots} />
      <circle cx={57} cy={22.5} r={1.5} fill={OCTO.spots} />
      <circle cx={27} cy={44} r={1.4} fill={OCTO.spots} />
    </g>
  )
})

// ─── Parrot "Polly" ──────────────────────────────────────────

const PARROT = { green: "#2fb35a", dark: "#1d8a42", belly: "#ffd54a", red: "#ef4444", yellow: "#facc15", blue: "#3b82f6", feet: "#a8a29e", line: "#14432a" }
const PARROT_WING: Record<Energy, SwingSpec> = {
  still:  { base: -2, amp: 0,  dur: 1 },
  droop:  { base: -4, amp: 2,  dur: 4 },
  calm:   { base: 2,  amp: 3,  dur: 3 },
  lively: { base: 10, amp: 14, dur: 0.5 },
  wild:   { base: 22, amp: 20, dur: 0.28 },
}

function ParrotWing({ energy, animated, side }: BodyProps & { side: 0 | 1 }) {
  const w = swing(energy, PARROT_WING)
  return (
    <Sway pivot={[33, 61]} on={animated} base={w.base} amp={w.amp} dur={w.dur} phase={side * 0.05}>
      <ellipse cx={29.5} cy={77} rx={7.4} ry={13.5} transform="rotate(12 29.5 77)" fill={PARROT.blue} stroke={PARROT.line} strokeWidth={1.8} />
      <ellipse cx={30.5} cy={72} rx={7.8} ry={12.5} transform="rotate(12 30.5 72)" fill={PARROT.dark} stroke={PARROT.line} strokeWidth={1.8} />
    </Sway>
  )
}

const ParrotBody = memo(function ParrotBody(p: BodyProps) {
  const { energy, walking, animated } = p
  const perky = energy === "lively" || energy === "wild"
  return (
    <g>
      {/* tail feathers */}
      <Sway pivot={[56, 84]} on={animated} amp={perky ? 6 : 3} dur={perky ? 1 : 2.8}>
        <ellipse cx={66} cy={94} rx={13} ry={4} transform="rotate(58 66 94)" fill={PARROT.red} stroke={PARROT.line} strokeWidth={1.5} />
        <ellipse cx={69} cy={91} rx={15} ry={4.2} transform="rotate(38 69 91)" fill={PARROT.blue} stroke={PARROT.line} strokeWidth={1.5} />
      </Sway>
      {([[44, 0], [56, 0.5]] as const).map(([fx, ph]) => (
        <Sway key={fx} pivot={[fx, 92]} on={animated && walking} amp={10} dur={0.3} phase={ph}>
          <path d={`M${fx - 4.5} 95.5 Q${fx} 92 ${fx + 4.5} 95.5`} fill="none" stroke={PARROT.line} strokeWidth={4.6} strokeLinecap="round" />
          <path d={`M${fx - 4.5} 95.5 Q${fx} 92 ${fx + 4.5} 95.5`} fill="none" stroke={PARROT.feet} strokeWidth={2.4} strokeLinecap="round" />
        </Sway>
      ))}
      {/* crest (behind the head, leaning back so hats leave it peeking out) */}
      <Sway pivot={[54, 24]} on={animated && perky} amp={energy === "wild" ? 10 : 6} dur={energy === "wild" ? 0.4 : 0.7}>
        <path d="M47 24 C44 16 46 10 51 8 C50 14 51 19 52.5 24 Z" fill={PARROT.red} stroke={PARROT.line} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M56 25 C57 16 63 12 68 12 C65 17 63 21 61 26 Z" fill={PARROT.yellow} stroke={PARROT.line} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M51.5 24 C50 14 54 8 60 6 C58 12 58 18 57.5 24 Z" fill={PARROT.red} stroke={PARROT.line} strokeWidth={1.5} strokeLinejoin="round" />
      </Sway>
      <ellipse cx={50} cy={72} rx={20} ry={21} fill={PARROT.green} stroke={PARROT.line} strokeWidth={2.2} />
      <ellipse cx={50} cy={77} rx={12.5} ry={13.5} fill={PARROT.belly} />
      <path d="M44 74 Q50 77 56 74 M45 80 Q50 83 55 80" fill="none" stroke="#f0b429" strokeWidth={1} strokeLinecap="round" opacity={0.7} />
      <ParrotWing {...p} side={0} />
      <Mirror><ParrotWing {...p} side={1} /></Mirror>
      <circle cx={50} cy={40} r={21} fill={PARROT.green} stroke={PARROT.line} strokeWidth={2.2} />
      <ellipse cx={39} cy={28} rx={5} ry={2.6} transform="rotate(-30 39 28)" fill="#ffffff" opacity={0.25} />
    </g>
  )
})

export const BODIES: Record<SpeciesId, ComponentType<BodyProps>> = {
  crab: CrabBody,
  otter: OtterBody,
  octopus: OctopusBody,
  parrot: ParrotBody,
}
