"use client"

import { motion, useMotionValue, type MotionValue } from "framer-motion"
import { useLayoutEffect, useRef } from "react"

interface SpeechBubbleProps {
  text:   string
  name:   string
  petX:   MotionValue<number>
  petY:   MotionValue<number>
  boxW:   number
  boxH:   number
}

const MARGIN = 8
const GAP = 10

/**
 * Lives in the overlay (not inside the pet) so it can be clamped to the
 * viewport. Tracks the pet's motion values directly — no re-renders.
 */
export function SpeechBubble({ text, name, petX, petY, boxW, boxH }: SpeechBubbleProps) {
  const ref = useRef<HTMLDivElement>(null)
  const bx = useMotionValue(-9999)
  const by = useMotionValue(-9999)
  const tailX = useMotionValue(0)
  const tailY = useMotionValue(0)
  const origin = useMotionValue("50% 100%")

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let bw = el.offsetWidth
    let bh = el.offsetHeight

    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const px = petX.get()
      const py = petY.get()
      const left = Math.max(MARGIN, Math.min(vw - bw - MARGIN, px + boxW / 2 - bw / 2))
      const above = py - bh - GAP >= MARGIN
      const top = Math.max(MARGIN, Math.min(vh - bh - MARGIN, above ? py - bh - GAP : py + boxH + GAP))
      bx.set(left)
      by.set(top)
      const tx = Math.max(12, Math.min(bw - 24, px + boxW / 2 - left - 6))
      tailX.set(tx)
      tailY.set(above ? bh - 6 : -6)
      origin.set(`${tx + 6}px ${above ? "100%" : "0%"}`)
    }

    update()
    const offX = petX.on("change", update)
    const offY = petY.on("change", update)
    const onResize = () => { bw = el.offsetWidth; bh = el.offsetHeight; update() }
    window.addEventListener("resize", onResize)
    return () => { offX(); offY(); window.removeEventListener("resize", onResize) }
  }, [petX, petY, boxW, boxH, bx, by, tailX, tailY, origin])

  return (
    <motion.div
      ref={ref}
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-0 top-0 w-max max-w-[240px]"
      style={{ x: bx, y: by }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ transformOrigin: origin }}
        className="relative"
      >
        <motion.span aria-hidden="true" className="absolute left-0 top-0 h-3 w-3" style={{ x: tailX, y: tailY }}>
          <span className="block h-3 w-3 rotate-45 border border-border bg-popover" />
        </motion.span>
        <div className="relative rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
          <span className="block text-xs font-medium text-muted-foreground">{name}</span>
          <span className="block text-sm leading-snug text-popover-foreground">{text}</span>
        </div>
      </motion.div>
    </motion.div>
  )
}
