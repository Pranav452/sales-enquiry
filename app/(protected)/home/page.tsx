"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ACTIVITY_TYPE_MAP, getRank, getRankProgress, getNextRank } from "@/lib/constants/activities"
import { useChatDock } from "@/lib/store/chatDock"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts"
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  Phone,
  Trophy,
  TrendingUp,
  AlertCircle,
  Package,
  Zap,
  ChevronRight,
} from "lucide-react"
import { displayStatus } from "@/lib/constants/dropdowns"

// ─── Types ────────────────────────────────────────────────────

interface Reminder {
  id:            string
  client_name:   string | null
  activity_type: string | null
  reminder_date: string | null
  notes:         string | null
  status:        string | null
}

interface EnquirySummary {
  id:               string
  enq_ref_no:       string | null
  enq_receipt_date: string | null
  shipper:          string | null
  consignee:        string | null
  sales_person:     string | null
  mode:             string | null
  status:           string | null
  created_at:       string | null
}

interface ActivitySummary {
  id:            string
  activity_date: string | null
  activity_type: string | null
  client_name:   string | null
  sales_person:  string | null
  status:        string | null
  points:        number | null
  notes:         string | null
}

interface HomeData {
  reminders: Reminder[]
  enquiry: {
    stats:  { total: number; in_progress: number; won_month: number }
    recent: EnquirySummary[]
  }
  activity: {
    stats: {
      total_xp:        number
      total_activities: number
      week_calls:      number
      week_visits:     number
      week_xp:         number
      month_calls:     number
      month_visits:    number
      month_xp:        number
    }
    recent:       ActivitySummary[]
    weekly_chart: { date: string; calls: number; visits: number; xp: number }[]
  }
}

interface ChatRoom {
  id: string
  name: string | null
  type: string
  unread_count: number
  last_message: { content: string; created_at: string; sender_name: string | null } | null
  members: { user_id: string; full_name: string | null }[]
}

// ─── Helpers ──────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

function overdueLabel(d: string): { text: string; urgent: boolean } {
  const today = new Date().toISOString().split("T")[0]
  if (d === today) return { text: "Today", urgent: false }
  if (d < today) {
    const days = Math.round(
      (new Date(today).getTime() - new Date(d).getTime()) / 86400000
    )
    return { text: `${days}d overdue`, urgent: true }
  }
  return {
    text: new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    urgent: false,
  }
}

