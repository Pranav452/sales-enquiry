import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const destId = req.nextUrl.searchParams.get("dest_id")
  if (!destId) return NextResponse.json({ error: "dest_id required" }, { status: 400 })

  const pool = await getPool(auth.company)
  const result = await pool.request()
    .input("dest_id", sql.Int, parseInt(destId))
    .query(`
      SELECT SCHED_ID, DEST_ID, CARRIER, VESSEL_NAME, VOYAGE_NO,
             ETD, ETA, TRANSIT_DAYS, VIA_PORT, GATE_IN, SORT_ORDER, CREATED_AT
      FROM [dbo].[TBL_RATE_SHEET_SCHEDULES]
      WHERE DEST_ID = @dest_id
      ORDER BY CARRIER, SORT_ORDER, CREATED_AT
    `)
  return NextResponse.json(result.recordset)
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { dest_id, carrier, vessel_name, voyage_no, etd, eta, transit_days, via_port, gate_in, sort_order } = body
  if (!dest_id || !carrier) return NextResponse.json({ error: "dest_id and carrier required" }, { status: 400 })

  const pool = await getPool(auth.company)
  const result = await pool.request()
    .input("dest_id",      sql.Int,          dest_id)
    .input("carrier",      sql.NVarChar(50), carrier.trim())
    .input("vessel_name",  sql.NVarChar(200), vessel_name?.trim() ?? null)
    .input("voyage_no",    sql.NVarChar(50),  voyage_no?.trim() ?? null)
    .input("etd",          sql.NVarChar(30),  etd?.trim() ?? null)
    .input("eta",          sql.NVarChar(30),  eta?.trim() ?? null)
    .input("transit_days", sql.NVarChar(30),  transit_days?.trim() ?? null)
    .input("via_port",     sql.NVarChar(100), via_port?.trim() ?? null)
    .input("gate_in",      sql.NVarChar(30),  gate_in?.trim() ?? null)
    .input("sort_order",   sql.Int,           sort_order ?? 0)
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_SCHEDULES]
        (DEST_ID, CARRIER, VESSEL_NAME, VOYAGE_NO, ETD, ETA, TRANSIT_DAYS, VIA_PORT, GATE_IN, SORT_ORDER)
      OUTPUT INSERTED.SCHED_ID
      VALUES (@dest_id, @carrier, @vessel_name, @voyage_no, @etd, @eta, @transit_days, @via_port, @gate_in, @sort_order)
    `)
  return NextResponse.json({ sched_id: result.recordset[0].SCHED_ID }, { status: 201 })
}
