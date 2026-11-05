"use client"

// Six-sided die drawn in SVG, with a short tumble animation while rolling.

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
}

export function Die({
  value, rolling = false, size = 56, color = "#ffffff", pipColor = "#1f2937", className, label,
}: {
  value:     number
  rolling?:  boolean
  size?:     number
  color?:    string
  pipColor?: string
  className?: string
  label?:    string
}) {
  const reduced = useReducedMotion()
  const v = Math.min(6, Math.max(1, Math.round(value)))
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? (rolling ? "Rolling die" : `Die showing ${v}`)}
      className={cn("drop-shadow-sm", className)}
      animate={rolling && !reduced ? { rotate: [0, -18, 14, -8, 0], y: [0, -6, 0, -3, 0] } : { rotate: 0, y: 0 }}
      transition={rolling ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
    >
      <rect x={4} y={4} width={92} height={92} rx={18} fill={color} stroke="#94a3b8" strokeWidth={3} />
      {PIPS[v].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={8.5} fill={pipColor} />)}
    </motion.svg>
  )
}

export function rollDie(rng: () => number = Math.random): number {
  return 1 + Math.floor(rng() * 6)
}