function statusBadge(status: string | null) {
  const map: Record<string, string> = {
    "WIN":         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "LOSE":        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "PENDING":     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "QUOTED":      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "FOLLOW UP":   "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    "NO FEEDBACK": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  }
  const key = (status ?? "").toUpperCase()
  return (
    <span className={cn(
      "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
      map[key] ?? "bg-muted text-muted-foreground"
    )}>
      {status ? displayStatus(status) : "—"}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Stat card ────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, href, iconClass,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  href: string
  iconClass?: string
}) {
  return (
    <Link href={href} className={cn(
      "rounded-xl border border-border bg-card p-4 flex items-start gap-4",
      "hover:border-primary/40 hover:shadow-sm transition-all group"
    )}>
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        iconClass ?? "bg-primary/10 text-primary"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-primary font-medium mt-1">{sub}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-1 transition-colors" />
    </Link>
  )
}

// ─── XP / rank mini card ─────────────────────────────────────

function RankCard({ xp, weekXp }: { xp: number; weekXp: number }) {
  const rank     = getRank(xp)
  const nextRank = getNextRank(xp)
  const progress = getRankProgress(xp)

  return (
    <Link href="/activities" className={cn(
      "rounded-xl border-2 p-4 flex items-start gap-4",
      "hover:shadow-sm transition-all group",
      rank.color, rank.bg
    )}>
      <div className={cn(
        "h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0 font-black text-xs",
        rank.color, rank.text
      )}>
        {rank.rank.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-lg font-bold leading-tight", rank.text)}>{rank.rank}</p>
          <span className={cn("text-xs font-semibold", rank.text)}>{xp} XP</span>
        </div>
        {weekXp > 0 && (
          <p className="text-[11px] text-muted-foreground mt-0.5">+{weekXp} XP this week</p>
        )}
        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", rank.barColor)}
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextRank && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {nextRank.minXp - xp} XP to <strong>{nextRank.rank}</strong>
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:opacity-80 shrink-0 mt-1 transition-colors" />
    </Link>
  )
}

// ─── Custom chart tooltip ─────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const date = label
    ? new Date(label + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : label
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground">{date}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const { openChat } = useChatDock()

  const [displayName,   setDisplayName]   = useState("")
  const [userId,        setUserId]        = useState("")
  const [userRole,      setUserRole]      = useState("")
  const [data,          setData]          = useState<HomeData | null>(null)
  const [chatRooms,     setChatRooms]     = useState<ChatRoom[]>([])
  const [loading,       setLoading]       = useState(true)
  const [dismissing,    setDismissing]    = useState<Set<string>>(new Set())
  const [testEmailSent, setTestEmailSent] = useState(false)
  const [testEmailBusy, setTestEmailBusy] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null)

  // ── Load user info + home data ───────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, role, salesperson")
        .eq("id", user.id)
        .single()
      setDisplayName(profile?.full_name ?? user.email ?? "")
      setUserId(user.id)
      setUserRole(profile?.role ?? "")
    })
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [homeRes, chatRes] = await Promise.all([
        fetch("/api/home"),
        fetch("/api/chat/rooms"),
      ])
      if (homeRes.ok) setData(await homeRes.json())
      if (chatRes.ok) setChatRooms(await chatRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function triggerTestEmail() {
    setTestEmailBusy(true)
    setTestEmailResult(null)
    try {
      const res  = await fetch("/api/cron/reminders", { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        setTestEmailResult(`Error: ${json.error ?? "Unknown"}`)
      } else if (!json.sent) {
        setTestEmailResult("No reminders due today — no emails sent.")
      } else {
        const ok    = json.emails.filter((e: { ok: boolean }) => e.ok).length
        const total = json.emails.length
        setTestEmailResult(`Sent! ${ok}/${total} emails delivered (${json.total} reminders).`)
        setTestEmailSent(true)
      }
    } catch {
      setTestEmailResult("Network error — check console.")
    } finally {
      setTestEmailBusy(false)
    }
  }

  async function dismissReminder(id: string) {
    setDismissing((prev) => new Set(prev).add(id))
    setData((prev) => prev
      ? { ...prev, reminders: prev.reminders.filter((r) => r.id !== id) }
      : prev
    )
    await fetch(`/api/activities/reminders?id=${id}`, { method: "PATCH" })
    setDismissing((prev) => { const s = new Set(prev); s.delete(id); return s })
  }

  // ── Derived values ───────────────────────────────────────────
  const firstName    = displayName.split(" ")[0]
  const unreadRooms  = chatRooms.filter((r) => r.unread_count > 0)
  const totalUnread  = unreadRooms.reduce((s, r) => s + r.unread_count, 0)

  const actStats  = data?.activity.stats
  const enqStats  = data?.enquiry.stats
  const xp        = actStats?.total_xp ?? 0
  const weekXp    = actStats?.week_xp  ?? 0

  // Fill missing days in chart with zeros
  const chartData = (() => {
    const raw  = data?.activity.weekly_chart ?? []
    const days: { date: string; calls: number; visits: number; xp: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key  = d.toISOString().split("T")[0]
      const found = raw.find((r) => r.date?.slice(0, 10) === key)
      days.push({ date: key, calls: found?.calls ?? 0, visits: found?.visits ?? 0, xp: found?.xp ?? 0 })
    }
    return days
  })()

  const hasActivity = chartData.some((d) => d.calls > 0 || d.visits > 0)

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-screen-xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 max-w-screen-xl mx-auto space-y-5 pb-10">

      {/* ── Greeting ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate()}</p>
        </div>
        <Link
          href="/enquiry"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shrink-0",
            "bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">New Enquiry</span>
        </Link>
      </div>

      {/* ── Admin: test email trigger ─────────────────────────── */}
      {userRole === "admin" && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Daily Reminder Emails</p>
            <p className="text-[11px] text-muted-foreground">
              {testEmailResult ?? "Send today's reminder digest to all users right now (normally runs at 9 AM IST)."}
            </p>
          </div>
          <button
            type="button"
            disabled={testEmailBusy}
            onClick={triggerTestEmail}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              testEmailSent
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-primary text-primary-foreground hover:opacity-90",
              testEmailBusy && "opacity-60 cursor-not-allowed"
            )}
          >
            {testEmailBusy ? "Sending…" : testEmailSent ? "Sent ✓" : "Send Now"}
          </button>
        </div>
      )}

      {/* ── Reminders banner ─────────────────────────────────── */}
      {data && data.reminders.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                {data.reminders.length} Reminder{data.reminders.length > 1 ? "s" : ""} need your attention
              </span>
            </div>
            <Link
              href="/activities"
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {data.reminders.slice(0, 4).map((r) => {
              const label  = r.reminder_date ? overdueLabel(r.reminder_date) : null
              const typeDef = r.activity_type ? ACTIVITY_TYPE_MAP[r.activity_type] : null
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5",
                    "bg-white dark:bg-card border border-amber-100 dark:border-border"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    label?.urgent ? "bg-red-500" : "bg-amber-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {r.client_name || "Unknown client"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {label && (
                        <span className={cn(
                          "text-[10px] font-semibold",
                          label.urgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-500"
                        )}>
                          {label.text}
                        </span>
                      )}
                      {typeDef && (
                        <span className="text-[10px] text-muted-foreground">· {typeDef.label}</span>
                      )}
                      {r.notes && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">· {r.notes}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={dismissing.has(r.id)}
                    onClick={() => dismissReminder(r.id)}
                    className={cn(
                      "shrink-0 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded",
                      "border border-amber-200 dark:border-border",
                      "text-amber-700 dark:text-muted-foreground",
                      "hover:bg-amber-100 dark:hover:bg-accent transition-colors",
                      "disabled:opacity-40"
                    )}
                  >
                    <CheckCheck className="h-3 w-3" />
                    Done
                  </button>
                </div>
              )
            })}
          </div>

          {data.reminders.length > 4 && (
            <p className="text-xs text-amber-700 dark:text-amber-500 font-medium pl-1">
              +{data.reminders.length - 4} more reminders
            </p>
          )}
        </div>
      )}

      {/* ── Stat cards row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={ClipboardList}
          label="Total enquiries"
          value={enqStats?.total ?? 0}
          sub={enqStats?.in_progress ? `${enqStats.in_progress} in progress` : undefined}
          href="/enquiries"
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Won this month"
          value={enqStats?.won_month ?? 0}
          sub={enqStats?.in_progress ? `${enqStats.in_progress} active` : "enquiries"}
          href="/enquiries"
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          icon={Phone}
          label="Calls this week"
          value={actStats?.week_calls ?? 0}
          sub={actStats?.week_visits ? `${actStats.week_visits} visits` : undefined}
          href="/activities"
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        {totalUnread > 0 ? (
          <button
            type="button"
            onClick={() => unreadRooms[0] && openChat(unreadRooms[0].id)}
            className={cn(
              "rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-start gap-4 text-left",
              "hover:border-primary/60 hover:shadow-sm transition-all group"
            )}
          >
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5 relative">
              <MessageSquare className="h-5 w-5" />
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground leading-tight">{totalUnread}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unread message{totalUnread > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-primary font-medium mt-1">
                {unreadRooms.length} room{unreadRooms.length > 1 ? "s" : ""}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-1 transition-colors" />
          </button>
        ) : (
          <StatCard
            icon={MessageSquare}
            label="Unread messages"
            value={0}
            sub="All caught up"
            href="/chat"
            iconClass="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          />
        )}
      </div>

      {/* ── Rank card ────────────────────────────────────────── */}
      <RankCard xp={xp} weekXp={weekXp} />

      {/* ── Weekly activity chart ─────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">This Week's Activity</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[hsl(217,91%,60%)]" />
              Calls
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[hsl(160,60%,45%)]" />
              Visits
            </span>
          </div>
        </div>
        <div className="p-4">
          {hasActivity ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={14} barGap={3}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="calls"  name="Calls"  fill="hsl(217,91%,60%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="visits" name="Visits" fill="hsl(160,60%,45%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex flex-col items-center justify-center text-center gap-2">
              <Phone className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activity logged this week</p>
              <Link href="/activities" className="text-xs text-primary hover:underline font-medium">
                Log your first activity →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom two-column grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Enquiries */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent Enquiries</span>
            </div>
            <Link
              href="/enquiries"
              className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!data?.enquiry.recent.length ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Package className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No enquiries yet</p>
              <Link href="/enquiry" className="text-xs text-primary hover:underline font-medium">
                Create your first →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.enquiry.recent.map((e) => (
                <Link
                  key={e.id}
                  href={`/enquiry?edit=${e.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-foreground">
                        {e.enq_ref_no || `#${e.id}`}
                      </span>
                      {statusBadge(e.status)}
                      {e.mode && (
                        <span className="text-[10px] text-muted-foreground uppercase">{e.mode}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {[e.shipper, e.consignee].filter(Boolean).join(" → ") || "No shipper/consignee"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {e.created_at ? timeAgo(e.created_at) : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent Activities</span>
            </div>
            <Link
              href="/activities"
              className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {!data?.activity.recent.length ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Phone className="h-7 w-7 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No activities logged yet</p>
              <Link href="/activities" className="text-xs text-primary hover:underline font-medium">
                Log your first activity →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.activity.recent.map((a) => {
                const typeDef = a.activity_type ? ACTIVITY_TYPE_MAP[a.activity_type] : null
                return (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={cn(
                      "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
                      typeDef?.color ?? "bg-muted",
                      typeDef?.textColor ?? "text-muted-foreground"
                    )}>
                      {typeDef?.label.slice(0, 2).toUpperCase() ?? "AC"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {a.client_name || "Unknown client"}
                        </p>
                        {a.points != null && a.points > 0 && (
                          <span className="text-[10px] text-primary font-bold shrink-0">
                            +{a.points} XP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {typeDef && (
                          <span className="text-[10px] text-muted-foreground">{typeDef.label}</span>
                        )}
                        {a.activity_date && (
                          <span className="text-[10px] text-muted-foreground">
                            · {new Date(a.activity_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        {a.status && (
                          <span className="text-[10px] text-muted-foreground">· {a.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Unread chat rooms (if any) ────────────────────────── */}
      {unreadRooms.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Unread Messages</span>
              <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                {totalUnread}
              </span>
            </div>
            <Link
              href="/chat"
              className="text-[11px] text-primary hover:underline font-medium flex items-center gap-0.5"
            >
              Open chat <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {unreadRooms.slice(0, 4).map((room) => {
              const otherMember = room.type === "direct"
                ? room.members.find((m) => m.user_id !== userId)
                : null
              const roomName = room.name || otherMember?.full_name || "Direct message"
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => openChat(room.id)}
                  className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                    {roomName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{roomName}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {room.last_message && (
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(room.last_message.created_at)}
                          </span>
                        )}
                        <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                          {room.unread_count > 9 ? "9+" : room.unread_count}
                        </span>
                      </div>
                    </div>
                    {room.last_message && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {room.last_message.sender_name
                          ? `${room.last_message.sender_name}: `
                          : ""}
                        {room.last_message.content}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quick actions footer ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {[
          { label: "Log Activity",  href: "/activities",  icon: Phone,         iconClass: "text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400" },
          { label: "New Enquiry",   href: "/enquiry",     icon: ClipboardList, iconClass: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400" },
          { label: "Rate Explorer", href: "/rates",       icon: TrendingUp,    iconClass: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400" },
          { label: "Open Chat",     href: "/chat",        icon: MessageSquare, iconClass: "text-primary bg-primary/10" },
        ].map(({ label, href, icon: Icon, iconClass }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card",
              "hover:border-primary/40 hover:shadow-sm transition-all text-sm font-medium text-foreground"
            )}
          >
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", iconClass)}>
              <Icon className="h-4 w-4" />
            </div>
            {label}
          </Link>
        ))}
      </div>

    </div>
  )
}
