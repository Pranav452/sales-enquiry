import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export interface EnquiryQuotationRow {
  id: string
  quot_ref_no: string | null
  quot_date: string | null
  shipping_line: string | null
  vessel_name: string | null
  quoted_rate: number | null
  total_inr: number | null
  total_display: number | null
  display_currency: string | null
  sales_person: string | null
  status: string
  created_at: string | null
}

// ─── GET /api/enquiries/[id]/quotations ───────────────────────
// Full quotation history for one enquiry, newest first.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const enqId = parseInt(id, 10)
  if (isNaN(enqId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)

    const enqResult = await pool.request()
      .input("enq_id", sql.Int, enqId)
      .query(`
        SELECT CAST(PK_ID AS varchar(20)) AS id, ENQREFNO AS enq_ref_no
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
        WHERE PK_ID = @enq_id
      `)

    if (!enqResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Same join shape as /api/contacts/[id]: quotations reach the
    // enquiry through TBL_QUOTATIONS.ENQ_ID = TBL_ADMIN_SALESENQUIRY.PK_ID
    const quotResult = await pool.request()
      .input("enq_id", sql.Int, enqId)
      .query(`
        SELECT
          CAST(q.QUOT_ID AS varchar(20))          AS id,
          q.QUOT_REF_NO                           AS quot_ref_no,
          CONVERT(varchar(10), q.QUOT_DATE, 120)  AS quot_date,
          q.SHIPPING_LINE                         AS shipping_line,
          q.VESSEL_NAME                           AS vessel_name,
          q.QUOTED_RATE                           AS quoted_rate,
          q.TOTAL_INR                             AS total_inr,
          q.TOTAL_DISPLAY                         AS total_display,
          q.DISPLAY_CURRENCY                      AS display_currency,
          q.SALES_PERSON                          AS sales_person,
          ISNULL(q.STATUS, 'DRAFT')               AS status,
          CONVERT(varchar(19), q.CREATED_AT, 120) AS created_at
        FROM [dbo].[TBL_QUOTATIONS] q
        INNER JOIN [dbo].[TBL_ADMIN_SALESENQUIRY] e ON q.ENQ_ID = e.PK_ID
        WHERE e.PK_ID = @enq_id
        ORDER BY q.QUOT_ID DESC
      `)

    const quotations = quotResult.recordset as EnquiryQuotationRow[]

    return NextResponse.json({
      enq_id: enqResult.recordset[0].id as string,
      enq_ref_no: (enqResult.recordset[0].enq_ref_no as string | null) ?? null,
      quotation_status: quotations.length ? quotations[0].status : "NOT_PREPARED",
      quotations,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
