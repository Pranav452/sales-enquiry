"use client"

// Blackjack vs the dealer. Rules and payouts live in tablecards/blackjack.ts;
// this file is the table, the controls and the session (20 rounds max).

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "framer-motion"
import { Lightbulb } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { cardHeight } from "@/components/game/arcade/kit/cards"
import { GameToolbar, SetupScreen, ToolButton, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { createRng } from "@/components/game/arcade/kit/random"
import {
  ACTION_LABEL, BET_SIZES, MAX_ROUNDS, START_BANKROLL,
  basicStrategy, betOptions, canDeal, canDouble, canHit, canSplit, deal, dealerStep, describeHand,
  double as doubleDown, hit, initialState, insuranceCost, pointValue, resolveInsurance, split, stand,
  type Action, type BJHand, type BJState, type Outcome,
} from "./tablecards/blackjack"
import { formatNumber, type Card } from "./tablecards/common"
import { Felt, FeltMessage, FeltPrint, QuitButton, SeatBadge, TableCard, clamp, useMeasuredWidth } from "./tablecards/ui"

const DEALER_STEP_MS = 650
const END_DELAY_MS = 1400

const OUTCOME_TEXT: Record<Outcome, string> = {
  blackjack: "Blackjack",
  win: "Win",
  push: "Push",
  lose: "Lose",
  bust: "Bust",
}

function OutcomePill({ hand }: { hand: BJHand }) {
  if (!hand.outcome) return null
  const delta = hand.returned - hand.bet
  const good = hand.outcome === "win" || hand.outcome === "blackjack"
  const neutral = hand.outcome === "push"
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
        good ? "bg-emerald-50 text-emerald-800" : neutral ? "bg-white/85 text-slate-800" : "bg-black/45 text-white",
      )}
    >
      {OUTCOME_TEXT[hand.outcome]}
      {delta !== 0 && <span className="ml-1 font-medium">{delta > 0 ? `+${delta}` : `${delta}`}</span>}
    </motion.span>
  )
}

/** The selected bet if affordable, otherwise the largest bet the bankroll allows. */
function chooseBet(bankroll: number, wanted: number): number {
  const opts = betOptions(bankroll)
  return opts.includes(wanted) ? wanted : opts[opts.length - 1] ?? 0
}

