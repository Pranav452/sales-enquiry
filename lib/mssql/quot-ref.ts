import { getPool, sql } from "./client"

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

export async function generateQuotRefNo(
  company: string,
  branch: string,
  quotDate: string
): Promise<string> {
  const pool = await getPool(company)
  const branchCode = getBranchCode(branch)

  const d = new Date(quotDate)
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dateStr = `${yy}${mm}`

  const result = await pool
    .request()
    .input("branch_code", sql.VarChar, branchCode)
    .input("date_str", sql.VarChar, dateStr)
    .query<{ LAST_SEQ: number }>(`
      MERGE [dbo].[QUOT_REF_SEQUENCES] WITH (HOLDLOCK) AS target
      USING (VALUES (@branch_code, @date_str)) AS src (BRANCH_CODE, DATE_STR)
        ON target.BRANCH_CODE = src.BRANCH_CODE AND target.DATE_STR = src.DATE_STR
      WHEN MATCHED THEN
        UPDATE SET LAST_SEQ = target.LAST_SEQ + 1
      WHEN NOT MATCHED THEN
        INSERT (BRANCH_CODE, DATE_STR, LAST_SEQ) VALUES (@branch_code, @date_str, 1)
      OUTPUT inserted.LAST_SEQ;
    `)

  const seq = result.recordset[0].LAST_SEQ
  return `${branchCode}Q${dateStr}${String(seq).padStart(3, "0")}`
}
