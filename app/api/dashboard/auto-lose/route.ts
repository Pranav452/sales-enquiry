import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function POST() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const pool = await getPool(auth.company)
    const result = await pool.request()
      .input("days", sql.Int, 30)
      .query(`
        UPDATE [dbo].[TBL_ADMIN_SALESENQUIRY]
        SET STATUS = 'LOSE', UPDATED_AT = GETDATE()
        WHERE ASSIGNED_USER IS NOT NULL
          AND ASSIGNED_DATE IS NOT NULL
          AND DATEDIFF(day, ASSIGNED_DATE, GETDATE()) >= @days
          AND STATUS NOT IN ('WIN', 'LOSE')
      `)
    return NextResponse.json({ count: result.rowsAffected[0] ?? 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
