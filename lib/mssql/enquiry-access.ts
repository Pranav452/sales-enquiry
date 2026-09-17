import type { Request as SqlRequest } from "mssql"
import type { AuthContext } from "@/lib/api-auth"
import { SALESPERSON_CODE_MAP } from "@/lib/constants/dropdowns"

/**
 * Row-level visibility rule for TBL_ADMIN_SALESENQUIRY.
 *
 * Admins see everything. A sales user sees rows they created plus rows
 * carrying their salesperson name — or any legacy short code that maps to
 * that name (pre-migration rows stored codes, not names).
 *
 * Returns a boolean SQL fragment (no WHERE keyword) or null when no
 * restriction applies, and registers its own parameters on `req`. Shared by
 * GET /api/enquiries and the link-enquiry suggestion search so the two can
 * never drift apart.
 *
 * @param prefix table alias including the dot, e.g. "e." — "" for none.
 */
export function enquiryVisibilityCondition(
  req: SqlRequest,
  auth: AuthContext,
  prefix = ""
): string | null {
  if (auth.role === "admin") return null

  req.input("acc_created_by", auth.userId)
  req.input("acc_salesperson", auth.salesperson ?? "")

  const parts = [
    `${prefix}CREATED_BY = @acc_created_by`,
    `${prefix}SALESPERSON = @acc_salesperson`,
  ]

  const oldCodes = Object.entries(SALESPERSON_CODE_MAP)
    .filter(([, name]) => name === auth.salesperson)
    .map(([code]) => code)

  if (oldCodes.length > 0) {
    oldCodes.forEach((code, i) => req.input(`acc_sp_code${i}`, code))
    const placeholders = oldCodes.map((_, i) => `@acc_sp_code${i}`).join(", ")
    parts.push(`${prefix}SALESPERSON IN (${placeholders})`)
  }

  return `(${parts.join(" OR ")})`
}
