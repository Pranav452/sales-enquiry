import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const b = await req.json()
  const pool = await getPool(auth.company)

  await pool.request()
    .input("id",           sql.Int,           parseInt(id))
    .input("vessel_name",  sql.NVarChar(200),  b.vessel_name?.trim() ?? null)
    .input("voyage_no",    sql.NVarChar(50),   b.voyage_no?.trim() ?? null)
    .input("etd",          sql.NVarChar(30),   b.etd?.trim() ?? null)
    .input("eta",          sql.NVarChar(30),   b.eta?.trim() ?? null)
    .input("transit_days", sql.NVarChar(30),   b.transit_days?.trim() ?? null)
    .input("via_port",     sql.NVarChar(100),  b.via_port?.trim() ?? null)
    .input("gate_in",      sql.NVarChar(30),   b.gate_in?.trim() ?? null)
    .input("sort_order",   sql.Int,            b.sort_order ?? 0)
    .query(`
      UPDATE [dbo].[TBL_RATE_SHEET_SCHEDULES]
      SET
        VESSEL_NAME  = COALESCE(@vessel_name, VESSEL_NAME),
        VOYAGE_NO    = COALESCE(@voyage_no, VOYAGE_NO),
        ETD          = COALESCE(@etd, ETD),
        ETA          = COALESCE(@eta, ETA),
        TRANSIT_DAYS = COALESCE(@transit_days, TRANSIT_DAYS),
        VIA_PORT     = COALESCE(@via_port, VIA_PORT),
        GATE_IN      = COALESCE(@gate_in, GATE_IN),
        SORT_ORDER   = @sort_order
      WHERE SCHED_ID = @id
    `)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const pool = await getPool(auth.company)
  await pool.request()
    .input("id", sql.Int, parseInt(id))
    .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_SCHEDULES] WHERE SCHED_ID = @id`)
  return NextResponse.json({ ok: true })
}
