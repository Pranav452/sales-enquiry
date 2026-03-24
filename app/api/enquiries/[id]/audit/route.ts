import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── GET /api/enquiries/[id]/audit ────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only admins can view audit logs
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const pkId = parseInt(id)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    const result = await pool
      .request()
      .input("enquiry_id", sql.Int, pkId)
      .query(`
        SELECT
          PK_ID                                    AS id,
          ENQUIRY_ID                               AS enquiry_id,
          FIELD_NAME                               AS field_name,
          OLD_VALUE                                AS old_value,
          NEW_VALUE                                AS new_value,
          CHANGED_BY                               AS changed_by,
          CONVERT(varchar(19), CHANGED_AT, 120)   AS changed_at
        FROM [dbo].[ENQUIRY_AUDIT_LOG]
        WHERE ENQUIRY_ID = @enquiry_id
        ORDER BY CHANGED_AT DESC
      `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
