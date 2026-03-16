import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

function truncate(val: unknown, max: number): string | null {
  if (!val) return null
  const s = String(val)
  return s.length > max ? s.substring(0, max) : s
}

const SELECT_COLS = `
  CAST(PK_ID AS varchar(20))  AS id,
  ENQREFNO                    AS enq_ref_no,
  ENQRECPTDT                  AS enq_receipt_date,
  ENQTYPE                     AS enq_type,
  MODE                        AS mode,
  EXIM                        AS exim,
  FN                          AS fn,
  SALESPERSON                 AS sales_person,
  AGENT_NAME                  AS agent_name,
  COUNTRY_CODE                AS country,
  BRANCH                      AS branch,
  NETWORK                     AS network,
  POL                         AS pol,
  POD                         AS pod,
  INCOTERM                    AS incoterms,
  DIMENSION                   AS container_type,
  STATUS                      AS status,
  EMAIL_SUBJECT               AS email_subject_line,
  SHIPPER                     AS shipper,
  CONSIGNEE                   AS consignee,
  REMARK                      AS remarks,
  MBL_AWB_NO                  AS mbl_awb_no,
  JOB_INVOICE_NO              AS job_invoice_no,
  GOP                         AS gop,
  ASSIGNED_USER               AS assigned_user,
  CONVERT(varchar(10), ASSIGNED_DATE, 120) AS assigned_date,
  BUY_RATE_FILE               AS buy_rate_file,
  SELL_RATE_FILE              AS sell_rate_file
`

// ─── GET /api/enquiries/[id] ──────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const pkId = parseInt(id)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    const result = await pool
      .request()
      .input("pk_id", sql.Int, pkId)
      .query(`
        SELECT ${SELECT_COLS}
        FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
        WHERE PK_ID = @pk_id
      `)

    if (!result.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json(result.recordset[0])
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/enquiries/[id] ────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const pkId = parseInt(id)
  if (isNaN(pkId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // ENQRECPTDT is varchar(10) — store as YYYY-MM-DD string
  const receiptDateStr = body.enq_receipt_date
    ? String(body.enq_receipt_date).split("T")[0]
    : null

  try {
    const pool = await getPool(auth.company)
    const result = await pool
      .request()
      .input("pk_id",         sql.Int,          pkId)
      .input("enqrecptdt",    sql.VarChar(10),  receiptDateStr)
      .input("mode",          sql.VarChar(10),  truncate(body.mode, 10))
      .input("enqtype",       sql.VarChar(10),  truncate(body.enq_type, 10))
      .input("exim",          sql.VarChar(10),  truncate(body.exim, 10))
      .input("fn",            sql.VarChar(20),  truncate(body.fn, 20))
      .input("salesperson",   sql.VarChar(15),  truncate(body.sales_person, 15))
      .input("agent_name",    sql.VarChar(100), truncate(body.agent_name, 100))
      .input("country_code",  sql.VarChar(15),  truncate(body.country, 15))
      .input("branch",        sql.VarChar(10),  truncate(body.branch, 10))
      .input("network",       sql.VarChar(25),  truncate(body.network, 25))
      .input("pol",           sql.VarChar(3),   truncate(body.pol, 3))
      .input("pod",           sql.VarChar(3),   truncate(body.pod, 3))
      .input("incoterm",      sql.VarChar(10),  truncate(body.incoterms, 10))
      .input("dimension",     sql.VarChar(20),  truncate(body.container_type, 20))
      .input("status",        sql.VarChar(25),  truncate(body.status, 25))
      .input("email_subject", sql.VarChar(200), truncate(body.email_subject_line, 200))
      .input("shipper",       sql.VarChar(100), truncate(body.shipper, 100))
      .input("consignee",     sql.VarChar(100), truncate(body.consignee, 100))
      .input("remark",        sql.VarChar(200), truncate(body.remarks, 200))
      .input("mbl_awb_no",    sql.VarChar(50),  truncate(body.mbl_awb_no, 50))
      .input("job_invoice_no",sql.VarChar(50),  truncate(body.job_invoice_no, 50))
      .input("gop",           sql.VarChar(50),  truncate(body.gop, 50))
      .input("assigned_user", sql.VarChar(100), truncate(body.assigned_user, 100))
      .input("assigned_date", sql.DateTime,     body.assigned_date ? new Date(body.assigned_date as string) : null)
      .input("buy_rate_file", sql.VarChar(500), body.buy_rate_file ?? null)
      .input("sell_rate_file",sql.VarChar(500), body.sell_rate_file ?? null)
      .input("updated_at",    sql.DateTime,     new Date())
      .query<{ ENQREFNO: string }>(`
        UPDATE [dbo].[TBL_ADMIN_SALESENQUIRY]
        SET
          ENQRECPTDT    = @enqrecptdt,
          MODE          = @mode,
          ENQTYPE       = @enqtype,
          EXIM          = @exim,
          FN            = @fn,
          SALESPERSON   = @salesperson,
          AGENT_NAME    = @agent_name,
          COUNTRY_CODE  = @country_code,
          BRANCH        = @branch,
          NETWORK       = @network,
          POL           = @pol,
          POD           = @pod,
          INCOTERM      = @incoterm,
          DIMENSION     = @dimension,
          STATUS        = @status,
          EMAIL_SUBJECT = @email_subject,
          SHIPPER       = @shipper,
          CONSIGNEE     = @consignee,
          REMARK        = @remark,
          MBL_AWB_NO    = @mbl_awb_no,
          JOB_INVOICE_NO= @job_invoice_no,
          GOP           = @gop,
          ASSIGNED_USER = @assigned_user,
          ASSIGNED_DATE = @assigned_date,
          BUY_RATE_FILE = @buy_rate_file,
          SELL_RATE_FILE= @sell_rate_file,
          UPDATED_AT    = @updated_at
        OUTPUT inserted.ENQREFNO
        WHERE PK_ID = @pk_id
      `)

    if (!result.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ enq_ref_no: result.recordset[0].ENQREFNO })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
