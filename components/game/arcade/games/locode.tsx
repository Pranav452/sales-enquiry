"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Delete, Globe2 } from "lucide-react"
import type { ArcadeGameProps } from "@/lib/game/arcade"

// LOGIC-START
/** code|port name|country */
const RAW_PORTS = [
  // India
  "INNSA|Nhava Sheva|India",
  "INMUN|Mundra|India",
  "INMAA|Chennai|India",
  "INCCU|Kolkata|India",
  "INCOK|Cochin|India",
  "INBOM|Mumbai|India",
  "INDEL|Delhi|India",
  "INVTZ|Visakhapatnam|India",
  "INTUT|Tuticorin|India",
  "INPAV|Pipavav|India",
  "INMRM|Mormugao|India",
  "INHZA|Hazira|India",
  "INBLR|Bengaluru|India",
  "INHYD|Hyderabad|India",
  // China, Hong Kong, Taiwan
  "CNSHA|Shanghai|China",
  "CNNGB|Ningbo|China",
  "CNSZX|Shenzhen|China",
  "CNYTN|Yantian|China",
  "CNTAO|Qingdao|China",
  "CNTXG|Tianjin Xingang|China",
  "CNXMN|Xiamen|China",
  "CNDLC|Dalian|China",
  "CNCAN|Guangzhou|China",
  "CNNSA|Nansha|China",
  "CNLYG|Lianyungang|China",
  "CNFOC|Fuzhou|China",
  "CNSHK|Shekou|China",
  "CNPEK|Beijing|China",
  "CNNKG|Nanjing|China",
  "CNWUH|Wuhan|China",
  "CNCKG|Chongqing|China",
  "HKHKG|Hong Kong|Hong Kong",
  "TWKHH|Kaohsiung|Taiwan",
  "TWTPE|Taipei|Taiwan",
  "TWKEL|Keelung|Taiwan",
  "TWTXG|Taichung|Taiwan",
  // Japan, Korea
  "JPTYO|Tokyo|Japan",
  "JPYOK|Yokohama|Japan",
  "JPOSA|Osaka|Japan",
  "JPUKB|Kobe|Japan",
  "JPNGO|Nagoya|Japan",
  "JPHKT|Hakata|Japan",
  "JPMOJ|Moji|Japan",
  "KRPUS|Busan|South Korea",
  "KRICN|Incheon|South Korea",
  "KRSEL|Seoul|South Korea",
  "KRKAN|Gwangyang|South Korea",
  // South and South-East Asia
  "SGSIN|Singapore|Singapore",
  "MYPKG|Port Klang|Malaysia",
  "MYTPP|Tanjung Pelepas|Malaysia",
  "MYPEN|Penang|Malaysia",
  "MYKUL|Kuala Lumpur|Malaysia",
  "THBKK|Bangkok|Thailand",
  "THLCH|Laem Chabang|Thailand",
  "VNSGN|Ho Chi Minh City|Vietnam",
  "VNHPH|Haiphong|Vietnam",
  "VNCMT|Cai Mep|Vietnam",
  "VNDAD|Da Nang|Vietnam",
  "IDJKT|Jakarta|Indonesia",
  "IDSUB|Surabaya|Indonesia",
  "PHMNL|Manila|Philippines",
  "PHCEB|Cebu|Philippines",
  "MMRGN|Yangon|Myanmar",
  "KHPNH|Phnom Penh|Cambodia",
  "KHSHV|Sihanoukville|Cambodia",
  "LKCMB|Colombo|Sri Lanka",
  "BDCGP|Chittagong|Bangladesh",
  "BDDAC|Dhaka|Bangladesh",
  "PKKHI|Karachi|Pakistan",
  "PKBQM|Port Qasim|Pakistan",
  // Middle East
  "AEJEA|Jebel Ali|United Arab Emirates",
  "AEDXB|Dubai|United Arab Emirates",
  "AEAUH|Abu Dhabi|United Arab Emirates",
  "AESHJ|Sharjah|United Arab Emirates",
  "OMSLL|Salalah|Oman",
  "OMSOH|Sohar|Oman",
  "OMMCT|Muscat|Oman",
  "SAJED|Jeddah|Saudi Arabia",
  "SADMM|Dammam|Saudi Arabia",
  "SARUH|Riyadh|Saudi Arabia",
  "KWKWI|Kuwait|Kuwait",
  "QADOH|Doha|Qatar",
  "BHBAH|Bahrain|Bahrain",
  "IRBND|Bandar Abbas|Iran",
  "JOAQJ|Aqaba|Jordan",
  "ILHFA|Haifa|Israel",
  "ILASH|Ashdod|Israel",
  "TRIST|Istanbul|Turkey",
  "TRMER|Mersin|Turkey",
  "TRIZM|Izmir|Turkey",
  "EGPSD|Port Said|Egypt",
  "EGALY|Alexandria|Egypt",
  "DJJIB|Djibouti|Djibouti",
  // Europe
  "NLRTM|Rotterdam|Netherlands",
  "NLAMS|Amsterdam|Netherlands",
  "BEANR|Antwerp|Belgium",
  "BEBRU|Brussels|Belgium",
  "DEHAM|Hamburg|Germany",
  "DEBRV|Bremerhaven|Germany",
  "DEFRA|Frankfurt|Germany",
  "DEMUC|Munich|Germany",
  "DEDUS|Dusseldorf|Germany",
  "GBFXT|Felixstowe|United Kingdom",
  "GBSOU|Southampton|United Kingdom",
  "GBLGP|London Gateway|United Kingdom",
  "GBLHR|London Heathrow|United Kingdom",
  "FRLEH|Le Havre|France",
  "FRMRS|Marseille|France",
  "FRPAR|Paris|France",
  "FRCDG|Paris Charles de Gaulle|France",
  "ESVLC|Valencia|Spain",
  "ESBCN|Barcelona|Spain",
  "ESALG|Algeciras|Spain",
  "ESMAD|Madrid|Spain",
  "ITGOA|Genoa|Italy",
  "ITSPE|La Spezia|Italy",
  "ITNAP|Naples|Italy",
  "ITGIT|Gioia Tauro|Italy",
  "ITMIL|Milan|Italy",
  "GRPIR|Piraeus|Greece",
  "MTMAR|Marsaxlokk|Malta",
  "PTLIS|Lisbon|Portugal",
  "PTSIN|Sines|Portugal",
  "PLGDN|Gdansk|Poland",
  "PLGDY|Gdynia|Poland",
  "SEGOT|Gothenburg|Sweden",
  "DKCPH|Copenhagen|Denmark",
  "DKAAR|Aarhus|Denmark",
  "FIHEL|Helsinki|Finland",
  "NOOSL|Oslo|Norway",
  "LVRIX|Riga|Latvia",
  "EETLL|Tallinn|Estonia",
  "RULED|St Petersburg|Russia",
  "ROCND|Constanta|Romania",
  "IEDUB|Dublin|Ireland",
  "ATVIE|Vienna|Austria",
  "CHZRH|Zurich|Switzerland",
  "CHBSL|Basel|Switzerland",
  "SIKOP|Koper|Slovenia",
  "HRRJK|Rijeka|Croatia",
  "UAODS|Odesa|Ukraine",
  // North America
  "USLAX|Los Angeles|United States",
  "USLGB|Long Beach|United States",
  "USNYC|New York|United States",
  "USEWR|Newark|United States",
  "USSAV|Savannah|United States",
  "USCHS|Charleston|United States",
  "USORF|Norfolk|United States",
  "USHOU|Houston|United States",
  "USMIA|Miami|United States",
  "USSEA|Seattle|United States",
  "USTIW|Tacoma|United States",
  "USOAK|Oakland|United States",
  "USJFK|New York JFK|United States",
  "USORD|Chicago|United States",
  "USATL|Atlanta|United States",
  "USBAL|Baltimore|United States",
  "USMSY|New Orleans|United States",
  "USDFW|Dallas Fort Worth|United States",
  "CAVAN|Vancouver|Canada",
  "CAMTR|Montreal|Canada",
  "CATOR|Toronto|Canada",
  "CAHAL|Halifax|Canada",
  "CAPRR|Prince Rupert|Canada",
  "MXZLO|Manzanillo|Mexico",
  "MXVER|Veracruz|Mexico",
  "MXLZC|Lazaro Cardenas|Mexico",
  "MXMEX|Mexico City|Mexico",
  "PABLB|Balboa|Panama",
  // South America and Caribbean
  "BRSSZ|Santos|Brazil",
  "BRRIO|Rio de Janeiro|Brazil",
  "BRPNG|Paranagua|Brazil",
  "BRITJ|Itajai|Brazil",
  "ARBUE|Buenos Aires|Argentina",
  "CLVAP|Valparaiso|Chile",
  "CLSAI|San Antonio|Chile",
  "PECLL|Callao|Peru",
  "COCTG|Cartagena|Colombia",
  "ECGYE|Guayaquil|Ecuador",
  "UYMVD|Montevideo|Uruguay",
  "JMKIN|Kingston|Jamaica",
  // Africa and Oceania
  "ZADUR|Durban|South Africa",
  "ZACPT|Cape Town|South Africa",
  "KEMBA|Mombasa|Kenya",
  "TZDAR|Dar es Salaam|Tanzania",
  "NGLOS|Lagos|Nigeria",
  "GHTEM|Tema|Ghana",
  "MAPTM|Tanger Med|Morocco",
  "MACAS|Casablanca|Morocco",
  "DZALG|Algiers|Algeria",
  "MUPLU|Port Louis|Mauritius",
  "AUSYD|Sydney|Australia",
  "AUMEL|Melbourne|Australia",
  "AUBNE|Brisbane|Australia",
  "AUFRE|Fremantle|Australia",
  "NZAKL|Auckland|New Zealand",
  "NZTRG|Tauranga|New Zealand",
]

