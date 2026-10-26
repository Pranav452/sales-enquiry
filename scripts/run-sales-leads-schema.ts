/**
 * Runs a SQL file from scripts/ against MSSQL (default: sales-leads-schema.sql).
 *
 * Usage:
 *   npx tsx scripts/run-sales-leads-schema.ts --company=manilal
 *   npx tsx scripts/run-sales-leads-schema.ts --company=links
 *   npx tsx scripts/run-sales-leads-schema.ts --company=links --file=add-sales-lead-design-fields.sql
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

// Optional --file=<name>.sql (a file inside scripts/); default keeps the original behaviour
const fileArg = process.argv.find((a) => a.startsWith("--file="))?.split("=")[1] ?? "sales-leads-schema.sql"
const sqlFile = path.basename(fileArg)
if (!sqlFile.toLowerCase().endsWith(".sql") || !fs.existsSync(path.join(__dirname, sqlFile))) {
  console.error(`--file must name an existing .sql file in scripts/ (got '${fileArg}')`)
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
  const sqlText = fs.readFileSync(path.join(__dirname, sqlFile), "utf8")
  const pool = await sql.connect(config)
  console.log(`Connected to ${config.database} on ${config.server} — running ${sqlFile}`)

  // Split on GO if any; this file has none, run whole batch
  const result = await pool.request().batch(sqlText)
  console.log("Schema script executed.", result.recordset ?? "")

  const check = await pool.request().query(
    "SELECT COUNT(*) AS cnt FROM [dbo].[TBL_SALES_LEADS]"
  )
  console.log(`TBL_SALES_LEADS row count: ${check.recordset[0].cnt}`)

  await pool.close()
}

main().catch((err) => { console.error(err); process.exit(1) })
