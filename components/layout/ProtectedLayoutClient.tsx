"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar"
import {
  Anchor,
  ClipboardList,
  LayoutDashboard,
  List,
  LogOut,
  User,
} from "lucide-react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface Props {
  role: string
  displayName: string
  branch: string
  children: React.ReactNode
}

export function ProtectedLayoutClient({ role, displayName, branch, children }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const links = [
    {
      label: "New Enquiry",
      href: "/enquiry",
      icon: <ClipboardList className="h-5 w-5 flex-shrink-0 text-muted-foreground" />,
    },
    {
      label: "Recent Enquiries",
      href: "/enquiries",
      icon: <List className="h-5 w-5 flex-shrink-0 text-muted-foreground" />,
    },
    ...(role === "admin"
      ? [
          {
            label: "Dashboard",
            href: "/dashboard",
            icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0 text-muted-foreground" />,
          },
        ]
      : []),
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className={cn("flex h-screen overflow-hidden bg-background")}>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 py-2 px-2"
              >
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <Anchor className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm text-foreground whitespace-pre">
                  Links Cargo
                </span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 py-2 px-2">
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                  <Anchor className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}

            {/* Nav links */}
            <div className="mt-6 flex flex-col gap-1">
              {links.map((link) => (
                <SidebarLink key={link.href} link={link} />
              ))}
            </div>
          </div>

          {/* Bottom: user info + logout */}
          <div className="flex flex-col gap-1">
            <SidebarLink
              link={{
                label: displayName,
                href: "#",
                icon: (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                ),
              }}
            />
            {open && branch && (
              <p className="text-xs text-muted-foreground px-2 pb-1">{branch}</p>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 py-2 px-2 rounded-md hover:bg-accent transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-sm text-foreground whitespace-pre inline-block !p-0 !m-0"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
