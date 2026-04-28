import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

/**
 * PATCH /api/contacts/dead-lead
 * Body: { client_name: string, is_dead_lead: boolean }
 * Upserts a flag in TBL_CONTACT_FLAGS (keyed by lowercase client name).
 * Works for both contact-sourced (c_) and activity-sourced (a_) clients.
 */
export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { client_name, is_dead_lead } = await req.json()
  if (!client_name?.trim()) {
    return NextResponse.json({ error: "client_name required" }, { status: 400 })
  }

  try {
    const pool = await getPool(auth.company)

    // Auto-create flags table if not present
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'TBL_CONTACT_FLAGS'
      )
      BEGIN
        CREATE TABLE [dbo].[TBL_CONTACT_FLAGS] (
          [CLIENT_NAME_LOWER]  varchar(400)  NOT NULL PRIMARY KEY,
          [IS_DEAD_LEAD]       bit           NOT NULL DEFAULT 0,
          [FLAGGED_BY]         varchar(200)  NULL,
          [UPDATED_AT]         datetime      NOT NULL DEFAULT GETUTCDATE()
        )
      END
    `)

    // MERGE upsert
    await pool.request()
      .input("cname",        client_name.trim().toLowerCase())
      .input("is_dead_lead", is_dead_lead ? 1 : 0)
      .input("flagged_by",   auth.email)
      .query(`
        MERGE [dbo].[TBL_CONTACT_FLAGS] AS target
        USING (SELECT @cname AS cname) AS src ON target.CLIENT_NAME_LOWER = src.cname
        WHEN MATCHED THEN
          UPDATE SET IS_DEAD_LEAD = @is_dead_lead, FLAGGED_BY = @flagged_by, UPDATED_AT = GETUTCDATE()
        WHEN NOT MATCHED THEN
          INSERT (CLIENT_NAME_LOWER, IS_DEAD_LEAD, FLAGGED_BY, UPDATED_AT)
          VALUES (@cname, @is_dead_lead, @flagged_by, GETUTCDATE());
      `)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[contacts/dead-lead PATCH]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
