"use client"

// Hearts: you (South) against three computer players. Rules live in
// tablecards/hearts.ts, the computer players in tablecards/heartsBot.ts.

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import type { ArcadeGameProps, ArcadeGameResult } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PlayingCard, SuitIcon, cardHeight, cardName } from "@/components/game/arcade/kit/cards"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import { formatNumber, isLevel, sortHand, type Card, type Level } from "./tablecards/common"
import {
  applyPasses, collectTrick, isLegal, legalPlays, newGame, nextHand, passDirFor, passTarget, placeOf, playCard, seatName,
  trickPoints, type HeartsState, type PassDir,
} from "./tablecards/hearts"
import { choosePass, choosePlay } from "./tablecards/heartsBot"
import {
  BackFan, Felt, FeltMessage, QuitButton, SeatBadge, TableCard, clamp, fanStep, plural, useMeasuredWidth,
} from "./tablecards/ui"

const BOT_MS = 620
const TRICK_PAUSE_MS = 1150
const END_DELAY_MS = 1600
const PLACE_BONUS = [300, 150, 50, 0]
const SHORT = ["You", "W", "N", "E"]

/** Direction (unit vector) from the table centre to each seat. */
const SEAT_DIR: { x: number; y: number }[] = [
  { x: 0, y: 1 },   // South
  { x: -1, y: 0 },  // West
  { x: 0, y: -1 },  // North
  { x: 1, y: 0 },   // East
]

const ORDINAL = ["1st", "2nd", "3rd", "4th"]

function passPrompt(dir: PassDir): string {
  if (dir === "none") return "No passing this hand"
  return `Pass three cards ${dir === "across" ? "across" : `to the ${dir}`}`
}

/** Arcade score. Finished: place bonus + 10 per point under the opponents' average. Quit: half the margin only. */
function arcadeResult(s: HeartsState, level: Level, finished: boolean): ArcadeGameResult {
  const mult = DIFFICULTY_MULTIPLIER[level] ?? 1
  const mine = s.scores[0]
  const avgOpp = (s.scores[1] + s.scores[2] + s.scores[3]) / 3
  const margin = Math.max(0, avgOpp - mine)
  const others = [1, 2, 3].map((i) => `${seatName(i)} ${s.scores[i]}`).join(", ")
  if (finished) {
    const place = placeOf(s.scores, 0)
    const score = Math.round((PLACE_BONUS[place - 1] + 10 * margin) * mult)
    return { score, won: place === 1, summary: `${ORDINAL[place - 1]} place with ${plural(mine, "point")} (${others})` }
  }
  const hands = s.history.length
  return {
    score: Math.round(5 * margin * mult),
    won: false,
    summary: `Left after ${plural(hands, "hand")} on ${plural(mine, "point")} (${others})`,
  }
}

