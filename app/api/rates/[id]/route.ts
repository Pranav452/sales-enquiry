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

// ─── GET /api/rates/[id] ──────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const pkId = parseInt(id, 10)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool("manilal")
    const result = await pool
      .request()
      .input("pk_id", sql.Int, pkId)
      .query(`SELECT ${SELECT_COLS} FROM [dbo].[FREIGHT_RATES] WHERE PK_ID = @pk_id`)

    if (!result.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json(result.recordset[0])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/rates/[id] ────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const pkId = parseInt(id, 10)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: Partial<RatePayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const pool = await getPool("manilal")
    const now = new Date()

    await pool
      .request()
      .input("pk_id",          sql.Int,            pkId)
      .input("shipping_line",  sql.VarChar(50),    body.shipping_line != null ? body.shipping_line.trim().toUpperCase() : undefined)
      .input("origin_country", sql.VarChar(100),   body.origin_country != null ? body.origin_country.trim().toUpperCase() : undefined)
      .input("dest_country",   sql.VarChar(100),   body.dest_country != null ? body.dest_country.trim().toUpperCase() : undefined)
      .input("origin_port",    sql.VarChar(100),   body.origin_port?.trim() ?? null)
      .input("dest_port",      sql.VarChar(100),   body.dest_port?.trim() ?? null)
      .input("currency",       sql.VarChar(5),     body.currency?.trim() ?? null)
      .input("rate_20",        sql.Decimal(10, 2), body.rate_20 ?? null)
      .input("rate_40",        sql.Decimal(10, 2), body.rate_40 ?? null)
      .input("valid_from",     sql.VarChar(10),    body.valid_from ?? null)
      .input("valid_to",       sql.VarChar(10),    body.valid_to ?? null)
      .input("transit_days",   sql.Int,            body.transit_days ?? null)
      .input("via_port",       sql.VarChar(200),   body.via_port?.trim() ?? null)
      .input("surcharges",     sql.VarChar(500),        body.surcharges?.trim() ?? null)
      .input("notes",          sql.VarChar(500),        body.notes?.trim() ?? null)
      .input("pdf_url",        sql.VarChar(500),        body.pdf_url?.trim() ?? null)
      .input("clauses",        sql.VarChar(sql.MAX),    body.clauses?.trim() ?? null)
      .input("is_active",      sql.Bit,                 body.is_active ?? null)
      .input("updated_at",     sql.DateTime,            now)
      .query(`
        UPDATE [dbo].[FREIGHT_RATES] SET
          SHIPPING_LINE  = COALESCE(@shipping_line,  SHIPPING_LINE),
          ORIGIN_COUNTRY = COALESCE(@origin_country, ORIGIN_COUNTRY),
          DEST_COUNTRY   = COALESCE(@dest_country,   DEST_COUNTRY),
          ORIGIN_PORT    = @origin_port,
          DEST_PORT      = @dest_port,
          CURRENCY       = COALESCE(@currency, CURRENCY),
          RATE_20        = @rate_20,
          RATE_40        = @rate_40,
          VALID_FROM     = @valid_from,
          VALID_TO       = @valid_to,
          TRANSIT_DAYS   = @transit_days,
          VIA_PORT       = @via_port,
          SURCHARGES     = @surcharges,
          NOTES          = @notes,
          PDF_URL        = @pdf_url,
          CLAUSES        = @clauses,
          IS_ACTIVE      = COALESCE(@is_active, IS_ACTIVE),
          UPDATED_AT     = @updated_at
        WHERE PK_ID = @pk_id
      `)

    return NextResponse.json({ id: String(pkId) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE /api/rates/[id] ───────────────────────────────────
// Soft delete: sets IS_ACTIVE = 0
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const pkId = parseInt(id, 10)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool("manilal")
    await pool
      .request()
      .input("pk_id",      sql.Int,      pkId)
      .input("updated_at", sql.DateTime, new Date())
      .query(`UPDATE [dbo].[FREIGHT_RATES] SET IS_ACTIVE = 0, UPDATED_AT = @updated_at WHERE PK_ID = @pk_id`)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
