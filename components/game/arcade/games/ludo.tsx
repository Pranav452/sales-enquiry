"use client"

// ============================================================
// Ludo — you (red) against 1 or 3 computer players.
// Logic + bots: ./dicegames/ludoLogic.ts · Board: ./dicegames/LudoBoard.tsx
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { DIFFICULTY_MULTIPLIER, GameToolbar, SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { rollDie } from "@/components/game/arcade/kit/dice"
import { createRng, shuffle } from "@/components/game/arcade/kit/random"
import {
  BASE, HOME, LAST_TRACK, applyMove, chooseMove, distinctMoves, earnsBonusRoll, isTripleSix, legalTokens,
  ludoScore, newState, progressOf, tokensHome, destination,
  type Difficulty, type LudoColor, type LudoState,
} from "./dicegames/ludoLogic"
import { LUDO_COLORS, LudoBoard, restingPoint, type LudoTokenView } from "./dicegames/LudoBoard"
import {
  BOT_NAMES, BoardLayout, Cancelled, DiceTray, EventLog, PlayerList, QuitButton, SpeedToggle,
  hopMotion, isTypingTarget, useCancellableWait, type LogEntry, type TokenMotion,
} from "./dicegames/shared"
import { ordinal } from "./dicegames/snakesLogic"
import { cn } from "@/lib/utils"

const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" }

interface LPlayer {
  color:    LudoColor
  name:     string
  human:    boolean
  captures: number
  lost:     number
  place:    number | null
}

interface Shown {
  rel:    number
  motion: TokenMotion | null
}

interface LGame {
  state:     LudoState
  shown:     Shown[][]
  players:   LPlayer[]
  current:   number
  dice:      number
  rolling:   boolean
  busy:      boolean
  over:      boolean
  phase:     "roll" | "choose"
  /** sixes rolled in a row by the current player (this turn) */
  sixes:     number
  choices:   number[]
  /** the current roll is a bonus roll */
  bonus:     boolean
  nextPlace: number
  turns:     number
  log:       LogEntry[]
  announce:  string
}

function timing(fast: boolean) {
  return fast
    ? { roll: 240, step: 75, exit: 170, slide: 0.32, think: 170, pause: 320, bot: 220, end: 700 }
    : { roll: 460, step: 140, exit: 320, slide: 0.55, think: 360, pause: 650, bot: 460, end: 1100 }
}

function whereText(rel: number) {
  if (rel === BASE) return "in base"
  if (rel >= HOME) return "home"
  if (rel > LAST_TRACK) return `in home column, ${HOME - rel} to go`
  return `${HOME - rel} steps from home`
}

export default function Ludo({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const wait = useCancellableWait()

  const [game, setGame] = useState<LGame | null>(null)
  const [fast, setFast] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")

  const gameRef = useRef<LGame | null>(null)
  const diffRef = useRef<Difficulty>("medium")
  const fastRef = useRef(false)
  const rngRef = useRef<() => number>(Math.random)
  const logId = useRef(0)

  const commit = useCallback((fn: (g: LGame) => void) => {
    const cur = gameRef.current
    if (!cur) return
    const next: LGame = {
      ...cur,
      players: cur.players.map((p) => ({ ...p })),
      shown: cur.shown.map((row) => row.map((s) => ({ ...s }))),
    }
    fn(next)
    gameRef.current = next
    setGame(next)
  }, [])

  const addLog = useCallback((g: LGame, color: string, text: string) => {
    logId.current += 1
    g.log = [{ id: logId.current, color, text }, ...g.log].slice(0, 80)
    g.announce = text
  }, [])

  const pause = useCallback(async (ms: number) => {
    await wait(ms)
    if (!gameRef.current || gameRef.current.over) throw new Cancelled()
  }, [wait])

  // ─── Start ──────────────────────────────────────────────────

  function start(values: Record<string, string>) {
    const count = values.players === "2" ? 2 : 4
    const diff = (["easy", "medium", "hard"].includes(values.difficulty) ? values.difficulty : "medium") as Difficulty
    const rng = createRng()
    rngRef.current = rng
    diffRef.current = diff
    setDifficulty(diff)
    const colors: LudoColor[] = count === 2 ? ["red", "yellow"] : ["red", "green", "yellow", "blue"]
    const names = shuffle(BOT_NAMES, rng)
    const players: LPlayer[] = colors.map((color, i) => ({
      color,
      name: i === 0 ? "You" : names[i - 1],
      human: i === 0,
      captures: 0, lost: 0, place: null,
    }))
    const state = newState(colors)
    logId.current = 1
    const g: LGame = {
      state,
      shown: state.map((s) => s.tokens.map((rel) => ({ rel, motion: null }))),
      players, current: 0, dice: 6, rolling: false, busy: false, over: false,
      phase: "roll", sixes: 0, choices: [], bonus: false, nextPlace: 1, turns: 1,
      log: [{ id: 1, color: "#94a3b8", text: `New game: ${count} players, ${DIFF_LABEL[diff]}. You play red and go first.` }],
      announce: "New game. Your turn — roll the die. You need a 6 to bring a token out.",
    }
    gameRef.current = g
    setGame(g)
  }

  // ─── End of game ────────────────────────────────────────────

  const report = useCallback((g: LGame) => {
    const me = g.players[0]
    const n = g.players.length
    const mult = DIFFICULTY_MULTIPLIER[diffRef.current] ?? 1
    const place = me.place ?? n
    const won = place === 1
    finish({
      score: ludoScore({ place, players: n, captures: me.captures, home: tokensHome(g.state[0]), multiplier: mult }),
      won,
      summary: won
        ? `Won on ${DIFF_LABEL[diffRef.current]} with ${me.captures} capture${me.captures === 1 ? "" : "s"}`
        : `Finished ${ordinal(place)} of ${n} on ${DIFF_LABEL[diffRef.current]}`,
    })
  }, [finish])

  const quit = useCallback(() => {
    const g = gameRef.current
    if (!g || g.over) return
    const me = g.players[0]
    const home = tokensHome(g.state[0])
    commit((d) => {
      d.over = true
      d.busy = false
      d.rolling = false
      d.phase = "roll"
      d.choices = []
      addLog(d, LUDO_COLORS.red.fill, "You left the game.")
    })
    finish({
      score: ludoScore({ place: null, players: g.players.length, captures: me.captures, home, multiplier: DIFFICULTY_MULTIPLIER[diffRef.current] ?? 1 }),
      won: false,
      summary: `Quit with ${home} token${home === 1 ? "" : "s"} home and ${me.captures} capture${me.captures === 1 ? "" : "s"}`,
    })
  }, [addLog, commit, finish])

  // ─── Turn helpers ───────────────────────────────────────────

  const passTurn = useCallback((pi: number) => {
    commit((g) => {
      let n = pi
      do n = (n + 1) % g.players.length
      while (g.players[n].place != null)
      g.current = n
      g.sixes = 0
      g.bonus = false
      g.busy = false
      g.phase = "roll"
      g.choices = []
      if (g.players[n].human) g.turns += 1
    })
  }, [commit])

  const rollAgain = useCallback((pi: number, why: string) => {
    commit((g) => {
      g.current = pi
      g.bonus = true
      g.busy = false
      g.phase = "roll"
      g.choices = []
      g.announce = g.players[pi].human ? `${why} Roll again.` : `${g.players[pi].name}: ${why} Rolls again.`
    })
  }, [commit])

  // ─── Move one token (animated) ──────────────────────────────

  const performMove = useCallback(async (pi: number, ti: number, roll: number) => {
    const g0 = gameRef.current!
    const tm = timing(fastRef.current)
    const color = g0.state[pi].color
    const res = applyMove(g0.state, pi, ti, roll)
    const P = g0.players[pi]
    commit((g) => {
      g.busy = true
      g.phase = "roll"
      g.choices = []
    })

    if (res.from === BASE) {
      const a = restingPoint(color, BASE, ti)
      const b = restingPoint(color, 0, ti)
      commit((g) => { g.shown[pi][ti] = { rel: 0, motion: hopMotion(a, b, tm.exit / 1000, 34) } })
      await pause(tm.exit)
    } else {
      for (let r = res.from + 1; r <= res.to; r++) {
        const a = restingPoint(color, r - 1, ti)
        const b = restingPoint(color, r, ti)
        commit((g) => { g.shown[pi][ti] = { rel: r, motion: hopMotion(a, b, tm.step / 1000, 13) } })
        await pause(tm.step)
      }
    }
    commit((g) => {
      g.state = res.state
      g.shown[pi][ti] = { rel: res.to, motion: null }
      if (res.from === BASE) addLog(g, LUDO_COLORS[color].fill, `${P.name} brought a token out.`)
    })

    if (res.captured.length) {
      await pause(Math.round(tm.step * 0.8))
      commit((g) => {
        for (const v of res.captured) {
          const vc = g.state[v.pi].color
          const a = restingPoint(vc, v.rel, v.ti)
          const b = restingPoint(vc, BASE, v.ti)
          g.shown[v.pi][v.ti] = { rel: BASE, motion: { xs: [a.x, b.x], ys: [a.y, b.y], dur: tm.slide, ease: "easeInOut" } }
          g.players[v.pi].lost += 1
        }
        g.players[pi].captures += res.captured.length
        const victims = [...new Set(res.captured.map((v) => v.pi))]
        for (const vp of victims) {
          const n = res.captured.filter((v) => v.pi === vp).length
          const whose = g.players[vp].human ? "your" : `${g.players[vp].name}'s`
          addLog(g, LUDO_COLORS[color].fill,
            `${P.name} captured ${whose} ${n > 1 ? `${n} tokens` : "token"} — back to base.`)
        }
      })
      await pause(Math.round(tm.slide * 1000) + 40)
      commit((g) => { for (const v of res.captured) g.shown[v.pi][v.ti].motion = null })
    }

    if (res.reachedHome) {
      commit((g) => {
        const h = tokensHome(g.state[pi])
        addLog(g, LUDO_COLORS[color].fill, `${P.name} got a token home (${h}/4).`)
        if (res.finished) {
          g.players[pi].place = g.nextPlace
          g.nextPlace += 1
          addLog(g, LUDO_COLORS[color].fill,
            `${P.name} ${P.human ? "have" : "has"} brought all four home — ${ordinal(g.players[pi].place!)} place.`)
        }
      })
    }

    await pause(Math.round(tm.pause * 0.35))

    // Game over?
    const g1 = gameRef.current!
    const left = g1.players.filter((p) => p.place == null)
    if (g1.players[0].place != null || left.length <= 1) {
      commit((g) => {
        const rest = g.players
          .map((p, i) => ({ p, prog: progressOf(g.state[i]) }))
          .filter((x) => x.p.place == null)
          .sort((a, b) => b.prog - a.prog)
        for (const x of rest) {
          x.p.place = g.nextPlace
          g.nextPlace += 1
        }
        g.over = true
        g.busy = false
        const me = g.players[0]
        addLog(g, LUDO_COLORS.red.fill, me.place === 1 ? "You win the game." : `Game over. You finished ${ordinal(me.place!)}.`)
      })
      await wait(tm.end)
      report(gameRef.current!)
      return
    }

    if (earnsBonusRoll(roll, res)) {
      rollAgain(pi, roll === 6 ? "Rolled a 6." : res.captured.length ? "Capture bonus." : "Token home bonus.")
    } else {
      passTurn(pi)
    }
  }, [addLog, commit, passTurn, pause, report, rollAgain, wait])

  // ─── Roll ───────────────────────────────────────────────────

  const takeRoll = useCallback(async () => {
    const g0 = gameRef.current
    if (!g0 || g0.over || g0.busy || g0.phase !== "roll") return
    const pi = g0.current
    const P = g0.players[pi]
    const tm = timing(fastRef.current)
    const col = LUDO_COLORS[P.color].fill
    try {
      commit((g) => {
        g.busy = true
        g.rolling = true
      })
      await pause(tm.roll)
      const roll = rollDie(rngRef.current)
      const sixes = roll === 6 ? gameRef.current!.sixes + 1 : 0
      commit((g) => {
        g.rolling = false
        g.dice = roll
        g.sixes = sixes
        g.announce = `${P.name} rolled ${roll}.`
      })

      if (isTripleSix(sixes)) {
        commit((g) => addLog(g, col, `${P.name} rolled three 6s in a row — turn forfeited.`))
        await pause(tm.pause)
        passTurn(pi)
        return
      }

      const state = gameRef.current!.state
      const moves = distinctMoves(state, pi, roll)
      if (moves.length === 0) {
        commit((g) => {
          const allBase = g.state[pi].tokens.every((t) => t === BASE)
          const why = allBase ? "needs a 6 to come out" : "no token can move"
          if (P.human) addLog(g, col, `You rolled ${roll} — ${allBase ? "you need a 6 to come out" : why}.`)
          else g.announce = `${P.name} rolled ${roll} — ${why}.`
        })
        await pause(tm.pause)
        if (roll === 6) rollAgain(pi, "Rolled a 6.")
        else passTurn(pi)
        return
      }

      if (P.human && moves.length > 1) {
        commit((g) => {
          g.phase = "choose"
          g.choices = legalTokens(g.state, pi, roll)
          g.busy = false
          g.announce = `You rolled ${roll}. Choose a token to move (keys 1 to 4).`
        })
        return
      }

      let ti: number
      if (P.human) {
        ti = moves[0]
        await pause(Math.round(tm.think * 0.6))
      } else {
        await pause(tm.think)
        ti = chooseMove(gameRef.current!.state, pi, roll, diffRef.current, rngRef.current)
      }
      await performMove(pi, ti, roll)
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e
    }
  }, [addLog, commit, passTurn, pause, performMove, rollAgain])

  const choose = useCallback((pi: number, ti: number) => {
    const g = gameRef.current
    if (!g || g.over || g.busy || g.phase !== "choose" || g.current !== pi || !g.players[pi].human) return
    if (!g.choices.includes(ti)) return
    void performMove(pi, ti, g.dice).catch((e) => { if (!(e instanceof Cancelled)) throw e })
  }, [performMove])

  // Computer turns play themselves.
  useEffect(() => {
    if (!game || game.over || game.busy || game.phase !== "roll" || game.players[game.current].human) return
    const t = setTimeout(() => { void takeRoll() }, timing(fastRef.current).bot)
    return () => clearTimeout(t)
  }, [game, takeRoll])

  // Space rolls, 1-4 pick a token.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const g = gameRef.current
      if (!g || g.over) return
      if (e.code === "Space" || e.key === " ") {
        if (isTypingTarget(e.target)) return
        e.preventDefault() // never scroll the dialog while playing
        if (!g.busy && g.phase === "roll" && g.players[g.current].human) void takeRoll()
        return
      }
      if (g.busy || !g.players[g.current].human) return
      if (g.phase === "choose" && /^[1-4]$/.test(e.key)) {
        const ti = Number(e.key) - 1
        if (g.choices.includes(ti)) {
          e.preventDefault()
          choose(g.current, ti)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [choose, takeRoll])

  function toggleFast() {
    fastRef.current = !fastRef.current
    setFast(fastRef.current)
  }

  // ─── Render ─────────────────────────────────────────────────

  if (!game) {
    return (
      <SetupScreen
        title="Ludo"
        description="Roll a 6 to leave base, race once around the board and bring all four tokens home."
        options={[
          { id: "players", label: "Players", choices: [
            { value: "2", label: "2 players", hint: "You vs 1 computer" },
            { value: "4", label: "4 players", hint: "You vs 3 computers" },
          ] },
          { id: "difficulty", label: "Difficulty", choices: [
            { value: "easy", label: "Easy", hint: "Random moves · x1" },
            { value: "medium", label: "Medium", hint: "Captures first · x2" },
            { value: "hard", label: "Hard", hint: "Plays the odds · x4" },
          ] },
        ]}
        defaults={{ players: "4", difficulty: "medium" }}
        onStart={start}
      >
        <p className="text-center text-xs text-muted-foreground">
          You play red. Six, capture or token home: roll again. Three 6s in a row lose the turn.
        </p>
      </SetupScreen>
    )
  }

  const cur = game.players[game.current]
  const me = game.players[0]
  const myTurn = cur.human && !game.over
  const choosing = myTurn && game.phase === "choose" && !game.busy
  const canRoll = myTurn && game.phase === "roll" && !game.busy
  const myHome = tokensHome(game.state[0])

  const status = game.over
    ? me.place === 1 ? "You won" : `Game over — you finished ${ordinal(me.place ?? game.players.length)}`
    : myTurn
      ? game.rolling ? "Rolling..." : choosing ? `You rolled ${game.dice} — choose a token` : game.busy ? "Moving..." : game.bonus ? "Bonus roll — roll again" : "Your turn"
      : `${cur.name}'s turn`

  const tokens: LudoTokenView[] = game.state.flatMap((side, pi) => side.tokens.map((rel, ti) => {
    const shown = game.shown[pi][ti]
    const selectable = choosing && pi === game.current && game.choices.includes(ti)
    const dest = selectable ? destination(rel, game.dice) : null
    return {
      key: `${pi}-${ti}`,
      pi, ti,
      color: side.color,
      rel: shown.rel,
      motion: shown.motion,
      selectable,
      dest,
      label: `Move token ${ti + 1}, ${whereText(rel)}${rel === BASE ? ", out to the start square" : dest === HOME ? ", reaches home" : ""}`,
    }
  }))

  const boardLabel = "Ludo board. " + game.players.map((p, i) => {
    const t = game.state[i].tokens
    return `${p.name} (${LUDO_COLORS[p.color].label}): ${tokensHome(game.state[i])} home, ${t.filter((x) => x === BASE).length} in base`
  }).join(". ")

  return (
    <div className="text-foreground">
      <GameToolbar
        status={status}
        stats={[
          { label: "Home", value: `${myHome}/4` },
          { label: "Captures", value: me.captures },
          { label: "Level", value: DIFF_LABEL[difficulty] },
        ]}
        actions={
          <>
            <SpeedToggle fast={fast} onToggle={toggleFast} />
            <QuitButton onQuit={quit} disabled={game.over} />
          </>
        }
      />
      <p className="sr-only" aria-live="polite">{game.announce}</p>

      <BoardLayout
        board={
          <LudoBoard
            tokens={tokens}
            activeColor={game.over ? null : cur.color}
            label={boardLabel}
            onChoose={choose}
          />
        }
        side={
          <>
            <DiceTray
              value={game.dice}
              rolling={game.rolling}
              canRoll={canRoll}
              onRoll={() => { void takeRoll() }}
              accent={LUDO_COLORS[cur.color].fill}
              caption={game.over ? "Game over" : myTurn ? (choosing ? "Pick a token" : game.bonus ? "Bonus roll" : "Your roll") : `${cur.name} is playing`}
            />
            {choosing && (
              <div className="rounded-lg border border-border bg-background p-2" role="group" aria-label="Choose a token">
                <p className="mb-1.5 text-[11px] text-muted-foreground">Move which token? (keys 1-4)</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map((ti) => {
                    const ok = game.choices.includes(ti)
                    const rel = game.state[0].tokens[ti]
                    return (
                      <button
                        key={ti}
                        type="button"
                        disabled={!ok}
                        onClick={() => choose(0, ti)}
                        aria-label={ok ? `Move token ${ti + 1}, ${whereText(rel)}` : `Token ${ti + 1} cannot move`}
                        title={whereText(rel)}
                        className={cn(
                          "rounded-md border px-1 py-1 text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          ok
                            ? "border-foreground/40 bg-accent text-foreground hover:bg-foreground hover:text-background"
                            : "border-border text-muted-foreground opacity-50",
                        )}
                      >
                        {ti + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <PlayerList
              players={game.players.map((p, i) => {
                const t = game.state[i].tokens
                const out = t.filter((x) => x !== BASE && x !== HOME).length
                return {
                  key: p.color,
                  name: p.name,
                  color: LUDO_COLORS[p.color].fill,
                  active: !game.over && i === game.current,
                  place: p.place,
                  human: p.human,
                  detail: `Home ${tokensHome(game.state[i])}/4 · Out ${out}${p.captures ? ` · ${p.captures} cap${p.captures === 1 ? "" : "s"}` : ""}`,
                }
              })}
            />
            <EventLog entries={game.log} className="max-h-44 @2xl:max-h-none @2xl:flex-1" />
          </>
        }
      />
    </div>
  )
}
