import { Badge } from "@/components/ui/badge"
import { parseSurcharges } from "@/lib/utils/surcharges"

interface Props {
  raw: string | null
}

export function SurchargeList({ raw }: Props) {
  const items = parseSurcharges(raw)
  if (!items.length) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge key={s.name} variant="outline" className="text-xs font-normal">
          {s.name}: {s.value === "included" ? "incl." : `$${s.value}/TEU`}
        </Badge>
      ))}
    </div>
  )
}
