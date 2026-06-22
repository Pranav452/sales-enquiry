import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const pool = await getPool(auth.company)
  await pool.request()
    .input("id", sql.Int, parseInt(id))
    .query(`UPDATE [dbo].[TBL_RATE_SHEET_TOKENS] SET ACTIVE = 0 WHERE TOKEN_ID = @id`)
  return NextResponse.json({ ok: true })
}
