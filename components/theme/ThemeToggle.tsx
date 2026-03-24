"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

const THEMES = ["light", "dark", "pink"] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="fixed top-4 right-4 z-50 size-9" aria-label="Toggle theme">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const idx = THEMES.indexOf((theme ?? "light") as typeof THEMES[number])
  const next = THEMES[(idx + 1) % THEMES.length]
  const Icon = theme === "dark" ? Moon : theme === "pink" ? Heart : Sun

  return (
    <Button variant="ghost" size="icon" className="fixed top-4 right-4 z-50 size-9"
      onClick={() => setTheme(next)} aria-label="Toggle theme">
      <Icon className="h-4 w-4" />
    </Button>
  )
}
