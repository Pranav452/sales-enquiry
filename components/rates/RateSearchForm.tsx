"use client"

import { useState } from "react"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { COUNTRIES } from "@/lib/constants/dropdowns"

interface Props {
  onSearch: (origin: string, dest: string, originPort: string, destPort: string) => void
  initialOrigin?: string
  initialDest?: string
  initialOriginPort?: string
  initialDestPort?: string
}

export function RateSearchForm({
  onSearch,
  initialOrigin = "",
  initialDest = "",
  initialOriginPort = "",
  initialDestPort = "",
}: Props) {
  const [origin, setOrigin]           = useState(initialOrigin)
  const [dest,   setDest]             = useState(initialDest)
  const [originPort, setOriginPort]   = useState(initialOriginPort)
  const [destPort,   setDestPort]     = useState(initialDestPort)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin.trim() || !dest.trim()) return
    onSearch(
      origin.trim().toUpperCase(),
      dest.trim().toUpperCase(),
      originPort.trim(),
      destPort.trim(),
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Country row */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
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
      </div>

      {/* Port filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Origin Port <span className="text-muted-foreground/60">(optional)</span></Label>
          <input
            type="text"
            value={originPort}
            onChange={e => setOriginPort(e.target.value)}
            placeholder="e.g. Nhava Sheva, Mundra"
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="hidden sm:block w-8" />
        <div className="flex-1 min-w-0">
          <Label className="mb-1.5 block text-xs text-muted-foreground">Dest Port <span className="text-muted-foreground/60">(optional)</span></Label>
          <input
            type="text"
            value={destPort}
            onChange={e => setDestPort(e.target.value)}
            placeholder="e.g. Mombasa, Apapa"
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="hidden sm:block w-[73px]" />{/* align with Search button above */}
      </div>
    </form>
  )
}
