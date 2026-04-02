import { Badge } from "@/components/ui/badge"

interface Props {
  valid_from: string | null
  valid_to: string | null
}

export function ValidityBadge({ valid_from: _valid_from, valid_to }: Props) {
  const today = new Date().toISOString().split("T")[0]
  const warnDate = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]

  if (!valid_to) {
    return <Badge variant="secondary">No expiry</Badge>
  }

  if (valid_to < today) {
    return <Badge variant="danger">Expired {valid_to}</Badge>
  }

  if (valid_to <= warnDate) {
    return <Badge variant="warning">Expires {valid_to}</Badge>
  }

  return <Badge variant="success">Valid until {valid_to}</Badge>
}