interface Port {
  code: string
  name: string
  country: string
}

const PORTS: Port[] = RAW_PORTS.map((r) => {
  const [code, name, country] = r.split("|")
  return { code, name, country }
})
const PORT_MAP: Record<string, Port> = Object.fromEntries(PORTS.map((p) => [p.code, p]))

type LetterState = "correct" | "present" | "absent"

/** Wordle colouring with correct duplicate-letter handling. */
function evaluateGuess(guess: string, target: string): LetterState[] {
  const res: LetterState[] = Array<LetterState>(guess.length).fill("absent")
  const remaining: Record<string, number> = {}
  for (let i = 0; i < target.length; i++) {
    if (guess[i] === target[i]) res[i] = "correct"
    else remaining[target[i]] = (remaining[target[i]] ?? 0) + 1
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] === "correct") continue
    if ((remaining[guess[i]] ?? 0) > 0) {
      res[i] = "present"
      remaining[guess[i]] -= 1
    }
  }
  return res
}
// LOGIC-END

const ROWS = 6
const LEN = 5
const FLIP_STEP = 0.25
const COL = { correct: "#16a34a", present: "#d97706", absent: "#475569", empty: "#0f1b2d" }
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]

function Tile({
  letter,
  state,
  index,
  reduced,
  active,
}: {
  letter: string
  state?: LetterState
  index: number
  reduced: boolean
  active: boolean
}) {
  const border = state ? COL[state] : letter ? "#94a3b8" : "#334155"
  if (!state) {
    return (
      <motion.div
        key={letter ? "f" : "e"}
        initial={false}
        animate={letter && !reduced ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.12 }}
        className="flex aspect-square items-center justify-center rounded-md border-2 text-lg font-bold text-slate-50"
        style={{ background: COL.empty, borderColor: active ? border : "#334155" }}
      >
        {letter}
      </motion.div>
    )
  }
  const c = COL[state]
  return (
    <motion.div
      initial={{ rotateX: 0, backgroundColor: COL.empty, borderColor: "#94a3b8" }}
      animate={
        reduced
          ? { rotateX: 0, backgroundColor: c, borderColor: c }
          : {
              rotateX: [0, 90, 0],
              backgroundColor: [COL.empty, COL.empty, c, c],
              borderColor: ["#94a3b8", "#94a3b8", c, c],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.5, delay: index * FLIP_STEP, times: [0, 0.5, 0.5, 1] }
      }
      className="flex aspect-square items-center justify-center rounded-md border-2 text-lg font-bold text-white"
    >
      {letter}
    </motion.div>
  )
}

