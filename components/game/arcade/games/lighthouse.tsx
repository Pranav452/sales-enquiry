"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import type { ArcadeGameProps } from "@/lib/game/arcade"

const C = { panel: "#111c33", border: "#1e2d4d", text: "#e2e8f0", muted: "#94a3b8", gold: "#facc15" }

interface Beacon { key: string; name: string; color: string; glow: string; freq: number; pos: string }
const BEACONS: Beacon[] = [
  { key: "1", name: "Red", color: "#ef4444", glow: "#fca5a5", freq: 261.63, pos: "top-0 left-0" },
  { key: "2", name: "Green", color: "#22c55e", glow: "#86efac", freq: 329.63, pos: "top-0 right-0" },
  { key: "3", name: "Blue", color: "#3b82f6", glow: "#93c5fd", freq: 392.0, pos: "bottom-0 left-0" },
  { key: "4", name: "Yellow", color: "#eab308", glow: "#fde047", freq: 523.25, pos: "bottom-0 right-0" },
]

type Phase = "ready" | "showing" | "input" | "over"

function towerX(y: number, side: -1 | 1): number {
  return 30 + side * (8 + ((y - 40) * 4) / 70)
}

function LighthouseArt({ lit }: { lit: Beacon | null }) {
  const band = (y1: number, y2: number) =>
    `${towerX(y1, -1)},${y1} ${towerX(y1, 1)},${y1} ${towerX(y2, 1)},${y2} ${towerX(y2, -1)},${y2}`
  return (
    <svg viewBox="0 0 60 120" className="h-full w-full" style={{ overflow: "visible" }} aria-hidden>
      {lit && (
        <>
          <polygon points="23,34 -70,14 -70,54" fill={lit.color} opacity={0.22} />
          <polygon points="37,34 130,14 130,54" fill={lit.color} opacity={0.22} />
        </>
      )}
      <polygon points={band(40, 110)} fill="#e2e8f0" />
      <polygon points={band(54, 68)} fill="#dc2626" />
      <polygon points={band(82, 96)} fill="#dc2626" />
      <rect x={17} y={110} width={26} height={6} rx={2} fill="#475569" />
      <rect x={18} y={37} width={24} height={4} rx={1} fill="#334155" />
      <rect x={23} y={25} width={14} height={12} rx={2} fill={lit ? lit.glow : "#334155"} stroke="#94a3b8" strokeWidth={1} />
      <polygon points="21,25 30,13 39,25" fill="#475569" />
      <circle cx={30} cy={11} r={1.8} fill="#94a3b8" />
    </svg>
  )
}

