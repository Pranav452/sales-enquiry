"use client"

// ============================================================
// Solitaire engine — generic board shared by Klondike, Spider
// and FreeCell: toolbar (score / time / moves, Undo, Hint,
// Auto-complete, End game), click-to-select, double-click to
// play home, hints, "no more moves" and the win sequence.
// The game itself is described by a SolitaireAdapter.
// ============================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { FastForward, Flag, Lightbulb, Undo2 } from "lucide-react"
import type { ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { GameToolbar, ToolButton } from "@/components/game/arcade/kit/GameShell"
import { feltHeight } from "./layout"
import {
  fmtNum, fmtTime, last, pileKind,
  type MoveRef, type PileId, type Placement, type SolitaireAdapter, type Transition,
} from "./model"
import { SolitaireTable } from "./Table"
import { useElementWidth, useSolitaire, useViewportHeight } from "./useSolitaire"

interface Selection { pile: PileId; index: number }
interface HintView { ids: string[]; target: PileId | null }

const EMPTY_SET: ReadonlySet<string> = new Set()
const EMPTY_MAP: ReadonlyMap<string, number> = new Map()

function FeltPanel({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-4" style={{ zIndex: 2000 }}>
      <div
        role="alertdialog"
        aria-label={title}
        className="w-full max-w-xs rounded-lg border border-border bg-card p-4 text-center text-card-foreground shadow-lg"
      >
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{children}</p>
        <div className="mt-4 flex justify-center gap-2">{actions}</div>
      </div>
    </div>
  )
}

export function SolitaireBoard<S>({
  adapter, init, onFinish, openingMs = 1100,
}: {
  adapter:    SolitaireAdapter<S>
  init:       () => Transition<S>
  onFinish:   (r: ArcadeGameResult) => void
  /** length of the opening deal animation */
  openingMs?: number
}) {
  const core = useSolitaire(init, adapter.isWon, openingMs)
  const { state, undos, elapsed } = core
  const [wrapRef, width] = useElementWidth<HTMLDivElement>()
  const viewportH = useViewportHeight()
  const height = feltHeight(width, viewportH)
  const layout = useMemo(() => (width > 0 ? adapter.layout(state, width, height) : null), [adapter, state, width, height])

  const [selection, setSelection] = useState<Selection | null>(null)
  const [hint, setHint] = useState<HintView | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [over, setOver] = useState(false)
  const flashTimer = useRef<number | null>(null)
  const hintTimer = useRef<number | null>(null)

  const won = adapter.isWon(state)
  const idle = !core.busy && !won && !over
  const auto = useMemo(() => (idle ? adapter.autoComplete(state) : null), [adapter, state, idle])
  const stuck = useMemo(() => idle && !auto && !adapter.hasMoves(state), [adapter, state, idle, auto])
  const locked = !idle || confirmEnd || stuck
  // once solved, show the final total (win and time bonuses included)
  const live = won ? adapter.result(state, { undos, elapsed }, true).score : adapter.liveScore(state, { undos, elapsed })
  const compact = width > 0 && width < 560

  // timers
  useEffect(() => () => {
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
  }, [])

  // Win: let the last cards land, hop the foundations, then report.
  useEffect(() => {
    if (!won || over) return
    const t = window.setTimeout(() => {
      setOver(true)
      onFinish(adapter.result(state, { undos, elapsed }, true))
    }, 1900)
    return () => window.clearTimeout(t)
  }, [won, over, adapter, state, undos, elapsed, onFinish])

  const hops = useMemo(() => {
    if (!won || !layout) return EMPTY_MAP
    const tops = new Map<string, Placement>()
    for (const c of layout.cards) {
      const k = pileKind(c.pile)
      if (k !== "foundation" && k !== "done") continue
      const cur = tops.get(c.pile)
      if (!cur || c.index > cur.index) tops.set(c.pile, c)
    }
    const m = new Map<string, number>()
    ;[...tops.values()].sort((a, b) => a.x - b.x).forEach((c, i) => m.set(c.id, 0.55 + i * 0.12))
    return m
  }, [won, layout])

  const selectedIds = useMemo(() => {
    if (!selection) return EMPTY_SET
    return new Set(adapter.pile(state, selection.pile).slice(selection.index).map((c) => c.id))
  }, [adapter, state, selection])
  const hintedIds = useMemo(() => (hint ? new Set(hint.ids) : EMPTY_SET), [hint])

  // ─── actions ───

  function say(text: string) {
    setFlash(text)
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 3200)
  }

  function clearHint() {
    if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
    hintTimer.current = null
    setHint(null)
  }

  function clearFlash() {
    if (flashTimer.current != null) window.clearTimeout(flashTimer.current)
    flashTimer.current = null
    setFlash(null)
  }

  function act(t: Transition<S>) {
    setSelection(null)
    clearHint()
    clearFlash()
    core.run(t)
  }

  function tryMove(m: MoveRef): boolean {
    const t = adapter.move(state, m)
    if (!t) return false
    act(t)
    return true
  }

  function drawStock() {
    const t = adapter.stock?.(state)
    if (t) act(t)
    else say(adapter.stockBlocked?.(state) ?? "Nothing left to draw")
  }

  function onCardClick(p: Placement): boolean {
    if (locked) return false
    clearHint()
    if (adapter.stockPile && p.pile === adapter.stockPile) {
      drawStock()
      return true
    }
    if (selection && selection.pile !== p.pile) {
      if (tryMove({ from: selection.pile, index: selection.index, to: p.pile })) return true
    } else if (selection && selection.index === p.index) {
      setSelection(null)
      return false
    }
    setSelection(adapter.canPick(state, p.pile, p.index) ? { pile: p.pile, index: p.index } : null)
    return false
  }

  function onCardDoubleClick(p: Placement) {
    if (locked) return
    setSelection(null)
    if (adapter.stockPile && p.pile === adapter.stockPile) {
      drawStock()
      return
    }
    const to = adapter.quickTarget(state, p.pile, p.index)
    if (to) tryMove({ from: p.pile, index: p.index, to })
  }

  function onSlotClick(id: PileId) {
    if (locked) return
    clearHint()
    if (id === adapter.stockPile) {
      drawStock()
      return
    }
    if (selection && !tryMove({ from: selection.pile, index: selection.index, to: id })) setSelection(null)
  }

  function showHint() {
    if (locked) return
    setSelection(null)
    const h = adapter.hint(state)
    if (!h) {
      say("No useful moves left")
      return
    }
    if (h.kind === "stock") {
      const pile = adapter.stockPile ?? "stock"
      const top = last(adapter.pile(state, pile))
      setHint({ ids: top ? [top.id] : [], target: top ? null : pile })
    } else {
      setHint({ ids: adapter.pile(state, h.move.from).slice(h.move.index).map((c) => c.id), target: h.move.to })
    }
    say(h.text)
    if (hintTimer.current != null) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 3200)
  }

  function undo() {
    if (!core.canUndo || core.busy || won || over) return
    setSelection(null)
    clearHint()
    clearFlash()
    setConfirmEnd(false)
    core.undo()
  }

  function autoFinish() {
    if (!auto || locked) return
    setSelection(null)
    clearHint()
    clearFlash()
    core.sequence(auto)
  }

  function endGame() {
    if (over) return
    setOver(true)
    setConfirmEnd(false)
    core.stopClock()
    onFinish(adapter.result(state, { undos, elapsed }, false))
  }

  // ─── render ───

  const status = won
    ? `Solved in ${fmtTime(elapsed)}`
    : flash ?? (auto ? "The remaining cards can all go home. Auto-complete will finish the game." : adapter.status(state))
  const endScore = adapter.result(state, { undos, elapsed }, false).score
  const label = (text: string) => <span className={compact ? "sr-only" : undefined}>{text}</span>

  return (
    <div ref={wrapRef} className="w-full">
      <GameToolbar
        status={status}
        stats={[
          { label: "Score", value: fmtNum(live) },
          { label: "Time", value: fmtTime(elapsed) },
          { label: "Moves", value: adapter.moves(state) },
        ]}
        actions={
          <>
            {auto && (
              <ToolButton variant="default" onClick={autoFinish} disabled={locked} title="Auto-complete">
                <FastForward className="h-3.5 w-3.5" aria-hidden />
                {label("Auto-complete")}
              </ToolButton>
            )}
            <ToolButton onClick={undo} disabled={!core.canUndo || core.busy || won || over} title="Undo">
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              {label("Undo")}
            </ToolButton>
            <ToolButton onClick={showHint} disabled={locked} title="Hint">
              <Lightbulb className="h-3.5 w-3.5" aria-hidden />
              {label("Hint")}
            </ToolButton>
            <ToolButton onClick={() => { setSelection(null); setConfirmEnd(true) }} disabled={won || over || confirmEnd} title="End game">
              <Flag className="h-3.5 w-3.5" aria-hidden />
              {label("End game")}
            </ToolButton>
          </>
        }
      />

      {layout && (
        <SolitaireTable
          layout={layout}
          fx={core.fx}
          selected={selectedIds}
          hinted={hintedIds}
          hintTarget={hint?.target ?? null}
          hops={hops}
          disabled={locked}
          getTargets={(pile, index) => adapter.targets(state, pile, index)}
          onDrop={(m) => !locked && tryMove(m)}
          onCardClick={onCardClick}
          onCardDoubleClick={onCardDoubleClick}
          onSlotClick={onSlotClick}
          onBackgroundClick={() => setSelection(null)}
          onDragStart={() => { setSelection(null); clearHint() }}
        >
          {confirmEnd && !over && (
            <FeltPanel
              title="End this game?"
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={() => setConfirmEnd(false)}>Keep playing</Button>
                  <Button size="sm" onClick={endGame}>End game</Button>
                </>
              }
            >
              The game ends now with {fmtNum(endScore)} points.
            </FeltPanel>
          )}
          {stuck && !confirmEnd && !over && (
            <FeltPanel
              title="No more moves"
              actions={
                <>
                  {core.canUndo && <Button size="sm" variant="outline" onClick={undo}>Undo</Button>}
                  <Button size="sm" onClick={endGame}>End game</Button>
                </>
              }
            >
              There are no useful moves left. Undo to try another line, or end the game with {fmtNum(endScore)} points.
            </FeltPanel>
          )}
        </SolitaireTable>
      )}
    </div>
  )
}
