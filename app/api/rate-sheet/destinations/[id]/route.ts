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
    .input("id",            sql.Int,           parseInt(id))
    .input("dest_name",     sql.NVarChar(100), body.dest_name?.trim() ?? null)
    .input("port_name",     sql.NVarChar(100), body.port_name?.trim() ?? null)
    .input("continent",     sql.NVarChar(50),  body.continent?.trim() ?? null)
    .input("requirements",  sql.NVarChar(sql.MAX), body.requirements?.trim() ?? null)
    .input("active",        sql.Bit,           body.active ?? 1)
    .query(`
      UPDATE [dbo].[TBL_RATE_SHEET_DESTINATIONS]
      SET
        DEST_NAME     = COALESCE(@dest_name, DEST_NAME),
        PORT_NAME     = COALESCE(@port_name, PORT_NAME),
        CONTINENT     = COALESCE(@continent, CONTINENT),
        REQUIREMENTS  = COALESCE(@requirements, REQUIREMENTS),
        ACTIVE        = @active
      WHERE DEST_ID = @id
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
    .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS] WHERE DEST_ID = @id`)
  return NextResponse.json({ ok: true })
}
