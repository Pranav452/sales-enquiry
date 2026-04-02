import type { ParsedSurcharge } from "@/lib/types/rates"

// Parses 'EBS:160;THC:included;ETS:85' → [{name:'EBS',value:'160'}, ...]
export function parseSurcharges(raw: string | null): ParsedSurcharge[] {
  if (!raw || !raw.trim()) return []
  return raw
    .split(";")
    .map((entry) => {
      const idx = entry.indexOf(":")
      if (idx === -1) return null
      const name = entry.slice(0, idx).trim()
      const value = entry.slice(idx + 1).trim()
      if (!name) return null
      return { name, value }
    })
    .filter((x): x is ParsedSurcharge => x !== null)
}

// Serializes [{name:'EBS',value:'160'}, ...] → 'EBS:160;THC:included'
export function serializeSurcharges(items: ParsedSurcharge[]): string {
  return items
    .filter((s) => s.name.trim())
    .map((s) => `${s.name.trim()}:${s.value.trim()}`)
    .join(";")
}
