// ============================================================
// The Grand Voyage — trophies (lifetime achievements)
// Each trophy grants one-time bonus XP.
// ============================================================

import type { LifetimeStats, TrophyProgress } from "./types"

export type TrophyTier = "bronze" | "silver" | "gold" | "mythic"

export interface TrophyDef {
  id:          string
  name:        string
  description: string
  icon:        string           // lucide-react icon name
  tier:        TrophyTier
  reward:      number
  target:      number
  metric:      (s: LifetimeStats) => number
  secret?:     boolean          // hidden until earned
}

export const TROPHIES: TrophyDef[] = [
  { id: "t_first",       tier: "bronze", icon: "Anchor",        reward: 1,  target: 1,    name: "First Contact",     description: "Log your first activity",               metric: (s) => s.activities },
  { id: "t_century",     tier: "bronze", icon: "Phone",         reward: 5,  target: 100,  name: "Century Caller",    description: "Make 100 calls",                        metric: (s) => s.calls },
  { id: "t_thousand",    tier: "gold",   icon: "PhoneForwarded",reward: 20, target: 1000, name: "Thousand Voices",   description: "Make 1,000 calls",                      metric: (s) => s.calls },
  { id: "t_road",        tier: "silver", icon: "Footprints",    reward: 5,  target: 10,   name: "Road Warrior",      description: "Visit 10 clients in person",            metric: (s) => s.clientVisits },
  { id: "t_globe",       tier: "gold",   icon: "Globe2",        reward: 15, target: 50,   name: "Globe Wanderer",    description: "Visit 50 clients in person",            metric: (s) => s.clientVisits },
  { id: "t_line",        tier: "silver", icon: "Ship",          reward: 5,  target: 5,    name: "Line Whisperer",    description: "Visit 5 shipping lines",                metric: (s) => s.lineVisits },
  { id: "t_treasure1",   tier: "bronze", icon: "Gem",           reward: 5,  target: 1,    name: "First Treasure",    description: "Secure your first deal",                metric: (s) => s.secured },
  { id: "t_treasure10",  tier: "silver", icon: "Crown",         reward: 15, target: 10,   name: "Treasure Fleet",    description: "Secure 10 deals",                       metric: (s) => s.secured },
  { id: "t_treasure50",  tier: "mythic", icon: "Castle",        reward: 40, target: 50,   name: "Golden Hoard",      description: "Secure 50 deals",                       metric: (s) => s.secured },
  { id: "t_phonecloser", tier: "silver", icon: "PhoneIncoming", reward: 8,  target: 5,    name: "Silver Tongue",     description: "Close 5 deals over the phone",          metric: (s) => s.callSecured },
  { id: "t_spark",       tier: "bronze", icon: "Sparkles",      reward: 5,  target: 25,   name: "Spark",             description: "Get 25 'Interested' outcomes",          metric: (s) => s.interested },
  { id: "t_wildfire",    tier: "gold",   icon: "Flame",         reward: 15, target: 100,  name: "Wildfire",          description: "Get 100 'Interested' outcomes",         metric: (s) => s.interested },
  { id: "t_streak7",     tier: "bronze", icon: "Link",          reward: 5,  target: 7,    name: "Iron Chain",        description: "Hold a 7-day streak",                   metric: (s) => s.bestStreak },
  { id: "t_streak21",    tier: "silver", icon: "Link2",         reward: 15, target: 21,   name: "Unbroken",          description: "Hold a 21-day streak",                  metric: (s) => s.bestStreak },
  { id: "t_streak60",    tier: "mythic", icon: "Infinity",      reward: 40, target: 60,   name: "Eternal Tide",      description: "Hold a 60-day streak",                  metric: (s) => s.bestStreak },
  { id: "t_pods",        tier: "silver", icon: "Map",           reward: 8,  target: 15,   name: "Globetrotter",      description: "Pitch 15 different destination ports",  metric: (s) => s.distinctPods },
  { id: "t_rolodex",     tier: "silver", icon: "BookUser",      reward: 10, target: 100,  name: "Rolodex",           description: "Contact 100 unique clients",            metric: (s) => s.distinctClients },
  { id: "t_atlas",       tier: "gold",   icon: "Library",       reward: 25, target: 500,  name: "Atlas",             description: "Contact 500 unique clients",            metric: (s) => s.distinctClients },
  { id: "t_marathon",    tier: "silver", icon: "Timer",         reward: 5,  target: 25,   name: "Marathon Day",      description: "Log 25 activities in a single day",     metric: (s) => s.maxDayActivities },
  { id: "t_quests25",    tier: "silver", icon: "ScrollText",    reward: 10, target: 25,   name: "Quest Hunter",      description: "Complete 25 daily quests",              metric: (s) => s.questsDone },
  { id: "t_weekly10",    tier: "gold",   icon: "Swords",        reward: 15, target: 10,   name: "Weekly Warlord",    description: "Complete 10 weekly quests",             metric: (s) => s.weekliesDone },
  { id: "t_sweeper",     tier: "silver", icon: "Brush",         reward: 8,  target: 5,    name: "Clean Sweeper",     description: "Clear all 3 dailies on 5 days",         metric: (s) => s.cleanSweeps },
  { id: "t_sunday",      tier: "bronze", icon: "Sun",           reward: 2,  target: 1,    name: "Sunday Sailor",     description: "Log an activity on a Sunday",           metric: (s) => s.sundayDays, secret: true },
  { id: "t_days100",     tier: "gold",   icon: "CalendarRange", reward: 20, target: 100,  name: "Old Salt",          description: "Be active on 100 different days",       metric: (s) => s.activeDays },
]

export const TROPHY_MAP: Record<string, TrophyDef> = Object.fromEntries(TROPHIES.map((t) => [t.id, t]))

export function evaluateTrophies(stats: LifetimeStats): TrophyProgress[] {
  return TROPHIES.map((t) => {
    const current = t.metric(stats)
    return { id: t.id, earned: current >= t.target, current: Math.min(current, t.target), target: t.target }
  })
}

export function trophyBonus(progress: TrophyProgress[]): number {
  return progress.reduce((sum, p) => sum + (p.earned ? TROPHY_MAP[p.id]?.reward ?? 0 : 0), 0)
}
