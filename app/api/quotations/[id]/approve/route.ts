import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

// ─── POST /api/quotations/[id]/approve ────────────────────────
// Marks the quotation APPROVED and promotes the linked contact
// (via ENQ_ID → TBL_ADMIN_SALESENQUIRY.CONTACT_ID) to STAGE = 'CLIENT'.
export async function POST(
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
        SELECT QUOT_ID, QUOT_REF_NO, ISNULL(STATUS, 'DRAFT') AS STATUS, ENQ_ID, CREATED_BY
        FROM [dbo].[TBL_QUOTATIONS]
        WHERE QUOT_ID = @quot_id
      `)

    if (!quotResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const quot = quotResult.recordset[0]

    // Same ownership rule as the quotation list: non-admins only their own
    if (auth.role !== "admin" && quot.CREATED_BY !== (auth.salesperson ?? auth.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (quot.STATUS === "APPROVED") {
      return NextResponse.json({ ok: true, status: "APPROVED", already_approved: true })
    }

    await pool.request()
      .input("quot_id", sql.Int, quotId)
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS]
        SET STATUS = 'APPROVED', UPDATED_AT = GETDATE()
        WHERE QUOT_ID = @quot_id
      `)

    // Promote the linked contact to CLIENT
    let contactPromoted = false
    if (quot.ENQ_ID) {
      const enqResult = await pool.request()
        .input("enq_id", sql.Int, quot.ENQ_ID)
        .query(`
          SELECT CONTACT_ID FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
          WHERE PK_ID = @enq_id
        `)
      const contactId = enqResult.recordset[0]?.CONTACT_ID
      if (contactId) {
        await pool.request()
          .input("contact_id", sql.Int, contactId)
          .query(`
            UPDATE [dbo].[TBL_CONTACTS]
            SET STAGE = 'CLIENT', UPDATED_AT = GETUTCDATE()
            WHERE ID = @contact_id
          `)
        contactPromoted = true
      }
    }

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
      quot_ref_no: quot.QUOT_REF_NO,
      contact_promoted: contactPromoted,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
