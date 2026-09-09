import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── PATCH /api/quotations/[id]/close ─────────────────────────
// Any state → CLOSED_NOT_QUOTED. Mirrors the auth/ownership rules
// of the approve route.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const quotId = parseInt(id, 10)
  if (isNaN(quotId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)

    const quotResult = await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query(`
        SELECT QUOT_ID, QUOT_REF_NO, ISNULL(STATUS, 'DRAFT') AS STATUS, CREATED_BY
        FROM [dbo].[TBL_QUOTATIONS]
        WHERE QUOT_ID = @quot_id
      `)

    if (!quotResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const quot = quotResult.recordset[0]

    if (auth.role !== "admin" && quot.CREATED_BY !== (auth.salesperson ?? auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (quot.STATUS === "CLOSED_NOT_QUOTED") {
      return NextResponse.json({ ok: true, status: "CLOSED_NOT_QUOTED", already_closed: true })
    }

    await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS]
        SET STATUS = 'CLOSED_NOT_QUOTED', UPDATED_AT = GETDATE()
        WHERE QUOT_ID = @quot_id
      `)

    return NextResponse.json({
      ok: true,
      status: "CLOSED_NOT_QUOTED",
      quot_ref_no: quot.QUOT_REF_NO,
      previous_status: quot.STATUS,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
