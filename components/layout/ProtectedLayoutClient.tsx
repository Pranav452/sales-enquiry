"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Anchor,
  BarChart2,
  Bell,
  ClipboardList,
  FileDown,
  Flame,
  LayoutDashboard,
  List,
  LogOut,
  MessageSquare,
  Moon,
  Phone,
  Sun,
  Heart,
  User,
  ScrollText,
  TrendingUp,
  Settings2,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ACTIVITY_TYPE_MAP } from "@/lib/constants/activities"
import { useChatDock } from "@/lib/store/chatDock"
import { useChatGlobalRealtime } from "@/components/chat/useChatGlobalRealtime"
import { ChatDock } from "@/components/chat/ChatDock"

// ─── Types ────────────────────────────────────────────────────

interface Reminder {
  id:            string
  client_name:   string | null
  sales_person:  string | null
  activity_type: string | null
  activity_date: string | null
  reminder_date: string | null
  notes:         string | null
  status:        string | null
}

interface ChatRoom {
  id:           string
  name:         string | null
  type:         string
  unread_count: number
  last_message: {
    content:     string
    created_at:  string
    sender_name: string | null
  } | null
  members: { user_id: string; full_name: string | null }[]
}

// ─── Notification hook ───────────────────────────────────────

function useNotifications(userId: string) {
  const [reminders,    setReminders]    = useState<Reminder[]>([])
  const [chatRooms,    setChatRooms]    = useState<ChatRoom[]>([])
  const [loading,      setLoading]      = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [remRes, chatRes] = await Promise.all([
        fetch("/api/activities/reminders"),
        fetch("/api/chat/rooms"),
      ])
      if (remRes.ok)  setReminders(await remRes.json())
      if (chatRes.ok) setChatRooms(await chatRes.json())
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Poll every 5 minutes
    const interval = setInterval(fetchAll, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const unreadRooms  = chatRooms.filter((r) => r.unread_count > 0)
  const totalUnread  = unreadRooms.reduce((s, r) => s + r.unread_count, 0)
  const totalCount   = reminders.length + totalUnread

  async function dismissReminder(id: string) {
    // Optimistic update
    setReminders((prev) => prev.filter((r) => r.id !== id))
    await fetch(`/api/activities/reminders?id=${id}`, { method: "PATCH" })
  }

  return { reminders, unreadRooms, totalCount, loading, dismissReminder, refetch: fetchAll }
}

// ─── Notification panel ───────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return "just now"
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function overdueLabel(reminderDate: string): string {
  const today   = new Date().toISOString().split("T")[0]
  if (reminderDate === today) return "Today"
  if (reminderDate < today) {
    const days = Math.round(
      (new Date(today).getTime() - new Date(reminderDate).getTime()) / 86400000
    )
    return `${days}d overdue`
  }
  return new Date(reminderDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

interface PanelProps {
  reminders:    Reminder[]
  unreadRooms:  ChatRoom[]
  totalCount:   number
  loading:      boolean
  userId:       string
  onDismiss:    (id: string) => void
  onClose:      () => void
  onOpenChat:   (roomId: string) => void  // opens room in dock panel
}

function NotificationPanel({
  reminders, unreadRooms, totalCount, loading, userId,
  onDismiss, onClose, onOpenChat,
}: PanelProps) {
  return (
    <div
      className={cn(
        "absolute right-0 top-full mt-2 w-[380px] max-h-[520px] overflow-y-auto z-50",
        "rounded-xl border border-border bg-card shadow-xl",
        "animate-in slide-in-from-top-2 fade-in duration-150"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold">Notifications</span>
          {totalCount > 0 && (
            <span className="text-[11px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
              {totalCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
      )}

      {!loading && totalCount === 0 && (
        <div className="py-10 text-center space-y-1">
          <p className="text-sm font-medium text-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground">No pending reminders or unread messages.</p>
        </div>
      )}

      {/* ── Reminders section ──────────────────────────── */}
      {reminders.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Reminders ({reminders.length})
          </p>
          {reminders.map((r) => {
            const typeDef = r.activity_type ? ACTIVITY_TYPE_MAP[r.activity_type] : null
            const today   = new Date().toISOString().split("T")[0]
            const isOverdue = r.reminder_date ? r.reminder_date < today : false
            const isToday   = r.reminder_date === today

            return (
              <div
                key={r.id}
                className={cn(
                  "px-4 py-3 border-b border-border/50 flex items-start gap-3 group",
                  "hover:bg-accent/50 transition-colors"
                )}
              >
                {/* Status dot */}
                <div className={cn(
                  "mt-0.5 h-2 w-2 rounded-full shrink-0",
                  isOverdue ? "bg-red-500" : isToday ? "bg-amber-500" : "bg-blue-500"
                )} />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {r.client_name || "Unknown client"}
                  </p>
                  <p className={cn(
                    "text-[11px] font-medium",
                    isOverdue ? "text-red-600 dark:text-red-400" :
                    isToday   ? "text-amber-600 dark:text-amber-400" :
                                "text-muted-foreground"
                  )}>
                    {r.reminder_date ? overdueLabel(r.reminder_date) : "No date"}
                    {typeDef && ` · ${typeDef.label}`}
                  </p>
                  {r.notes && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{r.notes}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDismiss(r.id)}
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded border shrink-0",
                    "text-muted-foreground border-border hover:text-foreground hover:border-foreground",
                    "transition-colors opacity-0 group-hover:opacity-100"
                  )}
                >
                  Dismiss
                </button>
              </div>
            )
          })}
          <Link
            href="/activities"
            onClick={onClose}
            className="block px-4 py-2 text-[11px] text-primary hover:underline font-medium"
          >
            View all reminders →
          </Link>
        </div>
      )}

      {/* ── Unread messages section ────────────────────── */}
      {unreadRooms.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Unread Messages ({unreadRooms.reduce((s, r) => s + r.unread_count, 0)})
          </p>
          {unreadRooms.map((room) => {
            // For DMs, show the other person's name
            const otherMember = room.type === "direct"
              ? room.members.find((m) => m.user_id !== userId)
              : null
            const roomName = room.name || otherMember?.full_name || "Direct message"
            const preview  = room.last_message?.content ?? ""

            return (
              <button
                key={room.id}
                type="button"
                onClick={() => { onOpenChat(room.id); onClose() }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50",
                  "hover:bg-accent/50 transition-colors flex items-start gap-3"
                )}
              >
                {/* Avatar initial */}
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[11px] font-bold text-primary">
                  {roomName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate">{roomName}</p>
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
                  {preview && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {room.last_message?.sender_name
                        ? `${room.last_message.sender_name}: ${preview}`
                        : preview}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
          <Link
            href="/chat"
            onClick={onClose}
            className="block px-4 py-2 text-[11px] text-primary hover:underline font-medium"
          >
            Open full chat →
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── Main layout ──────────────────────────────────────────────

interface Props {
  role: string
  displayName: string
  branch: string
  company: string
  userId: string
  email: string
  children: React.ReactNode
}

const COMPANY_LABELS: Record<string, string> = {
  manilal: "Sales bridge - MP",
  links: "Sales bridge - Links",
}

export function ProtectedLayoutClient({ role, displayName, branch, company, userId, email, children }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted]     = useState(false)
  const [bellOpen, setBellOpen]   = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const { reminders, unreadRooms, totalCount, loading, dismissReminder } =
    useNotifications(userId)

  // ── Chat dock: global realtime subscription ─────────────────
  const { items: dockItems, openChat } = useChatDock()
  const activeRoomIds = dockItems.filter((i) => !i.minimized).map((i) => i.roomId)
  useChatGlobalRealtime(activeRoomIds)

  useEffect(() => { setMounted(true) }, [])

  // Close bell dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [bellOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  async function handleCompanySwitch(newCompany: string) {
    await supabase
      .from("user_profiles")
      .update({ company: newCompany })
      .eq("id", userId)
    router.refresh()
  }

  const currentTheme = mounted ? (theme ?? "light") : "light"
  const brandName    = COMPANY_LABELS[company] || "Freight CRM"

  const THEMES = [
    { key: "light", icon: Sun,   label: "Light mode" },
    { key: "dark",  icon: Moon,  label: "Dark mode"  },
    { key: "pink",  icon: Heart, label: "Pink mode"  },
  ]
  const currentThemeIndex = THEMES.findIndex((t) => t.key === currentTheme)
  const nextTheme         = THEMES[(currentThemeIndex + 1) % THEMES.length]
  const CurrentThemeIcon  = THEMES[currentThemeIndex]?.icon ?? Sun

  const navLinks = [
    { label: "New Enquiry",       href: "/enquiry",                icon: ClipboardList },
    { label: "Recent Enquiries",  href: "/enquiries",              icon: List },
    { label: "Activity Tracker",  href: "/activities",             icon: Phone },
    { label: "Export",            href: "/export",                 icon: FileDown },
    { label: "Rate Explorer",     href: "/rates",                  icon: TrendingUp },
    { label: "Chat",              href: "/chat",                   icon: MessageSquare },
    ...(role === "admin"
      ? [
          { label: "Dashboard",          href: "/dashboard",           icon: LayoutDashboard },
          { label: "Activity Dashboard", href: "/activities/dashboard", icon: BarChart2 },
          { label: "Audit Log",          href: "/audit",               icon: ScrollText },
          { label: "Manage Rates",       href: "/rates/manage",        icon: Settings2 },
        ]
      : []),
    ...(email === "sales2.bom@manilal.com"
      ? [{ label: "Ronaldo", href: "/ronaldo", icon: Flame }]
      : []),
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* ── Top Header ─────────────────────────────────────────── */}
      <header
        className="h-14 flex-shrink-0 flex items-center px-4 gap-4 z-50 border-b border-white/10"
        style={{ background: "hsl(var(--topbar))" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
            <Anchor className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-semibold text-sm leading-tight tracking-tight">
              {brandName}
            </p>
            <p className="text-white/50 text-[10px] leading-tight tracking-widest uppercase">
              Freight CRM
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Company switcher — admin only */}
        {role === "admin" && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {Object.entries(COMPANY_LABELS).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => handleCompanySwitch(val)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  company === val
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Bell notification button ────────────────────── */}
        <div ref={bellRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setBellOpen((v) => !v)}
            className={cn(
              "relative flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
              bellOpen
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {totalCount > 0 && (
              <span className={cn(
                "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1",
                "rounded-full bg-red-500 text-white text-[10px] font-bold",
                "flex items-center justify-center leading-none"
              )}>
                {totalCount > 99 ? "99+" : totalCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <NotificationPanel
              reminders={reminders}
              unreadRooms={unreadRooms}
              totalCount={totalCount}
              loading={loading}
              userId={userId}
              onDismiss={dismissReminder}
              onClose={() => setBellOpen(false)}
              onOpenChat={(roomId) => { openChat(roomId); setBellOpen(false) }}
            />
          )}
        </div>

        {/* User info + Logout */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-white" />
          </div>

          <div className="text-right hidden md:block min-w-0 max-w-[160px] overflow-hidden">
            <p className="text-white text-xs font-medium leading-tight truncate">{displayName}</p>
            {branch && (
              <p className="text-white/50 text-[10px] leading-tight truncate">{branch}</p>
            )}
          </div>

          <div className="w-px h-5 bg-white/20 flex-shrink-0 hidden md:block" />

          <button
            onClick={handleLogout}
            className="flex-shrink-0 flex items-center gap-1.5 text-white/70 hover:text-white
                       text-xs px-2.5 py-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Body: Hover-Expand Sidebar + Main Content ──────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <nav
          className={cn(
            "group/nav w-14 hover:w-52 transition-[width] duration-200 ease-in-out",
            "bg-card border-r border-border flex flex-col py-3 gap-0.5 flex-shrink-0 overflow-hidden"
          )}
        >
          {/* Nav links */}
          {navLinks.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/enquiry"
                ? pathname === "/enquiry" || pathname.startsWith("/enquiry?")
                : href === "/rates"
                  ? pathname === "/rates"
                  : href === "/activities"
                    ? pathname === "/activities"
                    : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center h-10 mx-1.5 px-2.5 gap-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium",
                    "opacity-0 group-hover/nav:opacity-100",
                    "transition-opacity duration-150 delay-75"
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* Spacer pushes toggle to bottom */}
          <div className="flex-1" />

          {/* Theme toggle — cycles light → dark → pink */}
          <button
            onClick={() => setTheme(nextTheme.key)}
            title={`Switch to ${nextTheme.label}`}
            className="flex items-center h-10 mx-1.5 px-2.5 gap-3 rounded-lg transition-colors
                       text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {mounted
              ? <CurrentThemeIcon className="h-5 w-5 shrink-0" />
              : <Moon className="h-5 w-5 shrink-0 opacity-0" />
            }
            <span
              className={cn(
                "whitespace-nowrap text-sm font-medium",
                "opacity-0 group-hover/nav:opacity-100",
                "transition-opacity duration-150 delay-75"
              )}
            >
              {nextTheme.label}
            </span>
          </button>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </div>

      {/* ── Global chat dock — persists across all pages ────── */}
      <ChatDock />
    </div>
  )
}
