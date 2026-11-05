"use client"

// ============================================================
// Chess — full rules (chess.js) against a computer opponent that
// searches in a Web Worker (chess/engine.ts). Click or drag to move,
// keyboard supported, undo on Easy/Medium, draw offers, resign.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Chess as ChessRules, type Square } from "chess.js"
import { ArrowDownUp, Flag, Handshake, Loader2, Undo2 } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { SetupScreen, ToolButton, useGameOverOnce } from "../kit/GameShell"
import { ChessBoard, type BoardPiece, type LastMove, type TargetMove } from "./chess/Board"
import { EngineClient } from "./chess/client"
import { START_FEN } from "./chess/engine"
import type { ChessLevel } from "./chess/protocol"
import { MoveList, PlayerRow, type PlayerInfo } from "./chess/SidePanel"
import type { PieceColor, PieceType } from "./chess/pieces"
import { chessResult, LEVEL_LABEL, outcomeTitle, UNDO_PENALTY, type Outcome } from "./chess/scoring"

interface MoveRec {
  from:       Square
  to:         Square
  promotion?: PieceType
  san:        string
  color:      PieceColor
  captured?:  PieceType
  castle?:    "k" | "q"
}

interface Settings { level: ChessLevel; player: PieceColor }

/** Computer accepts a draw only when its own evaluation is at or below this (centipawns). */
const DRAW_ACCEPT_CP = -50
/** Draw offers open after this many of your moves (stops farming draws in the opening). */
const DRAW_MIN_MOVES = 10
/** After a declined offer you must play this many moves before offering again. */
const DRAW_COOLDOWN = 3
/** Minimum visible "thinking" time so instant replies don't feel abrupt. */
const MIN_THINK_MS = 450
/** Pause on the final position before the arcade result card appears. */
const RESULT_DELAY_MS = 1800

const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
const CAPTURE_ORDER: PieceType[] = ["q", "r", "b", "n", "p"]

const uciOf = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? "")

function recordMove(game: ChessRules, from: string, to: string, promotion?: string): MoveRec {
  const probe = new ChessRules(game.fen())
  const m = probe.move({ from, to, promotion }) // throws on an illegal move
  return {
    from: m.from,
    to: m.to,
    promotion: m.promotion as PieceType | undefined,
    san: m.san,
    color: m.color,
    captured: m.captured as PieceType | undefined,
    castle: m.isKingsideCastle() ? "k" : m.isQueensideCastle() ? "q" : undefined,
  }
}

function castleRook(m: MoveRec): LastMove["rook"] {
  if (!m.castle) return undefined
  const rank = m.color === "w" ? "1" : "8"
  return m.castle === "k"
    ? { from: `h${rank}` as Square, to: `f${rank}` as Square }
    : { from: `a${rank}` as Square, to: `d${rank}` as Square }
}

// ─── Entry: setup screen, then the game ───────────────────────

export default function Chess({ onGameOver }: ArcadeGameProps) {
  const [settings, setSettings] = useState<Settings | null>(null)

  if (!settings) {
    return (
      <SetupScreen
        title="Chess"
        description="A full game of chess against the computer."
        options={[
          {
            id: "level", label: "Difficulty", choices: [
              { value: "easy",   label: "Easy",   hint: "Relaxed, makes mistakes" },
              { value: "medium", label: "Medium", hint: "Solid club player" },
              { value: "hard",   label: "Hard",   hint: "Strong, thinks ~2s" },
            ],
          },
          {
            id: "color", label: "Your pieces", choices: [
              { value: "w",      label: "White",  hint: "You move first" },
              { value: "b",      label: "Black",  hint: "Computer starts" },
              { value: "random", label: "Random" },
            ],
          },
        ]}
        defaults={{ level: "medium", color: "w" }}
        onStart={(v) => {
          const player: PieceColor = v.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : (v.color as PieceColor)
          setSettings({ level: v.level as ChessLevel, player })
        }}
      >
        <p className="text-center text-xs text-muted-foreground">
          Win 300 points × difficulty (Easy 1, Medium 2, Hard 4) plus up to 200 for a quick mate.
          Undo is allowed on Easy and Medium for {UNDO_PENALTY} points each.
        </p>
      </SetupScreen>
    )
  }

  return <ChessGame settings={settings} onGameOver={onGameOver} />
}

