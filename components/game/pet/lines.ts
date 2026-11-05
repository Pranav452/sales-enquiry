// ============================================================
// What the pet says. Contextual lines are built from the live
// GameProfile; the rest is original nautical/freight humour.
// ============================================================

import type { GameProfile, LifetimeStatKey, PetMood, QuestProgress } from "@/lib/game/types"
import { SPECIES, STAGE_GEAR, STAGE_LABELS, type SpeciesId } from "./species"

export interface LineContext {
  me:      GameProfile | null
  species: SpeciesId
  name:    string
}

// ─── Helpers ─────────────────────────────────────────────────

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"]

function numberWord(n: number): string {
  return n >= 0 && n < WORDS.length ? WORDS[n] : n.toLocaleString("en-IN")
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function firstName(person: string | undefined): string {
  if (!person) return ""
  const w = person.trim().split(/\s+/)[0] ?? ""
  if (!w) return ""
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}

// ─── Quest units ─────────────────────────────────────────────

const QUEST_UNITS: Record<string, [string, string]> = {
  d_dialer:     ["call", "calls"],
  d_fresh:      ["cold call", "cold calls"],
  d_rekindle:   ["warm call", "warm calls"],
  d_manifest:   ["activity", "activities"],
  d_longhaul:   ["activity", "activities"],
  d_blitz:      ["activity", "activities"],
  d_hotlead:    ["'Interested' outcome", "'Interested' outcomes"],
  d_mixed:      ["new activity type", "new activity types"],
  d_horizons:   ["new client", "new clients"],
  d_boots:      ["client visit", "client visits"],
  d_line:       ["shipping line visit", "shipping line visits"],
  d_seal:       ["secured deal", "secured deals"],
  w_voyage:     ["activity", "activities"],
  w_fleet:      ["active day", "active days"],
  w_prospector: ["cold call", "cold calls"],
  w_magnet:     ["'Interested' outcome", "'Interested' outcomes"],
  w_harbor:     ["field visit", "field visits"],
  w_treasure:   ["secured deal", "secured deals"],
}

function questGap(q: QuestProgress): string {
  const left = Math.max(0, q.target - q.current)
  const unit = QUEST_UNITS[q.id]
  if (unit) return `${left} more ${plural(left, unit[0], unit[1])}`
  return `${left} more to go`
}

/** The unfinished quest closest to done (highest completion ratio). */
function closestQuest(quests: QuestProgress[]): QuestProgress | null {
  let best: QuestProgress | null = null
  let bestScore = -1
  for (const q of quests) {
    if (q.done || q.target <= 0) continue
    const ratio = q.current / q.target
    const score = ratio - (q.target - q.current) * 0.001
    if (score > bestScore) { best = q; bestScore = score }
  }
  return best
}

// ─── Gate nouns ──────────────────────────────────────────────

const GATE_NOUNS: Partial<Record<LifetimeStatKey, [string, string]>> = {
  fieldVisits:     ["field visit", "field visits"],
  secured:         ["secured deal", "secured deals"],
  lineVisits:      ["shipping line visit", "shipping line visits"],
  bestStreak:      ["more day on your best streak", "more days on your best streak"],
  weekliesDone:    ["weekly quest", "weekly quests"],
  distinctClients: ["new client", "new clients"],
  questsDone:      ["daily quest", "daily quests"],
  clientVisits:    ["client visit", "client visits"],
}

function gateLine(me: GameProfile): string | null {
  const gate = me.nextGate
  if (!gate || gate.cleared) return null
  const missing = gate.requirements.filter((r) => !r.done)
  if (!missing.length) return null
  const parts = missing.slice(0, 2).map((r) => {
    const left = Math.max(1, r.target - r.current)
    const noun = GATE_NOUNS[r.stat]
    return noun ? `${numberWord(left)} ${plural(left, noun[0], noun[1])}` : `${numberWord(left)} more: ${r.label.toLowerCase()}`
  })
  const single = missing.length === 1 && Math.max(1, missing[0].target - missing[0].current) === 1
  const verb = single ? "opens" : "open"
  const more = missing.length > 2 ? " (plus a little more)" : ""
  const banked = me.bankedXp > 0 ? ` — ${me.bankedXp.toLocaleString("en-IN")} XP waiting` : ""
  if (me.gateBlocked) return `${cap(parts.join(" and "))}${more} ${verb} ${gate.name}${banked}.`
  return `Next trial: ${gate.name}. ${cap(parts.join(" and "))}${more} to go.`
}

// ─── Contextual lines ────────────────────────────────────────

interface Weighted { text: string; weight: number }

export function contextualLines(ctx: LineContext): Weighted[] {
  const me = ctx.me
  if (!me) return []
  const out: Weighted[] = []
  const s = me.streak
  const today = me.todayStats

  if (s.atRisk && s.current > 0) {
    out.push({ text: `Your ${s.current}-day streak is at risk. One activity today keeps it alive.`, weight: 6 })
  } else if (s.activeToday && s.current >= 2) {
    out.push({ text: `${s.current}-day streak and counting. Keep the wind in the sails.`, weight: 1.5 })
  }

  const gl = gateLine(me)
  if (gl) out.push({ text: gl, weight: me.gateBlocked ? 5 : 1.2 })

  if (me.cleanSweepToday) {
    out.push({ text: `Clean sweep! All three dailies done. Time for my ${SPECIES[ctx.species].dance}.`, weight: 3 })
  } else {
    const dq = closestQuest(me.dailyQuests)
    if (dq) {
      const left = dq.target - dq.current
      out.push({
        text: left === 1 ? `One more ${QUEST_UNITS[dq.id]?.[0] ?? "push"} and ${dq.name} is done!` : `${questGap(dq)} for ${dq.name}.`,
        weight: 4,
      })
    }
  }

  const wq = closestQuest(me.weeklyQuests)
  if (wq) out.push({ text: `${cap(questGap(wq))} this week for ${wq.name}.`, weight: 1.5 })

  if (today.n === 0 && !s.atRisk) {
    out.push({ text: "Fresh page in the log today. Shall we open with a warm call?", weight: 2 })
  } else if (today.n >= 12) {
    out.push({ text: `${today.n} activities today. You're a machine. A friendly, freight-shaped machine.`, weight: 2 })
  } else if (today.xp > 0) {
    out.push({ text: `${today.xp} XP on the board today. Steady hands on the wheel.`, weight: 1 })
  }

  if (me.nextLevelXp != null && !me.gateBlocked) {
    const pct = Math.round(me.progress * 100)
    if (pct >= 80) out.push({ text: `${me.title}, you're ${pct}% of the way to level ${me.level + 1}. So close I can smell it.`, weight: 2 })
    else out.push({ text: `Aye aye, ${me.title}. Level ${me.level}, ${pct}% to the next.`, weight: 0.8 })
  }

  if (today.secured > 0) out.push({ text: `${cap(numberWord(today.secured))} ${plural(today.secured, "deal", "deals")} secured today. Ring the ship's bell!`, weight: 2 })
  if (me.prestigeStars > 0) out.push({ text: `${me.prestigeStars} prestige ${plural(me.prestigeStars, "star", "stars")}. Sailors will sing about you.`, weight: 1 })

  return out
}

// ─── Mood + species chatter ──────────────────────────────────

const MOOD_LINES: Record<PetMood, string[]> = {
  sleepy: [
    "Five more minutes... the tide can wait.",
    "Yawn. Log something and I'll wake right up.",
    "I was dreaming about container stacks. Neat, tidy, twenty-foot dreams.",
  ],
  content: [
    "Steady seas today.",
    "Good view of the pipeline from up here.",
    "All hands, all calm.",
    "I like this page. Cosy.",
  ],
  happy: [
    "Wind in the sails! Keep it coming.",
    "This feels like a good day for deals.",
    "You're on a roll. I'm on a roll too, if you drag me fast enough.",
  ],
  ecstatic: [
    "Best. Voyage. Ever.",
    "I could do cartwheels. I am doing cartwheels.",
    "The whole harbour is talking about you.",
  ],
  grumpy: [
    "Hmph. The log's been quiet. Too quiet.",
    "My hat is getting dusty. Just saying.",
    "I'll cheer up after one call. Maybe two.",
  ],
}

const SPECIES_LINES: Record<SpeciesId, string[]> = {
  crab: [
    "I walk sideways, but I always move forward.",
    "Pinch me, I think we're about to close something.",
    "Hard shell, soft heart. Ideal sales temperament.",
  ],
  otter: [
    "Otters hold hands so they don't drift apart. Same rule for follow-ups.",
    "I keep my favourite shell in my pocket. You keep your best clients close.",
    "Floating on my back, reviewing the pipeline. Very professional.",
  ],
  octopus: [
    "Eight arms. Eight phones. Zero excuses.",
    "Three hearts, and every one of them is rooting for you.",
    "I can squeeze through any gap. Including a client's busy calendar.",
  ],
  parrot: [
    "Squawk! Follow up! Squawk!",
    "I repeat everything. Especially good habits.",
    "Polly wants a confirmed booking.",
  ],
}

// ─── Jokes + trivia (originals) ──────────────────────────────

export const JOKES: string[] = [
  "Why did the container break up with the ship? It needed more space. Twenty feet, to be exact.",
  "What do you call a reefer that tells jokes? A cool container.",
  "My favourite Incoterm is FOB. Friends On Board.",
  "Why did the shipping line hire a magician? To make the blank sailings disappear.",
  "A sailor's favourite KPI? Knots Per Inquiry.",
  "Why did the anchor go to therapy? It couldn't let go.",
  "A demurrage charge walks into a bar. It stays far too long.",
  "Why was the bill of lading so calm? It had everything on record.",
  "Why did the forwarder bring a ladder to work? Someone asked for a high cube quote.",
  "What keeps a client on board? A good relation-ship.",
  "Why did the crab never share its leads? It was a little shellfish.",
  "Why did the parrot join sales? It was brilliant at repeat business.",
  "Why did the ETA apologise? It was running a little behind. Again.",
  "Transshipment is just a container's way of making friends at another port.",
  "I tried to write a joke about LCL consolidation. It needed a few more people to fill it.",
  "Air freight is just sea freight that got impatient.",
  "Why are forwarders great friends? They always know where your stuff is. Mostly.",
  "My love language is a confirmed booking with a vessel name.",
  "What did the port say to the delayed vessel? Better late than never berth.",
  "Why don't containers gossip? Everything inside is sealed.",
  "Why did the ship's cat become a broker? Purr-fect negotiation skills and nine follow-ups.",
  "I asked the forklift for life advice. It said: lift with your legs. It has no legs.",
]

export const TRIVIA: string[] = [
  "Trivia: a TEU is a twenty-foot equivalent unit. A forty-footer counts as two.",
  "Trivia: in April 1956 the Ideal X sailed from Newark to Houston with 58 containers. Modern container shipping set sail.",
  "Trivia: sea otters hold hands while they sleep so they don't drift apart.",
  "Trivia: an octopus has three hearts and blue blood.",
  "Trivia: octopuses can taste with their suckers.",
  "Trivia: a knot is one nautical mile per hour, about 1.852 km/h.",
  "Trivia: port is left, starboard is right. The port-side navigation light is red.",
  "Trivia: 'posh' supposedly meant 'port out, starboard home'. Historians say that's almost certainly a myth.",
  "Trivia: the Suez Canal has no locks. The Panama Canal lifts ships about 26 metres.",
  "Trivia: roughly 80 percent of world trade by volume travels by sea.",
  "Trivia: the biggest container ships today carry more than 24,000 TEU.",
  "Trivia: 'Mayday' comes from the French 'venez m'aider' — come help me.",
  "Trivia: eight bells marks the end of a four-hour watch at sea.",
  "Trivia: most crabs walk sideways because of how their leg joints bend.",
  "Trivia: Incoterms are published by the International Chamber of Commerce.",
  "Trivia: dead reckoning means plotting your position from speed, time and heading. A bit like forecasting a pipeline.",
  "Trivia: some macaws live for more than 60 years. Long-term relationships are their thing.",
]

// ─── Event lines ─────────────────────────────────────────────

const ACTIVITY_LINES: Record<string, string[]> = {
  COLD_CALL: ["Cold call logged. Brave sailor!", "Into uncharted waters. Nice cold call.", "Fresh contact on the chart!"],
  WARM_CALL: ["Warm call! Keeping the fire lit.", "A warm call. The relationship thanks you."],
  CALL_SECURED: ["SECURED! Ring the ship's bell!", "A deal over the phone. Smooth sailing!"],
  VISIT_SECURED: ["SECURED in person! Break out the good biscuits.", "Handshake and a deal. Legendary."],
  CLIENT_VISIT: ["Boots on deck! A real face-to-face.", "A client visit. That's how trust is built."],
  SHIPPING_LINE_VISIT: ["A shipping line visit. Diplomacy at sea.", "Allies at the line office. Smart move."],
}
const GENERIC_ACTIVITY = ["Logged! The log grows.", "Another one in the book.", "Nice work, crewmate."]

const SPECIES_SOUND: Record<SpeciesId, string> = {
  crab: "Click-clack!",
  otter: "Squeak!",
  octopus: "Blub blub!",
  parrot: "Squawk!",
}

export function activityLine(ctx: LineContext, activityType: string): string {
  const line = pick(ACTIVITY_LINES[activityType] ?? GENERIC_ACTIVITY)
  return Math.random() < 0.35 ? `${SPECIES_SOUND[ctx.species]} ${line}` : line
}

const PET_LINES = [
  "Hehe, that tickles.",
  "Ahoy!",
  "Careful, I'm a professional.",
  "Again! Again!",
  "Best crewmate ever.",
]

const TRICK_LINES = [
  "Ta-da!",
  "Did you see that? Ten out of ten from the judges.",
  "I've been practising that one.",
  "Whoa. The room is spinning. Worth it.",
  "Nailed the landing. Mostly.",
]

const DROP_LINES = [
  "Wheee!",
  "New office. Nice view.",
  "Land ho!",
  "I'll guard this corner.",
]

export function trickLine(): string { return pick(TRICK_LINES) }
export function dropLine(): string { return pick(DROP_LINES) }

export function evolveLine(ctx: LineContext, stage: number): string {
  const label = STAGE_LABELS[stage - 1] ?? "Sailor"
  const gear = STAGE_GEAR[stage - 1] ?? "new gear"
  return `I evolved! ${ctx.name} the ${label} — and look, ${gear}.`
}

export function greetingLine(ctx: LineContext): string {
  const h = new Date().getHours()
  const fn = firstName(ctx.me?.person)
  const who = fn ? `, ${fn}` : ""
  if (h < 12) return `Morning${who}! The tide's in. Let's make some calls.`
  if (h < 17) return `Ahoy${who}! Afternoon watch reporting for duty.`
  return `Evening${who}. Still at the helm? Respect.`
}

export function adoptLine(ctx: LineContext): string {
  const kind = SPECIES[ctx.species].kind
  return `Ahoy! I'm ${ctx.name} the ${kind}. Drag me anywhere, click me for tips, right-click for my menu.`
}

// ─── Picking ─────────────────────────────────────────────────

function weightedPick(items: Weighted[]): string | null {
  const total = items.reduce((s, i) => s + i.weight, 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const i of items) {
    r -= i.weight
    if (r <= 0) return i.text
  }
  return items[items.length - 1]?.text ?? null
}

/**
 * Pick something to say, avoiding anything in `recent`.
 * `kind`: "auto" leans on useful context, "click" mixes in more fun.
 */
export function pickLine(ctx: LineContext, mood: PetMood, recent: string[], kind: "auto" | "click"): string {
  const fresh = (list: string[]) => list.filter((t) => !recent.includes(t))
  const context = contextualLines(ctx).filter((w) => !recent.includes(w.text))
  const roll = Math.random()

  const contextShare = kind === "auto" ? 0.6 : 0.4
  if (context.length && roll < contextShare) {
    const t = weightedPick(context)
    if (t) return t
  }

  const moodPool = fresh([...MOOD_LINES[mood], ...SPECIES_LINES[ctx.species], ...(kind === "click" ? PET_LINES : [])])
  if (roll < contextShare + 0.15 && moodPool.length) return pick(moodPool)

  const fun = fresh([...JOKES, ...TRIVIA])
  if (fun.length) return pick(fun)
  return pick([...JOKES, ...TRIVIA])
}
