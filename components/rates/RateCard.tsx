import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ValidityBadge } from "./ValidityBadge"
import { SurchargeList } from "./SurchargeList"
import type { FreightRate } from "@/lib/types/rates"
import { ExternalLink } from "lucide-react"

interface Props {
  line: string
  rates: FreightRate[]
}

// Builds a /quotation link that seeds the form from this rate row so a
// sales person can go from "found a rate" to "drafted a quote" in one click.
function quotationHref(rate: FreightRate, size: "20" | "40"): string {
  const amount = size === "20" ? rate.rate_20 : rate.rate_40
  const params = new URLSearchParams()
  if (rate.origin_port) params.set("pol", rate.origin_port)
  if (rate.dest_port) params.set("pod", rate.dest_port)
  params.set("container_type", size === "20" ? "20GP" : "40HC")
  if (amount != null) params.set("freight_amount", String(amount))
  params.set("freight_currency", rate.currency)
  if (rate.shipping_line) params.set("carrier", rate.shipping_line)
  if (rate.transit_days != null) params.set("transit_time", `${rate.transit_days} days`)
  if (rate.valid_to) params.set("freight_validity_date", rate.valid_to)
  if (rate.surcharges) params.set("surcharges", rate.surcharges)
  return `/quotation?${params.toString()}`
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
          <div className="flex items-center gap-2">
            {primary.pdf_url && (
              <a
                href={encodeURI(primary.pdf_url)}
                target="_blank"
                rel="noopener noreferrer"
                title="View source PDF"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                PDF
              </a>
            )}
            <ValidityBadge valid_from={primary.valid_from} valid_to={primary.valid_to} />
          </div>
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
          <RateBox
            label="20' Rate"
            value={primary.rate_20}
            currency={primary.currency}
            href={primary.rate_20 != null ? quotationHref(primary, "20") : undefined}
          />
          <RateBox
            label="40' Rate"
            value={primary.rate_40}
            currency={primary.currency}
            href={primary.rate_40 != null ? quotationHref(primary, "40") : undefined}
          />
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
                    <Link href={quotationHref(r, "20")} title="Use this rate in a new quotation">
                      <Badge variant="outline" className="font-normal text-xs cursor-pointer transition-colors hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30">
                        20': {r.currency} {r.rate_20.toLocaleString()}
                      </Badge>
                    </Link>
                  )}
                  {r.rate_40 != null && (
                    <Link href={quotationHref(r, "40")} title="Use this rate in a new quotation">
                      <Badge variant="outline" className="font-normal text-xs cursor-pointer transition-colors hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/30">
                        40': {r.currency} {r.rate_40.toLocaleString()}
                      </Badge>
                    </Link>
                  )}
                  <ValidityBadge valid_from={r.valid_from} valid_to={r.valid_to} />
                  {r.pdf_url && (
                    <a
                      href={encodeURI(r.pdf_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View source PDF"
                      className="text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 inline" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RateBox({
  label, value, currency, href,
}: { label: string; value: number | null; currency: string; href?: string }) {
  const content = (
    <>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {value != null
        ? <p className="text-lg font-semibold">{currency} {value.toLocaleString()}</p>
        : <p className="text-sm text-muted-foreground">—</p>
      }
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        title="Use this rate in a new quotation"
        className="block rounded-lg bg-muted/50 p-3 cursor-pointer transition-colors hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 dark:hover:bg-blue-950/30"
      >
        {content}
      </Link>
    )
  }

  return <div className="rounded-lg bg-muted/50 p-3">{content}</div>
}
