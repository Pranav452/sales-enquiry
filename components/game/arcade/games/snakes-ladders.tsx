"use client"

// ============================================================
// Snakes & Ladders — 2 to 4 players (you + computers).
// Logic: ./dicegames/snakesLogic.ts · Board: ./dicegames/SnakesBoard.tsx
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react"
import type { ArcadeGameProps } from "@/lib/game/arcade"
import { GameToolbar, SetupScreen, useGameOverOnce } from "@/components/game/arcade/kit/GameShell"
import { rollDie } from "@/components/game/arcade/kit/dice"
import { createRng, shuffle } from "@/components/game/arcade/kit/random"
import {
  LAST_SQUARE, grantsExtraRoll, ordinal, placeScore, planMove, quitScore, squareCenter,
  type SLOptions,
} from "./dicegames/snakesLogic"
import { SnakesBoard, snakeSlidePoints, startPoint, type SLTokenView } from "./dicegames/SnakesBoard"
import {
  BOT_NAMES, BoardLayout, Cancelled, DiceTray, EventLog, PlayerList, QuitButton, SpeedToggle,
  hopMotion, isTypingTarget, useCancellableWait, type LogEntry, type TokenMotion,
} from "./dicegames/shared"

const SEATS = [
  { color: "#d63a32", ink: "#ffffff", label: "Red" },
  { color: "#2563c9", ink: "#ffffff", label: "Blue" },
  { color: "#23914a", ink: "#ffffff", label: "Green" },
  { color: "#f0b81c", ink: "#2b2200", label: "Yellow" },
]

interface SLPlayer {
  id:      number
  name:    string
  initial: string
  color:   string
  ink:     string
  human:   boolean
  /** logical square (0 = not started) */
  pos:     number
  /** square the token is drawn on */
  shown:   number
  motion:  TokenMotion | null
  turns:   number
  ladders: number
  snakes:  number
  place:   number | null
}

interface SLGame {
  players:   SLPlayer[]
  current:   number
  dice:      number
  rolling:   boolean
  busy:      boolean
  over:      boolean
  /** the current roll is a bonus roll after a 6 */
  extra:     boolean
  nextPlace: number
  log:       LogEntry[]
  announce:  string
}

function timing(fast: boolean) {
  return fast
    ? { roll: 260, step: 90, slide: 0.5, pause: 260, bot: 260, end: 700 }
    : { roll: 560, step: 175, slide: 1.0, pause: 600, bot: 650, end: 1100 }
}

