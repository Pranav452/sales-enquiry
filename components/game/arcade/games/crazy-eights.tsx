"use client"

// Crazy Eights: you against 1 or 3 computer players. Rules live in
// tablecards/crazyEights.ts, the computer players in tablecards/crazyEightsBot.ts.

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import type { ArcadeGameProps, ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CardSlot, SUIT_NAME, SuitIcon, cardHeight, cardName, rankName, type Suit } from "@/components/game/arcade/kit/cards"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import { formatNumber, isLevel, sortHand, type Card, type Level } from "./tablecards/common"
import {
  MATCH_LIMIT, MATCH_ROUNDS, canDraw, drawCard, legalCards, matchLeaders, newMatch, nextRound, passTurn,
  penaltyPoints, playCard, roundPoints, seatNames, topCard, type C8LastAction, type C8State,
} from "./tablecards/crazyEights"
import { chooseC8Move } from "./tablecards/crazyEightsBot"
import {
  BackFan, Felt, FeltMessage, QuitButton, SeatBadge, TableCard, clamp, fanStep, plural, useMeasuredWidth,
} from "./tablecards/ui"

const BOT_PLAY_MS = 720
const BOT_DRAW_MS = 430
const END_DELAY_MS = 1600
const WIN_BONUS = 150
const ORDINAL = ["1st", "2nd", "3rd", "4th"]
const SUIT_ORDER: Suit[] = ["S", "H", "D", "C"]

/** Small, stable offset so the discard pile looks like a pile. */
function pileJitter(c: Card): { left: number; top: number } {
  const h = c.rank * 7 + c.suit.charCodeAt(0)
  return { left: 1 + (h % 7), top: 1 + ((h >> 1) % 4) }
}

function arcadeResult(s: C8State, level: Level, finished: boolean): ArcadeGameResult {
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const earned = s.rounds.reduce((sum, r) => sum + roundPoints(r), 0)
  const roundsWon = s.rounds.filter((r) => r.winner === 0).length
  const names = seatNames(s.players)
  if (finished) {
    const won = matchLeaders(s.totals).includes(0)
    const score = Math.round((earned + (won ? WIN_BONUS : 0)) * mult)
    const others = names.slice(1).map((n, i) => `${n} ${s.totals[i + 1]}`).join(", ")
    return {
      score, won,
      summary: `${won ? "Won the match" : "Lost the match"} with ${plural(s.totals[0], "penalty point")} (${others}) · ${plural(roundsWon, "round")} won`,
    }
  }
  return {
    score: Math.round(earned * mult),
    won: false,
    summary: `Left after ${plural(s.rounds.length, "round")} · ${plural(roundsWon, "round")} won`,
  }
}

function describe(last: C8LastAction | null, names: string[], top: Card, myLastCard: Card | undefined): string {
  if (!last) return `Starter card: ${cardName(top)}`
  const who = names[last.seat]
  if (last.kind === "draw") {
    return last.seat === 0 ? (myLastCard ? `You drew the ${cardName(myLastCard)}` : "You drew a card") : `${who} draws from the stock`
  }
  if (last.kind === "pass") return `${who} cannot play or draw and passes`
  const card = last.card!
  const played = `${who} played the ${cardName(card)}`
  return last.suit ? `${played} and named ${SUIT_NAME[last.suit]}` : played
}

