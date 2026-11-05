"use client"

import { motion } from "framer-motion"
import { memo } from "react"

export interface Heart {
  dx: number
  dy: number
  rot: number
  s: number
  delay: number
  color: string
}

export interface HeartBurst { id: number; hearts: Heart[] }
export interface XpPop { id: number; text: string }

const HEART_PATH =
  "M12 20.5 C5 15.5 2.5 12.2 2.5 8.6 C2.5 5.8 4.7 3.6 7.4 3.6 C9.3 3.6 11 4.7 12 6.3 C13 4.7 14.7 3.6 16.6 3.6 C19.3 3.6 21.5 5.8 21.5 8.6 C21.5 12.2 19 15.5 12 20.5 Z"

const HEART_COLORS = ["#f472b6", "#fb7185", "#ef4444"]

/** Build a burst (call from an event handler — uses Math.random). */
export function makeHearts(count = 6): Heart[] {
  return Array.from({ length: count }, (_, i) => {
    const a = -Math.PI / 2 + (i - (count - 1) / 2) * 0.42 + (Math.random() - 0.5) * 0.3
    const d = 34 + Math.random() * 22
    return {
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d - 10,
      rot: (Math.random() - 0.5) * 50,
      s: 0.7 + Math.random() * 0.6,
      delay: i * 0.03,
      color: HEART_COLORS[i % HEART_COLORS.length],
    }
  })
}

/** Hearts fly out of the pet's head. Positioned at the top-centre of the pet box. */
export const HeartBursts = memo(function HeartBursts({ bursts, top }: { bursts: HeartBurst[]; top: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2" style={{ top }}>
      {bursts.map((b) =>
        b.hearts.map((h, i) => (
          <motion.svg
            key={`${b.id}-${i}`}
            viewBox="0 0 24 24"
            width={16}
            height={16}
            className="absolute -left-2 -top-2"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
            animate={{ x: h.dx, y: h.dy, scale: h.s, opacity: 0, rotate: h.rot }}
            transition={{ duration: 0.95, delay: h.delay, ease: [0.2, 0.7, 0.3, 1], opacity: { duration: 0.95, delay: h.delay + 0.25 } }}
          >
            <path d={HEART_PATH} fill={h.color} stroke="#ffffff" strokeWidth={1.4} />
          </motion.svg>
        )),
      )}
    </div>
  )
})

/** Floating "+N XP" labels. */
export const XpPops = memo(function XpPops({ pops, top }: { pops: XpPop[]; top: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2" style={{ top }}>
      {pops.map((p) => (
        <motion.div
          key={p.id}
          // fixed colours: readable on light, dark and pink themes alike
          className="absolute -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-800 shadow-md"
          initial={{ y: 0, opacity: 0, scale: 0.6 }}
          animate={{ y: -48, opacity: [0, 1, 1, 0], scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", opacity: { duration: 1.5, times: [0, 0.15, 0.7, 1] } }}
        >
          {p.text}
        </motion.div>
      ))}
    </div>
  )
})
