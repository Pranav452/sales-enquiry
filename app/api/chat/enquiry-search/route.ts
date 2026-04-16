import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── GET /api/chat/enquiry-search?q= ─────────────────────────────────────────
// Searches MSSQL TBL_ADMIN_SALESENQUIRY by ENQREFNO (contains match).
// Returns top 10 matches: [{ id: number, ref_no: string }]
// Column names verified against /api/enquiries SELECT_COLS:
//   PK_ID       = primary key integer
//   ENQREFNO    = enquiry reference number
//   SALESPERSON = sales person name
export async function GET(req: Request) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()

  if (q.length < 2) return NextResponse.json([])

  try {
    const pool   = await getPool(auth.company)
    const mssql  = pool.request()

    // Contains match — so typing "BOM" matches "MP/BOM/2604/001" etc.
    mssql.input("q", sql.NVarChar(50), q)
    let whereClause = "ENQREFNO LIKE N'%' + @q + N'%'"

    // Non-admin users only see their own enquiries
    if (auth.role !== "admin" && auth.salesperson) {
      mssql.input("sp", sql.NVarChar(100), auth.salesperson)
      whereClause += " AND SALESPERSON = @sp"
    }

    const result = await mssql.query(`
      SELECT TOP 10
        PK_ID    AS id,
        ENQREFNO AS ref_no
      FROM dbo.TBL_ADMIN_SALESENQUIRY
      WHERE ${whereClause}
      ORDER BY PK_ID DESC
    `)

    return NextResponse.json(result.recordset ?? [])
  } catch (err) {
    console.error("[enquiry-search]", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
