import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import type { RatePayload } from "@/lib/types/rates"

const SELECT_COLS = `
  CAST(PK_ID AS varchar(20)) AS id,
  SHIPPING_LINE               AS shipping_line,
  ORIGIN_COUNTRY              AS origin_country,
  DEST_COUNTRY                AS dest_country,
  ORIGIN_PORT                 AS origin_port,
  DEST_PORT                   AS dest_port,
  CURRENCY                    AS currency,
  RATE_20                     AS rate_20,
  RATE_40                     AS rate_40,
  VALID_FROM                  AS valid_from,
  VALID_TO                    AS valid_to,
  TRANSIT_DAYS                AS transit_days,
  VIA_PORT                    AS via_port,
  SURCHARGES                  AS surcharges,
  NOTES                       AS notes,
  PDF_URL                     AS pdf_url,
  CLAUSES                     AS clauses,
  IS_ACTIVE                   AS is_active,
  CREATED_BY                  AS created_by,
  CONVERT(varchar(20), CREATED_AT, 120) AS created_at,
  CONVERT(varchar(20), UPDATED_AT, 120) AS updated_at
`

// ─── GET /api/rates ───────────────────────────────────────────
// ?origin_country=INDIA&dest_country=BRAZIL  → search by route (plain array)
// ?admin=true&page=1&limit=20&origin_port=X&dest_port=Y&shipping_line=Z
//                                            → paginated admin list { data, total }
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const p      = req.nextUrl.searchParams
  const origin = p.get("origin_country")?.toUpperCase() ?? ""
  const dest   = p.get("dest_country")?.toUpperCase() ?? ""
  const admin  = p.get("admin") === "true"

  // Optional port/line filters (used in both admin and route-search modes)
  const originPort   = p.get("origin_port")?.trim() ?? ""
  const destPort     = p.get("dest_port")?.trim() ?? ""
  const shippingLine = p.get("shipping_line")?.trim() ?? ""

  if (admin && auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const pool    = await getPool("manilal")

    // ── Hard-delete expired rates (fire-and-forget) ───────────
    // Rates where VALID_TO is set and is before today are deleted from the DB entirely.
    // Wrapped in try/catch so a cleanup failure never blocks the main query.
    try {
      await pool.request().query(`
        DELETE FROM [dbo].[FREIGHT_RATES]
        WHERE VALID_TO IS NOT NULL
          AND VALID_TO < CONVERT(date, GETDATE())
      `)
    } catch { /* non-critical — proceed with read */ }

    const request = pool.request()

    if (admin) {
      // ── Paginated admin list ──────────────────────────────
      const page   = Math.max(1, parseInt(p.get("page") ?? "1") || 1)
      const limit  = Math.min(100, Math.max(1, parseInt(p.get("limit") ?? "20") || 20))
      const offset = (page - 1) * limit  // safe integer, used in SQL directly

      // Build optional LIKE clauses — only add inputs that are actually used
      const likeClauses: string[] = []
      if (shippingLine) {
        request.input("sl", shippingLine)
        likeClauses.push("SHIPPING_LINE LIKE '%' + @sl + '%'")
      }
      if (originPort) {
        request.input("op", originPort)
        likeClauses.push("ORIGIN_PORT LIKE '%' + @op + '%'")
      }
      if (destPort) {
        request.input("dp", destPort)
        likeClauses.push("DEST_PORT LIKE '%' + @dp + '%'")
      }

      const extraWhere = likeClauses.length ? " AND " + likeClauses.join(" AND ") : ""
      const baseWhere  = `WHERE IS_ACTIVE = 1
        AND (VALID_TO IS NULL OR VALID_TO >= CONVERT(date, GETDATE()))${extraWhere}`

      // MSSQL 2008 R2: ROW_NUMBER() pattern (no OFFSET/FETCH support)
      // offset and limit are validated integers — safe to inline
      const from = offset + 1
      const to   = offset + limit

      const countResult = await request.query(`
        SELECT COUNT(*) AS total
        FROM [dbo].[FREIGHT_RATES]
        ${baseWhere}
      `)
      const total = (countResult.recordset[0]?.total as number) ?? 0

      const dataRequest = pool.request()
      if (shippingLine) dataRequest.input("sl", shippingLine)
      if (originPort)   dataRequest.input("op", originPort)
      if (destPort)     dataRequest.input("dp", destPort)

      const dataResult = await dataRequest.query(`
        SELECT * FROM (
          SELECT ROW_NUMBER() OVER (ORDER BY VALID_TO DESC, SHIPPING_LINE ASC) AS rn,
          ${SELECT_COLS}
          FROM [dbo].[FREIGHT_RATES]
          ${baseWhere}
        ) AS paged
        WHERE rn BETWEEN ${from} AND ${to}
      `)

      return NextResponse.json({
        data:  dataResult.recordset,
        total,
      })
    } else {
      // ── Route search (non-admin) — returns plain array ────
      if (!origin || !dest) return NextResponse.json([], { status: 200 })

      request.input("origin", origin)
      request.input("dest",   dest)

      const likeClauses: string[] = []
      if (originPort) {
        request.input("op", originPort)
        likeClauses.push("ORIGIN_PORT LIKE '%' + @op + '%'")
      }
      if (destPort) {
        request.input("dp", destPort)
        likeClauses.push("DEST_PORT LIKE '%' + @dp + '%'")
      }
      const extraWhere = likeClauses.length ? " AND " + likeClauses.join(" AND ") : ""

      const result = await request.query(`
        SELECT ${SELECT_COLS}
        FROM [dbo].[FREIGHT_RATES]
        WHERE ORIGIN_COUNTRY = @origin AND DEST_COUNTRY = @dest AND IS_ACTIVE = 1
          AND (VALID_TO IS NULL OR VALID_TO >= CONVERT(date, GETDATE()))
        ${extraWhere}
        ORDER BY VALID_TO DESC, SHIPPING_LINE ASC
      `)
      return NextResponse.json(result.recordset)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/rates ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: RatePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.shipping_line?.trim() || !body.origin_country?.trim() || !body.dest_country?.trim()) {
    return NextResponse.json({ error: "shipping_line, origin_country, dest_country are required" }, { status: 400 })
  }

  try {
    const pool = await getPool("manilal")
    const now = new Date()

    const result = await pool
      .request()
      .input("shipping_line",   body.shipping_line.trim().toUpperCase())
      .input("origin_country",  body.origin_country.trim().toUpperCase())
      .input("dest_country",    body.dest_country.trim().toUpperCase())
      .input("origin_port",     body.origin_port?.trim() ?? null)
      .input("dest_port",       body.dest_port?.trim() ?? null)
      .input("currency",        body.currency?.trim() ?? "USD")
      .input("rate_20",         body.rate_20 ?? null)
      .input("rate_40",         body.rate_40 ?? null)
      .input("valid_from",      body.valid_from ?? null)
      .input("valid_to",        body.valid_to ?? null)
      .input("transit_days",    body.transit_days ?? null)
      .input("via_port",        body.via_port?.trim() ?? null)
      .input("surcharges",      body.surcharges?.trim() ?? null)
      .input("notes",           body.notes?.trim() ?? null)
      .input("pdf_url",         body.pdf_url?.trim() ?? null)
      .input("clauses",         body.clauses?.trim() ?? null)
      .input("created_by",      auth.userId)
      .input("created_at",      now)
      .input("updated_at",      now)
      .query<{ PK_ID: number }>(`
        INSERT INTO [dbo].[FREIGHT_RATES] (
          SHIPPING_LINE, ORIGIN_COUNTRY, DEST_COUNTRY,
          ORIGIN_PORT, DEST_PORT, CURRENCY,
          RATE_20, RATE_40, VALID_FROM, VALID_TO,
          TRANSIT_DAYS, VIA_PORT, SURCHARGES, NOTES,
          PDF_URL, CLAUSES,
          CREATED_BY, CREATED_AT, UPDATED_AT
        )
        OUTPUT inserted.PK_ID
        VALUES (
          @shipping_line, @origin_country, @dest_country,
          @origin_port, @dest_port, @currency,
          @rate_20, @rate_40, @valid_from, @valid_to,
          @transit_days, @via_port, @surcharges, @notes,
          @pdf_url, @clauses,
          @created_by, @created_at, @updated_at
        )
      `)

    return NextResponse.json({ id: String(result.recordset[0].PK_ID) }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
