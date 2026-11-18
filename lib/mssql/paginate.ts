import type { Request } from "mssql"

/**
 * Server-side paging for MSSQL 2008 R2 (no OFFSET/FETCH).
 *
 * One round trip: rows are numbered with ROW_NUMBER() and the total comes from
 * COUNT(*) OVER() on the same pass, so a page costs a single query.
 *
 *   const { page, limit } = readPaging(req.nextUrl.searchParams)
 *   const { rows, total } = await pagedQuery(request, {
 *     select: "ID AS id, NAME AS name",           // column list (no trailing comma)
 *     from:   "[dbo].[TBL_X] x",                   // FROM + JOINs
 *     where:  "x.STATUS = @status",                // optional, without WHERE
 *     orderBy:"x.ID DESC",                         // required, deterministic
 *     page, limit,
 *   })
 *   return NextResponse.json({ data: rows, total, page, limit })
 */

export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export interface Paging {
  page: number
  limit: number
}

export function readPaging(params: URLSearchParams, defaultLimit = DEFAULT_PAGE_SIZE): Paging {
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1))
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(params.get("limit")) || defaultLimit)))
  return { page, limit }
}

/** Trimmed search string or null. Bind it with request.input("q", q) and use `LIKE '%' + @q + '%'`. */
export function readSearch(params: URLSearchParams, key = "q", max = 100): string | null {
  const v = (params.get(key) ?? "").trim()
  return v ? v.slice(0, max) : null
}

export interface PagedOptions extends Paging {
  select: string
  from: string
  where?: string
  orderBy: string
}

export interface PagedResult<T> {
  rows: T[]
  total: number
}

export async function pagedQuery<T = Record<string, unknown>>(request: Request, o: PagedOptions): Promise<PagedResult<T>> {
  // page/limit are validated integers (readPaging) — safe to inline.
  const from = (o.page - 1) * o.limit + 1
  const to = o.page * o.limit
  const result = await request.query(`
    SELECT * FROM (
      SELECT ROW_NUMBER() OVER (ORDER BY ${o.orderBy}) AS __rn,
             COUNT(*) OVER () AS __total,
             ${o.select}
      FROM ${o.from}
      ${o.where ? `WHERE ${o.where}` : ""}
    ) AS __paged
    WHERE __rn BETWEEN ${from} AND ${to}
    ORDER BY __rn
  `)
  const set = result.recordset as (T & { __rn?: number; __total?: number })[]
  const total = set.length ? Number(set[0].__total) : 0
  const rows = set.map((r) => {
    const { __rn, __total, ...rest } = r as Record<string, unknown>
    void __rn; void __total
    return rest as T
  })
  // Asked for a page past the end (e.g. after a delete): still report the real total.
  if (!set.length && o.page > 1) {
    const c = await request.query(`SELECT COUNT(*) AS n FROM ${o.from} ${o.where ? `WHERE ${o.where}` : ""}`)
    return { rows, total: Number(c.recordset[0]?.n ?? 0) }
  }
  return { rows, total }
}
