import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { generateQuotRefNo } from "@/lib/mssql/quot-ref"
import { buildLocalBlob, buildCcBlob } from "@/lib/quotation-charges"

// ─── GET — list quotations ────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { role, company, salesperson } = auth
  const pool = await getPool(company)

  const whereClause = role === "admin"
    ? ""
    : "WHERE CREATED_BY = @created_by"

  const result = await pool
    .request()
    .input("created_by", sql.NVarChar, salesperson ?? auth.email)
    .query(`
      SELECT
        QUOT_ID, QUOT_REF_NO, QUOT_DATE, MODE, EXIM, FN, ENQ_TYPE,
        INCOTERMS, POL, POD, CONTAINER_TYPE, SHIPPER, SHIPMENT_TYPE,
        VESSEL_NAME, ETD, ETA, TRANSIT_TIME, FREE_TIME,
        LOCAL_CHARGES, STUFFING_TYPE, CC_CHARGES,
        TRANSPORT_ENABLED, TRANSPORT_COST,
        TOTAL_INR, EXCHANGE_RATE, CLAUSES, ISNULL(STATUS, 'DRAFT') AS STATUS,
        ENQ_ID, SALES_PERSON, BRANCH, CREATED_BY, CREATED_AT, UPDATED_AT
      FROM [dbo].[TBL_QUOTATIONS]
      ${whereClause}
      ORDER BY CREATED_AT DESC
    `)

  return NextResponse.json(result.recordset)
}

// ─── POST — create quotation ──────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { company, salesperson, email } = auth
  const pool = await getPool(company)

  try {
    const quotDate = body.quot_date || new Date().toISOString().split("T")[0]
    const branch = (body.branch || "MUMBAI").trim()

    const quotRefNo = await generateQuotRefNo(company, branch, quotDate)

    await pool.request()
      .input("quot_ref_no",       sql.NVarChar, quotRefNo)
      .input("quot_date",         sql.Date,     new Date(quotDate))
      .input("mode",              sql.NVarChar, body.mode || null)
      .input("exim",              sql.NVarChar, body.exim || null)
      .input("fn",                sql.NVarChar, body.fn || null)
      .input("enq_type",          sql.NVarChar, body.enq_type || null)
      .input("incoterms",         sql.NVarChar, body.incoterms || null)
      .input("pol",               sql.NVarChar, body.pol || null)
      .input("pod",               sql.NVarChar, body.pod || null)
      .input("container_type",    sql.NVarChar, body.container_type || null)
      .input("shipper",           sql.NVarChar, body.shipper || null)
      .input("shipment_type",     sql.NVarChar, body.shipment_type || null)
      .input("vessel_name",       sql.NVarChar, body.vessel_name || null)
      .input("etd",               sql.Date,     body.etd ? new Date(body.etd) : null)
      .input("eta",               sql.Date,     body.eta ? new Date(body.eta) : null)
      .input("transit_time",      sql.NVarChar, body.transit_time || null)
      .input("free_time",         sql.NVarChar, body.free_time || null)
      .input("local_charges",     sql.NVarChar, buildLocalBlob(body))
      .input("stuffing_type",     sql.NVarChar, body.stuffing_type || null)
      .input("cc_charges",        sql.NVarChar, buildCcBlob(body))
      .input("transport_enabled", sql.Bit,      body.transport_enabled ? 1 : 0)
      .input("transport_cost",    sql.NVarChar, body.transport_cost ? JSON.stringify(body.transport_cost) : null)
      .input("total_inr",         sql.Decimal,  body.total_inr ?? null)
      .input("exchange_rate",     sql.Decimal,  body.exchange_rate ?? null)
      .input("clauses",           sql.NVarChar, body.clauses || null)
      .input("enq_id",            sql.Int,      body.enq_id ? parseInt(body.enq_id) : null)
      .input("sales_person",      sql.NVarChar, body.sales_person || salesperson || null)
      .input("branch",            sql.NVarChar, branch)
      .input("status",            sql.NVarChar, "DRAFT")
      .input("created_by",        sql.NVarChar, salesperson ?? email)
      .query(`
        INSERT INTO [dbo].[TBL_QUOTATIONS]
          (QUOT_REF_NO, QUOT_DATE, MODE, EXIM, FN, ENQ_TYPE, INCOTERMS,
           POL, POD, CONTAINER_TYPE, SHIPPER, SHIPMENT_TYPE,
           VESSEL_NAME, ETD, ETA, TRANSIT_TIME, FREE_TIME,
           LOCAL_CHARGES, STUFFING_TYPE, CC_CHARGES,
           TRANSPORT_ENABLED, TRANSPORT_COST,
           TOTAL_INR, EXCHANGE_RATE, CLAUSES,
           ENQ_ID, SALES_PERSON, BRANCH, STATUS, CREATED_BY)
        VALUES
          (@quot_ref_no, @quot_date, @mode, @exim, @fn, @enq_type, @incoterms,
           @pol, @pod, @container_type, @shipper, @shipment_type,
           @vessel_name, @etd, @eta, @transit_time, @free_time,
           @local_charges, @stuffing_type, @cc_charges,
           @transport_enabled, @transport_cost,
           @total_inr, @exchange_rate, @clauses,
           @enq_id, @sales_person, @branch, @status, @created_by)
      `)

    const idResult = await pool.request().query<{ QUOT_ID: number }>(
      "SELECT TOP 1 QUOT_ID FROM [dbo].[TBL_QUOTATIONS] ORDER BY QUOT_ID DESC"
    )

    return NextResponse.json({
      id: String(idResult.recordset[0].QUOT_ID),
      quot_ref_no: quotRefNo,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
