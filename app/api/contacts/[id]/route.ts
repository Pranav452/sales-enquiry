import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { ensureContactsTable } from "@/lib/mssql/contacts"

function parseContactId(raw: string): number {
  // Contact ids are exposed as "c_<ID>" on the contacts page; accept both forms
  return parseInt(raw.startsWith("c_") ? raw.slice(2) : raw, 10)
}

// ─── GET /api/contacts/[id] — Client 360 ──────────────────────
// Contact row + linked leads, enquiries, quotations, activities.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const numId = parseContactId(id)
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    await ensureContactsTable(pool)

    const contactResult = await pool.request()
      .input("id", numId)
      .query(`
        SELECT
          CAST(ID AS varchar(20))     AS id,
          ISNULL(SHIPPER_NAME, '')    AS shipper_name,
          ISNULL(CONSIGNEE_NAME, '')  AS consignee_name,
          ISNULL([MODE], '')          AS mode,
          ISNULL(POL, '')             AS pol,
          ISNULL(POD, '')             AS pod,
          ISNULL(CONTACT_PERSON, '')  AS contact_person,
          ISNULL(CONTACT_NUMBER, '')  AS contact_number,
          ISNULL(EMAIL, '')           AS email,
          ISNULL(STAGE, 'CONTACT')    AS stage,
          ISNULL(CREATED_BY, '')      AS created_by,
          CONVERT(varchar(10), CREATED_AT, 120) AS created_at
        FROM [dbo].[TBL_CONTACTS]
        WHERE ID = @id
      `)

    if (!contactResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const contact = contactResult.recordset[0]

    const leadsResult = await pool.request()
      .input("id", numId)
      .query(`
        SELECT
          CAST(ID AS varchar(20)) AS id,
          REF_CODE                AS ref_code,
          SENT_BY                 AS sent_by,
          DATE_SENT               AS date_sent,
          SHIPPER                 AS shipper,
          DEST_COUNTRY            AS dest_country,
          STATUS                  AS status
        FROM [dbo].[TBL_SALES_LEADS]
        WHERE CONTACT_ID = @id
        ORDER BY ID DESC
      `)

    const enquiriesResult = await pool.request()
      .input("id", numId)
      .query(`
        SELECT
          CAST(PK_ID AS varchar(20)) AS id,
          ENQREFNO                   AS enq_ref_no,
          ENQRECPTDT                 AS enq_receipt_date,
          MODE                       AS mode,
          POL                        AS pol,
          POD                        AS pod,
          STATUS                     AS status,
          SHIPPER                    AS shipper
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
        WHERE CONTACT_ID = @id
        ORDER BY PK_ID DESC
      `)

    const quotationsResult = await pool.request()
      .input("id", numId)
      .query(`
        SELECT
          CAST(q.QUOT_ID AS varchar(20))           AS id,
          q.QUOT_REF_NO                            AS quot_ref_no,
          CONVERT(varchar(10), q.QUOT_DATE, 120)   AS quot_date,
          q.TOTAL_INR                              AS total_inr,
          ISNULL(q.STATUS, 'DRAFT')                AS status,
          CAST(q.ENQ_ID AS varchar(20))            AS enq_id
        FROM [dbo].[TBL_QUOTATIONS] q
        INNER JOIN [dbo].[TBL_ADMIN_SALESENQUIRY] e ON q.ENQ_ID = e.PK_ID
        WHERE e.CONTACT_ID = @id
        ORDER BY q.QUOT_ID DESC
      `)

    const activitiesResult = await pool.request()
      .input("cname", (contact.shipper_name as string).trim().toLowerCase())
      .query(`
        SELECT TOP 50
          CAST(ID AS varchar(20)) AS id,
          ACTIVITY_DATE           AS activity_date,
          ACTIVITY_TYPE           AS activity_type,
          SALES_PERSON            AS sales_person,
          STATUS                  AS status,
          NOTES                   AS notes,
          POINTS                  AS points
        FROM [dbo].[TBL_CALLS_VISITS]
        WHERE CLIENT_NAME IS NOT NULL AND CLIENT_NAME != ''
          AND LOWER(RTRIM(LTRIM(CLIENT_NAME))) = @cname
        ORDER BY ACTIVITY_DATE DESC, ID DESC
      `)

    return NextResponse.json({
      contact,
      leads:      leadsResult.recordset,
      enquiries:  enquiriesResult.recordset,
      quotations: quotationsResult.recordset,
      activities: activitiesResult.recordset,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts/[id] GET]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  const pool = await getPool(auth.company)
  await pool.request()
    .input("id", numId)
    .query("DELETE FROM [dbo].[TBL_CONTACTS] WHERE ID = @id")

  return NextResponse.json({ ok: true })
}
