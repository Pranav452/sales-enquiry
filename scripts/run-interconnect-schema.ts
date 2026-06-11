/**
 * Runs scripts/interconnect-schema.sql against MSSQL.
 *
 * Usage:
 *   npx tsx scripts/run-interconnect-schema.ts --company=manilal
 *   npx tsx scripts/run-interconnect-schema.ts --company=links
 */

import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import sql from "mssql"

dotenv.config({ path: ".env.local" })

const company = process.argv.find((a) => a.startsWith("--company="))?.split("=")[1] ?? "manilal"
if (!["manilal", "links"].includes(company)) {
  console.error("--company must be 'manilal' or 'links'")
  process.exit(1)
}

const prefix = company === "links" ? "LINKS" : "MANILAL"

const config: sql.config = {
  server:   process.env[`MSSQL_${prefix}_HOST`]!,
  port:     parseInt(process.env[`MSSQL_${prefix}_PORT`] ?? "1433"),
  user:     process.env[`MSSQL_${prefix}_USER`]!,
  password: process.env[`MSSQL_${prefix}_PASSWORD`]!,
  database: process.env[`MSSQL_${prefix}_DATABASE`]!,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 60000,
}

async function main() {
  const sqlText = fs.readFileSync(path.join(__dirname, "interconnect-schema.sql"), "utf8")
  const pool = await sql.connect(config)
  console.log(`Connected to ${config.database} on ${config.server}`)

  // Split on GO — MSSQL 2008 R2 fails on multiple IF blocks in one batch
  const batches = sqlText
    .split(/^\s*GO\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean)

  for (const batch of batches) {
    await pool.request().batch(batch)
  }
  console.log(`Schema script executed (${batches.length} batches).`)

  await pool.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
