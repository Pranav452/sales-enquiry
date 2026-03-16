import { getPool, sql } from "./client"

// Map branch names to IATA-style 3-letter codes
const BRANCH_CODES: Record<string, string> = {
  MUMBAI: "BOM",
  "NEW DELHI": "DEL",
  MADRAS: "MAA",
  BANGALORE: "BLR",
  COCHIN: "COK",
  AHMEDABAD: "AMD",
  VADODARA: "BDQ",
  NASIK: "ISK",
}

function getBranchCode(branch: string): string {
  return BRANCH_CODES[branch.toUpperCase()] ?? branch.substring(0, 3).toUpperCase()
}

/**
 * Atomically generates the next enquiry reference number for the given branch + date.
 * Uses ENQ_REF_SEQUENCES table with MERGE for atomic counter increment.
 */
export async function generateEnqRefNo(
  company: string,
  branch: string,
  receiptDate: string
): Promise<string> {
  const pool = await getPool(company)
  const branchCode = getBranchCode(branch)

  const d = new Date(receiptDate)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dateStr = `${yy}${mm}`

  // Atomic upsert — MERGE is supported in MSSQL 2008 R2
  const result = await pool
    .request()
    .input("branch_code", sql.VarChar, branchCode)
    .input("date_str", sql.VarChar, dateStr)
    .query<{ LAST_SEQ: number }>(`
      MERGE [dbo].[ENQ_REF_SEQUENCES] WITH (HOLDLOCK) AS target
      USING (VALUES (@branch_code, @date_str)) AS src (BRANCH_CODE, DATE_STR)
        ON target.BRANCH_CODE = src.BRANCH_CODE AND target.DATE_STR = src.DATE_STR
      WHEN MATCHED THEN
        UPDATE SET LAST_SEQ = target.LAST_SEQ + 1
      WHEN NOT MATCHED THEN
        INSERT (BRANCH_CODE, DATE_STR, LAST_SEQ) VALUES (@branch_code, @date_str, 1)
      OUTPUT inserted.LAST_SEQ;
    `)

  const seq = result.recordset[0].LAST_SEQ
  return `${branchCode}${dateStr}${String(seq).padStart(3, "0")}`
}
