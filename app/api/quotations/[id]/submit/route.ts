import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── PATCH /api/quotations/[id]/submit ────────────────────────
// DRAFT → SUBMITTED. Mirrors the auth/ownership rules of the
// approve route.
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

    if (quot.STATUS === "SUBMITTED") {
      return NextResponse.json({ ok: true, status: "SUBMITTED", already_submitted: true })
    }

    if (quot.STATUS !== "DRAFT") {
      return NextResponse.json(
        { error: `Only a DRAFT quotation can be submitted (current status: ${quot.STATUS})` },
        { status: 409 }
      )
    }

    await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS]
        SET STATUS = 'SUBMITTED', UPDATED_AT = GETDATE()
        WHERE QUOT_ID = @quot_id
      `)

    return NextResponse.json({
      ok: true,
      status: "SUBMITTED",
      quot_ref_no: quot.QUOT_REF_NO,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
