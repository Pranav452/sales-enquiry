import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { ensureContactsTable } from "@/lib/mssql/contacts"

// ─── POST /api/sales-leads/[id]/convert ───────────────────────
// "Convert to Contact": creates (or reuses) a TBL_CONTACTS row for the
// lead's shipper and stamps TBL_SALES_LEADS.CONTACT_ID.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    const pool = await getPool(auth.company)
    await ensureContactsTable(pool)

    const leadReq = pool.request()
    leadReq.input("id", id)
    let ownerClause = ""
    if (auth.role !== "admin") {
      leadReq.input("owner_id", auth.userId)
      leadReq.input("owner_sp", (auth.salesperson ?? "").toUpperCase())
      ownerClause = " AND (CREATED_BY = @owner_id OR UPPER(SENT_BY) = @owner_sp)"
    }

    const leadResult = await leadReq.query(`
      SELECT ID, SHIPPER, CONSIGNEE, CONTACT_ID
      FROM [dbo].[TBL_SALES_LEADS]
      WHERE ID = @id${ownerClause}
    `)

    if (!leadResult.recordset.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const lead = leadResult.recordset[0]

    if (lead.CONTACT_ID) {
      return NextResponse.json({ ok: true, contact_id: String(lead.CONTACT_ID), already_converted: true })
    }

    const shipper = (lead.SHIPPER ?? "").trim()
    if (!shipper) {
      return NextResponse.json({ error: "Lead has no shipper name to convert" }, { status: 400 })
    }

    // Reuse an existing contact with the same shipper name, else create one
    let contactId: number
    const existing = await pool.request()
      .input("sname", shipper.toLowerCase())
      .query(`
        SELECT TOP 1 ID FROM [dbo].[TBL_CONTACTS]
        WHERE LOWER(RTRIM(LTRIM(ISNULL(SHIPPER_NAME, '')))) = @sname
        ORDER BY ID ASC
      `)

    if (existing.recordset.length) {
      contactId = existing.recordset[0].ID
    } else {
      const inserted = await pool.request()
        .input("shipper_name",   shipper.slice(0, 200))
        .input("consignee_name", ((lead.CONSIGNEE ?? "") as string).trim().slice(0, 200) || null)
        .input("created_by",     auth.email)
        .query<{ ID: number }>(`
          INSERT INTO [dbo].[TBL_CONTACTS]
            (SHIPPER_NAME, CONSIGNEE_NAME, STAGE, CREATED_BY, CREATED_AT, UPDATED_AT)
          OUTPUT inserted.ID
          VALUES
            (@shipper_name, @consignee_name, 'CONTACT', @created_by, GETUTCDATE(), GETUTCDATE())
        `)
      contactId = inserted.recordset[0].ID
    }

    await pool.request()
      .input("id", id)
      .input("contact_id", contactId)
      .input("now", new Date())
      .query(`
        UPDATE [dbo].[TBL_SALES_LEADS]
        SET CONTACT_ID = @contact_id, UPDATED_AT = @now
        WHERE ID = @id
      `)

    return NextResponse.json({ ok: true, contact_id: String(contactId) }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
