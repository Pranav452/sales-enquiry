"use client"

// ============================================================
// Reversi (Othello) vs the computer.
// Rules live in ./classics/reversi.ts, the AI in ./classics/reversi-ai.ts.
// ============================================================

import {
  useEffect, useEffectEvent, useMemo, useRef, useState, useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from "react"
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion"
import { Flag, Lightbulb, Undo2 } from "lucide-react"
import type { ArcadeGameProps, ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, ToolButton } from "../kit/GameShell"
import { useDelayedGameOver, useElementSize } from "./classics/shared"
import * as R from "./classics/reversi"
import { chooseMove, type Level } from "./classics/reversi-ai"
import { cn } from "@/lib/utils"

// ─── Look ──────────────────────────────────────────────────────

const COLORS = {
  board: "#2e7a4b",
  line: "#1b4a2d",
  star: "#143a22",
  frame: "#1a2e22",
  frameEdge: "#2d4a39",
  coord: "#9fbfaa",
  last: "#e5484d",
}
const FACE: Record<R.Side, { fill: string; rim: string; hint: string; ghost: string }> = {
  [R.BLACK]: { fill: "#1d1d1f", rim: "#050505", hint: "rgba(0, 0, 0, 0.34)", ghost: "rgba(16, 16, 18, 0.45)" },
  [R.WHITE]: { fill: "#f4f3ee", rim: "#bdbbb1", hint: "rgba(255, 255, 255, 0.5)", ghost: "rgba(244, 243, 238, 0.55)" },
}
/** seconds: a disc turning over, the gap before the first flip, extra delay per square of distance */
const FLIP = 0.3
const LEAD = 0.1
const STAGGER = 0.06
const PLACE = 0.14
const LEVEL_NAME: Record<Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }
const LINE = [0, 1, 2, 3, 4, 5, 6, 7]

interface Config { level: Level; human: R.Side }

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}

const sideName = (s: R.Side) => (s === R.BLACK ? "black" : "white")

/** Flip timing for a move: staggered by distance from the placed disc; settle = ms until all discs are still. */
function flipPlan(last: R.LastMove | null, animated: boolean) {
  const flips = new Map<number, { delay: number; angle: number }>()
  let settle = 0
  if (last && animated) {
    const r0 = last.sq >> 3
    const c0 = last.sq & 7
    let far = 1
    for (const f of last.flips) {
      const dr = (f >> 3) - r0
      const dc = (f & 7) - c0
      const dist = Math.max(Math.abs(dr), Math.abs(dc))
      far = Math.max(far, dist)
      flips.set(f, { delay: LEAD + (dist - 1) * STAGGER, angle: (Math.atan2(dr, dc) * 180) / Math.PI })
    }
    settle = Math.round((LEAD + (far - 1) * STAGGER + FLIP) * 1000)
  }
  return { flips, settle }
}

// ─── Discs ─────────────────────────────────────────────────────

/**
 * A disc on the board. When its colour changes it turns over: it squashes to
 * nothing along the line of the capture, swaps colour at the midpoint and
 * opens up again. `delay` < 0 swaps instantly (undo, reduced motion).
 */
