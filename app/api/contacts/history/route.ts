import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

/**
 * GET /api/contacts/history?client=CLIENT_NAME
 * Returns the last 5 activities logged for a given client name.
 * Used by the Log Activity modal on the contacts page to show call history.
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const client = req.nextUrl.searchParams.get("client")
  if (!client?.trim()) return NextResponse.json([], { status: 200 })

  try {
    const pool = await getPool(auth.company)

    const result = await pool.request()
      .input("client", client.trim())
      .query(`
        SELECT TOP 5
          CAST(ID AS varchar(20))                       AS id,
          CONVERT(varchar(10), ACTIVITY_DATE, 120)      AS activity_date,
          ISNULL(ACTIVITY_TYPE, '')                     AS activity_type,
          ISNULL(SALES_PERSON,  '')                     AS sales_person,
          ISNULL(STATUS,        '')                     AS status,
          ISNULL(NOTES,         '')                     AS notes,
          ISNULL(POINTS, 0)                             AS points
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE LOWER(RTRIM(LTRIM(CLIENT_NAME))) = LOWER(RTRIM(LTRIM(@client)))
        ORDER BY ACTIVITY_DATE DESC, ID DESC
      `)

    return NextResponse.json(result.recordset)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts/history]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
