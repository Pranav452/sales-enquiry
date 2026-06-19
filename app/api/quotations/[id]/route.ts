import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"
import { buildLocalBlob, buildCcBlob, parseLocalBlob, parseCcBlob } from "@/lib/quotation-charges"

// ─── GET — single quotation ───────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const pool = await getPool(auth.company)

  const result = await pool
    .request()
    .input("quot_id", sql.Int, parseInt(id))
    .query(`
      SELECT
        QUOT_ID, QUOT_REF_NO, QUOT_DATE, MODE, EXIM, FN, ENQ_TYPE,
        INCOTERMS, POL, POD, CONTAINER_TYPE, SHIPPER, SHIPMENT_TYPE,
        VESSEL_NAME, ETD, ETA, TRANSIT_TIME, FREE_TIME,
        LOCAL_CHARGES, STUFFING_TYPE, CC_CHARGES,
        TRANSPORT_ENABLED, TRANSPORT_COST,
        TOTAL_INR, EXCHANGE_RATE, TOTAL_DISPLAY, DISPLAY_CURRENCY,
        CLAUSES, ISNULL(STATUS, 'DRAFT') AS STATUS,
        ENQ_ID, SALES_PERSON, BRANCH, CREATED_BY, CREATED_AT, UPDATED_AT
      FROM [dbo].[TBL_QUOTATIONS]
      WHERE QUOT_ID = @quot_id
    `)

  if (!result.recordset[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const row = result.recordset[0]
  const local = parseLocalBlob(row.LOCAL_CHARGES ?? null)
  const cc = parseCcBlob(row.CC_CHARGES ?? null)

  return NextResponse.json({
    ...row,
    local_charges:          local.local_charges,
    freight_charge:         local.freight_charge,
    extra_freight:          local.extra_freight,
    extra_local:            local.extra_local,
    freight_validity:       local.freight_validity,
    freight_validity_date:  local.freight_validity_date,
    cc_charges:             cc.cc_charges,
    extra_cc:               cc.extra_cc,
    transport_cost:         row.TRANSPORT_COST ? JSON.parse(row.TRANSPORT_COST) : null,
  })
}

// ─── PATCH — update quotation ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const pool = await getPool(auth.company)

  try {
    await pool.request()
      .input("quot_id",           sql.Int,      parseInt(id))
      .input("quot_date",         sql.Date,     body.quot_date ? new Date(body.quot_date) : null)
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
      .input("total_inr",         sql.Decimal(18, 2), body.total_inr ?? null)
      .input("exchange_rate",     sql.Decimal(18, 6), body.exchange_rate ?? null)
      .input("total_display",     sql.Decimal(18, 2), body.total_display ?? null)
      .input("display_currency",  sql.NVarChar, body.display_currency || null)
      .input("clauses",           sql.NVarChar, body.clauses || null)
      .input("sales_person",      sql.NVarChar, body.sales_person || null)
      .input("branch",            sql.NVarChar, body.branch || null)
      .query(`
        UPDATE [dbo].[TBL_QUOTATIONS] SET
          QUOT_DATE         = COALESCE(@quot_date, QUOT_DATE),
          MODE              = @mode,
          EXIM              = @exim,
          FN                = @fn,
          ENQ_TYPE          = @enq_type,
          INCOTERMS         = @incoterms,
          POL               = @pol,
          POD               = @pod,
          CONTAINER_TYPE    = @container_type,
          SHIPPER           = @shipper,
          SHIPMENT_TYPE     = @shipment_type,
          VESSEL_NAME       = @vessel_name,
          ETD               = @etd,
          ETA               = @eta,
          TRANSIT_TIME      = @transit_time,
          FREE_TIME         = @free_time,
          LOCAL_CHARGES     = @local_charges,
          STUFFING_TYPE     = @stuffing_type,
          CC_CHARGES        = @cc_charges,
          TRANSPORT_ENABLED = @transport_enabled,
          TRANSPORT_COST    = @transport_cost,
          TOTAL_INR         = @total_inr,
          EXCHANGE_RATE     = @exchange_rate,
          TOTAL_DISPLAY     = @total_display,
          DISPLAY_CURRENCY  = @display_currency,
          CLAUSES           = @clauses,
          SALES_PERSON      = @sales_person,
          BRANCH            = @branch,
          UPDATED_AT        = GETDATE()
        WHERE QUOT_ID = @quot_id
      `)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
