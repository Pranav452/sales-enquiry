"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Apple, Car, Cpu, Fish, Fuel, Pill, Shirt, Wine, type LucideIcon } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

const C = { panel: "#111c33", border: "#1e2d4d", text: "#e2e8f0", muted: "#94a3b8", gold: "#fbbf24" }

interface Cargo { name: string; Icon: LucideIcon; color: string }
const CARGO: Cargo[] = [
  { name: "Seafood", Icon: Fish, color: "#0284c7" },
  { name: "Produce", Icon: Apple, color: "#dc2626" },
  { name: "Wine", Icon: Wine, color: "#9333ea" },
  { name: "Electronics", Icon: Cpu, color: "#16a34a" },
  { name: "Garments", Icon: Shirt, color: "#db2777" },
  { name: "Vehicles", Icon: Car, color: "#d97706" },
  { name: "Fuel", Icon: Fuel, color: "#0d9488" },
  { name: "Pharma", Icon: Pill, color: "#ea580c" },
]

export function shuffled<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function cargoScore(moves: number, seconds: number): number {
  return Math.max(50, 1000 - moves * 15 - seconds * 4)
}

const nowMs = (): number => Date.now()
const RIDGES = "repeating-linear-gradient(90deg, rgba(0,0,0,0.22) 0 3px, rgba(255,255,255,0.05) 3px 8px)"
const HIDDEN: React.CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }

export default function CargoMatch({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [deck] = useState<number[]>(() => shuffled([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7]))
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [wrong, setWrong] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)

  const lockRef = useRef(false)
  const movesRef = useRef(0)
  const startRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const finishedRef = useRef(false)
  const cbRef = useRef(onGameOver)
  useEffect(() => { cbRef.current = onGameOver }, [onGameOver])

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms))
  }, [])

  useEffect(() => {
    const timers = timersRef
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const finish = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    const secs = startRef.current ? Math.floor((nowMs() - startRef.current) / 1000) : 0
    setSeconds(secs)
    const m = movesRef.current
    later(() => {
      if (finishedRef.current) return
      finishedRef.current = true
      cbRef.current({ score: cargoScore(m, secs), won: true, summary: `All pairs matched in ${m} moves, ${secs}s` })
    }, 800)
  }, [later])

  const onCard = (i: number) => {
    if (lockRef.current || matched.includes(i) || flipped.includes(i)) return
    if (startRef.current === null) {
      startRef.current = nowMs()
      intervalRef.current = setInterval(() => {
        if (startRef.current) setSeconds(Math.floor((nowMs() - startRef.current) / 1000))
      }, 500)
    }
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length < 2) return
    lockRef.current = true
    movesRef.current += 1
    setMoves(movesRef.current)
    const [a, b] = next
    if (deck[a] === deck[b]) {
      later(() => {
        const all = [...matched, a, b]
        setMatched(all)
        setFlipped([])
        lockRef.current = false
        if (all.length === deck.length) finish()
      }, 450)
    } else {
      later(() => setWrong([a, b]), 350)
      later(() => { setFlipped([]); setWrong([]); lockRef.current = false }, 950)
    }
  }

  const pairs = matched.length / 2
  const complete = matched.length === deck.length

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 select-none" style={{ color: C.text }}>
      <div className="grid w-full max-w-[380px] grid-cols-3 gap-2">
        {([["Moves", String(moves)], ["Pairs", `${pairs}/8`], ["Time", `${seconds}s`]] as const).map(([label, val]) => (
          <div key={label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: label === "Pairs" ? C.gold : C.text }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid w-full max-w-[380px] grid-cols-4 gap-2" style={{ perspective: 900 }}>
        {deck.map((c, i) => {
          const isMatched = matched.includes(i)
          const faceUp = isMatched || flipped.includes(i)
          const cargo = CARGO[c]
          const isWrong = wrong.includes(i)
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => onCard(i)}
              aria-label={faceUp ? `${cargo.name} container` : `Face-down container ${i + 1}`}
              className="relative aspect-[4/5] w-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              animate={reduced ? undefined : { scale: isMatched ? [1, 1.1, 1] : 1, x: isWrong ? [0, -4, 4, -3, 0] : 0 }}
              transition={{ duration: 0.4 }}
              whileTap={reduced || faceUp ? undefined : { scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                initial={false}
                animate={{ rotateY: faceUp ? 180 : 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: "easeInOut" }}
              >
                {/* back: weathered steel door */}
                <div className="absolute inset-0 flex items-center justify-center rounded-md" style={{ ...HIDDEN, background: `${RIDGES}, #3b4a63`, border: "2px solid #64748b", boxShadow: "inset 0 -6px 0 rgba(0,0,0,0.25)" }}>
                  <div className="h-[55%] w-[2px]" style={{ background: "rgba(15,23,42,0.6)" }} />
                  <div className="absolute left-[42%] top-[45%] h-[10%] w-[4px] rounded-sm" style={{ background: "#cbd5e1" }} />
                  <div className="absolute right-[42%] top-[45%] h-[10%] w-[4px] rounded-sm" style={{ background: "#cbd5e1" }} />
                </div>
                {/* front: coloured container with cargo */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-md"
                  style={{ ...HIDDEN, transform: "rotateY(180deg)", background: `${RIDGES}, ${cargo.color}`, border: `2px solid ${isMatched ? C.gold : "rgba(255,255,255,0.45)"}`, boxShadow: isMatched ? `0 0 14px ${C.gold}88` : "inset 0 -6px 0 rgba(0,0,0,0.22)" }}
                >
                  <div className="flex h-[52%] w-[70%] items-center justify-center rounded-sm" style={{ background: "rgba(2,6,23,0.35)" }}>
                    <cargo.Icon className="h-[70%] w-[70%]" color="#fff" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white/90">{cargo.name}</span>
                </div>
              </motion.div>
            </motion.button>
          )
        })}
      </div>

      <p className="min-h-5 text-center text-sm font-medium" style={{ color: complete ? C.gold : C.text }} aria-live="polite">
        {complete ? "Manifest complete. All cargo accounted for!" : "Flip two containers to find a matching pair."}
      </p>
      <p className="text-center text-xs" style={{ color: C.muted }}>Fewer moves and less time means a higher score. Timer starts on your first flip.</p>
    </div>
  )
}
