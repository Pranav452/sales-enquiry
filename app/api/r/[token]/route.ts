import { NextRequest, NextResponse } from "next/server"
import { getPool, sql } from "@/lib/mssql/client"

// Public — no auth. Company is inferred from token prefix (mp_ / lk_).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const company = token.startsWith("lk_") ? "links" : "manilal"

  let pool
  try {
    pool = await getPool(company)
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
  }

  // Validate token
  const tokenResult = await pool.request()
    .input("token", sql.NVarChar(100), token)
    .query(`
      SELECT TOKEN_ID, COMPANY, DEST_ID, CLIENT_NAME, CLIENT_EMAIL, ACTIVE
      FROM [dbo].[TBL_RATE_SHEET_TOKENS]
      WHERE TOKEN = @token
    `)

  const tokenRow = tokenResult.recordset[0]
  if (!tokenRow || !tokenRow.ACTIVE) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 })
  }

  const destId = tokenRow.DEST_ID

  // Update last viewed
  await pool.request()
    .input("token", sql.NVarChar(100), token)
    .query(`UPDATE [dbo].[TBL_RATE_SHEET_TOKENS] SET LAST_VIEWED = GETDATE() WHERE TOKEN = @token`)

  // Fetch destination
  const destResult = await pool.request()
    .input("dest_id", sql.Int, destId)
    .query(`
      SELECT DEST_ID, DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS
      FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS]
      WHERE DEST_ID = @dest_id AND ACTIVE = 1
    `)

  if (!destResult.recordset[0]) {
    return NextResponse.json({ error: "Destination not found" }, { status: 404 })
  }

  // Fetch rates
  const ratesResult = await pool.request()
    .input("dest_id", sql.Int, destId)
    .query(`
      SELECT RATE_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_AT
      FROM [dbo].[TBL_RATE_SHEET_RATES]
      WHERE DEST_ID = @dest_id
      ORDER BY CARRIER
    `)

  // Fetch schedules
  const schedResult = await pool.request()
    .input("dest_id", sql.Int, destId)
    .query(`
      SELECT SCHED_ID, CARRIER, VESSEL_NAME, VOYAGE_NO, ETD, ETA, TRANSIT_DAYS, VIA_PORT, GATE_IN
      FROM [dbo].[TBL_RATE_SHEET_SCHEDULES]
      WHERE DEST_ID = @dest_id
      ORDER BY CARRIER, SORT_ORDER, CREATED_AT
    `)

  return NextResponse.json({
    company,
    client_name: tokenRow.CLIENT_NAME,
    destination: destResult.recordset[0],
    rates: ratesResult.recordset,
    schedules: schedResult.recordset,
  })
}
