"use client"

// ============================================================
// Connect Four vs the computer.
// Rules, scoring and the AI live in ./classics/connect-four.ts.
// Discs fall behind the board face and show through the holes,
// like the real thing.
// ============================================================

import {
  useEffect, useEffectEvent, useId, useMemo, useRef, useState, useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Flag, Undo2 } from "lucide-react"
import type { ArcadeGameProps, ArcadeGameResult } from "@/lib/game/arcade"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, ToolButton } from "../kit/GameShell"
import { useDelayedGameOver, useElementSize } from "./classics/shared"
import * as C from "./classics/connect-four"
import { cn } from "@/lib/utils"

// ─── Look ──────────────────────────────────────────────────────

const BOARD = {
  face: "#1f55c6",
  rim: "#16409b",
  edge: "#143a8c",
  win: "#ffffff",
}
type Color = "red" | "yellow"
const DISC: Record<Color, { fill: string; ring: string; rim: string; ghost: string }> = {
  red: { fill: "#e03131", ring: "#b42323", rim: "#a11d1d", ghost: "rgba(224, 49, 49, 0.32)" },
  yellow: { fill: "#f6c623", ring: "#d4a10d", rim: "#c19209", ghost: "rgba(246, 198, 35, 0.4)" },
}
const LEVEL_NAME: Record<C.Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }
const COL_INDEX = [0, 1, 2, 3, 4, 5, 6]
/** computer: minimum time between your disc landing and its reply */
const MIN_REPLY_MS = 450
const HARD_BUDGET_MS = 750

interface Config { level: C.Level; humanFirst: boolean }

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb)
  return () => window.removeEventListener("resize", cb)
}
function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 800)
}

/** Seconds a disc takes to fall `cells` rows (roughly gravity: t ~ sqrt(distance)). */
const fallTime = (cells: number) => 0.17 * Math.sqrt(Math.max(1, cells))

// ─── Disc ──────────────────────────────────────────────────────

/** Flat disc with the moulded inner ring of a real Connect Four counter. */
function Disc({ color, size, x, y, fromY, fall, dim, marked }: {
  color:  Color
  size:   number
  x:      number
  y:      number
  /** start offset (px, negative = above) for the drop; null = no animation */
  fromY:  number | null
  fall:   number
  dim:    boolean
  marked: boolean
}) {
  const d = DISC[color]
  const ring = Math.round(size * 0.66)
  const line = Math.max(1.5, size * 0.045)
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        background: d.fill,
        boxShadow: `inset 0 0 0 ${line}px ${d.rim}`,
        opacity: dim ? 0.62 : 1,
        transition: "opacity 300ms ease",
      }}
      initial={fromY != null ? { y: fromY } : false}
      animate={{ y: 0 }}
      transition={{ duration: fall, ease: [0.45, 0, 0.9, 0.55] }}
    >
      <span
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{ width: ring, height: ring, marginLeft: -ring / 2, marginTop: -ring / 2, boxShadow: `inset 0 0 0 ${line}px ${d.ring}` }}
      />
      {marked && (
        <span
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: size * 0.16, height: size * 0.16, marginLeft: -size * 0.08, marginTop: -size * 0.08, background: "rgba(0, 0, 0, 0.38)" }}
        />
      )}
    </motion.div>
  )
}

function Swatch({ color }: { color: Color }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full align-[-1px]"
      style={{ background: DISC[color].fill, boxShadow: `inset 0 0 0 1.5px ${DISC[color].rim}` }}
    />
  )
}

// ─── Entry: setup, then the game ───────────────────────────────

export default function ConnectFour({ onGameOver }: ArcadeGameProps) {
  const [config, setConfig] = useState<Config | null>(null)
  if (!config) {
    return (
      <SetupScreen
        title="Connect Four"
        description="You play red, the computer plays yellow."
        options={[
          {
            id: "level",
            label: "Difficulty",
            choices: [
              { value: "easy", label: "Easy", hint: "Makes mistakes, undo allowed" },
              { value: "medium", label: "Medium", hint: "Looks 6 moves ahead" },
              { value: "hard", label: "Hard", hint: "Deep search, no slips" },
            ],
          },
          {
            id: "first",
            label: "First move",
            choices: [
              { value: "you", label: "You", hint: "You drop the first disc" },
              { value: "computer", label: "Computer", hint: "Computer opens" },
            ],
          },
        ]}
        defaults={{ level: "medium", first: "you" }}
        onStart={(v) => setConfig({ level: (v.level as C.Level) ?? "medium", humanFirst: v.first !== "computer" })}
      >
        <p className="text-center text-xs text-muted-foreground">
          Line up four of your discs across, up or diagonally before the computer does. Keys 1 to 7 drop a disc.
        </p>
      </SetupScreen>
    )
  }
  return <ConnectFourGame config={config} onGameOver={onGameOver} />
}

