"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ComboboxProps {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Type to search...",
  className,
  disabled = false,
}: ComboboxProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync internal query when external value changes (e.g. form reset)
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  )

  const showList = open && !disabled && filtered.length > 0

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-[hsl(var(--input-bg))] px-3 py-1 text-sm shadow-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
      {showList && (
        <ul className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {filtered.map((opt) => (
            <li
              key={opt}
              className={cn(
                "cursor-pointer px-3 py-1.5 text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                opt === value && "bg-accent/50 font-medium"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(opt)
                setQuery(opt)
                setOpen(false)
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