export default function Hearts({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [rng] = useState(() => createRng())
  const [level, setLevel] = useState<Level>("medium")
  const [s, setS] = useState<HeartsState | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [rootRef, width] = useMeasuredWidth<HTMLDivElement>(1060)

  // ── Computer turns and trick pacing ──
  useEffect(() => {
    if (!s) return
    let t: number | undefined
    if (s.phase === "playing" && s.turn !== 0) {
      const seat = s.turn
      t = window.setTimeout(() => setS(playCard(s, seat, choosePlay(s, seat, level, rng))), BOT_MS)
    } else if (s.phase === "trickDone") {
      t = window.setTimeout(() => setS(collectTrick(s)), TRICK_PAUSE_MS)
    } else if (s.phase === "gameOver") {
      t = window.setTimeout(() => finish(arcadeResult(s, level, true)), END_DELAY_MS)
    }
    return () => window.clearTimeout(t)
  }, [s, level, rng, finish])

  const myHand = useMemo(() => (s ? sortHand(s.hands[0], true) : []), [s])
  const legalIds = useMemo(() => {
    if (!s || s.phase !== "playing" || s.turn !== 0) return null
    return new Set(legalPlays(s.hands[0], s.trick, s.heartsBroken, s.trickNo === 0).map((c) => c.id))
  }, [s])

  const toggleSelect = useCallback((c: Card) => {
    setSelected((sel) => (sel.includes(c.id) ? sel.filter((id) => id !== c.id) : sel.length >= 3 ? sel : [...sel, c.id]))
  }, [])

  const confirmPass = useCallback(() => {
    if (!s || s.phase !== "passing" || selected.length !== 3) return
    const mine = s.hands[0].filter((c) => selected.includes(c.id))
    const passes = [mine, ...[1, 2, 3].map((seat) => choosePass(s.hands[seat], s.passDir, level, rng))]
    setSelected([])
    setS(applyPasses(s, passes))
  }, [s, selected, level, rng])

  const playMine = useCallback((c: Card) => {
    if (!s || !isLegal(s, 0, c)) return
    setS(playCard(s, 0, c))
  }, [s])

  if (!s) {
    return (
      <div ref={rootRef} className="text-foreground">
        <SetupScreen
          title="Hearts"
          description="Avoid hearts and the Queen of Spades. Lowest score when someone reaches the target wins."
          options={[
            {
              id: "level", label: "Computer players", choices: [
                { value: "easy", label: "Easy", hint: "Plays any legal card" },
                { value: "medium", label: "Medium", hint: "Ducks and dumps" },
                { value: "hard", label: "Hard", hint: "Counts cards" },
              ],
            },
            {
              id: "target", label: "Play to", choices: [
                { value: "50", label: "50 points", hint: "Shorter game" },
                { value: "100", label: "100 points", hint: "Standard" },
              ],
            },
          ]}
          defaults={{ level: "medium", target: "100" }}
          startLabel="Deal"
          onStart={(v) => {
            setLevel(isLevel(v.level) ? v.level : "medium")
            setS(newGame(v.target === "50" ? 50 : 100, rng))
          }}
        />
      </div>
    )
  }

  // ── Sizing ──
  const wide = width >= 860
  const feltW = wide ? width - 236 : width
  const cw = Math.round(clamp(feltW * 0.085, 44, 74))
  const ch = cardHeight(cw)
  const bw = Math.round(clamp(feltW * 0.045, 24, 38))
  const bh = cardHeight(bw)
  const tw = Math.round(clamp(feltW * 0.078, 42, 68))
  const th = cardHeight(tw)
  const feltMin = Math.round(bh + ch + 2 * th + 120)
  const feltH = `clamp(${feltMin}px, calc(85vh - 210px), ${feltMin + 150}px)`
  const handStep = fanStep(myHand.length, cw, feltW - 28, 4)
  const northStep = fanStep(13, bw, Math.min(feltW * 0.42, 300), 3)
  const sideStep = Math.round(clamp((feltW < 560 ? 0.18 : 0.26) * bh, 6, 13))
  const msgW = Math.round(clamp(feltW - 2 * (bw + 44), 200, 460))

  const prefix = `h${s.handNo}-`
  const dealing = s.phase === "passing" || (s.passDir === "none" && s.trickNo === 0 && s.played.length === 0)
  const receivedIds = new Set(s.trickNo === 0 ? s.received[0].map((c) => c.id) : [])
  const myTurn = s.phase === "playing" && s.turn === 0
  const someIllegal = !!legalIds && legalIds.size < myHand.length
  const passTo = s.passDir === "none" ? null : seatName(passTarget(0, s.passDir))
  const passFrom = s.passDir === "none" ? null : [1, 2, 3].find((seat) => passTarget(seat, s.passDir) === 0) ?? null

  // ── Status ──
  let status: string
  if (s.phase === "passing") status = `${passPrompt(s.passDir)} (${passTo})`
  else if (s.phase === "playing") {
    if (s.turn === 0) {
      status = s.trickNo === 0 && s.trick.length === 0 ? "Your lead: the 2 of clubs"
        : s.trick.length === 0 ? (s.heartsBroken ? "Your lead" : "Your lead · hearts not broken yet")
        : "Your turn"
    } else status = `${seatName(s.turn)} is playing...`
  } else if (s.phase === "trickDone") {
    const pts = trickPoints(s.trick)
    status = `${s.trickWinner === 0 ? "You take" : `${seatName(s.trickWinner ?? 0)} takes`} the trick${pts ? ` (+${pts})` : ""}`
  } else if (s.phase === "handDone") status = `Hand ${s.handNo + 1} complete`
  else status = "Game over"

  const lastRecord = s.history[s.history.length - 1]
  const showResults = s.phase === "handDone" || s.phase === "gameOver"

  // ── Trick geometry ──
  const trickBoxW = Math.round(tw * 3)
  const trickBoxH = Math.round(th * 1.95)
  const trickPos = (seat: number) => {
    const d = SEAT_DIR[seat]
    return {
      left: Math.round(trickBoxW / 2 - tw / 2 + d.x * tw * 0.92),
      top: Math.round(trickBoxH / 2 - th / 2 + d.y * th * 0.46),
    }
  }
  const winner = s.trickWinner
  const exitTo = winner == null ? undefined : {
    x: SEAT_DIR[winner].x * feltW * 0.32,
    y: SEAT_DIR[winner].y * 170,
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.42, ease: "easeIn" as const },
  }

  const dealIn = (seat: number) => (dealing ? {
    opacity: 0,
    x: -SEAT_DIR[seat].x * 120,
    y: -SEAT_DIR[seat].y * 120,
  } : null)

  const seatDetail = (seat: number) => `${s.handPoints[seat]} pt${s.handPoints[seat] === 1 ? "" : "s"}`

  const scorePanel = (
    <div className={cn("rounded-lg border border-border bg-card text-card-foreground", wide ? "w-[224px] shrink-0" : "w-full")}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-foreground">Scores</span>
        <span className="text-[11px] text-muted-foreground">to {s.target} · low wins</span>
      </div>
      <div className={cn("overflow-y-auto", wide ? "max-h-[260px]" : "max-h-[160px]")}>
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium">Hand</th>
              {SHORT.map((n, i) => (
                <th key={n} className={cn("px-1.5 py-1.5 text-right font-medium", i === 0 && "text-foreground")}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.history.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-2 text-center text-muted-foreground">No hands played yet</td></tr>
            )}
            {s.history.map((h, i) => (
              <tr key={i} className="border-t border-border/60">
                <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                {h.scored.map((p, seat) => (
                  <td key={seat} className={cn("px-1.5 py-1 text-right", seat === 0 && "font-medium text-foreground", h.moon === seat && "text-primary")}
                    title={h.moon === seat ? "Shot the moon" : undefined}>
                    {h.moon === seat ? "Moon" : p}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border font-semibold text-foreground">
              <td className="px-2 py-1.5">Total</td>
              {s.scores.map((p, seat) => <td key={seat} className="px-1.5 py-1.5 text-right">{p}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
      {wide && s.lastTrick && (
        <div className="border-t border-border px-3 py-2">
          <p className="mb-1.5 text-[11px] text-muted-foreground">
            Last trick · {s.lastTrick.winner === 0 ? "you took it" : `${seatName(s.lastTrick.winner)} took it`}
          </p>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((seat) => {
              const p = s.lastTrick!.plays.find((x) => x.seat === seat)!
              return (
                <div key={seat} className="flex flex-col items-center gap-0.5">
                  <div className={cn("rounded-[7%]", p.seat === s.lastTrick!.winner && "ring-2 ring-primary")}>
                    <PlayingCard card={p.card} width={34} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{SHORT[seat]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <LayoutGroup id="hearts">
      <div ref={rootRef} className="flex flex-col text-foreground">
        <GameToolbar
          status={status}
          stats={[
            { label: "Hand", value: s.handNo + 1 },
            { label: "Hearts", value: s.heartsBroken ? "broken" : "not broken" },
            { label: "You", value: `${s.scores[0]} pts` },
          ]}
          actions={
            <QuitButton
              onQuit={() => finish(arcadeResult(s, level, s.phase === "gameOver"))}
              disabled={s.phase === "gameOver"}
              title="Leave the game now (partial score)"
            />
          }
        />

        <div className={cn("flex gap-3", wide ? "flex-row items-start" : "flex-col")}>
          <Felt className={wide ? "min-w-0 flex-1" : undefined} style={{ height: feltH }}>
            {/* North */}
            <div className="absolute left-1/2 top-2.5 flex -translate-x-1/2 flex-col items-center gap-1.5">
              <SeatBadge name="North" detail={seatDetail(2)} active={s.phase === "playing" && s.turn === 2} />
              <BackFan cards={s.hands[2]} width={bw} step={northStep} label="North" initialFor={dealIn(2)} idPrefix={prefix} />
            </div>

            {/* West */}
            <div className="absolute left-2.5 top-[44%] flex -translate-y-1/2 flex-col items-start gap-1.5">
              <SeatBadge name="West" detail={seatDetail(1)} active={s.phase === "playing" && s.turn === 1} />
              <BackFan cards={s.hands[1]} width={bw} step={sideStep} vertical label="West" initialFor={dealIn(1)} idPrefix={prefix} />
            </div>

            {/* East */}
            <div className="absolute right-2.5 top-[44%] flex -translate-y-1/2 flex-col items-end gap-1.5">
              <SeatBadge name="East" detail={seatDetail(3)} active={s.phase === "playing" && s.turn === 3} />
              <BackFan cards={s.hands[3]} width={bw} step={sideStep} vertical label="East" initialFor={dealIn(3)} idPrefix={prefix} />
            </div>

            {/* Centre: trick, passing prompt, messages */}
            <div className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
              <div className="relative" style={{ width: trickBoxW, height: trickBoxH }} aria-label="Current trick" role="group">
                <AnimatePresence>
                  {s.trick.map((p, i) => (
                    <TableCard
                      key={prefix + p.card.id}
                      layoutId={prefix + p.card.id}
                      card={p.card}
                      faceUp
                      flipIn={p.seat !== 0}
                      width={tw}
                      exit={exitTo}
                      highlight={s.phase === "trickDone" && p.seat === winner}
                      className="absolute"
                      style={{ ...trickPos(p.seat), zIndex: i + 1 }}
                      label={`${seatName(p.seat)} played the ${cardName(p.card)}`}
                    />
                  ))}
                </AnimatePresence>
                {s.phase === "passing" && (
                  <div className="absolute left-1/2 top-1/2 flex w-max max-w-[260px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-lg bg-black/35 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-white">{passPrompt(s.passDir)}</p>
                    <p className="text-xs text-white/75">
                      to {passTo} · {selected.length} of 3 selected
                    </p>
                    <Button size="sm" onClick={confirmPass} disabled={selected.length !== 3}>
                      Pass cards
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex h-8 justify-center" style={{ width: msgW }}>
                {s.phase === "playing" && passFrom != null && s.trickNo === 0 && !s.played.some((p) => p.seat === 0) && (
                  <FeltMessage>Cards from {seatName(passFrom)} are highlighted</FeltMessage>
                )}
                {s.phase === "trickDone" && winner != null && trickPoints(s.trick) > 0 && (
                  <FeltMessage>{winner === 0 ? "You take" : `${seatName(winner)} takes`} {plural(trickPoints(s.trick), "point")}</FeltMessage>
                )}
              </div>
            </div>

            {/* South: your hand */}
            <div className="absolute inset-x-0 bottom-2.5 flex flex-col items-center gap-1.5">
              <SeatBadge name="You" detail={seatDetail(0)} active={myTurn} />
              <div className="flex items-end justify-center" style={{ height: ch + 10, paddingTop: 10 }}>
                {myHand.map((c, i) => {
                  const legal = legalIds ? legalIds.has(c.id) : true
                  const passing = s.phase === "passing"
                  const clickable = passing || (myTurn && legal)
                  return (
                    <TableCard
                      key={prefix + c.id}
                      layoutId={prefix + c.id}
                      card={c}
                      faceUp
                      flipIn
                      width={cw}
                      initial={dealIn(0) ?? false}
                      enterDelay={dealing ? i * 0.03 : 0}
                      selected={passing && selected.includes(c.id)}
                      highlight={receivedIds.has(c.id)}
                      dim={myTurn && !legal}
                      hoverLift={clickable}
                      onClick={clickable ? () => (passing ? toggleSelect(c) : playMine(c)) : undefined}
                      lift={myTurn && legal && someIllegal ? 6 : 0}
                      style={{ marginLeft: i ? handStep - cw : 0, zIndex: i }}
                      label={cardName(c)}
                    />
                  )
                })}
              </div>
            </div>

            {/* Hand / game results */}
            <AnimatePresence>
              {showResults && lastRecord && (
                <motion.div
                  key={`results-${s.handNo}`}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 p-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  <div className="w-[min(340px,100%)] rounded-lg border border-border bg-card p-4 text-card-foreground shadow-md">
                    <p className="text-sm font-semibold text-foreground">
                      {s.phase === "gameOver" ? "Final standings" : `Hand ${s.handNo + 1} results`}
                    </p>
                    {lastRecord.moon != null && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <SuitIcon suit="H" size={12} className="shrink-0" />
                        {lastRecord.moon === 0 ? "You shot the moon. Everyone else takes 26." : `${seatName(lastRecord.moon)} shot the moon. Everyone else takes 26.`}
                      </p>
                    )}
                    <table className="mt-3 w-full text-xs tabular-nums">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="py-1 text-left font-medium">Player</th>
                          <th className="py-1 text-right font-medium">This hand</th>
                          <th className="py-1 text-right font-medium">Total</th>
                          {s.phase === "gameOver" && <th className="py-1 text-right font-medium">Place</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[0, 1, 2, 3]
                          .slice()
                          .sort((a, b) => (s.phase === "gameOver" ? s.scores[a] - s.scores[b] : a - b))
                          .map((seat) => (
                            <tr key={seat} className={cn("border-t border-border/60", seat === 0 && "font-semibold text-foreground")}>
                              <td className="py-1.5">{seatName(seat)}</td>
                              <td className="py-1.5 text-right">+{lastRecord.scored[seat]}</td>
                              <td className="py-1.5 text-right">{s.scores[seat]}</td>
                              {s.phase === "gameOver" && <td className="py-1.5 text-right">{ORDINAL[placeOf(s.scores, seat) - 1]}</td>}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {s.phase === "handDone" ? (
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">Next: {passPrompt(passDirFor(s.handNo + 1)).toLowerCase()}</span>
                        <Button size="sm" onClick={() => setS(nextHand(s, rng))} autoFocus>Next hand</Button>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {placeOf(s.scores, 0) === 1 ? "You win with the lowest score." : `You finished ${ORDINAL[placeOf(s.scores, 0) - 1]}.`}
                        {" "}Score {formatNumber(arcadeResult(s, level, true).score)}.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Felt>

          {scorePanel}
        </div>
      </div>
    </LayoutGroup>
  )
}