function Disc({ side, size, delay, angle, enter, reduce }: {
  side: R.Side
  size: number
  delay: number
  angle: number
  enter: boolean
  reduce: boolean
}) {
  const squash = useMotionValue(1)
  const fill = useMotionValue(FACE[side].fill)
  const rim = useMotionValue(FACE[side].rim)
  const shown = useRef(side)

  useEffect(() => {
    if (shown.current === side) return
    shown.current = side
    const f = FACE[side]
    if (reduce || delay < 0) {
      squash.jump(1)
      fill.jump(f.fill)
      rim.jump(f.rim)
      return
    }
    const turn = animate(squash, [1, 0, 1], { duration: FLIP, delay, times: [0, 0.5, 1], ease: ["easeIn", "easeOut"] })
    const swap = window.setTimeout(() => {
      fill.jump(f.fill)
      rim.jump(f.rim)
    }, (delay + FLIP / 2) * 1000)
    return () => {
      turn.stop()
      window.clearTimeout(swap)
      squash.jump(1)
      fill.jump(f.fill)
      rim.jump(f.rim)
    }
  }, [side, delay, reduce, squash, fill, rim])

  const rimW = Math.max(1, Math.round(size * 0.035))
  const drop = Math.max(1, Math.round(size * 0.035))
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
      initial={enter && !reduce ? { scale: 0.45, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: PLACE, ease: "easeOut" }}
    >
      {/* rotate, squash along x, rotate back: a squash along the capture line that keeps the shadow upright */}
      <div className="h-full w-full" style={{ transform: `rotate(${angle}deg)` }}>
        <motion.div className="h-full w-full" style={{ scaleX: squash }}>
          <div className="h-full w-full" style={{ transform: `rotate(${-angle}deg)` }}>
            <motion.div
              className="h-full w-full rounded-full"
              style={{
                backgroundColor: fill,
                borderColor: rim,
                borderWidth: rimW,
                borderStyle: "solid",
                boxShadow: `0 ${drop}px ${drop}px rgba(0, 0, 0, 0.28)`,
              }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/** Small swatch for the toolbar counters. */
function MiniDisc({ side }: { side: R.Side }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full"
      style={{ background: FACE[side].fill, boxShadow: "0 0 0 1px hsl(var(--foreground) / 0.4)" }}
    />
  )
}

// ─── Entry: setup, then the game ───────────────────────────────

export default function Reversi({ onGameOver }: ArcadeGameProps) {
  const [config, setConfig] = useState<Config | null>(null)
  if (!config) {
    return (
      <SetupScreen
        title="Reversi"
        description="Othello on an 8x8 board against the computer."
        options={[
          {
            id: "level",
            label: "Difficulty",
            choices: [
              { value: "easy", label: "Easy", hint: "Relaxed, undo allowed" },
              { value: "medium", label: "Medium", hint: "Solid, undo allowed" },
              { value: "hard", label: "Hard", hint: "Deep search, no undo" },
            ],
          },
          {
            id: "side",
            label: "Play as",
            choices: [
              { value: "black", label: "Black", hint: "You move first" },
              { value: "white", label: "White", hint: "Computer moves first" },
            ],
          },
        ]}
        defaults={{ level: "medium", side: "black" }}
        onStart={(v) => setConfig({ level: (v.level as Level) ?? "medium", human: v.side === "white" ? R.WHITE : R.BLACK })}
      >
        <p className="text-center text-xs text-muted-foreground">
          Trap a line of the computer&apos;s discs between two of yours to flip them. Most discs when neither side can move wins.
        </p>
      </SetupScreen>
    )
  }
  return <ReversiGame config={config} onGameOver={onGameOver} />
}

function ReversiGame({ config, onGameOver }: { config: Config; onGameOver: ArcadeGameProps["onGameOver"] }) {
  const { level, human } = config
  const cpu = R.other(human)
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const canUndo = level !== "hard"
  const finish = useDelayedGameOver(onGameOver)
  const reduce = useReducedMotion() ?? false

  const [game, setGame] = useState<R.GameState>(R.newGame)
  /** snapshots taken before each of your moves (passes are not recorded) */
  const [history, setHistory] = useState<R.GameState[]>([])
  const [undos, setUndos] = useState(0)
  /** the last change was an undo: snap discs instead of animating */
  const [instant, setInstant] = useState(false)
  const [hints, setHints] = useState(level !== "hard")
  const [resigned, setResigned] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [focusSq, setFocusSq] = useState(43) // d3
  const [hoverSq, setHoverSq] = useState<number | null>(null)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  // ── sizing: fit the width, and the dialog height on desktop ──
  const [wrapRef, wrapSize] = useElementSize<HTMLDivElement>()
  const [barRef, barSize] = useElementSize<HTMLDivElement>()
  const vh = useViewportHeight()
  const avail = Math.floor(Math.min(wrapSize.width, Math.max(260, vh * 0.85 - 140 - barSize.height - 28)))
  const frame = Math.max(12, Math.min(20, Math.round(avail * 0.036)))
  const cell = Math.max(26, Math.floor((avail - 2 * frame) / 8))
  const boardPx = cell * 8
  const discSize = Math.round(cell * 0.8)

  // ── derived state ──
  const pos = game.pos
  const cells = useMemo(() => R.cells(pos), [pos])
  const ended = R.isGameOver(pos)
  const over = ended || resigned
  const humanToAct = !over && pos.turn === human
  const cpuTurn = !over && pos.turn === cpu
  const flipCount = useMemo(() => {
    const m = new Map<number, number>()
    if (humanToAct) for (const s of R.legalMoves(pos)) m.set(s, R.flipsFor(pos, s).length)
    return m
  }, [pos, humanToAct])
  const mustPass = humanToAct && flipCount.size === 0
  const humanTurn = humanToAct && flipCount.size > 0
  const counts = R.discCounts(pos)
  const mine = human === R.BLACK ? counts.black : counts.white
  const theirs = human === R.BLACK ? counts.white : counts.black
  const last = game.last

  const anim = useMemo(() => flipPlan(last, !instant && !reduce), [last, instant, reduce])

  const preview = useMemo(
    () => (hints && humanTurn && hoverSq != null && flipCount.has(hoverSq) ? new Set(R.flipsFor(pos, hoverSq)) : null),
    [hints, humanTurn, hoverSq, flipCount, pos],
  )

  // ── results ──
  function resultFor(p: R.Position, kind: R.ResultKind): ArcadeGameResult {
    const c = R.discCounts(p)
    const m = human === R.BLACK ? c.black : c.white
    const t = human === R.BLACK ? c.white : c.black
    const score = R.computeScore({ kind, mult, mine: m, theirs: t, undos })
    const name = LEVEL_NAME[level]
    const summary =
      kind === "win" ? `Beat ${name} ${m}–${t}`
      : kind === "draw" ? `Draw with ${name} ${m}–${t}`
      : kind === "loss" ? `Lost to ${name} ${m}–${t}`
      : `Resigned vs ${name} at ${m}–${t}`
    return { score, won: kind === "win", summary }
  }

  function applyMove(s: number, byHuman: boolean) {
    let next = R.advanceGame(game, s)
    // the computer has no reply: it passes at once and the status says so
    if (next.pos.turn === cpu && !R.isGameOver(next.pos) && !R.canMove(next.pos)) next = R.passGame(next)
    if (byHuman) setHistory((h) => [...h, game])
    setGame(next)
    setInstant(false)
    setNotice(null)
    setConfirmResign(false)
    if (R.isGameOver(next.pos)) {
      const c = R.discCounts(next.pos)
      const m = human === R.BLACK ? c.black : c.white
      const t = human === R.BLACK ? c.white : c.black
      // leave the final position on screen (after the last flips) before the result card covers it
      finish(resultFor(next.pos, m > t ? "win" : m < t ? "loss" : "draw"), 1100 + flipPlan(next.last, !reduce).settle)
    }
  }

  /** Click / tap / Enter on a square. */
  function activate(s: number) {
    setConfirmResign(false)
    if (!humanTurn) return
    if (flipCount.has(s)) {
      applyMove(s, true)
      return
    }
    setNotice(cells[s] === R.EMPTY ? "Not a legal move" : null)
  }

  function pass() {
    if (!mustPass) return
    setGame(R.passGame(game))
    setNotice(null)
    setConfirmResign(false)
  }

  function undo() {
    if (!canUndo || !humanToAct || history.length === 0) return
    setGame(history[history.length - 1])
    setHistory(history.slice(0, -1))
    setUndos((u) => u + 1)
    setInstant(true)
    setNotice(null)
    setHoverSq(null)
    setConfirmResign(false)
  }

  function resign() {
    if (over) return
    if (!confirmResign) {
      setConfirmResign(true)
      return
    }
    setResigned(true)
    setConfirmResign(false)
    setHoverSq(null)
    finish(resultFor(pos, "resign"), 0)
  }

  // ── computer turn: think in a timeout once the last move has settled ──
  const onCpuMove = useEffectEvent((s: number) => applyMove(s, false))
  const settle = anim.settle
  useEffect(() => {
    if (!cpuTurn) return
    const t0 = performance.now()
    let reply = 0
    const think = window.setTimeout(() => {
      const res = chooseMove(game.pos, { level })
      const wait = Math.max(0, 420 + settle - (performance.now() - t0))
      reply = window.setTimeout(() => onCpuMove(res.move), wait)
    }, settle + 40)
    return () => {
      window.clearTimeout(think)
      window.clearTimeout(reply)
    }
  }, [cpuTurn, game, level, settle])

  // ── keyboard: arrows move between squares, Enter/Space play ──
  function onGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    let r = focusSq >> 3
    let c = focusSq & 7
    if (e.key === "ArrowLeft") c--
    else if (e.key === "ArrowRight") c++
    else if (e.key === "ArrowUp") r--
    else if (e.key === "ArrowDown") r++
    else if (e.key === "Home") c = 0
    else if (e.key === "End") c = 7
    else return
    e.preventDefault()
    if (r < 0 || r > 7 || c < 0 || c > 7) return
    const s = r * 8 + c
    setFocusSq(s)
    btnRefs.current[s]?.focus()
  }

  // ── status line ──
  let status: string
  if (resigned) status = "You resigned"
  else if (ended) {
    const res = mine > theirs ? `You win ${mine}–${theirs}` : mine < theirs ? `Computer wins ${theirs}–${mine}` : `Draw ${mine}–${theirs}`
    status = counts.empty > 0 ? `No moves left: ${res.charAt(0).toLowerCase()}${res.slice(1)}` : res
  } else if (cpuTurn) status = "Computer is thinking..."
  else if (mustPass) status = "No legal move — pass"
  else if (notice) status = notice
  else if (game.passed === cpu) status = "Computer passes — your move"
  else status = "Your move"

  // black first, as on an Othello scoreboard; your own count is the stronger one
  const stats: { label: string; value: ReactNode }[] = [
    {
      label: "Discs",
      value: (
        <span className="inline-flex items-center gap-1 align-middle">
          {([R.BLACK, R.WHITE] as const).map((side) => (
            <span
              key={side}
              aria-hidden
              className={cn("inline-flex items-center gap-1", side === R.WHITE && "ml-2", side !== human && "font-normal text-muted-foreground")}
            >
              <MiniDisc side={side} />
              <span className="min-w-[2ch]">{side === R.BLACK ? counts.black : counts.white}</span>
            </span>
          ))}
          <span className="sr-only">{`you ${mine}, computer ${theirs}`}</span>
        </span>
      ),
    },
  ]

  function describe(s: number): string {
    const v = cells[s]
    let t = `${R.squareName(s)}, ${v === R.EMPTY ? "empty" : sideName(v)}`
    const n = humanTurn ? flipCount.get(s) : undefined
    if (n != null) t += `, legal move — flips ${n}`
    if (preview?.has(s)) t += ", would flip"
    if (last?.sq === s) t += ", last move"
    return t
  }

  const coordSize = Math.max(8, Math.round(frame * 0.56))
  const dot = Math.max(6, Math.round(cell * 0.22))
  const lastDot = Math.max(5, Math.round(cell * 0.14))
  const star = Math.max(2, cell * 0.065)

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={barRef} className="min-h-11">
        <GameToolbar
          status={<span className="sm:inline-block sm:min-w-36">{status}</span>}
          stats={stats}
          actions={over ? undefined : (
            <>
              <ToolButton
                aria-pressed={hints}
                onClick={() => setHints((h) => !h)}
                className={cn(hints && "border-primary/60! bg-primary/10 text-foreground hover:bg-primary/15")}
              >
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                Hints
              </ToolButton>
              {canUndo && (
                <ToolButton onClick={undo} disabled={!humanToAct || history.length === 0}>
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />
                  Undo
                </ToolButton>
              )}
              <ToolButton
                onClick={resign}
                onBlur={() => setConfirmResign(false)}
                className={cn(confirmResign && "border-destructive! text-destructive hover:bg-destructive/10 hover:text-destructive")}
              >
                <Flag className="h-3.5 w-3.5" aria-hidden />
                {confirmResign ? "Confirm resign" : "Resign"}
              </ToolButton>
            </>
          )}
        />
      </div>

      {wrapSize.width > 0 && (
        <div className="flex justify-center">
          <div
            className="relative select-none rounded-md"
            style={{ padding: frame, background: COLORS.frame, boxShadow: `inset 0 0 0 1px ${COLORS.frameEdge}` }}
          >
            {/* coordinates: files along the top, ranks down the left */}
            {LINE.map((i) => (
              <span
                key={`f${i}`}
                aria-hidden
                className="pointer-events-none absolute flex items-center justify-center font-medium leading-none"
                style={{ left: frame + i * cell, width: cell, top: 0, height: frame, fontSize: coordSize, color: COLORS.coord }}
              >
                {"abcdefgh"[i]}
              </span>
            ))}
            {LINE.map((i) => (
              <span
                key={`r${i}`}
                aria-hidden
                className="pointer-events-none absolute flex items-center justify-center font-medium leading-none"
                style={{ top: frame + i * cell, height: cell, left: 0, width: frame, fontSize: coordSize, color: COLORS.coord }}
              >
                {8 - i}
              </span>
            ))}

            <div
              role="grid"
              aria-label={`Reversi board, you play ${sideName(human)}`}
              aria-readonly={!humanTurn}
              className="relative"
              style={{ width: boardPx, height: boardPx, background: COLORS.board }}
              onKeyDown={onGridKeyDown}
              onPointerLeave={() => setHoverSq(null)}
            >
              <svg aria-hidden className="pointer-events-none absolute inset-0" width={boardPx} height={boardPx} shapeRendering="crispEdges">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                  const p = i === 8 ? boardPx - 0.5 : i * cell + 0.5
                  return (
                    <g key={i} stroke={COLORS.line} strokeWidth={1}>
                      <line x1={p} y1={0} x2={p} y2={boardPx} />
                      <line x1={0} y1={p} x2={boardPx} y2={p} />
                    </g>
                  )
                })}
                {[[2, 2], [2, 6], [6, 2], [6, 6]].map(([x, y]) => (
                  <circle key={`${x}${y}`} cx={x * cell + 0.5} cy={y * cell + 0.5} r={star} fill={COLORS.star} shapeRendering="geometricPrecision" />
                ))}
              </svg>

              {LINE.map((r) => (
                <div key={r} role="row" className="flex" style={{ height: cell }}>
                  {LINE.map((c) => {
                    const s = r * 8 + c
                    const v = cells[s]
                    const legal = humanTurn && flipCount.has(s)
                    const ghost = preview != null && hoverSq === s
                    const flip = anim.flips.get(s)
                    return (
                      <div key={c} role="gridcell" style={{ width: cell, height: cell }}>
                        <button
                          ref={(el) => {
                            btnRefs.current[s] = el
                          }}
                          type="button"
                          tabIndex={s === focusSq ? 0 : -1}
                          aria-label={describe(s)}
                          onClick={() => activate(s)}
                          onFocus={() => {
                            setFocusSq(s)
                            setHoverSq(s)
                          }}
                          onBlur={() => setHoverSq((h) => (h === s ? null : h))}
                          onPointerEnter={(e) => {
                            if (e.pointerType === "mouse") setHoverSq(s)
                          }}
                          className="relative block h-full w-full outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-sky-300"
                          style={{ cursor: humanTurn && v === R.EMPTY ? "pointer" : "default" }}
                        >
                          {v !== R.EMPTY && (
                            <Disc
                              side={v}
                              size={discSize}
                              delay={flip ? flip.delay : -1}
                              angle={flip ? flip.angle : 0}
                              enter={!instant && last?.sq === s}
                              reduce={reduce}
                            />
                          )}
                          {ghost && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                              style={{
                                width: discSize,
                                height: discSize,
                                marginLeft: -discSize / 2,
                                marginTop: -discSize / 2,
                                background: FACE[human].ghost,
                              }}
                            />
                          )}
                          {legal && hints && !ghost && (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                              style={{ width: dot, height: dot, marginLeft: -dot / 2, marginTop: -dot / 2, background: FACE[human].hint }}
                            />
                          )}
                          {preview?.has(s) ? (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                              style={{
                                width: dot,
                                height: dot,
                                marginLeft: -dot / 2,
                                marginTop: -dot / 2,
                                background: FACE[human].fill,
                                boxShadow: `0 0 0 1px ${FACE[human].rim}`,
                                opacity: 0.85,
                              }}
                            />
                          ) : last?.sq === s && v !== R.EMPTY ? (
                            <span
                              aria-hidden
                              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
                              style={{ width: lastDot, height: lastDot, marginLeft: -lastDot / 2, marginTop: -lastDot / 2, background: COLORS.last }}
                            />
                          ) : null}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}

              {mustPass && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                  <div className="w-full max-w-60 rounded-lg border bg-card px-4 py-3 text-center text-card-foreground shadow-md">
                    <p className="text-sm font-medium">No legal move</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">None of your moves would outflank a disc, so you must pass.</p>
                    <Button size="sm" className="mt-3 w-full" onClick={pass} autoFocus>
                      Pass
                    </Button>
                  </div>
                </div>
              )}
              {humanTurn && game.passed === cpu && (
                // fades out after a few seconds so it never hides squares; the status line keeps the message
                <motion.div
                  key={game.moves}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 3.4, times: [0, 0.05, 0.88, 1] }}
                >
                  <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm">
                    Computer has no legal move and passes
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
