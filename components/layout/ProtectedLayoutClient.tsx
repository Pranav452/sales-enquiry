"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import {
  Anchor,
  ClipboardList,
  LayoutDashboard,
  List,
  LogOut,
  Moon,
  Sun,
  Heart,
  User,
  ScrollText,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  role: string
  displayName: string
  branch: string
  company: string
  userId: string
  children: React.ReactNode
}

const COMPANY_LABELS: Record<string, string> = {
  manilal: "Sales bridge - MP",
  links: "Sales bridge - Links",
}

export function ProtectedLayoutClient({ role, displayName, branch, company, userId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
  const brandName = COMPANY_LABELS[company] || "Freight CRM"

  const THEMES = [
    { key: "light", icon: Sun,   label: "Light mode" },
    { key: "dark",  icon: Moon,  label: "Dark mode"  },
    { key: "pink",  icon: Heart, label: "Pink mode"  },
  ]
  const currentThemeIndex = THEMES.findIndex((t) => t.key === currentTheme)
  const nextTheme = THEMES[(currentThemeIndex + 1) % THEMES.length]
  const CurrentThemeIcon = THEMES[currentThemeIndex]?.icon ?? Sun

  const navLinks = [
    { label: "New Enquiry",      href: "/enquiry",    icon: ClipboardList },
    { label: "Recent Enquiries", href: "/enquiries",  icon: List },
    ...(role === "admin"
      ? [
          { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
          { label: "Audit Log",  href: "/audit",      icon: ScrollText },
        ]
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
    </div>
  )
}
