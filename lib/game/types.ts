// ============================================================
// The Grand Voyage — shared game types (server + client)
// ============================================================

/** Activity aggregate for one person on one calendar day (YYYY-MM-DD). */
export interface DayStat {
  date:          string
  n:             number   // activities logged
  xp:            number   // activity XP (POINTS)
  cold:          number   // COLD_CALL
  warm:          number   // WARM_CALL
  callSecured:   number   // CALL_SECURED
  clientVisits:  number   // CLIENT_VISIT
  visitSecured:  number   // VISIT_SECURED
  lineVisits:    number   // SHIPPING_LINE_VISIT
  interested:    number   // STATUS = INTERESTED
  secured:       number   // secured type OR STATUS = SECURED
  clients:       number   // distinct clients touched
  types:         number   // distinct activity types
}

/** Lifetime counters used by arena gates and trophies. */
export interface LifetimeStats {
  activities:      number
  activityXp:      number
  calls:           number   // cold + warm + called&secured
  coldCalls:       number
  warmCalls:       number
  clientVisits:    number   // CLIENT_VISIT + VISIT_SECURED
  lineVisits:      number
  fieldVisits:     number   // clientVisits + lineVisits
  secured:         number   // secured deals (type or status)
  callSecured:     number
  interested:      number
  distinctClients: number
  distinctPods:    number
  activeDays:      number
  bestStreak:      number
  questsDone:      number   // daily quests completed (since season start)
  weekliesDone:    number   // weekly quests completed (since season start)
  cleanSweeps:     number   // days with all 3 dailies done
  maxDayActivities:number
  sundayDays:      number
}

export type LifetimeStatKey = keyof LifetimeStats

export type QuestTier = "easy" | "medium" | "hard" | "weekly"

export interface QuestProgress {
  id:          string
  name:        string
  description: string
  icon:        string        // lucide-react icon name
  tier:        QuestTier
  reward:      number        // bonus XP
  current:     number
  target:      number
  done:        boolean
}

export interface GateRequirementProgress {
  stat:    LifetimeStatKey
  label:   string
  current: number
  target:  number
  done:    boolean
}

export interface GateProgress {
  arenaIndex:   number          // arena this gate opens
  name:         string          // trial name, e.g. "The Breakwater"
  requirements: GateRequirementProgress[]
  cleared:      boolean
}

export interface TrophyProgress {
  id:      string
  earned:  boolean
  current: number
  target:  number
}

export type PetMood = "sleepy" | "content" | "happy" | "ecstatic" | "grumpy"

export interface StreakInfo {
  current:     number   // working-day streak incl. today if active
  best:        number
  activeToday: boolean
  atRisk:      boolean   // streak > 0, nothing logged today, today is a working day
}

export interface GameProfile {
  person:        string
  today:         string            // YYYY-MM-DD (Asia/Kolkata)
  seasonStart:   string

  activityXp:    number
  bonusXp:       number
  totalXp:       number
  bonusBreakdown: { dailies: number; weeklies: number; sweeps: number; streak: number; trophies: number }

  level:         number            // effective level (gate-capped)
  rawLevel:      number            // level XP alone would give
  maxLevel:      number
  title:         string            // e.g. "Bosun IV"
  arenaIndex:    number            // 0..9
  levelFloorXp:  number            // XP at start of current level
  nextLevelXp:   number | null     // XP needed for next level (null at max)
  progress:      number            // 0..1 within current level
  bankedXp:      number            // XP earned past a locked gate
  prestigeStars: number            // stars beyond max level

  nextGate:      GateProgress | null   // gate for the next arena (null at last arena)
  gateBlocked:   boolean               // true when XP qualifies but trial not cleared

  streak:        StreakInfo
  todayStats:    DayStat
  weekStats:     { xp: number; bonus: number; n: number; activeDays: number; quests: number }
  dailyQuests:   QuestProgress[]
  weeklyQuests:  QuestProgress[]
  cleanSweepToday: boolean

  trophies:      TrophyProgress[]
  lifetime:      LifetimeStats
  lastActiveDate: string | null

  arcadeTokensEarned: number   // tokens earned today (client tracks spend)
  petMood:       PetMood
  petStage:      number        // 1..5
}

export interface BoardEntry {
  person:        string
  isMe:          boolean
  level:         number
  title:         string
  arenaIndex:    number
  totalXp:       number
  activityXp:    number
  bonusXp:       number
  weekXp:        number      // activity XP + bonus earned this week
  streak:        number
  bestStreak:    number
  trophies:      number
  questsThisWeek:number
  prestigeStars: number
  gateBlocked:   boolean
  /** Breakdown only for admins or the viewer's own row; null otherwise */
  detail: {
    calls: number; visits: number; lineVisits: number; secured: number; interested: number
  } | null
}

export interface GameApiResponse {
  today:    string
  isAdmin:  boolean
  me:       GameProfile | null
  board:    BoardEntry[]
}
