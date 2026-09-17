import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { insertEnquiry } from "@/lib/mssql/insert-enquiry"
import { enquiryDraftFromQuotation, type QuotationSource } from "@/lib/quotation-enquiry-map"

// ─── POST /api/quotations/[id]/create-enquiry ─────────────────
// Reverse link: raise an enquiry from a quotation that has none, then
// point the quotation at it. The quotation keeps its existing ref no —
// renumbering a already-issued quotation would break what the customer
// has in hand. Auth/ownership rules mirror the submit route.
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
      .query<QuotationSource & { QUOT_ID: number; ENQ_ID: number | null; CREATED_BY: string | null }>(`
        SELECT
          QUOT_ID, QUOT_REF_NO, QUOT_DATE, MODE, EXIM, FN, ENQ_TYPE, INCOTERMS,
          POL, POD, CONTAINER_TYPE, SHIPPER, SALES_PERSON, BRANCH,
          ENQ_ID, CREATED_BY
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

    if (quot.ENQ_ID) {
      return NextResponse.json(
        { error: "This quotation is already linked to an enquiry" },
        { status: 409 }
      )
    }

    const draft = enquiryDraftFromQuotation(quot)
    const created = await insertEnquiry(auth.company, draft, auth.userId)

    // Guarded update — if another request linked the quotation in the
    // meantime, don't clobber that link.
    const link = await pool.request()
      .input("quot_id", sql.Int, quotId)
      .input("enq_id", sql.Int, parseInt(created.id, 10))
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS]
        SET ENQ_ID = @enq_id, UPDATED_AT = GETDATE()
        WHERE QUOT_ID = @quot_id AND ENQ_ID IS NULL
      `)

    if (!link.rowsAffected[0]) {
      return NextResponse.json(
        { error: "This quotation is already linked to an enquiry" },
        { status: 409 }
      )
    }

    return NextResponse.json({
      ok: true,
      enq_id: created.id,
      enq_ref_no: created.enq_ref_no,
      quot_ref_no: quot.QUOT_REF_NO ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