export default function SnakesLadders({ onGameOver }: ArcadeGameProps) {
  const finish = useGameOverOnce(onGameOver)
  const wait = useCancellableWait()

  const [game, setGame] = useState<SLGame | null>(null)
  const [fast, setFast] = useState(false)
  const [opts, setOpts] = useState<SLOptions>({ exactFinish: true, sixExtra: true })

  const gameRef = useRef<SLGame | null>(null)
  const optsRef = useRef<SLOptions>(opts)
  const fastRef = useRef(false)
  const rngRef = useRef<() => number>(Math.random)
  const logId = useRef(0)

  const commit = useCallback((fn: (g: SLGame) => void) => {
    const cur = gameRef.current
    if (!cur) return
    const next: SLGame = { ...cur, players: cur.players.map((p) => ({ ...p })), log: cur.log }
    fn(next)
    gameRef.current = next
    setGame(next)
  }, [])

  const addLog = useCallback((g: SLGame, color: string, text: string) => {
    logId.current += 1
    g.log = [{ id: logId.current, color, text }, ...g.log].slice(0, 80)
    g.announce = text
  }, [])

  /** wait, then stop the script if the game ended meanwhile (quit) */
  const pause = useCallback(async (ms: number) => {
    await wait(ms)
    if (!gameRef.current || gameRef.current.over) throw new Cancelled()
  }, [wait])

  // ─── Start ──────────────────────────────────────────────────

  function start(values: Record<string, string>) {
    const count = Math.min(4, Math.max(2, Number(values.players) || 2))
    const o: SLOptions = { exactFinish: values.exact !== "off", sixExtra: values.six !== "off" }
    const rng = createRng()
    rngRef.current = rng
    optsRef.current = o
    setOpts(o)
    // computer names with distinct initials (tokens show the initial)
    const used = new Set(["Y"])
    const names: string[] = []
    for (const n of shuffle(BOT_NAMES, rng)) {
      if (names.length === count - 1) break
      if (used.has(n[0])) continue
      used.add(n[0])
      names.push(n)
    }
    const players: SLPlayer[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      name: i === 0 ? "You" : names[i - 1],
      initial: i === 0 ? "Y" : names[i - 1][0],
      color: SEATS[i].color,
      ink: SEATS[i].ink,
      human: i === 0,
      pos: 0, shown: 0, motion: null,
      turns: 0, ladders: 0, snakes: 0, place: null,
    }))
    logId.current = 1
    const g: SLGame = {
      players, current: 0, dice: 1, rolling: false, busy: false, over: false, extra: false, nextPlace: 1,
      log: [{ id: 1, color: "#94a3b8", text: `New game: ${count} players. You go first.` }],
      announce: "New game. Your turn — roll the die.",
    }
    gameRef.current = g
    setGame(g)
  }

  // ─── End of game ────────────────────────────────────────────

  const report = useCallback((g: SLGame) => {
    const me = g.players.find((p) => p.human)!
    const n = g.players.length
    const place = me.place ?? n
    const won = place === 1
    finish({
      score: placeScore(place, n, me.turns),
      won,
      summary: won
        ? `Won in ${me.turns} turns against ${n - 1} opponent${n > 2 ? "s" : ""}`
        : `Finished ${ordinal(place)} of ${n}`,
    })
  }, [finish])

  const quit = useCallback(() => {
    const g = gameRef.current
    if (!g || g.over) return
    const me = g.players.find((p) => p.human)!
    commit((d) => {
      d.over = true
      d.busy = false
      d.rolling = false
      addLog(d, me.color, "You left the game.")
    })
    finish({ score: quitScore(me.pos), won: false, summary: `Quit on square ${me.pos || "start"}` })
  }, [addLog, commit, finish])

  // ─── One roll ───────────────────────────────────────────────

  const takeTurn = useCallback(async () => {
    const g0 = gameRef.current
    if (!g0 || g0.busy || g0.over) return
    const pi = g0.current
    const tm = timing(fastRef.current)
    try {
      commit((g) => {
        g.busy = true
        g.rolling = true
        if (!g.extra) g.players[pi].turns += 1
      })
      await pause(tm.roll)
      const roll = rollDie(rngRef.current)
      commit((g) => {
        g.rolling = false
        g.dice = roll
      })
      const p = gameRef.current!.players[pi]
      const plan = planMove(p.pos, roll, optsRef.current)
      const you = p.human

      if (plan.blocked) {
        commit((g) => addLog(g, p.color, `${p.name} rolled ${roll} — ${you ? "you need" : "needs"} exactly ${LAST_SQUARE - p.pos} to finish.`))
        await pause(tm.pause)
      } else {
        await pause(Math.round(tm.step * 0.8))
        let prev = p.pos
        for (const sq of plan.path) {
          const a = prev > 0 ? squareCenter(prev) : startPoint(p.id)
          const b = squareCenter(sq)
          commit((g) => {
            g.players[pi].shown = sq
            g.players[pi].motion = hopMotion(a, b, tm.step / 1000, 26)
          })
          await pause(tm.step)
          prev = sq
        }

        const fromText = p.pos === 0 ? "start" : String(p.pos)
        if (plan.jump) {
          const jump = plan.jump
          await pause(Math.round(tm.pause * 0.45))
          const pts = jump.kind === "snake"
            ? snakeSlidePoints(jump.from)
            : [squareCenter(jump.from), squareCenter(jump.to)]
          const dur = jump.kind === "snake" ? tm.slide * 1.1 : tm.slide * 0.8
          commit((g) => {
            g.players[pi].shown = jump.to
            g.players[pi].motion = {
              xs: pts.map((q) => q.x), ys: pts.map((q) => q.y), dur,
              ease: jump.kind === "snake" ? "linear" : "easeInOut",
            }
          })
          await pause(Math.round(dur * 1000) + 60)
          commit((g) => {
            const q = g.players[pi]
            q.pos = jump.to
            q.shown = jump.to
            q.motion = null
            if (jump.kind === "ladder") {
              q.ladders += 1
              addLog(g, q.color, `${q.name} rolled ${roll} and climbed a ladder ${jump.from} → ${jump.to}.`)
            } else {
              q.snakes += 1
              addLog(g, q.color, `${q.name} rolled ${roll} and ${you ? "were" : "was"} bitten by a snake ${jump.from} → ${jump.to}.`)
            }
          })
        } else {
          commit((g) => {
            const q = g.players[pi]
            q.pos = plan.final
            q.shown = plan.final
            q.motion = null
            addLog(g, q.color, `${q.name} rolled ${roll}: ${fromText} → ${plan.final}.`)
          })
        }

        if (plan.won) {
          commit((g) => {
            const q = g.players[pi]
            q.place = g.nextPlace
            g.nextPlace += 1
            addLog(g, q.color, `${q.name} reached 100 and ${you ? "finish" : "finishes"} ${ordinal(q.place)}.`)
          })
        }
        await pause(Math.round(tm.pause * 0.4))
      }

      // ─── Game over? ──
      const g1 = gameRef.current!
      const me = g1.players.find((q) => q.human)!
      const left = g1.players.filter((q) => q.place == null)
      if (me.place != null || left.length <= 1) {
        commit((g) => {
          // remaining players are ranked by how far they got
          const rest = g.players.filter((q) => q.place == null).sort((a, b) => b.pos - a.pos)
          for (const q of rest) {
            q.place = g.nextPlace
            g.nextPlace += 1
          }
          g.over = true
          g.busy = false
          const mine = g.players.find((q) => q.human)!
          addLog(g, mine.color, mine.place === 1 ? "You win the game." : `Game over. You finished ${ordinal(mine.place ?? g.players.length)}.`)
        })
        await wait(tm.end)
        report(gameRef.current!)
        return
      }

      // ─── Next roll ──
      const again = grantsExtraRoll(roll, optsRef.current, plan.won)
      commit((g) => {
        g.busy = false
        if (again) {
          g.extra = true
          g.announce = `${g.players[pi].human ? "You rolled" : `${g.players[pi].name} rolled`} a 6 — another roll.`
        } else {
          g.extra = false
          let n = pi
          do n = (n + 1) % g.players.length
          while (g.players[n].place != null)
          g.current = n
        }
      })
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e
    }
  }, [addLog, commit, pause, report, wait])

  // Computer turns play themselves.
  useEffect(() => {
    if (!game || game.over || game.busy || game.players[game.current].human) return
    const t = setTimeout(() => { void takeTurn() }, timing(fastRef.current).bot)
    return () => clearTimeout(t)
  }, [game, takeTurn])

  // Space rolls on your turn.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" && e.key !== " ") return
      if (isTypingTarget(e.target)) return
      const g = gameRef.current
      if (!g || g.over) return
      e.preventDefault() // never scroll the dialog while playing
      if (g.busy || !g.players[g.current].human) return
      void takeTurn()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [takeTurn])

  function toggleFast() {
    fastRef.current = !fastRef.current
    setFast(fastRef.current)
  }

  // ─── Render ─────────────────────────────────────────────────

  if (!game) {
    return (
      <SetupScreen
        title="Snakes & Ladders"
        description="Race from square 1 to 100. Ladders lift you up, snakes drag you down."
        options={[
          { id: "players", label: "Players", choices: [
            { value: "2", label: "2 players", hint: "You + 1 computer" },
            { value: "3", label: "3 players", hint: "You + 2 computers" },
            { value: "4", label: "4 players", hint: "You + 3 computers" },
          ] },
          { id: "exact", label: "Exact roll to finish", choices: [
            { value: "on", label: "On", hint: "Overshooting 100 wastes the roll" },
            { value: "off", label: "Off", hint: "Any roll past 100 finishes" },
          ] },
          { id: "six", label: "Six gives another roll", choices: [
            { value: "on", label: "On", hint: "Roll again after a 6" },
            { value: "off", label: "Off", hint: "One roll per turn" },
          ] },
        ]}
        defaults={{ players: "4", exact: "on", six: "on" }}
        onStart={start}
      >
        <p className="text-center text-xs text-muted-foreground">
          Win to score 300 or more. Fewer turns earn a bigger bonus.
        </p>
      </SetupScreen>
    )
  }

  const cur = game.players[game.current]
  const me = game.players.find((p) => p.human)!
  const myTurn = cur.human && !game.over
  const canRoll = myTurn && !game.busy

  const status = game.over
    ? me.place === 1 ? "You won" : `Game over — you finished ${ordinal(me.place ?? game.players.length)}`
    : myTurn
      ? game.busy ? (game.rolling ? "Rolling..." : "Moving...") : game.extra ? "Six! Roll again" : "Your turn"
      : `${cur.name}'s turn`

  const tokens: SLTokenView[] = game.players.map((p) => ({
    key: `p${p.id}`,
    name: p.name,
    initial: p.initial,
    color: p.color,
    ink: p.ink,
    square: p.shown,
    slot: p.id,
    motion: p.motion,
    active: !game.over && p.id === cur.id && p.place == null,
  }))

  const boardLabel = "Snakes and Ladders board. " + game.players
    .map((p) => `${p.name}: ${p.place != null ? `finished ${ordinal(p.place)}` : p.pos === 0 ? "not started" : `square ${p.pos}`}`)
    .join(". ")

  return (
    <div className="text-foreground">
      <GameToolbar
        status={status}
        stats={[
          { label: "Your square", value: me.pos || "–" },
          { label: "Turns", value: me.turns },
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
        board={<SnakesBoard tokens={tokens} label={boardLabel} />}
        side={
          <>
            <DiceTray
              value={game.dice}
              rolling={game.rolling}
              canRoll={canRoll}
              onRoll={() => { void takeTurn() }}
              accent={cur.color}
              caption={game.over ? "Game over" : myTurn ? (game.extra ? "Bonus roll" : "Your roll") : `${cur.name} is playing`}
            />
            <PlayerList
              players={game.players.map((p) => ({
                key: `p${p.id}`,
                name: p.name,
                color: p.color,
                active: !game.over && p.id === cur.id,
                place: p.place,
                human: p.human,
                detail: p.pos === LAST_SQUARE
                  ? `Reached 100 in ${p.turns} turns`
                  : `${p.pos === 0 ? "Not started" : `Square ${p.pos}`} · ${p.turns} turn${p.turns === 1 ? "" : "s"}`,
              }))}
            />
            <p className="text-[11px] text-muted-foreground">
              Exact finish {opts.exactFinish ? "on" : "off"} · Six rolls again {opts.sixExtra ? "on" : "off"}
            </p>
            <EventLog entries={game.log} className="max-h-44 @2xl:max-h-none @2xl:flex-1" />
          </>
        }
      />
    </div>
  )
}
