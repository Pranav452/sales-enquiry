import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const pool = await getPool(auth.company)

  await pool.request()
    .input("id",             sql.Int,           parseInt(id))
    .input("rate_usd",       sql.NVarChar(300),  body.rate_usd?.trim() ?? null)
    .input("free_days",      sql.NVarChar(100),  body.free_days?.trim() ?? null)
    .input("validity",       sql.NVarChar(200),  body.validity?.trim() ?? null)
    .input("is_suspended",   sql.Bit,            body.is_suspended ? 1 : 0)
    .input("container_type", sql.NVarChar(20),   body.container_type?.trim() ?? null)
    .input("updated_by",     sql.NVarChar(200),  auth.email)
    .query(`
      UPDATE [dbo].[TBL_RATE_SHEET_RATES]
      SET
        RATE_USD       = COALESCE(@rate_usd, RATE_USD),
        FREE_DAYS      = COALESCE(@free_days, FREE_DAYS),
        VALIDITY       = COALESCE(@validity, VALIDITY),
        IS_SUSPENDED   = @is_suspended,
        CONTAINER_TYPE = COALESCE(@container_type, CONTAINER_TYPE),
        UPDATED_AT     = GETDATE(),
        UPDATED_BY     = @updated_by
      WHERE RATE_ID = @id
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
    .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_RATES] WHERE RATE_ID = @id`)
  return NextResponse.json({ ok: true })
}
