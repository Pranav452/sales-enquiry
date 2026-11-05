import type { ReactNode } from "react"

export type Energy = "still" | "droop" | "calm" | "lively" | "wild"

interface SwayProps {
  /** Rotation pivot in SVG user units. */
  pivot:    [number, number]
  /** Resting angle (deg, clockwise). */
  base?:    number
  /** Swing amplitude either side of base (deg). */
  amp?:     number
  /** Seconds per full cycle. */
  dur?:     number
  /** 0..1 phase offset so limbs don't move in lockstep. */
  phase?:   number
  on?:      boolean
  children: ReactNode
}

const EASE = "0.45 0 0.55 1"

/**
 * Rotates its children around an explicit pivot using SMIL
 * (unambiguous pivots inside mirrored groups; no React re-renders).
 */
export function Sway({ pivot, base = 0, amp = 0, dur = 1, phase = 0, on = false, children }: SwayProps) {
  const [px, py] = pivot
  if (!on || amp === 0) {
    return <g transform={base ? `rotate(${base} ${px} ${py})` : undefined}>{children}</g>
  }
  const v = (a: number) => `${a} ${px} ${py}`
  return (
    <g transform={base ? `rotate(${base} ${px} ${py})` : undefined}>
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={`${v(base)};${v(base + amp)};${v(base)};${v(base - amp)};${v(base)}`}
        keyTimes="0;0.25;0.5;0.75;1"
        calcMode="spline"
        keySplines={`${EASE};${EASE};${EASE};${EASE}`}
        dur={`${dur}s`}
        begin={`${(-phase * dur).toFixed(2)}s`}
        repeatCount="indefinite"
      />
      {children}
    </g>
  )
}

/** Mirror children across the vertical centre line (x = 50). */
export function Mirror({ children }: { children: ReactNode }) {
  return <g transform="translate(100 0) scale(-1 1)">{children}</g>
}

/** A stroked limb with a dark outline underneath. */
export function Limb({ d, color, line, width }: { d: string; color: string; line: string; width: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={line} strokeWidth={width + 3.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}
