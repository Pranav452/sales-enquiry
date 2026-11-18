import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

// ─── GET /api/sales-leads/options ─────────────────────────────
// Filter dropdown values + unfiltered lead count for the Sales Leads list,
// scoped by the same role rule as GET /api/sales-leads. One round trip.
export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req  = pool.request()

    let scope = "1 = 1"
    if (auth.role !== "admin") {
      req.input("created_by", auth.userId)
      req.input("sp", (auth.salesperson ?? "").toUpperCase())
      scope = "(CREATED_BY = @created_by OR UPPER(SENT_BY) = @sp)"
    }

    const result = await req.query(`
      SELECT DISTINCT SENT_BY AS v FROM [dbo].[TBL_SALES_LEADS]
      WHERE ${scope} AND SENT_BY IS NOT NULL AND SENT_BY <> '' ORDER BY SENT_BY;

      SELECT DISTINCT DEST_COUNTRY AS v FROM [dbo].[TBL_SALES_LEADS]
      WHERE ${scope} AND DEST_COUNTRY IS NOT NULL AND DEST_COUNTRY <> '' ORDER BY DEST_COUNTRY;

      SELECT COUNT(*) AS n FROM [dbo].[TBL_SALES_LEADS] WHERE ${scope};
    `)

    const sets = result.recordsets as unknown as { v?: string; n?: number }[][]
    return NextResponse.json({
      persons:   sets[0].map((r) => r.v as string),
      countries: sets[1].map((r) => r.v as string),
      total:     Number(sets[2][0]?.n ?? 0),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