export default function CrazyEights({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [rng] = useState(() => createRng())
  const [level, setLevel] = useState<Level>("medium")
  const [s, setS] = useState<C8State | null>(null)
  const [pendingEight, setPendingEight] = useState<Card | null>(null)
  const [rootRef, width] = useMeasuredWidth<HTMLDivElement>(840)

  // ── Computer turns ──
  useEffect(() => {
    if (!s) return
    let t: number | undefined
    if (s.phase === "playing" && s.turn !== 0) {
      const seat = s.turn
      const move = chooseC8Move(s, seat, level, rng)
      if (move) t = window.setTimeout(() => setS(playCard(s, seat, move.card, move.suit)), BOT_PLAY_MS)
      else if (canDraw(s)) t = window.setTimeout(() => setS(drawCard(s, seat, rng)), BOT_DRAW_MS)
      else t = window.setTimeout(() => setS(passTurn(s, seat)), BOT_PLAY_MS)
    } else if (s.phase === "matchOver") {
      t = window.setTimeout(() => finish(arcadeResult(s, level, true)), END_DELAY_MS)
    }
    return () => window.clearTimeout(t)
  }, [s, level, rng, finish])

  const myHand = useMemo(() => (s ? sortHand(s.hands[0], false) : []), [s])
  const legalIds = useMemo(() => new Set(s ? legalCards(s, 0).map((c) => c.id) : []), [s])

  const playMine = useCallback((c: Card) => {
    if (!s || s.phase !== "playing" || s.turn !== 0 || !legalIds.has(c.id)) return
    if (c.rank === 8) { setPendingEight(c); return }
    setS(playCard(s, 0, c))
  }, [s, legalIds])

  const nameSuit = useCallback((suit: Suit) => {
    if (!s || !pendingEight) return
    setS(playCard(s, 0, pendingEight, suit))
    setPendingEight(null)
  }, [s, pendingEight])

  const drawMine = useCallback(() => {
    if (!s || s.phase !== "playing" || s.turn !== 0 || legalIds.size > 0 || !canDraw(s)) return
    setS(drawCard(s, 0, rng))
  }, [s, legalIds, rng])

  if (!s) {
    return (
      <div ref={rootRef} className="text-foreground">
        <SetupScreen
          title="Crazy Eights"
          description={`Match the suit or rank, play eights as wild and empty your hand first. ${MATCH_ROUNDS} rounds, lowest penalty total wins.`}
          options={[
            {
              id: "players", label: "Players", choices: [
                { value: "2", label: "2 players", hint: "You vs 1 computer, 7 cards" },
                { value: "4", label: "4 players", hint: "You vs 3 computers, 5 cards" },
              ],
            },
            {
              id: "level", label: "Computer players", choices: [
                { value: "easy", label: "Easy", hint: "Plays any match" },
                { value: "medium", label: "Medium", hint: "Saves its eights" },
                { value: "hard", label: "Hard", hint: "Tracks suits" },
              ],
            },
          ]}
          defaults={{ players: "4", level: "medium" }}
          startLabel="Deal"
          onStart={(v) => {
            setLevel(isLevel(v.level) ? v.level : "medium")
            setS(newMatch(v.players === "2" ? 2 : 4, rng))
          }}
        />
      </div>
    )
  }

  const names = seatNames(s.players)
  const four = s.players === 4
  const top = topCard(s)
  const myTurn = s.phase === "playing" && s.turn === 0
  const mustDraw = myTurn && legalIds.size === 0 && canDraw(s)
  const mustPass = myTurn && legalIds.size === 0 && !canDraw(s)
  const prefix = `r${s.round}-`
  const dealing = s.last === null
  const suitChanged = top.rank === 8

  // ── Sizing ──
  const feltW = width
  const cw = Math.round(clamp(feltW * 0.095, 46, 80))
  const ch = cardHeight(cw)
  const bw = Math.round(clamp(feltW * 0.05, 26, 42))
  const bh = cardHeight(bw)
  const pw = Math.round(clamp(feltW * 0.09, 50, 76))
  const ph = cardHeight(pw)
  const feltMin = Math.round(bh + ch + ph + 150)
  const feltH = `clamp(${feltMin}px, calc(85vh - 250px), ${feltMin + 140}px)`
  const handStep = fanStep(myHand.length, cw, feltW - 28, 4)
  const northStep = fanStep(Math.max(s.hands[four ? 2 : 1].length, 1), bw, Math.min(feltW * 0.45, 320), 3)
  const sideStep = Math.round(clamp(0.24 * bh, 6, 12))
  const msgW = Math.round(clamp(feltW - 2 * (bw + 44), 200, 460))
  const someIllegal = myTurn && legalIds.size > 0 && legalIds.size < myHand.length

  const dealIn = (dx: number, dy: number) => (dealing ? { opacity: 0, x: dx, y: dy } : null)
  const seatIndex = { west: 1, north: four ? 2 : 1, east: 3 }

  // ── Status ──
  let status: string
  if (s.phase === "playing") {
    if (s.turn === 0) {
      status = pendingEight ? "Name the next suit"
        : mustPass ? "Nothing to draw · you pass"
        : mustDraw ? "No match · draw from the stock"
        : `Your turn · match ${SUIT_NAME[s.activeSuit]}${suitChanged ? "" : ` or ${rankName(top.rank)}`}`
    } else {
      status = s.last?.kind === "draw" && s.last.seat === s.turn ? `${names[s.turn]} is drawing...` : `${names[s.turn]} is playing...`
    }
  } else if (s.phase === "roundOver") status = `Round ${s.round} over`
  else status = "Match over"

  const lastRound = s.rounds[s.rounds.length - 1]
  const showResults = s.phase !== "playing" && !!lastRound
  const stockTop = s.stock.slice(-3)
  const discardShown = s.discard.slice(-3)

  const opponent = (seat: number, pos: "north" | "west" | "east") => {
    const vertical = pos !== "north"
    const active = s.phase === "playing" && s.turn === seat
    const cards = s.hands[seat]
    const dir = pos === "north" ? { x: 0, y: 140 } : pos === "west" ? { x: 140, y: 0 } : { x: -140, y: 0 }
    return (
      <div
        className={cn(
          "absolute flex flex-col gap-1.5",
          pos === "north" && "left-1/2 top-2.5 -translate-x-1/2 items-center",
          pos === "west" && "left-2.5 top-[42%] -translate-y-1/2 items-start",
          pos === "east" && "right-2.5 top-[42%] -translate-y-1/2 items-end",
        )}
      >
        <SeatBadge name={names[seat]} detail={plural(cards.length, "card")} active={active} />
        <BackFan
          cards={cards}
          width={bw}
          step={vertical ? sideStep : northStep}
          vertical={vertical}
          label={names[seat]}
          initialFor={dealIn(dir.x, dir.y)}
          idPrefix={prefix}
        />
      </div>
    )
  }

  return (
    <LayoutGroup id="crazy-eights">
      <div ref={rootRef} className="flex flex-col text-foreground">
        <GameToolbar
          status={status}
          stats={[
            { label: "Round", value: `${s.round} / ${MATCH_ROUNDS}` },
            { label: "Stock", value: s.stock.length },
            { label: "Your penalty", value: s.totals[0] },
          ]}
          actions={
            <QuitButton
              onQuit={() => finish(arcadeResult(s, level, s.phase === "matchOver"))}
              disabled={s.phase === "matchOver"}
              title="Leave the match now (points from rounds you won)"
            />
          }
        />

        <Felt style={{ height: feltH }}>
          {four ? (
            <>
              {opponent(seatIndex.west, "west")}
              {opponent(seatIndex.north, "north")}
              {opponent(seatIndex.east, "east")}
            </>
          ) : opponent(1, "north")}

          {/* Centre: stock, discard, active suit */}
          <div className="absolute left-1/2 top-[42%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2.5">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Stock */}
              <div className="flex flex-col items-center gap-1">
                <div
                  role={mustDraw ? "button" : "img"}
                  tabIndex={mustDraw ? 0 : undefined}
                  aria-label={mustDraw ? `Draw a card (${s.stock.length} in stock)` : `Stock, ${s.stock.length} cards`}
                  onClick={mustDraw ? drawMine : undefined}
                  onKeyDown={mustDraw ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); drawMine() } } : undefined}
                  className={cn(
                    "relative rounded-[7%]",
                    mustDraw && "cursor-pointer ring-2 ring-amber-300 ring-offset-2 ring-offset-[#1f5c45] focus-visible:outline-none",
                  )}
                  style={{ width: pw + 4, height: ph + 4 }}
                >
                  {stockTop.length === 0 ? (
                    <CardSlot width={pw} className="text-[10px] uppercase tracking-wide">
                      {s.discard.length > 1 ? "Reshuffle" : "Empty"}
                    </CardSlot>
                  ) : stockTop.map((c, i) => (
                    <TableCard
                      key={prefix + c.id}
                      layoutId={prefix + c.id}
                      card={c}
                      faceUp={false}
                      width={pw}
                      className="absolute"
                      style={{ left: i * 2, top: i * 2 }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">Stock · {s.stock.length}</span>
              </div>

              {/* Discard */}
              <div className="flex flex-col items-center gap-1">
                <div className="relative" style={{ width: pw + 8, height: ph + 4 }} role="group" aria-label={`Discard pile, top card ${cardName(top)}`}>
                  <AnimatePresence initial={false}>
                    {discardShown.map((c, i) => {
                      const isTop = i === discardShown.length - 1
                      return (
                        <TableCard
                          key={prefix + c.id}
                          layoutId={prefix + c.id}
                          card={c}
                          faceUp
                          flipIn={isTop && !!s.last && s.last.kind === "play" && s.last.seat !== 0}
                          width={pw}
                          exit={{ opacity: 0, transition: { duration: 0.15 } }}
                          className="absolute"
                          style={{ ...pileJitter(c), zIndex: i }}
                          label={isTop ? `Top card: ${cardName(c)}` : undefined}
                        />
                      )
                    })}
                  </AnimatePresence>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">Discard</span>
              </div>
            </div>

            {/* Suit to match */}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                suitChanged ? "bg-white text-slate-900" : "bg-black/30 text-white/90",
              )}
              aria-live="polite"
            >
              <span className={suitChanged ? "text-slate-600" : "text-white/70"}>{suitChanged ? "Suit named" : "Suit"}</span>
              <span className="inline-flex items-center rounded-sm bg-white p-0.5"><SuitIcon suit={s.activeSuit} size={13} className="shrink-0" /></span>
              {SUIT_NAME[s.activeSuit]}
            </div>

            <div className="flex h-8 justify-center" style={{ width: msgW }}>
              <FeltMessage key={`${s.round}-${s.discard.length}-${s.last?.kind}-${s.last?.seat}-${s.hands[s.last?.seat ?? 0].length}`}>
                {describe(s.last, names, top, s.hands[0][s.hands[0].length - 1])}
              </FeltMessage>
            </div>
          </div>

          {/* South: your hand */}
          <div className="absolute inset-x-0 bottom-2.5 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <SeatBadge name="You" detail={plural(myHand.length, "card")} active={myTurn} />
              {mustPass && <Button size="sm" className="h-7" onClick={() => setS(passTurn(s, 0))}>Pass</Button>}
            </div>
            <div className="flex items-end justify-center" style={{ height: ch + 10, paddingTop: 10 }}>
              {myHand.map((c, i) => {
                const legal = legalIds.has(c.id)
                const clickable = myTurn && legal && !pendingEight
                return (
                  <TableCard
                    key={prefix + c.id}
                    layoutId={prefix + c.id}
                    card={c}
                    faceUp
                    flipIn
                    width={cw}
                    initial={dealIn(0, -140) ?? false}
                    enterDelay={dealing ? i * 0.05 : 0}
                    selected={pendingEight?.id === c.id}
                    dim={myTurn && !legal}
                    hoverLift={clickable}
                    lift={someIllegal && legal && !pendingEight ? 6 : 0}
                    onClick={clickable ? () => playMine(c) : undefined}
                    style={{ marginLeft: i ? handStep - cw : 0, zIndex: i }}
                    label={cardName(c)}
                  />
                )
              })}
            </div>
          </div>

          {/* Suit picker for an eight */}
          <AnimatePresence>
            {pendingEight && (
              <motion.div
                key="suit-picker"
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div role="dialog" aria-label="Choose the next suit" className="w-[min(320px,100%)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-md">
                  <p className="text-sm font-semibold text-foreground">Eight of {SUIT_NAME[pendingEight.suit]}: name the next suit</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SUIT_ORDER.map((su) => {
                      const held = s.hands[0].filter((c) => c.suit === su && c.id !== pendingEight.id && c.rank !== 8).length
                      return (
                        <Button
                          key={su}
                          variant="outline"
                          className="h-auto min-w-0 justify-start gap-2.5 px-3 py-2"
                          onClick={() => nameSuit(su)}
                          autoFocus={su === "S"}
                          aria-label={`${SUIT_NAME[su]}, ${held} in your hand`}
                        >
                          <span className="inline-flex shrink-0 rounded-sm border border-border bg-white p-1">
                            <SuitIcon suit={su} size={16} />
                          </span>
                          <span className="flex min-w-0 flex-col items-start leading-tight">
                            <span className="truncate text-sm font-medium">{SUIT_NAME[su]}</span>
                            <span className="text-[11px] font-normal text-muted-foreground">{held} in hand</span>
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                  <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setPendingEight(null)}>Cancel</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Round / match results */}
          <AnimatePresence>
            {showResults && (
              <motion.div
                key={`results-${s.round}`}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 p-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.35 }}
              >
                <div className="w-[min(360px,100%)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-md">
                  <p className="text-sm font-semibold text-foreground">
                    {s.phase === "matchOver" ? "Match over" : `Round ${s.round} of ${MATCH_ROUNDS}`}
                    <span className="font-normal text-muted-foreground">
                      {" · "}
                      {lastRound.winner == null ? "blocked, nobody could play" : lastRound.winner === 0 ? "you went out" : `${names[lastRound.winner]} went out`}
                    </span>
                  </p>
                  <table className="mt-3 w-full text-xs tabular-nums">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 text-left font-medium">Player</th>
                        <th className="py-1 text-right font-medium">Cards left</th>
                        <th className="py-1 text-right font-medium">Penalty</th>
                        <th className="py-1 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {names.map((n, seat) => (
                        <tr key={n} className={cn("border-t border-border/60", seat === 0 && "font-semibold text-foreground")}>
                          <td className="py-1.5">{n}</td>
                          <td className="py-1.5 text-right">{s.hands[seat].length}</td>
                          <td className="py-1.5 text-right">+{lastRound.penalties[seat]}</td>
                          <td className="py-1.5 text-right">{s.totals[seat]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {roundPoints(lastRound) > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Going out earns {formatNumber(roundPoints(lastRound))} points (50 + cards left in other hands).
                    </p>
                  )}
                  {s.phase === "roundOver" ? (
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" onClick={() => setS(nextRound(s, rng))} autoFocus>Next round</Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {matchLeaders(s.totals).includes(0)
                        ? "You win the match with the lowest penalty total."
                        : `You finished ${ORDINAL[s.totals.filter((t) => t < s.totals[0]).length]}.`}
                      {" "}Score {formatNumber(arcadeResult(s, level, true).score)}.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Felt>

        {/* Penalty table */}
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card text-card-foreground">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-3 py-1.5 text-left font-medium">Penalty points</th>
                {names.map((n, i) => <th key={n} className={cn("px-3 py-1.5 text-right font-medium", i === 0 && "text-foreground")}>{n}</th>)}
              </tr>
            </thead>
            <tbody>
              {s.rounds.map((r, ri) => (
                <tr key={ri} className="border-t border-border/60">
                  <td className="px-3 py-1 text-muted-foreground">Round {ri + 1}</td>
                  {r.penalties.map((p, seat) => (
                    <td key={seat} className={cn("px-3 py-1 text-right", seat === 0 && "font-medium text-foreground")}>
                      {r.winner === seat ? "Out" : p}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border font-semibold text-foreground">
                <td className="px-3 py-1.5">Total <span className="font-normal text-muted-foreground">· ends at {MATCH_LIMIT} or after round {MATCH_ROUNDS}</span></td>
                {s.totals.map((t, seat) => <td key={seat} className="px-3 py-1.5 text-right">{t}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Cards left count against you: eight 50, K Q J 10, ace 1, others face value. Your hand now: {penaltyPoints(s.hands[0])}.
        </p>
      </div>
    </LayoutGroup>
  )
}
