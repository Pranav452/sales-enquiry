import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { pagedQuery, readPaging } from "@/lib/mssql/paginate"

// ─── GET /api/audit ───────────────────────────────────────────
// Returns all enquiries that have audit log entries, with latest change info
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const pool = await getPool(auth.company)
    const sp = req.nextUrl.searchParams
    const { page, limit } = readPaging(sp)

    // One row per enquiry — latest change info + total change count.
    // The GROUP BY is a derived table so pagedQuery can number it.
    const { rows, total } = await pagedQuery(pool.request(), {
      select: `
        g.enquiry_id, g.enq_ref_no, g.shipper, g.status, g.change_count,
        CONVERT(varchar(19), g.last_raw, 120) AS last_changed_at,
        (SELECT TOP 1 CHANGED_BY FROM [dbo].[ENQUIRY_AUDIT_LOG]
         WHERE ENQUIRY_ID = g.enquiry_id
         ORDER BY CHANGED_AT DESC) AS last_changed_by`,
      from: `(
        SELECT
          e.PK_ID AS enquiry_id,
          e.ENQREFNO AS enq_ref_no,
          e.SHIPPER AS shipper,
          e.STATUS AS status,
          COUNT(a.PK_ID) AS change_count,
          MAX(a.CHANGED_AT) AS last_raw
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
        INNER JOIN [dbo].[ENQUIRY_AUDIT_LOG] a ON a.ENQUIRY_ID = e.PK_ID
        GROUP BY e.PK_ID, e.ENQREFNO, e.SHIPPER, e.STATUS
      ) g`,
      orderBy: "g.last_raw DESC, g.enquiry_id DESC",
      page,
      limit,
    })

    return NextResponse.json({ data: rows, total, page, limit })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
