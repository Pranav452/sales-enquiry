// Charge blobs stored as JSON in TBL_QUOTATIONS.
// LOCAL_CHARGES holds the fixed local-charge struct plus the freight
// charge and any user-added extra rows, under __-prefixed keys.
// CC_CHARGES holds the doc/factory struct plus extra rows.

interface ChargeBody {
  local_charges?: Record<string, unknown> | null
  freight_charge?: unknown
  cc_charges?: Record<string, unknown> | null
  extra_freight?: unknown[] | null
  extra_local?: unknown[] | null
  extra_cc?: unknown[] | null
}

function hasItems(a: unknown[] | null | undefined): boolean {
  return Array.isArray(a) && a.length > 0
}

export function buildLocalBlob(body: ChargeBody): string | null {
  const has =
    body.local_charges ||
    body.freight_charge ||
    hasItems(body.extra_freight) ||
    hasItems(body.extra_local)
  if (!has) return null
  return JSON.stringify({
    ...(body.local_charges ?? {}),
    __freight_charge: body.freight_charge ?? null,
    __extra_freight: body.extra_freight ?? [],
    __extra_local: body.extra_local ?? [],
  })
}

export function buildCcBlob(body: ChargeBody): string | null {
  const has = body.cc_charges || hasItems(body.extra_cc)
  if (!has) return null
  return JSON.stringify({
    ...(body.cc_charges ?? {}),
    __extra_cc: body.extra_cc ?? [],
  })
}

// Inverse of the builders — split a parsed blob into its parts.
interface ParsedLocal {
  local_charges: Record<string, unknown> | null
  freight_charge: unknown
  extra_freight: unknown[]
  extra_local: unknown[]
}

export function parseLocalBlob(raw: string | null): ParsedLocal {
  if (!raw) return { local_charges: null, freight_charge: null, extra_freight: [], extra_local: [] }
  const p = JSON.parse(raw) as Record<string, unknown>
  const {
    __freight_charge = null,
    __extra_freight = [],
    __extra_local = [],
    ...local
  } = p
  return {
    local_charges: Object.keys(local).length ? local : null,
    freight_charge: __freight_charge,
    extra_freight: (__extra_freight as unknown[]) ?? [],
    extra_local: (__extra_local as unknown[]) ?? [],
  }
}

interface ParsedCc {
  cc_charges: Record<string, unknown> | null
  extra_cc: unknown[]
}

export function parseCcBlob(raw: string | null): ParsedCc {
  if (!raw) return { cc_charges: null, extra_cc: [] }
  const p = JSON.parse(raw) as Record<string, unknown>
  const { __extra_cc = [], ...cc } = p
  return {
    cc_charges: Object.keys(cc).length ? cc : null,
    extra_cc: (__extra_cc as unknown[]) ?? [],
  }
}
