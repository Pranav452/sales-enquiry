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

/**
 * Ref no for a quotation raised against an enquiry: `<ENQREFNO>-Q<n>`,
 * where n is (number of quotations already on that enquiry) + 1. Users
 * asked for the quotation number to read back to its enquiry number.
 *
 * Collision-safe: the count is only a starting point (rows can be deleted,
 * or two requests can race), so the candidate is probed against
 * QUOT_REF_NO and incremented until it is free.
 *
 * Returns null when the enquiry has no ref no of its own — the caller then
 * falls back to the branch/date sequence generator.
 */
export async function generateLinkedQuotRefNo(
  company: string,
  enqId: number
): Promise<string | null> {
  const pool = await getPool(company)

  const base = await pool
    .request()
    .input("enq_id", sql.Int, enqId)
    .query<{ ENQREFNO: string | null; CNT: number }>(`
      SELECT
        e.ENQREFNO AS ENQREFNO,
        (SELECT COUNT(*) FROM [dbo].[TBL_QUOTATIONS] q WHERE q.ENQ_ID = e.PK_ID) AS CNT
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY] e
      WHERE e.PK_ID = @enq_id
    `)

  const row = base.recordset[0]
  const enqRef = row?.ENQREFNO?.trim()
  if (!enqRef) return null

  let n = (row.CNT ?? 0) + 1
  for (let attempt = 0; attempt < 50; attempt++, n++) {
    const candidate = `${enqRef}-Q${n}`
    const clash = await pool
      .request()
      .input("ref", sql.NVarChar, candidate)
      .query<{ CNT: number }>(`
        SELECT COUNT(*) AS CNT FROM [dbo].[TBL_QUOTATIONS] WHERE QUOT_REF_NO = @ref
      `)
    if ((clash.recordset[0]?.CNT ?? 0) === 0) return candidate
  }

  return null
}
