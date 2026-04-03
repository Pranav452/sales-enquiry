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
// ?origin_country=INDIA&dest_country=BRAZIL  → search by route
// ?admin=true                                → all active rates (admin only)
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const origin = req.nextUrl.searchParams.get("origin_country")?.toUpperCase() ?? ""
  const dest   = req.nextUrl.searchParams.get("dest_country")?.toUpperCase() ?? ""
  const admin  = req.nextUrl.searchParams.get("admin") === "true"

  if (admin && auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const pool = await getPool("manilal")
    const request = pool.request()

    let where: string
    if (admin) {
      where = "WHERE IS_ACTIVE = 1"
    } else {
      if (!origin || !dest) {
        return NextResponse.json([], { status: 200 })
      }
      request.input("origin", sql.VarChar(100), origin)
      request.input("dest",   sql.VarChar(100), dest)
      where = "WHERE ORIGIN_COUNTRY = @origin AND DEST_COUNTRY = @dest AND IS_ACTIVE = 1"
    }

    const result = await request.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[FREIGHT_RATES]
      ${where}
      ORDER BY VALID_TO DESC, SHIPPING_LINE ASC
    `)

    return NextResponse.json(result.recordset)
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
      .input("shipping_line",   sql.VarChar(50),    body.shipping_line.trim().toUpperCase())
      .input("origin_country",  sql.VarChar(100),   body.origin_country.trim().toUpperCase())
      .input("dest_country",    sql.VarChar(100),   body.dest_country.trim().toUpperCase())
      .input("origin_port",     sql.VarChar(100),   body.origin_port?.trim() ?? null)
      .input("dest_port",       sql.VarChar(100),   body.dest_port?.trim() ?? null)
      .input("currency",        sql.VarChar(5),     body.currency?.trim() ?? "USD")
      .input("rate_20",         sql.Decimal(10, 2), body.rate_20 ?? null)
      .input("rate_40",         sql.Decimal(10, 2), body.rate_40 ?? null)
      .input("valid_from",      sql.VarChar(10),    body.valid_from ?? null)
      .input("valid_to",        sql.VarChar(10),    body.valid_to ?? null)
      .input("transit_days",    sql.Int,            body.transit_days ?? null)
      .input("via_port",        sql.VarChar(200),   body.via_port?.trim() ?? null)
      .input("surcharges",      sql.VarChar(500),   body.surcharges?.trim() ?? null)
      .input("notes",           sql.VarChar(500),   body.notes?.trim() ?? null)
      .input("pdf_url",         sql.VarChar(500),   body.pdf_url?.trim() ?? null)
      .input("clauses",         sql.VarChar(sql.MAX), body.clauses?.trim() ?? null)
      .input("created_by",      sql.VarChar(100),   auth.userId)
      .input("created_at",      sql.DateTime,       now)
      .input("updated_at",      sql.DateTime,       now)
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
