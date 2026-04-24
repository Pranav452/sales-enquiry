import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const pool = await getPool(auth.company)
  await pool.request()
    .input("id", numId)
    .query("DELETE FROM [dbo].[TBL_CONTACTS] WHERE ID = @id")

  return NextResponse.json({ ok: true })
}
