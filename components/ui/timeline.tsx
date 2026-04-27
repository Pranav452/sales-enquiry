"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TimelineItem {
  id:          string
  date:        string          // ISO yyyy-mm-dd
  title:       string
  subtitle?:   string          // e.g. sales person name
  description?: string         // notes / status text
  icon?:       React.ReactNode
  dotColor?:   string          // tailwind bg class e.g. "bg-blue-500"
  badge?:      React.ReactNode // rendered inline after title (e.g. XP chip)
}

interface TimelineProps {
  items:              TimelineItem[]
  initialCount?:      number
  className?:         string
  showMoreText?:      string
  showLessText?:      string
  animationDuration?: number
  animationDelay?:    number
}

function TimelineEntry({ item }: { item: TimelineItem }) {
  return (
    <div className="flex gap-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 ring-2 ring-background shadow-sm",
          item.dotColor ?? "bg-muted-foreground/30"
        )}>
          {item.icon && (
            <span className="text-white [&_svg]:h-3.5 [&_svg]:w-3.5">{item.icon}</span>
          )}
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        {/* Date */}
        <p className="text-[11px] text-muted-foreground mb-0.5">
          {new Date(item.date + "T00:00:00").toLocaleDateString("en-GB", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </p>

        {/* Title + badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{item.title}</span>
          {item.badge}
        </div>

        {/* Subtitle (sales person) */}
        {item.subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
        )}

        {/* Description (status · notes) */}
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        )}
      </div>
    </div>
  )
}

export function Timeline({
  items,
  initialCount = 5,
  className,
  showMoreText = "Show older calls",
  showLessText = "Show less",
  animationDuration = 0.25,
  animationDelay = 0.06,
}: TimelineProps) {
  const [showAll, setShowAll] = useState(false)

  const visible   = items.slice(0, initialCount)
  const remaining = items.slice(initialCount)

  return (
    <div className={cn("relative", className)}>
      <div>
        {visible.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: animationDuration, delay: i * animationDelay }}
          >
            <TimelineEntry item={item} />
          </motion.div>
        ))}

        <AnimatePresence>
          {showAll && remaining.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: animationDuration, delay: i * animationDelay }}
            >
              <TimelineEntry item={item} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {remaining.length > 0 && (
        <div className="flex justify-center pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? showLessText : `${showMoreText} (${remaining.length} more)`}
            <motion.div animate={{ rotate: showAll ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </Button>
        </div>
      )}
    </div>
  )
}
