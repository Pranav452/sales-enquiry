import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ValidityBadge } from "./ValidityBadge"
import { SurchargeList } from "./SurchargeList"
import type { FreightRate } from "@/lib/types/rates"

interface Props {
  line: string
  rates: FreightRate[]
}

export function RateCard({ line, rates }: Props) {
  // Sort: most current validity first
  const sorted = [...rates].sort((a, b) => {
    const aTo = a.valid_to ?? "9999-12-31"
    const bTo = b.valid_to ?? "9999-12-31"
    return bTo > aTo ? 1 : bTo < aTo ? -1 : 0
  })

  const primary = sorted[0]
  const extras  = sorted.slice(1)

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-base">{line}</h3>
          <ValidityBadge valid_from={primary.valid_from} valid_to={primary.valid_to} />
        </div>
        {primary.dest_port && (
          <p className="text-sm text-muted-foreground">
            {primary.origin_port ?? "—"} → {primary.dest_port}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Rates */}
        <div className="grid grid-cols-2 gap-3">
          <RateBox label="20' Rate" value={primary.rate_20} currency={primary.currency} />
          <RateBox label="40' Rate" value={primary.rate_40} currency={primary.currency} />
        </div>

        {/* Transit + via */}
        {(primary.transit_days || primary.via_port) && (
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {primary.transit_days && (
              <span>
                <span className="text-foreground font-medium">{primary.transit_days}</span> days transit
              </span>
            )}
            {primary.via_port && (
              <span>via <span className="text-foreground font-medium">{primary.via_port}</span></span>
            )}
          </div>
        )}

        {/* Surcharges */}
        <SurchargeList raw={primary.surcharges} />

        {/* Notes */}
        {primary.notes && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2">{primary.notes}</p>
        )}

        {/* Additional validity windows */}
        {extras.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Other validity windows</p>
            {extras.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 text-sm flex-wrap">
                <span className="text-muted-foreground">{r.dest_port ?? "—"}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {r.rate_20 != null && (
                    <Badge variant="outline" className="font-normal text-xs">20': {r.currency} {r.rate_20.toLocaleString()}</Badge>
                  )}
                  {r.rate_40 != null && (
                    <Badge variant="outline" className="font-normal text-xs">40': {r.currency} {r.rate_40.toLocaleString()}</Badge>
                  )}
                  <ValidityBadge valid_from={r.valid_from} valid_to={r.valid_to} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RateBox({ label, value, currency }: { label: string; value: number | null; currency: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {value != null
        ? <p className="text-lg font-semibold">{currency} {value.toLocaleString()}</p>
        : <p className="text-sm text-muted-foreground">—</p>
      }
    </div>
  )
}
