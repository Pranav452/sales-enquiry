"use client"

// Server data for the Sales Lead workspace (TanStack Query).
// Every key starts with LEADS_ENDPOINT, so invalidateLeads() refreshes list
// pages, the filter options and any single-lead fetch in one call.

import { useQuery, type QueryClient } from "@tanstack/react-query"
import type { PagedResponse } from "@/lib/hooks/usePagedList"
import type { SalesLead } from "@/components/sales-leads/SalesLeadList"

export const LEADS_ENDPOINT = "/api/sales-leads"
export const LEAD_PAGE_SIZE = 20

export interface LeadPage extends PagedResponse<SalesLead> {
  /** WON leads across the whole filtered result, not just this page. */
  won: number
}

export interface LeadListParams {
  q: string
  status: string
  person: string
  country: string
  [key: string]: string
}

export interface LeadOptions {
  persons: string[]
  countries: string[]
  /** Every lead the user can see, ignoring search and filters. */
  total: number
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`)
  return json as T
}

/** Same key + URL as usePagedList(LEADS_ENDPOINT, page, params, LEAD_PAGE_SIZE), so the cache is shared. */
export function leadPageKey(params: LeadListParams, page: number) {
  return [LEADS_ENDPOINT, { ...params, page, limit: LEAD_PAGE_SIZE }] as const
}

export function fetchLeadPage(qc: QueryClient, params: LeadListParams, page: number): Promise<LeadPage> {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...params, page, limit: LEAD_PAGE_SIZE })) {
    if (v !== "" && v !== undefined && v !== null) sp.set(k, String(v))
  }
  return qc.fetchQuery({
    queryKey: leadPageKey(params, page),
    queryFn: ({ signal }) => getJson<LeadPage>(`${LEADS_ENDPOINT}?${sp.toString()}`, signal),
    staleTime: 30_000,
  })
}

/** Distinct sales persons / countries for the filter menu (cached a few minutes). */
export function useLeadOptions() {
  return useQuery({
    queryKey: [LEADS_ENDPOINT, "options"],
    queryFn: ({ signal }) => getJson<LeadOptions>(`${LEADS_ENDPOINT}/options`, signal),
    staleTime: 5 * 60_000,
  })
}

/** One lead by id — for a selection that is not on the current page (deep link). */
export function useLead(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [LEADS_ENDPOINT, "lead", id],
    queryFn: ({ signal }) => getJson<SalesLead>(`${LEADS_ENDPOINT}/${encodeURIComponent(id ?? "")}`, signal),
    enabled: enabled && !!id,
    staleTime: 30_000,
    retry: false,
  })
}

export function invalidateLeads(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: [LEADS_ENDPOINT] })
}

/** Patch one lead wherever it is cached (list pages + single fetch) — optimistic updates. */
export function patchLeadInCache(qc: QueryClient, id: string, patch: Partial<SalesLead>) {
  qc.setQueriesData<unknown>({ queryKey: [LEADS_ENDPOINT] }, (old: unknown) => {
    if (!old || typeof old !== "object") return old
    const page = old as Partial<LeadPage>
    if (Array.isArray(page.data)) {
      return { ...page, data: page.data.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
    }
    if ((old as Partial<SalesLead>).id === id) return { ...(old as SalesLead), ...patch }
    return old
  })
}
