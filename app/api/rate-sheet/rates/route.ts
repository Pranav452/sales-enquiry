import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const destId = req.nextUrl.searchParams.get("dest_id")
  if (!destId) return NextResponse.json({ error: "dest_id required" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    const result = await pool.request()
      .input("dest_id", parseInt(destId))
      .query(`
        SELECT RATE_ID, DEST_ID, CARRIER, CONTAINER_TYPE, RATE_USD,
               FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_AT, UPDATED_BY
        FROM [dbo].[TBL_RATE_SHEET_RATES]
        WHERE DEST_ID = @dest_id
        ORDER BY CARRIER
      `)
    return NextResponse.json(result.recordset)
  } catch (e) {
    console.error("[rate-sheet/rates GET]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { dest_id, carrier, container_type, rate_usd, free_days, validity, is_suspended } = body
  if (!dest_id || !carrier) return NextResponse.json({ error: "dest_id and carrier required" }, { status: 400 })

  const pool = await getPool(auth.company)
  const result = await pool.request()
    .input("dest_id",        sql.Int,          dest_id)
    .input("carrier",        sql.NVarChar(50), carrier.trim())
    .input("container_type", sql.NVarChar(20), (container_type ?? "40HC").trim())
    .input("rate_usd",       sql.NVarChar(300), rate_usd?.trim() ?? null)
    .input("free_days",      sql.NVarChar(100), free_days?.trim() ?? null)
    .input("validity",       sql.NVarChar(200), validity?.trim() ?? null)
    .input("is_suspended",   sql.Bit,          is_suspended ? 1 : 0)
    .input("updated_by",     sql.NVarChar(200), auth.email)
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_RATES]
        (DEST_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_BY)
      OUTPUT INSERTED.RATE_ID
      VALUES (@dest_id, @carrier, @container_type, @rate_usd, @free_days, @validity, @is_suspended, @updated_by)
    `)
  return NextResponse.json({ rate_id: result.recordset[0].RATE_ID }, { status: 201 })
}
