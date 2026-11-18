"use client"

import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"

export interface PagedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

type Params = Record<string, string | number | boolean | null | undefined>

function buildUrl(endpoint: string, params: Params): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue
    sp.set(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `${endpoint}?${qs}` : endpoint
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`)
  return json as T
}

/** Debounce a value (search boxes): only fire a request once typing pauses. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/**
 * Server-paginated list with TanStack Query:
 *  - fetches only `limit` rows for the current page (`{ data, total, page, limit }`)
 *  - keeps the previous page on screen while the next one loads (no flash)
 *  - caches pages, so going back / revisiting a page is instant
 *  - prefetches the next page in the background
 *
 * Pass search/filter values in `params`; debounce free-text with useDebounced.
 * Reset `page` to 1 yourself when filters change.
 */
export function usePagedList<T>(endpoint: string, page: number, params: Params = {}, limit = 20) {
  const queryClient = useQueryClient()
  const key = useMemo(() => [endpoint, { ...params, page, limit }] as const, [endpoint, params, page, limit])
  const url = buildUrl(endpoint, { ...params, page, limit })

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchJson<PagedResponse<T>>(url, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    if (!query.data || page >= totalPages) return
    const next = buildUrl(endpoint, { ...params, page: page + 1, limit })
    void queryClient.prefetchQuery({
      queryKey: [endpoint, { ...params, page: page + 1, limit }],
      queryFn: ({ signal }) => fetchJson<PagedResponse<T>>(next, signal),
      staleTime: 30_000,
    })
  }, [query.data, page, totalPages, endpoint, params, limit, queryClient])

  return {
    rows: query.data?.data ?? [],
    total,
    totalPages,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
    /** Invalidate every page of this endpoint (call after create/update/delete). */
    invalidate: () => queryClient.invalidateQueries({ queryKey: [endpoint] }),
  }
}
