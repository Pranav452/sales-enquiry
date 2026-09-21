import { getPool, sql } from "./client"
import { generateEnqRefNo } from "./enq-ref"
import { saveLostReason } from "./lost-reason"

// Shared enquiry insert. Used by POST /api/enquiries and by
// POST /api/quotations/[id]/create-enquiry so both produce identical rows
// (same column truncation, same ref-no generator).
//
// ENQRECPTDT is varchar(10) — stored as 'YYYY-MM-DD'.
// SALESPERSON is varchar(15), REMARK varchar(200), INCOTERM varchar(10).

export interface EnquiryPayload {
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
  lost_reason?: string | null
  mbl_awb_no?: string | null
  job_invoice_no?: string | null
  gop?: string | null
  assigned_user?: string | null
  assigned_date?: string | null
  buy_rate_file?: string | null
  sell_rate_file?: string | null
  contact_id?: string | null
  lead_id?: string | null
}

export function truncate(val: string | null | undefined, max: number): string | null {
  if (!val) return null
  return val.length > max ? val.substring(0, max) : val
}

export async function insertEnquiry(
  company: string,
  body: EnquiryPayload,
  createdBy: string
): Promise<{ id: string; enq_ref_no: string }> {
  const pool = await getPool(company)

  const enqRefNo = await generateEnqRefNo(
    company,
    body.branch ?? "",
    body.enq_receipt_date ?? new Date().toISOString().split("T")[0]
  )

  const now = new Date()
  const receiptDateStr = body.enq_receipt_date
    ? body.enq_receipt_date.split("T")[0]
    : now.toISOString().split("T")[0]

  const result = await pool
    .request()
    .input("enqrefno",      enqRefNo)
    .input("enqrecptdt",    receiptDateStr)
    .input("mode",          truncate(body.mode, 10))
    .input("enqtype",       truncate(body.enq_type, 10))
    .input("exim",          truncate(body.exim, 10))
    .input("fn",            truncate(body.fn, 20))
    .input("salesperson",   truncate(body.sales_person, 15))
    .input("agent_name",    truncate(body.agent_name, 100))
    .input("country_code",  truncate(body.country, 15))
    .input("branch",        truncate(body.branch, 10))
    .input("network",       truncate(body.network, 25))
    .input("pol",           truncate(body.pol, 100))
    .input("pod",           truncate(body.pod, 100))
    .input("incoterm",      truncate(body.incoterms, 10))
    .input("dimension",     truncate(body.container_type, 20))
    .input("status",        truncate(body.status ?? "PENDING", 25))
    .input("email_subject", truncate(body.email_subject_line, 200))
    .input("shipper",       truncate(body.shipper, 100))
    .input("consignee",     truncate(body.consignee, 100))
    .input("remark",        truncate(body.remarks, 200))
    .input("mbl_awb_no",    truncate(body.mbl_awb_no, 50))
    .input("job_invoice_no",truncate(body.job_invoice_no, 50))
    .input("gop",           truncate(body.gop, 50))
    .input("assigned_user", truncate(body.assigned_user, 100))
    .input("assigned_date", sql.DateTime, body.assigned_date ? new Date(body.assigned_date) : null)
    .input("buy_rate_file", body.buy_rate_file ?? null)
    .input("sell_rate_file",body.sell_rate_file ?? null)
    .input("contact_id",    sql.Int, body.contact_id ? parseInt(body.contact_id) : null)
    .input("lead_id",       sql.Int, body.lead_id ? parseInt(body.lead_id) : null)
    .input("created_by",    createdBy)
    .input("makerdt",       sql.DateTime, now)
    .input("updated_at",    sql.DateTime, now)
    .query<{ PK_ID: number }>(`
      INSERT INTO [dbo].[TBL_ADMIN_SALESENQUIRY] (
        ENQREFNO, ENQRECPTDT, MODE, ENQTYPE, EXIM, FN,
        SALESPERSON, AGENT_NAME, COUNTRY_CODE, BRANCH, NETWORK,
        POL, POD, INCOTERM, DIMENSION, STATUS, EMAIL_SUBJECT,
        SHIPPER, CONSIGNEE, REMARK, MBL_AWB_NO, JOB_INVOICE_NO, GOP,
        ASSIGNED_USER, ASSIGNED_DATE, BUY_RATE_FILE, SELL_RATE_FILE,
        CONTACT_ID, LEAD_ID, CREATED_BY, MAKERDT, UPDATED_AT
      )
      OUTPUT inserted.PK_ID
      VALUES (
        @enqrefno, @enqrecptdt, @mode, @enqtype, @exim, @fn,
        @salesperson, @agent_name, @country_code, @branch, @network,
        @pol, @pod, @incoterm, @dimension, @status, @email_subject,
        @shipper, @consignee, @remark, @mbl_awb_no, @job_invoice_no, @gop,
        @assigned_user, @assigned_date, @buy_rate_file, @sell_rate_file,
        @contact_id, @lead_id, @created_by, @makerdt, @updated_at
      )
    `)

  // Separate statement — see lib/mssql/lost-reason.ts. Never fails the insert.
  await saveLostReason(pool, result.recordset[0].PK_ID, body.status, body.lost_reason).catch(() => {})

  return { id: String(result.recordset[0].PK_ID), enq_ref_no: enqRefNo }
}