// ─── The game ──────────────────────────────────────────────────

function ConnectFourGame({ config, onGameOver }: { config: Config; onGameOver: ArcadeGameProps["onGameOver"] }) {
  const { level, humanFirst } = config
  const human: C.Player = humanFirst ? 1 : 2
  const cpu: C.Player = humanFirst ? 2 : 1
  const colorOf = (p: C.Cell): Color => (p === human ? "red" : "yellow")
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const canUndo = level === "easy"
  const finish = useDelayedGameOver(onGameOver)
  const reduce = useReducedMotion() ?? false
  const maskId = `c4-holes-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`

  const [game, setGame] = useState<C.Game>(C.newGame)
  const [undos, setUndos] = useState(0)
  /** the last change was an undo: don't animate */
  const [instant, setInstant] = useState(false)
  const [resigned, setResigned] = useState(false)
  const [confirmResign, setConfirmResign] = useState(false)
  /** column under the mouse */
  const [hoverCol, setHoverCol] = useState<number | null>(null)
  /** column with keyboard focus; `kbd` = the board is being driven from the keyboard */
  const [focusCol, setFocusCol] = useState(3)
  const [kbd, setKbd] = useState(false)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])

  // ── sizing: fit the width, and the dialog height on desktop ──
  const [wrapRef, wrapSize] = useElementSize<HTMLDivElement>()
  const [barRef, barSize] = useElementSize<HTMLDivElement>()
  const vh = useViewportHeight()
  const availH = Math.max(260, vh * 0.85 - 140 - barSize.height - 28)
  const cell = Math.floor(Math.max(34, Math.min(84, wrapSize.width / (C.COLS + 0.36), availH / (C.ROWS + 1.25))))
  const pad = Math.round(cell * 0.18)
  const previewH = Math.round(cell * 0.95)
  const boardW = cell * C.COLS + pad * 2
  const boardH = cell * C.ROWS + pad * 2
  const holeR = cell * 0.39
  const discSize = Math.round(holeR * 2 + 2)

  /** top-left of the disc in cell `i`, in board-container coordinates */
  const discX = (col: number) => pad + col * cell + (cell - discSize) / 2
  const discY = (row: number) => previewH + pad + (C.ROWS - 1 - row) * cell + (cell - discSize) / 2
  const previewY = (previewH - discSize) / 2

  // ── derived ──
  const over = C.isOver(game) || resigned
  const turn = C.toMove(game)
  const humanTurn = !over && turn === human
  const cpuTurn = !over && turn === cpu
  const lastIdx = game.moves.length ? C.idx(game.moves[game.moves.length - 1], game.heights[game.moves[game.moves.length - 1]] - 1) : -1
  const lastByCpu = lastIdx >= 0 && game.cells[lastIdx] === cpu
  const winSet = useMemo(() => new Set(game.line ?? []), [game.line])
  /** ms until the most recent disc has landed */
  const settle = instant || reduce || lastIdx < 0 ? 0 : Math.round(fallTime(C.ROWS - C.rowOf(lastIdx) + 0.6) * 1000)

  function resultFor(g: C.Game, kind: C.ResultKind): ArcadeGameResult {
    const discs = g.cells.filter((v) => v === human).length
    const name = LEVEL_NAME[level]
    const moves = `${discs} move${discs === 1 ? "" : "s"}`
    const summary =
      kind === "win" ? `Beat ${name} in ${moves}`
      : kind === "draw" ? `Draw with ${name}, board full`
      : kind === "loss" ? `Lost to ${name} after ${moves}`
      : `Resigned vs ${name} after ${moves}`
    return { score: C.computeScore(kind, mult, discs, undos), won: kind === "win", summary }
  }

  function applyMove(col: number) {
    const next = C.play(game, col)
    if (next === game) return
    setGame(next)
    setInstant(false)
    setConfirmResign(false)
    if (C.isOver(next)) {
      setHoverCol(null)
      const kind: C.ResultKind = next.draw ? "draw" : next.winner === human ? "win" : "loss"
      const row = next.heights[col] - 1
      const fall = reduce ? 0 : Math.round(fallTime(C.ROWS - row + 0.6) * 1000)
      finish(resultFor(next, kind), 1400 + fall)
    }
  }

  function drop(col: number) {
    setConfirmResign(false)
    if (!humanTurn || !C.canPlay(game, col)) return
    setFocusCol(col)
    applyMove(col)
  }

  function undo() {
    if (!canUndo || !humanTurn) return
    const keep = game.moves.length - 2
    if (keep < (humanFirst ? 0 : 1)) return
    setGame(C.replay(game.moves.slice(0, keep)))
    setUndos((u) => u + 1)
    setInstant(true)
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
    setHoverCol(null)
    finish(resultFor(game, "resign"), 0)
  }

  // ── computer turn: wait for the last disc to land, think, then drop ──
  const onCpuMove = useEffectEvent((col: number) => applyMove(col))
  useEffect(() => {
    if (!cpuTurn) return
    const t0 = performance.now()
    let reply = 0
    const think = window.setTimeout(() => {
      const res = C.chooseMove(game, level, { timeMs: HARD_BUDGET_MS })
      const wait = Math.max(0, MIN_REPLY_MS + settle - (performance.now() - t0))
      reply = window.setTimeout(() => onCpuMove(res.col), wait)
    }, settle + 40)
    return () => {
      window.clearTimeout(think)
      window.clearTimeout(reply)
    }
  }, [cpuTurn, game, level, settle])

  // ── keyboard: 1-7 anywhere in the window drops into that column ──
  const onWindowKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return
    if (e.key >= "1" && e.key <= "7") {
      e.preventDefault()
      const col = Number(e.key) - 1
      setKbd(true)
      drop(col)
      btnRefs.current[col]?.focus({ preventScroll: true })
    }
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => onWindowKey(e)
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // arrows move between columns (Enter / Space press the focused column's button)
  function onColumnsKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    let c = focusCol
    if (e.key === "ArrowLeft") c--
    else if (e.key === "ArrowRight") c++
    else if (e.key === "Home") c = 0
    else if (e.key === "End") c = C.COLS - 1
    else return
    e.preventDefault()
    c = Math.max(0, Math.min(C.COLS - 1, c))
    setKbd(true)
    setFocusCol(c)
    btnRefs.current[c]?.focus()
  }

  // ── status ──
  let status: string
  if (resigned) status = "You resigned"
  else if (game.winner === human) status = "You win with four in a row"
  else if (game.winner === cpu) status = "Computer wins with four in a row"
  else if (game.draw) status = "Draw: the board is full"
  else if (cpuTurn) status = "Computer is thinking..."
  else if (lastByCpu) status = `Computer played ${C.colOf(lastIdx) + 1}. Your move`
  else status = "Your move"

  const stats: { label: string; value: ReactNode }[] = [
    { label: "You", value: <Swatch color="red" /> },
    {
      label: "Computer",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Swatch color="yellow" />
          <span className="font-normal text-muted-foreground">{LEVEL_NAME[level]}</span>
        </span>
      ),
    },
  ]

  function describeColumn(col: number): string {
    const discs: string[] = []
    for (let r = 0; r < game.heights[col]; r++) discs.push(colorOf(game.cells[C.idx(col, r)]))
    const free = C.ROWS - game.heights[col]
    const contents = discs.length ? `${discs.join(", ")} from the bottom` : "empty"
    return `Column ${col + 1}: ${contents}; ${free === 0 ? "full" : `${free} space${free === 1 ? "" : "s"} left`}`
  }

  // hover / focus preview: your disc above the column and a ghost where it would land
  const wanted = kbd ? focusCol : hoverCol
  const previewCol = humanTurn && wanted != null && C.canPlay(game, wanted) ? wanted : null
  const ghostRow = previewCol != null ? game.heights[previewCol] : -1

  const discs: { i: number; color: Color }[] = []
  game.cells.forEach((v, i) => {
    if (v !== 0) discs.push({ i, color: colorOf(v) })
  })

  return (
    <div ref={wrapRef} className="w-full">
      <div ref={barRef} className="min-h-11">
        <GameToolbar
          status={<span className="sm:inline-block sm:min-w-56">{status}</span>}
          stats={stats}
          actions={over ? undefined : (
            <>
              {canUndo && (
                <ToolButton onClick={undo} disabled={!humanTurn || game.moves.length - 2 < (humanFirst ? 0 : 1)}>
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
        <div className="flex justify-center pb-1">
          <div
            className="relative select-none"
            style={{ width: boardW, height: previewH + boardH }}
            onPointerLeave={() => setHoverCol(null)}
          >
            {/* discs sit behind the board face */}
            {previewCol != null && (
              <Disc color="red" size={discSize} x={discX(previewCol)} y={previewY} fromY={null} fall={0} dim={false} marked={false} />
            )}
            {previewCol != null && ghostRow < C.ROWS && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{ left: discX(previewCol), top: discY(ghostRow), width: discSize, height: discSize, background: DISC.red.ghost }}
              />
            )}
            {discs.map(({ i, color }) => {
              const col = C.colOf(i)
              const row = C.rowOf(i)
              const animated = !instant && !reduce && i === lastIdx
              const y = discY(row)
              return (
                <Disc
                  key={i}
                  color={color}
                  size={discSize}
                  x={discX(col)}
                  y={y}
                  fromY={animated ? previewY - y : null}
                  fall={fallTime(C.ROWS - row + 0.6)}
                  dim={game.winner !== 0 && !winSet.has(i)}
                  marked={!over && i === lastIdx && game.cells[i] === cpu}
                />
              )
            })}

            {/* board face with holes */}
            <svg
              aria-hidden
              className="pointer-events-none absolute left-0"
              style={{ top: previewH }}
              width={boardW}
              height={boardH}
            >
              <defs>
                <mask id={maskId}>
                  <rect width={boardW} height={boardH} fill="white" />
                  {COL_INDEX.map((c) =>
                    Array.from({ length: C.ROWS }, (_, r) => (
                      <circle key={`${c}-${r}`} cx={pad + c * cell + cell / 2} cy={pad + r * cell + cell / 2} r={holeR} fill="black" />
                    )),
                  )}
                </mask>
              </defs>
              <rect width={boardW} height={boardH} rx={Math.round(pad * 0.7)} fill={BOARD.face} mask={`url(#${maskId})`} />
              <rect x={0.5} y={0.5} width={boardW - 1} height={boardH - 1} rx={Math.round(pad * 0.7)} fill="none" stroke={BOARD.edge} strokeWidth={1} />
              {previewCol != null && (
                <rect
                  x={pad + previewCol * cell}
                  y={pad * 0.5}
                  width={cell}
                  height={boardH - pad}
                  rx={cell / 2}
                  fill="white"
                  opacity={0.1}
                  mask={`url(#${maskId})`}
                />
              )}
              {COL_INDEX.map((c) =>
                Array.from({ length: C.ROWS }, (_, r) => (
                  <circle
                    key={`rim-${c}-${r}`}
                    cx={pad + c * cell + cell / 2}
                    cy={pad + r * cell + cell / 2}
                    r={holeR + 0.5}
                    fill="none"
                    stroke={BOARD.rim}
                    strokeWidth={Math.max(1.5, cell * 0.035)}
                  />
                )),
              )}
              {[...winSet].map((i) => (
                <circle
                  key={`win-${i}`}
                  cx={pad + C.colOf(i) * cell + cell / 2}
                  cy={pad + (C.ROWS - 1 - C.rowOf(i)) * cell + cell / 2}
                  r={holeR + Math.max(2, cell * 0.04)}
                  fill="none"
                  stroke={BOARD.win}
                  strokeWidth={Math.max(2.5, cell * 0.06)}
                />
              ))}
            </svg>

            {/* one button per column: click / tap / Enter drops a disc */}
            <div
              role="group"
              aria-label="Connect Four board: choose a column"
              className="absolute inset-0 flex"
              style={{ paddingLeft: pad, paddingRight: pad }}
              onKeyDown={onColumnsKeyDown}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKbd(false)
              }}
            >
              {COL_INDEX.map((c) => {
                const playable = humanTurn && C.canPlay(game, c)
                return (
                  <button
                    key={c}
                    ref={(el) => {
                      btnRefs.current[c] = el
                    }}
                    type="button"
                    tabIndex={c === focusCol ? 0 : -1}
                    aria-label={describeColumn(c)}
                    aria-disabled={!playable}
                    onClick={() => drop(c)}
                    onFocus={(e) => {
                      setFocusCol(c)
                      if (e.currentTarget.matches(":focus-visible")) setKbd(true)
                    }}
                    onPointerMove={(e) => {
                      // real moves only: layout shifts under a resting mouse don't count
                      if (e.pointerType !== "mouse") return
                      setKbd(false)
                      setHoverCol(c)
                    }}
                    className={cn(
                      "h-full rounded-full outline-none",
                      !over && "focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-sky-300",
                    )}
                    style={{ width: cell, cursor: playable ? "pointer" : "default" }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
