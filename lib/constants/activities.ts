// ============================================================
// Activity Tracker — constants, types, and rank system
// ============================================================

// ─── Activity Types ──────────────────────────────────────────

export interface ActivityTypeDef {
  value: string
  label: string
  points: number
  description: string
  color: string          // Tailwind bg class for badges
  textColor: string      // Tailwind text class
}

export const ACTIVITY_TYPES: ActivityTypeDef[] = [
  {
    value:       "COLD_CALL",
    label:       "Cold Call",
    points:      1,
    description: "First-time outreach to a new prospect",
    color:       "bg-blue-100 dark:bg-blue-900/40",
    textColor:   "text-blue-700 dark:text-blue-300",
  },
  {
    value:       "WARM_CALL",
    label:       "Warm Call",
    points:      1,
    description: "Follow-up call to an existing contact",
    color:       "bg-teal-100 dark:bg-teal-900/40",
    textColor:   "text-teal-700 dark:text-teal-300",
  },
  {
    value:       "CLIENT_VISIT",
    label:       "Client Visit",
    points:      2,
    description: "In-person visit to a client or prospect",
    color:       "bg-violet-100 dark:bg-violet-900/40",
    textColor:   "text-violet-700 dark:text-violet-300",
  },
  {
    value:       "VISIT_SECURED",
    label:       "Visit — Secured",
    points:      3,
    description: "Client visit that resulted in a confirmed shipment",
    color:       "bg-green-100 dark:bg-green-900/40",
    textColor:   "text-green-700 dark:text-green-300",
  },
  {
    value:       "SHIPPING_LINE_VISIT",
    label:       "Shipping Line Visit",
    points:      2,
    description: "In-person visit to a shipping line office",
    color:       "bg-cyan-100 dark:bg-cyan-900/40",
    textColor:   "text-cyan-700 dark:text-cyan-300",
  },
]

export const ACTIVITY_TYPE_MAP: Record<string, ActivityTypeDef> =
  Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t]))

export function getActivityPoints(type: string): number {
  return ACTIVITY_TYPE_MAP[type]?.points ?? 1
}

// ─── Activity Statuses ────────────────────────────────────────

export interface StatusDef {
  value: string
  label: string
  color: string
  textColor: string
}

export const ACTIVITY_STATUSES: StatusDef[] = [
  { value: "INTERESTED",      label: "Interested",       color: "bg-blue-100 dark:bg-blue-900/40",   textColor: "text-blue-700 dark:text-blue-300" },
  { value: "FOLLOW_UP",       label: "Follow Up",        color: "bg-amber-100 dark:bg-amber-900/40", textColor: "text-amber-700 dark:text-amber-300" },
  { value: "Nominated",        label: "Nominated",         color: "bg-indigo-100 dark:bg-indigo-900/40",textColor: "text-indigo-700 dark:text-indigo-300" },
  { value: "SECURED",         label: "Secured",          color: "bg-green-100 dark:bg-green-900/40", textColor: "text-green-700 dark:text-green-300" },
  { value: "CALLBACK",        label: "Callback Requested",color: "bg-orange-100 dark:bg-orange-900/40",textColor: "text-orange-700 dark:text-orange-300" },
  { value: "NOT_INTERESTED",  label: "Not Interested",   color: "bg-red-100 dark:bg-red-900/40",     textColor: "text-red-700 dark:text-red-300" },
  { value: "NO_ANSWER",       label: "No Answer",        color: "bg-slate-100 dark:bg-slate-800",    textColor: "text-slate-600 dark:text-slate-400" },
  { value: "INVALID_NUMBER",  label: "Invalid Number",   color: "bg-red-100 dark:bg-red-900/40",     textColor: "text-red-600 dark:text-red-400" },
  { value: "BUSY",            label: "Busy / Try Later", color: "bg-yellow-100 dark:bg-yellow-900/40",textColor: "text-yellow-700 dark:text-yellow-300" },
  { value: "COMMUNICATION",  label: "Communication",    color: "bg-purple-100 dark:bg-purple-900/40", textColor: "text-purple-700 dark:text-purple-300" },
]

export const ACTIVITY_STATUS_MAP: Record<string, StatusDef> =
  Object.fromEntries(ACTIVITY_STATUSES.map((s) => [s.value, s]))

// ─── XP Rank System ──────────────────────────────────────────

export interface RankDef {
  rank:     string
  minXp:    number
  maxXp:    number           // Infinity for highest rank
  color:    string           // Tailwind ring/border color
  bg:       string           // Tailwind bg
  text:     string           // Tailwind text
  barColor: string           // Progress bar fill
}

export const RANKS: RankDef[] = [
  { rank: "Rookie",      minXp: 0,   maxXp: 9,   color: "ring-slate-400",  bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-600 dark:text-slate-300",   barColor: "bg-slate-400" },
  { rank: "Caller",      minXp: 10,  maxXp: 29,  color: "ring-blue-400",   bg: "bg-blue-100 dark:bg-blue-900/50",   text: "text-blue-700 dark:text-blue-300",     barColor: "bg-blue-500" },
  { rank: "Prospector",  minXp: 30,  maxXp: 59,  color: "ring-teal-400",   bg: "bg-teal-100 dark:bg-teal-900/50",   text: "text-teal-700 dark:text-teal-300",     barColor: "bg-teal-500" },
  { rank: "Hunter",      minXp: 60,  maxXp: 99,  color: "ring-green-400",  bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-700 dark:text-green-300",   barColor: "bg-green-500" },
  { rank: "Closer",      minXp: 100, maxXp: 199, color: "ring-amber-400",  bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-700 dark:text-amber-300",   barColor: "bg-amber-500" },
  { rank: "Elite",       minXp: 200, maxXp: 499, color: "ring-orange-400", bg: "bg-orange-100 dark:bg-orange-900/50",text: "text-orange-700 dark:text-orange-300", barColor: "bg-orange-500" },
  { rank: "Legend",      minXp: 500, maxXp: Infinity, color: "ring-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/50", text: "text-yellow-700 dark:text-yellow-300", barColor: "bg-yellow-500" },
]

export function getRank(xp: number): RankDef {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) return RANKS[i]
  }
  return RANKS[0]
}

export function getNextRank(xp: number): RankDef | null {
  const current = getRank(xp)
  const idx = RANKS.findIndex((r) => r.rank === current.rank)
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null
}

/** 0–100 progress percentage toward next rank */
export function getRankProgress(xp: number): number {
  const current = getRank(xp)
  const next = getNextRank(xp)
  if (!next) return 100
  const range = next.minXp - current.minXp
  const earned = xp - current.minXp
  return Math.min(100, Math.round((earned / range) * 100))
}
