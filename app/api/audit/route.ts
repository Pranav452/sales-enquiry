import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── GET /api/audit ───────────────────────────────────────────
// Returns all enquiries that have audit log entries, with latest change info
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const pool = await getPool(auth.company)

    // One row per enquiry — latest change info + total change count
    const result = await pool.request().query(`
      SELECT
        e.PK_ID                                           AS enquiry_id,
        e.ENQREFNO                                        AS enq_ref_no,
        e.SHIPPER                                         AS shipper,
        e.STATUS                                          AS status,
        COUNT(a.PK_ID)                                    AS change_count,
        MAX(CONVERT(varchar(19), a.CHANGED_AT, 120))      AS last_changed_at,
        (SELECT TOP 1 CHANGED_BY FROM [dbo].[ENQUIRY_AUDIT_LOG]
         WHERE ENQUIRY_ID = e.PK_ID
         ORDER BY CHANGED_AT DESC)                         AS last_changed_by
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
      INNER JOIN [dbo].[ENQUIRY_AUDIT_LOG] a ON a.ENQUIRY_ID = e.PK_ID
      GROUP BY e.PK_ID, e.ENQREFNO, e.SHIPPER, e.STATUS
      ORDER BY MAX(a.CHANGED_AT) DESC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
