import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"

// ─── GET /api/activities/reminders ───────────────────────────
// Returns overdue + today's pending reminders for the current user.
// Admins see all; sales role sees only their own.
export async function GET(_req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const pool    = await getPool(auth.company)
    const request = pool.request()

    const today = new Date().toISOString().split("T")[0]
    request.input("today", today)

    let ownerClause = ""
    if (auth.role !== "admin") {
      request.input("created_by", auth.userId)
      ownerClause = "AND CREATED_BY = @created_by"
    }

    const result = await request.query(`
      SELECT
        CAST(ID AS varchar(20)) AS id,
        CLIENT_NAME             AS client_name,
        SALES_PERSON            AS sales_person,
        ACTIVITY_TYPE           AS activity_type,
        ACTIVITY_DATE           AS activity_date,
        REMINDER_DATE           AS reminder_date,
        NOTES                   AS notes,
        STATUS                  AS status
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE REMINDER_DONE = 0
        AND REMINDER_DATE IS NOT NULL
        AND REMINDER_DATE <= @today
        ${ownerClause}
      ORDER BY REMINDER_DATE ASC
    `)

    return NextResponse.json(result.recordset)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── PATCH /api/activities/reminders?id=X ────────────────────
// Dismiss a reminder (sets REMINDER_DONE = 1).
export async function PATCH(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id || isNaN(parseInt(id, 10))) {
    return NextResponse.json({ error: "Valid id query param required" }, { status: 400 })
  }

  try {
    const pool    = await getPool(auth.company)
    const request = pool.request()
    request.input("id",         parseInt(id, 10))
    request.input("updated_at", new Date())

    let ownerClause = ""
    if (auth.role !== "admin") {
      request.input("created_by", auth.userId)
      ownerClause = "AND CREATED_BY = @created_by"
    }

    await request.query(`
      UPDATE [dbo].[TBL_CALLS_VISITS]
      SET REMINDER_DONE = 1, UPDATED_AT = @updated_at
      WHERE ID = @id ${ownerClause}
    `)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
