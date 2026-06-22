import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool, sql } from "@/lib/mssql/client"

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pool = await getPool(auth.company)
  const result = await pool.request().query(`
    SELECT DEST_ID, DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS, ACTIVE, CREATED_AT
    FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS]
    ORDER BY CONTINENT, DEST_NAME
  `)
  return NextResponse.json(result.recordset)
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { dest_name, port_name, continent, requirements } = body
  if (!dest_name) return NextResponse.json({ error: "dest_name required" }, { status: 400 })

  const pool = await getPool(auth.company)
  const result = await pool.request()
    .input("dest_name",     sql.NVarChar(100), dest_name.trim())
    .input("port_name",     sql.NVarChar(100), port_name?.trim() ?? null)
    .input("continent",     sql.NVarChar(50),  continent?.trim() ?? null)
    .input("requirements",  sql.NVarChar(sql.MAX), requirements?.trim() ?? null)
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_DESTINATIONS]
        (DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS)
      OUTPUT INSERTED.DEST_ID
      VALUES (@dest_name, @port_name, @continent, @requirements)
    `)
  return NextResponse.json({ dest_id: result.recordset[0].DEST_ID }, { status: 201 })
}
