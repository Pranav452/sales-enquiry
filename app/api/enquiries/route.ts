import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { generateEnqRefNo } from "@/lib/mssql/enq-ref"

// ─── Column map (app field → MSSQL column) ───────────────────
// ENQRECPTDT is varchar(10) — store as 'YYYY-MM-DD' string
// POL / POD   are varchar(3) — IATA codes (3 chars max)
// SALESPERSON is varchar(15)
// REMARK      is varchar(200)

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

// ─── GET /api/enquiries ───────────────────────────────────────
export async function GET(_req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool = await getPool(auth.company)
    const req = pool.request()

    let where = ""
    if (auth.role !== "admin") {
      req.input("created_by", sql.VarChar(100), auth.userId)
      where = "WHERE CREATED_BY = @created_by"
    }

    const result = await req.query(`
      SELECT ${SELECT_COLS}
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
      ${where}
      ORDER BY PK_ID DESC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/enquiries ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: EnquiryPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    const pool = await getPool(auth.company)

    const enqRefNo = await generateEnqRefNo(
      auth.company,
      body.branch ?? "",
      body.enq_receipt_date ?? new Date().toISOString().split("T")[0]
    )

    const now = new Date()
    // ENQRECPTDT is varchar(10) — store as YYYY-MM-DD string
    const receiptDateStr = body.enq_receipt_date
      ? body.enq_receipt_date.split("T")[0]
      : now.toISOString().split("T")[0]

    const result = await pool
      .request()
      .input("enqrefno",      sql.VarChar(15),  enqRefNo)
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
      .input("status",        sql.VarChar(25),  truncate(body.status ?? "PENDING", 25))
      .input("email_subject", sql.VarChar(200), truncate(body.email_subject_line, 200))
      .input("shipper",       sql.VarChar(100), truncate(body.shipper, 100))
      .input("consignee",     sql.VarChar(100), truncate(body.consignee, 100))
      .input("remark",        sql.VarChar(200), truncate(body.remarks, 200))
      .input("mbl_awb_no",    sql.VarChar(50),  truncate(body.mbl_awb_no, 50))
      .input("job_invoice_no",sql.VarChar(50),  truncate(body.job_invoice_no, 50))
      .input("gop",           sql.VarChar(50),  truncate(body.gop, 50))
      .input("assigned_user", sql.VarChar(100), truncate(body.assigned_user, 100))
      .input("assigned_date", sql.DateTime,     body.assigned_date ? new Date(body.assigned_date) : null)
      .input("buy_rate_file", sql.VarChar(500), body.buy_rate_file ?? null)
      .input("sell_rate_file",sql.VarChar(500), body.sell_rate_file ?? null)
      .input("created_by",    sql.VarChar(100), auth.userId)
      .input("makerdt",       sql.DateTime,     now)
      .input("updated_at",    sql.DateTime,     now)
      .query<{ PK_ID: number }>(`
        INSERT INTO [dbo].[TBL_ADMIN_SALESENQUIRY] (
          ENQREFNO, ENQRECPTDT, MODE, ENQTYPE, EXIM, FN,
          SALESPERSON, AGENT_NAME, COUNTRY_CODE, BRANCH, NETWORK,
          POL, POD, INCOTERM, DIMENSION, STATUS, EMAIL_SUBJECT,
          SHIPPER, CONSIGNEE, REMARK, MBL_AWB_NO, JOB_INVOICE_NO, GOP,
          ASSIGNED_USER, ASSIGNED_DATE, BUY_RATE_FILE, SELL_RATE_FILE,
          CREATED_BY, MAKERDT, UPDATED_AT
        )
        OUTPUT inserted.PK_ID
        VALUES (
          @enqrefno, @enqrecptdt, @mode, @enqtype, @exim, @fn,
          @salesperson, @agent_name, @country_code, @branch, @network,
          @pol, @pod, @incoterm, @dimension, @status, @email_subject,
          @shipper, @consignee, @remark, @mbl_awb_no, @job_invoice_no, @gop,
          @assigned_user, @assigned_date, @buy_rate_file, @sell_rate_file,
          @created_by, @makerdt, @updated_at
        )
      `)

    const newId = result.recordset[0].PK_ID
    return NextResponse.json({ id: String(newId), enq_ref_no: enqRefNo }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function truncate(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  return val.length > max ? val.substring(0, max) : val
}

// ─── Types ────────────────────────────────────────────────────

interface EnquiryPayload {
  enq_receipt_date?: string
  mode?: string | null
  enq_type?: string | null
  exim?: string | null
  fn?: string | null
  sales_person?: string | null
  agent_name?: string | null
  country?: string | null
  branch?: string | null
  network?: string | null
  pol?: string | null
  pod?: string | null
  incoterms?: string | null
  container_type?: string | null
  status?: string | null
  email_subject_line?: string | null
  shipper?: string | null
  consignee?: string | null
  remarks?: string | null
  mbl_awb_no?: string | null
  job_invoice_no?: string | null
  gop?: string | null
  assigned_user?: string | null
  assigned_date?: string | null
  buy_rate_file?: string | null
  sell_rate_file?: string | null
}