export default function Lighthouse({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [phase, setPhaseState] = useState<Phase>("ready")
  const [lit, setLit] = useState<number | null>(null)
  const [len, setLen] = useState(0)
  const [pos, setPos] = useState(0)
  const [score, setScore] = useState(0)

  const phaseRef = useRef<Phase>("ready")
  const seqRef = useRef<number[]>([])
  const posRef = useRef(0)
  const completedRef = useRef(0)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const ctxRef = useRef<AudioContext | null>(null)
  const finishedRef = useRef(false)
  const cbRef = useRef(onGameOver)
  useEffect(() => { cbRef.current = onGameOver }, [onGameOver])

  const go = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p) }, [])
  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms))
  }, [])

  const ensureAudio = useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AC: typeof AudioContext | undefined =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AC) ctxRef.current = new AC()
      }
      if (ctxRef.current && ctxRef.current.state === "suspended") void ctxRef.current.resume().catch(() => undefined)
    } catch {
      ctxRef.current = null
    }
  }, [])

  const tone = useCallback((freq: number, ms: number, type: OscillatorType = "sine") => {
    try {
      const ctx = ctxRef.current
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = ctx.currentTime
      osc.type = type
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + ms / 1000 + 0.05)
    } catch {
      /* audio unavailable: ignore */
    }
  }, [])

  const playSequence = useCallback(() => {
    go("showing")
    const seq = seqRef.current
    const n = seq.length
    setLen(n)
    const on = Math.max(220, 620 - n * 28)
    const gap = Math.max(110, 260 - n * 10)
    let t = 600
    seq.forEach((b) => {
      later(() => { setLit(b); tone(BEACONS[b].freq, on) }, t)
      later(() => setLit(null), t + on)
      t += on + gap
    })
    later(() => { posRef.current = 0; setPos(0); go("input") }, t)
  }, [go, later, tone])

  const start = useCallback(() => {
    if (phaseRef.current !== "ready") return
    ensureAudio()
    seqRef.current = [Math.floor(Math.random() * 4)]
    playSequence()
  }, [ensureAudio, playSequence])

  const press = useCallback((i: number) => {
    if (phaseRef.current !== "input") return
    ensureAudio()
    setLit(i)
    later(() => setLit(null), 180)
    const seq = seqRef.current
    if (i !== seq[posRef.current]) {
      tone(110, 450, "sawtooth")
      go("over")
      setScore(completedRef.current)
      later(() => {
        if (finishedRef.current) return
        finishedRef.current = true
        const s = completedRef.current
        cbRef.current({ score: s, summary: s === 0 ? "Lost the signal on the first round" : `Longest sequence: ${s}` })
      }, 900)
      return
    }
    tone(BEACONS[i].freq, 180)
    posRef.current += 1
    setPos(posRef.current)
    if (posRef.current === seq.length) {
      completedRef.current = seq.length
      setScore(seq.length)
      go("showing")
      later(() => {
        seqRef.current = [...seqRef.current, Math.floor(Math.random() * 4)]
        playSequence()
      }, 900)
    }
  }, [ensureAudio, go, later, playSequence, tone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault()
        press(Number(e.key) - 1)
      } else if ((e.key === "Enter" || e.key === " ") && phaseRef.current === "ready") {
        e.preventDefault()
        start()
      } else if (e.key === " " || e.key.startsWith("Arrow")) {
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [press, start])

  useEffect(() => {
    const timers = timersRef
    const ctx = ctxRef
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
      try { void ctx.current?.close().catch(() => undefined) } catch { /* ignore */ }
      ctx.current = null
    }
  }, [])

  let status = "Press Start to light the lamp"
  if (phase === "showing") status = "Watch the beacons..."
  else if (phase === "input") status = `Your turn: ${pos}/${len}`
  else if (phase === "over") status = "Signal lost!"

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-3 select-none" style={{ color: C.text }}>
      <div className="grid w-full max-w-[340px] grid-cols-2 gap-2">
        {([["Sequence", String(len)], ["Best", String(score)]] as const).map(([label, val]) => (
          <div key={label} className="rounded-lg px-2 py-1.5 text-center" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</div>
            <div className="text-base font-bold tabular-nums" style={{ color: label === "Best" ? C.gold : C.text }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="relative aspect-square w-full max-w-[340px]">
        <div className="absolute left-1/2 top-[6%] h-[88%] w-[34%] -translate-x-1/2">
          <LighthouseArt lit={lit !== null ? BEACONS[lit] : null} />
        </div>
        {BEACONS.map((b, i) => {
          const on = lit === i
          return (
            <motion.button
              key={b.key}
              type="button"
              onClick={() => press(i)}
              aria-label={`${b.name} beacon, key ${b.key}`}
              className={`absolute ${b.pos} flex aspect-square w-[34%] cursor-pointer items-center justify-center rounded-full text-lg font-bold outline-none focus-visible:ring-2 focus-visible:ring-white`}
              style={{
                background: `radial-gradient(circle at 35% 30%, ${b.glow}, ${b.color} 65%)`,
                border: `3px solid ${on ? "#fff" : "rgba(255,255,255,0.2)"}`,
                color: "rgba(15,23,42,0.75)",
                boxShadow: on ? `0 0 38px 10px ${b.color}` : "none",
              }}
              animate={{ opacity: on ? 1 : phase === "over" ? 0.3 : 0.42, scale: on && !reduced ? 1.1 : 1 }}
              transition={{ duration: 0.08 }}
              whileTap={reduced ? undefined : { scale: 0.94 }}
            >
              {b.key}
            </motion.button>
          )
        })}
      </div>

      {phase === "ready" ? (
        <button
          type="button"
          onClick={start}
          className="rounded-lg px-6 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ background: C.gold, color: "#1c1917" }}
        >
          Start signalling
        </button>
      ) : (
        <p className="min-h-9 text-center text-sm font-medium" style={{ color: phase === "over" ? "#f87171" : C.text }} aria-live="polite">{status}</p>
      )}
      <p className="text-center text-xs" style={{ color: C.muted }}>Repeat the sequence with clicks or keys 1-4. It grows and speeds up each round.</p>
    </div>
  )
}