export default function Blackjack({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const [rng] = useState(() => createRng())
  const [started, setStarted] = useState(false)
  const [s, setS] = useState<BJState>(() => initialState(rng))
  const [bet, setBet] = useState<number>(25)
  const [hintKey, setHintKey] = useState<string | null>(null)
  const [rootRef, width] = useMeasuredWidth<HTMLDivElement>()

  // Shrink cards when split hands would not fit side by side.
  const handsN = Math.max(1, s.hands.length)
  const fitW = (width - 24 - 16 * (handsN - 1)) / (handsN * 2.3)
  const cw = Math.round(Math.min(clamp(width * 0.095, 52, 88), Math.max(40, fitW)))
  const ch = cardHeight(cw)
  const shoeW = Math.round(cw * 0.7)

  // ── Derived ──
  const options = betOptions(s.bankroll)
  const effectiveBet = chooseBet(s.bankroll, bet)
  const allIn = options.length === 1 && !(BET_SIZES as readonly number[]).includes(options[0])
  const betChoices: number[] = allIn ? options : [...BET_SIZES]
  const betweenRounds = s.phase === "betting" || s.phase === "settled"
  const active = s.phase === "player" ? s.hands[s.active] : null
  const decisionKey = `${s.round}:${s.phase}:${s.active}:${s.hands.length}:${active?.cards.length ?? 0}`
  const hint: Action | "no-insurance" | null = useMemo(() => {
    if (hintKey !== decisionKey) return null
    if (s.phase === "insurance") return "no-insurance"
    if (!active) return null
    return basicStrategy(active.cards, s.dealer[0], canDouble(s), canSplit(s))
  }, [hintKey, decisionKey, s, active])

  // ── Session end ──
  const endSession = useCallback((st: BJState, cashedOut: boolean) => {
    const score = Math.max(0, st.bankroll)
    const rounds = st.round
    const summary = st.bankroll <= 0
      ? `Bankroll lost after ${rounds} round${rounds === 1 ? "" : "s"}`
      : cashedOut
        ? `Cashed out ${formatNumber(score)} chips after ${rounds} round${rounds === 1 ? "" : "s"}`
        : `Finished ${MAX_ROUNDS} rounds with ${formatNumber(score)} chips`
    finish({ score, won: score > START_BANKROLL, summary })
  }, [finish])

  useEffect(() => {
    if (s.phase !== "over") return
    const t = window.setTimeout(() => endSession(s, false), END_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [s, endSession])

  // ── Dealer plays on a timer ──
  useEffect(() => {
    if (s.phase !== "dealer") return
    const t = window.setTimeout(() => setS(dealerStep(s, rng)), DEALER_STEP_MS)
    return () => window.clearTimeout(t)
  }, [s, rng])

  // ── Actions ──
  const doDeal = useCallback(() => {
    if (!canDeal(s, effectiveBet)) return
    setHintKey(null)
    setS(deal(s, effectiveBet, rng))
  }, [s, effectiveBet, rng])

  const act = useCallback((a: Action) => {
    if (s.phase !== "player") return
    if (a === "hit" && canHit(s)) setS(hit(s, rng))
    else if (a === "stand") setS(stand(s, rng))
    else if (a === "double" && canDouble(s)) setS(doubleDown(s, rng))
    else if (a === "split" && canSplit(s)) setS(split(s, rng))
  }, [s, rng])

  const insure = useCallback((take: boolean) => {
    if (s.phase === "insurance") setS(resolveInsurance(s, take))
  }, [s])

  // Keyboard: H / S / D / P during play, Enter to deal.
  useEffect(() => {
    if (!started) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      const k = e.key.toLowerCase()
      if (s.phase === "player") {
        const map: Record<string, Action> = { h: "hit", s: "stand", d: "double", p: "split" }
        if (map[k]) { e.preventDefault(); act(map[k]) }
      } else if (k === "enter" && betweenRounds && tag !== "BUTTON") {
        e.preventDefault()
        doDeal()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [started, s.phase, betweenRounds, act, doDeal])

  if (!started) {
    return (
      <div ref={rootRef} className="text-foreground">
        <SetupScreen
          title="Blackjack"
          description="Beat the dealer without going over 21. You start with 1,000 chips and play up to 20 rounds."
          options={[]}
          defaults={{}}
          startLabel="Sit down"
          onStart={() => setStarted(true)}
        >
          <ul className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <li>Six-deck shoe, reshuffled at the cut card</li>
            <li>Dealer stands on soft 17 and peeks for blackjack</li>
            <li>Blackjack pays 3 to 2, insurance pays 2 to 1</li>
            <li>Double on any two cards, split up to three hands</li>
          </ul>
        </SetupScreen>
      </div>
    )
  }

  // ── Labels ──
  const roundNo = s.phase === "betting" ? 1 : s.phase === "settled" || s.phase === "over" ? s.round : s.round + 1
  const status =
    s.phase === "betting" ? "Place your bet"
    : s.phase === "insurance" ? "Insurance?"
    : s.phase === "player" ? (s.hands.length > 1 ? `Your turn · hand ${s.active + 1} of ${s.hands.length}` : "Your turn")
    : s.phase === "dealer" ? "Dealer's turn"
    : s.phase === "over" ? "Session over"
    : s.net > 0 ? `You won ${s.net}` : s.net < 0 ? `You lost ${-s.net}` : s.hands.length > 1 ? "Broke even" : "Push"

  const dealerShown = s.holeHidden ? s.dealer.slice(0, 1) : s.dealer
  const dealerDetail = s.dealer.length === 0 ? undefined
    : s.holeHidden ? `Showing ${s.dealer[0].rank === 1 ? "A" : pointValue(s.dealer[0].rank)}`
    : describeHand(dealerShown)

  const prefix = `${s.shoeNo}-`
  const lastDrawn = s.lastDrawn
  const dealStagger = lastDrawn.length > 1
  const moveDelayFor = (c: Card) => (dealStagger ? Math.max(0, lastDrawn.indexOf(c.id)) * 0.16 : 0)
  const shoeTop = s.shoe.slice(-5)
  const onTable = s.hands.reduce((a, h) => a + h.bet, 0) + s.insurance
  const exitCard = { opacity: 0, y: -14, transition: { duration: 0.22 } }

  const message =
    s.phase === "betting" && s.round === 0 ? "Choose a bet and deal."
    : s.phase === "insurance" ? `Dealer shows an Ace. Insurance costs ${insuranceCost(s.hands[0]?.bet ?? 0)}.`
    : s.phase === "settled" || s.phase === "over" ? s.message
    : null

  const hintText =
    hint === "no-insurance" ? "Basic strategy: decline insurance."
    : hint ? `Basic strategy: ${ACTION_LABEL[hint]}.`
    : null

  const actionButton = (a: Action, enabled: boolean, key: string) => (
    <Button
      key={a}
      variant={hint === a ? "default" : "outline"}
      size="sm"
      className="h-9 min-w-[84px] gap-2"
      disabled={!enabled}
      onClick={() => act(a)}
      title={`${ACTION_LABEL[a]} (${key})`}
    >
      {ACTION_LABEL[a]}
      <kbd className={cn("rounded border px-1 text-[10px] font-normal", hint === a ? "border-primary-foreground/40" : "border-border text-muted-foreground")}>{key}</kbd>
    </Button>
  )

  return (
    <LayoutGroup id="blackjack">
      <div ref={rootRef} className="flex flex-col text-foreground">
        <GameToolbar
          status={status}
          stats={[
            { label: "Bankroll", value: formatNumber(s.bankroll) },
            ...(onTable > 0 && !betweenRounds && s.phase !== "over" ? [{ label: "On table", value: formatNumber(onTable) }] : []),
            { label: "Round", value: `${roundNo} / ${MAX_ROUNDS}` },
            { label: "Shoe", value: s.shoe.length },
          ]}
          actions={
            <>
              <ToolButton
                onClick={() => setHintKey(decisionKey)}
                disabled={!(s.phase === "player" || s.phase === "insurance")}
                aria-label="Show basic strategy hint"
              >
                <Lightbulb className="h-3.5 w-3.5" aria-hidden />
                Hint
              </ToolButton>
              <QuitButton
                label="Cash out"
                confirmLabel="Confirm cash out"
                onQuit={() => endSession(s, true)}
                disabled={!betweenRounds}
                title={betweenRounds ? "End the session and keep your chips" : "Finish the round first"}
              />
            </>
          }
        />

        <Felt
          className="flex flex-col items-center justify-between px-3 pb-3 pt-3"
          style={{ height: `clamp(${2 * ch + 196}px, calc(85vh - 250px), ${2 * ch + 300}px)` }}
        >
          {/* Shoe */}
          <div className="absolute right-3 top-3 flex flex-col items-center gap-1" aria-label={`Shoe, ${s.shoe.length} cards`} role="img">
            <div className="relative" style={{ width: shoeW + 4, height: cardHeight(shoeW) + 4 }}>
              {shoeTop.map((c, i) => (
                <TableCard
                  key={prefix + c.id}
                  layoutId={prefix + c.id}
                  card={c}
                  faceUp={false}
                  width={shoeW}
                  className="absolute"
                  style={{ left: i, top: i }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/55">Shoe</span>
          </div>

          {/* Dealer */}
          <div className="flex flex-col items-center gap-1.5">
            <SeatBadge name="Dealer" detail={dealerDetail} active={s.phase === "dealer"} />
            <div className="flex items-start justify-center" style={{ minHeight: ch, minWidth: cw }}>
              <AnimatePresence mode="popLayout" initial={false}>
                {s.dealer.map((c, i) => (
                  <TableCard
                    key={prefix + c.id}
                    layoutId={prefix + c.id}
                    card={c}
                    faceUp={!(i === 1 && s.holeHidden)}
                    flipIn={lastDrawn.includes(c.id) && !(i === 1 && s.holeHidden)}
                    moveDelay={moveDelayFor(c)}
                    width={cw}
                    exit={exitCard}
                    style={{ marginLeft: i ? -Math.round(cw * 0.42) : 0, zIndex: i }}
                    label={i === 1 && s.holeHidden ? "Dealer's hole card, face down" : undefined}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Table print + messages */}
          <div className="flex min-h-[64px] w-full flex-col items-center justify-center gap-1.5">
            <FeltPrint>Blackjack pays 3 to 2</FeltPrint>
            <FeltPrint className="hidden min-[440px]:block">Dealer stands on soft 17 · Insurance pays 2 to 1</FeltPrint>
            {message && <FeltMessage key={`${s.round}-${s.phase}`}>{message}</FeltMessage>}
            {s.reshuffled && s.phase === "player" && <FeltMessage key={`shuffle-${s.shoeNo}`}>New shoe shuffled.</FeltMessage>}
          </div>

          {/* Player hands */}
          <div className="flex max-w-full items-end justify-center gap-2 sm:gap-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {s.hands.length === 0 && (
                <motion.div key="empty" className="flex flex-col items-center gap-1.5" exit={{ opacity: 0 }}>
                  <SeatBadge name="You" detail={`Bet ${effectiveBet}`} />
                  <div className="rounded-[7%] border-2 border-dashed border-white/30" style={{ width: cw, height: ch }} />
                </motion.div>
              )}
              {s.hands.map((h, hi) => {
                const isActive = s.phase === "player" && hi === s.active
                const step = h.cards.length > 4 ? 0.32 : 0.44
                return (
                  <motion.div
                    key={`hand-${hi}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg p-1 sm:p-1.5",
                      isActive && s.hands.length > 1 ? "bg-white/10 ring-2 ring-white/70" : "ring-0",
                    )}
                  >
                    <SeatBadge
                      name={s.hands.length > 1 ? `Hand ${hi + 1}` : "You"}
                      detail={describeHand(h.cards, h.fromSplit)}
                      active={isActive}
                    />
                    <div className="flex items-start" style={{ minHeight: ch }}>
                      <AnimatePresence mode="popLayout" initial={false}>
                        {h.cards.map((c, i) => (
                          <TableCard
                            key={prefix + c.id}
                            layoutId={prefix + c.id}
                            card={c}
                            faceUp
                            flipIn={lastDrawn.includes(c.id)}
                            moveDelay={moveDelayFor(c)}
                            width={cw}
                            exit={exitCard}
                            style={{ marginLeft: i ? -Math.round(cw * (1 - step)) : 0, zIndex: i }}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="flex h-6 items-center gap-1.5">
                      <span className="rounded-md bg-black/30 px-2 py-0.5 text-xs font-medium tabular-nums text-white/90">
                        Bet {h.bet}{h.doubled ? " · doubled" : ""}
                      </span>
                      <OutcomePill hand={h} />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </Felt>

        {/* Controls */}
        <div className="mt-3 flex min-h-[40px] flex-wrap items-center justify-center gap-2">
          {betweenRounds && (
            <>
              <span className="text-xs font-medium text-muted-foreground">Bet</span>
              <div role="radiogroup" aria-label="Bet size" className="flex flex-wrap gap-1.5">
                {betChoices.map((v) => {
                  const ok = v <= s.bankroll
                  const on = v === effectiveBet
                  return (
                    <Button
                      key={v}
                      role="radio"
                      aria-checked={on}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      disabled={!ok}
                      onClick={() => setBet(v)}
                      className="h-9 min-w-[52px] tabular-nums"
                    >
                      {allIn ? `All in · ${v}` : v}
                    </Button>
                  )
                })}
              </div>
              <Button size="sm" className="h-9 min-w-[96px]" onClick={doDeal} disabled={!canDeal(s, effectiveBet)}>
                Deal
              </Button>
            </>
          )}

          {s.phase === "insurance" && (
            <>
              <p className="w-full text-center text-xs text-muted-foreground sm:w-auto">
                Insurance costs {insuranceCost(s.hands[0].bet)} and pays 2 to 1 if the dealer has blackjack.
              </p>
              <Button size="sm" variant="outline" className="h-9" onClick={() => insure(true)}>Take insurance</Button>
              <Button size="sm" variant={hint === "no-insurance" ? "default" : "outline"} className="h-9" onClick={() => insure(false)}>
                No insurance
              </Button>
            </>
          )}

          {s.phase === "player" && (
            <>
              {actionButton("hit", canHit(s), "H")}
              {actionButton("stand", true, "S")}
              {actionButton("double", canDouble(s), "D")}
              {actionButton("split", canSplit(s), "P")}
            </>
          )}

          {s.phase === "dealer" && <p className="text-sm text-muted-foreground">Dealer is drawing...</p>}

          {s.phase === "over" && (
            <p className="text-sm text-muted-foreground">
              Session over · final bankroll <span className="font-medium tabular-nums text-foreground">{formatNumber(s.bankroll)}</span>
            </p>
          )}
        </div>

        <p className="mt-1 min-h-[20px] text-center text-xs text-muted-foreground" aria-live="polite">
          {hintText ?? (s.phase === "player" && active ? `${describeHand(active.cards, active.fromSplit)} against the dealer's ${s.dealer[0].rank === 1 ? "Ace" : pointValue(s.dealer[0].rank)}.` : "")}
        </p>
      </div>
    </LayoutGroup>
  )
}