export default function Locode({ onGameOver }: ArcadeGameProps) {
  const reduced = !!useReducedMotion()
  const [target] = useState<Port>(() => PORTS[Math.floor(Math.random() * PORTS.length)])
  const [guesses, setGuesses] = useState<string[]>([])
  const [results, setResults] = useState<LetterState[][]>([])
  const [shown, setShown] = useState(0) // rows whose colours are visible on the keyboard
  const [current, setCurrent] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ended, setEnded] = useState<"won" | "lost" | null>(null)

  const doneRef = useRef(false)
  const overCbRef = useRef(onGameOver)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    overCbRef.current = onGameOver
  }, [onGameOver])

  useEffect(() => {
    const list = timers.current
    return () => list.forEach(clearTimeout)
  }, [])

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])

  const flash = useCallback(
    (msg: string) => {
      setToast(msg)
      setShake(true)
      later(() => setShake(false), 400)
      later(() => setToast((t) => (t === msg ? null : t)), 1600)
    },
    [later],
  )

  const submit = useCallback(() => {
    if (current.length < LEN) {
      flash("Not enough letters")
      return
    }
    if (!PORT_MAP[current]) {
      flash("Not a known port code")
      return
    }
    const res = evaluateGuess(current, target.code)
    const nextGuesses = [...guesses, current]
    const solved = current === target.code
    const over = solved || nextGuesses.length >= ROWS
    setGuesses(nextGuesses)
    setResults((r) => [...r, res])
    setCurrent("")
    setBusy(true)
    const reveal = reduced ? 50 : (LEN - 1) * FLIP_STEP * 1000 + 550
    later(() => {
      setShown(nextGuesses.length)
      if (!over) {
        setBusy(false)
        return
      }
      setEnded(solved ? "won" : "lost")
      later(() => {
        if (doneRef.current) return
        doneRef.current = true
        const n = nextGuesses.length
        const label = `${target.code} — ${target.name}, ${target.country}`
        overCbRef.current({
          score: solved ? (7 - n) * 100 : 0,
          won: solved,
          summary: solved ? `${label} in ${n}` : `${label} (missed)`,
        })
      }, 800)
    }, reveal)
  }, [current, flash, guesses, later, reduced, target])

  const press = useCallback(
    (k: string) => {
      if (busy || ended) return
      if (k === "ENTER") submit()
      else if (k === "BACK") setCurrent((c) => c.slice(0, -1))
      else if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < LEN ? c + k : c))
    },
    [busy, ended, submit],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === "Enter") {
        e.preventDefault()
        press("ENTER")
      } else if (e.key === "Backspace") {
        e.preventDefault()
        press("BACK")
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        press(e.key.toUpperCase())
      } else if (e.key === " " || e.key.startsWith("Arrow")) {
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [press])

  // keyboard letter states from fully revealed rows
  const keyState: Record<string, LetterState> = {}
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 }
  for (let r = 0; r < shown; r++) {
    for (let i = 0; i < LEN; i++) {
      const ch = guesses[r][i]
      const st = results[r][i]
      if (!keyState[ch] || rank[st] > rank[keyState[ch]]) keyState[ch] = st
    }
  }

  const wrong = guesses.length - (ended === "won" ? 1 : 0)
  const showHint = shown >= 3 && ended !== "won" && wrong >= 3
  const rowsToRender = Array.from({ length: ROWS }, (_, r) => {
    if (r < guesses.length) return { letters: guesses[r], res: results[r] as LetterState[] | undefined }
    if (r === guesses.length) return { letters: current, res: undefined }
    return { letters: "", res: undefined }
  })

  return (
    <div className="mx-auto flex w-full max-w-[560px] select-none flex-col items-center gap-1.5 text-slate-100">
      <div className="flex w-full items-center justify-between px-1 font-mono text-xs">
        <span className="flex items-center gap-1.5 text-teal-400">
          <Globe2 size={14} aria-hidden /> LOCODE
        </span>
        <span className="text-slate-300">
          TRY <b className="text-amber-400">{Math.min(guesses.length + (ended ? 0 : 1), ROWS)}</b>/{ROWS}
        </span>
        <span className="text-slate-300">
          {PORTS.length} <span className="text-slate-500">PORTS</span>
        </span>
      </div>

      <div className="flex h-5 items-center text-center text-xs">
        {toast ? (
          <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-900">{toast}</span>
        ) : ended ? (
          <span className={ended === "won" ? "text-emerald-400" : "text-rose-400"}>
            {target.code} {"—"} {target.name}, {target.country}
          </span>
        ) : showHint ? (
          <span className="text-amber-400">Hint: the port is in {target.country}</span>
        ) : (
          <span className="text-slate-400">Guess the 5-letter UN/LOCODE of a major port.</span>
        )}
      </div>

      <motion.div
        animate={shake && !reduced ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="grid w-[230px] gap-1"
        style={{ gridTemplateRows: `repeat(${ROWS}, 1fr)`, perspective: 600 }}
      >
        {rowsToRender.map((row, r) => (
          <div key={r} className="grid grid-cols-5 gap-1">
            {Array.from({ length: LEN }, (_, i) => (
              <Tile
                key={row.res ? `s${i}` : `e${i}`}
                letter={row.letters[i] ?? ""}
                state={row.res?.[i]}
                index={i}
                reduced={reduced}
                active={r === guesses.length}
              />
            ))}
          </div>
        ))}
      </motion.div>

      <div className="mt-1 flex w-full flex-col items-center gap-1.5">
        {KEY_ROWS.map((row, ri) => (
          <div key={row} className="flex w-full justify-center gap-1">
            {ri === 2 && (
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press("ENTER")}
                className="h-10 flex-[1.6] rounded-md bg-slate-700 text-[10px] font-bold text-slate-100 active:bg-slate-600"
              >
                ENTER
              </button>
            )}
            {row.split("").map((ch) => {
              const st = keyState[ch]
              return (
                <button
                  key={ch}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => press(ch)}
                  className="h-10 min-w-0 max-w-[40px] flex-1 rounded-md text-sm font-bold text-white transition-colors"
                  style={{ background: st ? COL[st] : "#64748b" }}
                >
                  {ch}
                </button>
              )
            })}
            {ri === 2 && (
              <button
                type="button"
                tabIndex={-1}
                aria-label="Backspace"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => press("BACK")}
                className="flex h-10 flex-[1.6] items-center justify-center rounded-md bg-slate-700 text-slate-100 active:bg-slate-600"
              >
                <Delete size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Green = right spot, amber = wrong spot, grey = not in the code.
      </p>
    </div>
  )
}