// ─── Game ─────────────────────────────────────────────────────

function ChessGame({ settings, onGameOver }: { settings: Settings } & ArcadeGameProps) {
  const { level, player } = settings
  const computer: PieceColor = player === "w" ? "b" : "w"
  const finish = useGameOverOnce(onGameOver)

  const [history, setHistory] = useState<MoveRec[]>([])
  const [animatePly, setAnimatePly] = useState(-1)
  const [undos, setUndos] = useState(0)
  const [manualEnd, setManualEnd] = useState<Outcome | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [drawPending, setDrawPending] = useState(false)
  const [drawBlockedUntil, setDrawBlockedUntil] = useState(0)
  const [confirmResign, setConfirmResign] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [engineError, setEngineError] = useState(false)

  // chess.js is the single source of truth for rules and game end
  const game = useMemo(() => {
    const c = new ChessRules()
    for (const m of history) c.move({ from: m.from, to: m.to, promotion: m.promotion })
    return c
  }, [history])

  const autoOutcome = useMemo<Outcome | null>(() => {
    if (game.isCheckmate()) return { winner: game.turn() === "w" ? "b" : "w", reason: "checkmate" }
    if (game.isStalemate()) return { winner: null, reason: "stalemate" }
    if (game.isInsufficientMaterial()) return { winner: null, reason: "insufficient" }
    if (game.isThreefoldRepetition()) return { winner: null, reason: "threefold" }
    if (game.isDrawByFiftyMoves()) return { winner: null, reason: "fifty" }
    return null
  }, [game])

  const outcome = manualEnd ?? autoOutcome
  const over = outcome !== null
  const turn = game.turn() as PieceColor
  const playerTurn = !over && turn === player
  const thinking = !over && turn === computer && !engineError
  const playerMoves = history.filter((m) => m.color === player).length

  const result = useMemo(
    () => (outcome ? chessResult({ outcome, player, level, playerMoves, undos }) : null),
    [outcome, player, level, playerMoves, undos],
  )

  // ─── Engine ───────────────────────────────────────────────

  const engineRef = useRef<EngineClient | null>(null)
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new EngineClient(
        () => new Worker(new URL("./chess/worker.ts", import.meta.url), { type: "module" }),
      )
    }
    return engineRef.current
  }, [])

  useEffect(() => {
    const engine = getEngine()
    return () => engine.dispose()
  }, [getEngine])

  // Computer's turn: search off the main thread, then play the reply.
  useEffect(() => {
    if (!thinking) return
    const engine = getEngine()
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const started = performance.now()
    engine
      .request({
        kind: "move",
        startFen: START_FEN,
        moves: game.history({ verbose: true }).map(uciOf),
        level,
        seed: Math.floor(Math.random() * 2 ** 31),
      })
      .then((res) => {
        if (!live || !res.move) return
        const uci = res.move
        const wait = Math.max(0, MIN_THINK_MS - (performance.now() - started))
        timer = setTimeout(() => {
          if (!live) return
          try {
            const rec = recordMove(game, uci.slice(0, 2), uci.slice(2, 4), uci[4])
            setHistory((h) => [...h, rec])
            setAnimatePly(game.history().length + 1)
          } catch {
            setEngineError(true)
          }
        }, wait)
      })
      .catch(() => { if (live) setEngineError(true) })
    return () => {
      live = false
      if (timer) clearTimeout(timer)
      engine.cancel()
    }
  }, [thinking, game, level, getEngine])

  // Game over: show the banner on the final position, then report once.
  const finishRef = useRef(finish)
  useEffect(() => { finishRef.current = finish }, [finish])
  useEffect(() => {
    if (!result) return
    const t = setTimeout(() => finishRef.current(result), RESULT_DELAY_MS)
    return () => {
      clearTimeout(t)
      finishRef.current(result) // closing early still records the result
    }
  }, [result])

  // Resign needs a second click within a few seconds.
  useEffect(() => {
    if (!confirmResign) return
    const t = setTimeout(() => setConfirmResign(false), 4000)
    return () => clearTimeout(t)
  }, [confirmResign])

  // ─── Player actions ───────────────────────────────────────

  const boardLocked = !playerTurn || drawPending

  const onBoardMove = useCallback((from: Square, to: Square, promotion: PieceType | undefined, animate: boolean) => {
    if (boardLocked) return
    let rec: MoveRec
    try {
      rec = recordMove(game, from, to, promotion)
    } catch {
      return
    }
    setHistory((h) => [...h, rec])
    setAnimatePly(animate ? history.length + 1 : -1)
    setNotice(null)
    setConfirmResign(false)
  }, [boardLocked, game, history.length])

  const targetsFrom = useCallback((sq: Square): TargetMove[] =>
    game.moves({ square: sq, verbose: true }).map((m) => ({
      to: m.to,
      promotion: m.promotion as PieceType | undefined,
      capture: Boolean(m.captured),
    })), [game])

  const canUndo = level !== "hard" && playerTurn && !drawPending && playerMoves > 0
  function undo() {
    if (!canUndo) return
    let cut = history.length - 1
    while (cut >= 0 && history[cut].color !== player) cut--
    if (cut < 0) return
    setHistory(history.slice(0, cut))
    setAnimatePly(-1)
    setUndos((u) => u + 1)
    setConfirmResign(false)
    setNotice(`Move taken back (−${UNDO_PENALTY} points)`)
  }

  const canOfferDraw = playerTurn && !drawPending && playerMoves >= Math.max(DRAW_MIN_MOVES, drawBlockedUntil)
  function offerDraw() {
    if (!canOfferDraw) return
    setDrawPending(true)
    setNotice(null)
    setConfirmResign(false)
    const movesNow = playerMoves
    getEngine()
      .request({ kind: "analyze", startFen: START_FEN, moves: history.map(uciOf), level, seed: 1 })
      .then((res) => {
        // the player is to move, so the computer's view is the negated score
        const computerEval = -res.score
        if (computerEval <= DRAW_ACCEPT_CP) {
          setManualEnd((prev) => prev ?? { winner: null, reason: "agreement" })
        } else {
          setNotice("The computer declines your draw offer.")
          setDrawBlockedUntil(movesNow + DRAW_COOLDOWN)
        }
      })
      .catch(() => setNotice("The computer declines your draw offer."))
      .finally(() => setDrawPending(false))
  }

  function resign() {
    if (over) return
    if (!confirmResign) {
      setConfirmResign(true)
      return
    }
    setConfirmResign(false)
    setManualEnd({ winner: computer, reason: "resign" })
  }

  // ─── View model ───────────────────────────────────────────

  const pieces = useMemo(() => {
    const out: Partial<Record<Square, BoardPiece>> = {}
    for (const row of game.board()) {
      for (const cell of row) if (cell) out[cell.square] = { type: cell.type as PieceType, color: cell.color }
    }
    return out
  }, [game])

  const lastRec = history[history.length - 1]
  const lastMove: LastMove | null = lastRec
    ? { from: lastRec.from, to: lastRec.to, ply: history.length, rook: castleRook(lastRec) }
    : null

  const checkSquare = game.inCheck() ? (game.findPiece({ type: "k", color: turn })[0] ?? null) : null

  const material = useMemo(() => {
    let diff = 0
    for (const pc of Object.values(pieces)) if (pc) diff += (pc.color === "w" ? 1 : -1) * PIECE_VALUE[pc.type]
    const caps: Record<PieceColor, PieceType[]> = { w: [], b: [] }
    for (const m of history) if (m.captured) caps[m.color].push(m.captured)
    for (const c of ["w", "b"] as const) caps[c].sort((a, b) => CAPTURE_ORDER.indexOf(a) - CAPTURE_ORDER.indexOf(b))
    return { diff, caps }
  }, [pieces, history])

  const infoFor = (color: PieceColor): PlayerInfo => ({
    name: color === player ? "You" : "Computer",
    tag: color === computer ? LEVEL_LABEL[level] : undefined,
    color,
    captured: material.caps[color],
    lead: color === "w" ? material.diff : -material.diff,
    thinking: color === computer && thinking,
    toMove: !over && turn === color,
  })

  const orientation: PieceColor = flipped ? computer : player
  const topColor: PieceColor = orientation === "w" ? "b" : "w"
  const bottomColor: PieceColor = orientation

  const ended = outcome ? outcomeTitle(outcome, player) : null
  let status: string
  if (ended) status = ended.title
  else if (engineError) status = "The computer could not find a move."
  else if (drawPending) status = "Offering a draw…"
  else if (thinking) status = "Computer is thinking…"
  else status = game.inCheck() ? "Your move. You are in check" : "Your move"

  const sans = useMemo(() => history.map((m) => m.san), [history])

  return (
    <div className="@container w-full">
      <div className="flex flex-col items-center gap-4 @min-[640px]:flex-row @min-[640px]:items-stretch @min-[640px]:justify-center">
        {/* Board */}
        <div className="w-full max-w-[min(520px,70vh)] shrink-0 @container @min-[640px]:w-[min(calc(100%-16rem),520px,70vh)] @min-[640px]:max-w-none">
          <ChessBoard
            pieces={pieces}
            orientation={orientation}
            movable={boardLocked ? null : player}
            targetsFrom={targetsFrom}
            onMove={onBoardMove}
            lastMove={lastMove}
            animatePly={animatePly}
            checkSquare={checkSquare}
          >
            {ended && result && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="min-w-[60%] rounded-lg border border-border bg-card px-5 py-4 text-center text-card-foreground shadow-lg"
                  role="status"
                >
                  <p className="text-base font-semibold text-foreground">{ended.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{ended.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Score <span className="font-semibold tabular-nums text-foreground">{result.score.toLocaleString()}</span>
                  </p>
                </motion.div>
              </div>
            )}
          </ChessBoard>
        </div>

        {/* Side panel */}
        <div className="relative w-full max-w-[min(520px,70vh)] @min-[640px]:max-w-none @min-[640px]:min-w-0 @min-[640px]:flex-1">
          <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground @min-[640px]:absolute @min-[640px]:inset-0">
            <PlayerRow info={infoFor(topColor)} />
            <div className="border-t border-border" />
            <MoveList sans={sans} className="h-32 @min-[640px]:h-auto @min-[640px]:min-h-0 @min-[640px]:flex-1" />
            <div className="border-t border-border" />
            <PlayerRow info={infoFor(bottomColor)} />

            <div className="space-y-2.5 border-t border-border px-3 py-3">
              <div aria-live="polite" className="min-h-[2.5rem]">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {(thinking || drawPending) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
                  {status}
                </p>
                {ended ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{ended.detail}</p>
                ) : notice ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{notice}</p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Move {Math.floor(history.length / 2) + 1} · {turn === "w" ? "White" : "Black"} to play
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <ToolButton
                  onClick={undo}
                  disabled={!canUndo}
                  title={level === "hard" ? "Undo is not available on Hard" : `Take back your last move (−${UNDO_PENALTY} points)`}
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Undo
                </ToolButton>
                <ToolButton
                  onClick={offerDraw}
                  disabled={!canOfferDraw}
                  title={
                    playerMoves < DRAW_MIN_MOVES ? `Draw offers open after move ${DRAW_MIN_MOVES}`
                      : playerMoves < drawBlockedUntil ? "Play a few more moves before offering again"
                      : "Offer a draw"
                  }
                >
                  <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
                  Offer draw
                </ToolButton>
                <ToolButton
                  onClick={resign}
                  disabled={over}
                  className={confirmResign ? "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" : undefined}
                >
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  {confirmResign ? "Confirm resign" : "Resign"}
                </ToolButton>
                <ToolButton onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
                  <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Flip board
                </ToolButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
