"use client"

import { useState } from "react"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { COUNTRIES } from "@/lib/constants/dropdowns"

interface Props {
  onSearch: (origin: string, dest: string) => void
  initialOrigin?: string
  initialDest?: string
}

export function RateSearchForm({ onSearch, initialOrigin = "", initialDest = "" }: Props) {
  const [origin, setOrigin] = useState(initialOrigin)
  const [dest,   setDest]   = useState(initialDest)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin.trim() || !dest.trim()) return
    onSearch(origin.trim().toUpperCase(), dest.trim().toUpperCase())
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex-1 min-w-0">
        <Label className="mb-1.5 block text-sm">Origin Country</Label>
        <Combobox
          value={origin}
          onChange={setOrigin}
          options={COUNTRIES}
          placeholder="e.g. INDIA"
        />
      </div>

      <div className="hidden sm:flex items-end pb-2.5 text-muted-foreground text-lg font-light select-none">→</div>

      <div className="flex-1 min-w-0">
        <Label className="mb-1.5 block text-sm">Destination Country</Label>
        <Combobox
          value={dest}
          onChange={setDest}
          options={COUNTRIES}
          placeholder="e.g. BRAZIL"
        />
      </div>

      <Button type="submit" disabled={!origin.trim() || !dest.trim()}>
        Search
      </Button>
    </form>
  )
}
