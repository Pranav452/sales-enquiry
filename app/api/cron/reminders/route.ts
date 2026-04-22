import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getPool } from "@/lib/mssql/client"
import { transporter } from "@/lib/email/mailer"
import { getAuthContext } from "@/lib/api-auth"

// ─── Types ────────────────────────────────────────────────────
interface ReminderRow {
  id:            string
  client_name:   string | null
  sales_person:  string | null
  activity_type: string | null
  activity_date: string | null
  reminder_date: string | null
  notes:         string | null
  db:            "Manilal" | "Links"
}

interface UserProfile {
  email:        string
  role:         string
  salesperson:  string | null
  full_name:    string | null
}

// ─── Supabase admin client (bypasses RLS) ─────────────────────
function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Fetch all user profiles ──────────────────────────────────
async function getUserProfiles(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from("user_profiles")
      .select("email, role, salesperson, full_name")
    if (error || !data) return []
    return data as UserProfile[]
  } catch {
    return []
  }
}

// ─── Fetch due reminders from one DB ─────────────────────────
async function getDueReminders(
  company: "manilal" | "links",
  label:   "Manilal" | "Links"
): Promise<ReminderRow[]> {
  try {
    const pool  = await getPool(company)
    const today = new Date().toISOString().split("T")[0]
    const result = await pool.request().query(`
      SELECT
        CAST(ID AS varchar(20))                  AS id,
        CLIENT_NAME                              AS client_name,
        SALES_PERSON                             AS sales_person,
        ACTIVITY_TYPE                            AS activity_type,
        CONVERT(varchar(10), ACTIVITY_DATE, 120) AS activity_date,
        REMINDER_DATE                            AS reminder_date,
        NOTES                                    AS notes
      FROM [dbo].[TBL_CALLS_VISITS]
      WHERE REMINDER_DONE = 0
        AND REMINDER_DATE IS NOT NULL
        AND REMINDER_DATE <= '${today}'
      ORDER BY REMINDER_DATE ASC, SALES_PERSON ASC
    `)
    return result.recordset.map((r) => ({ ...r, db: label }))
  } catch {
    return []
  }
}

// ─── Helpers ──────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  COLD_CALL:     "Cold Call",
  WARM_CALL:     "Warm Call",
  CLIENT_VISIT:  "Client Visit",
  VISIT_SECURED: "Visit — Secured",
}

function formatDate(d: string | null) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function daysOverdue(reminderDate: string, today: string): number {
  if (reminderDate >= today) return 0
  return Math.round((new Date(today).getTime() - new Date(reminderDate).getTime()) / 86400000)
}

// ─── Shared row HTML ──────────────────────────────────────────
function reminderRowHtml(r: ReminderRow, today: string, showPerson = false): string {
  const overdue      = daysOverdue(r.reminder_date!, today)
  const statusColor  = overdue > 0 ? "#dc2626" : "#d97706"
  const statusLabel  = overdue > 0 ? `${overdue}d overdue` : "Today"

  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      ${showPerson ? `<td style="padding:10px 12px;font-size:12px;font-weight:600;color:#374151;">${r.sales_person ?? "—"}</td>` : ""}
      <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#111827;">${r.client_name ?? "—"}</td>
      <td style="padding:10px 12px;font-size:12px;color:#6b7280;">${TYPE_LABELS[r.activity_type ?? ""] ?? r.activity_type ?? "—"}</td>
      <td style="padding:10px 12px;font-size:12px;">
        <span style="color:${statusColor};font-weight:600;">${statusLabel}</span><br/>
        <span style="color:#9ca3af;font-size:11px;">${formatDate(r.reminder_date)}</span>
      </td>
      <td style="padding:10px 12px;font-size:12px;color:#4b5563;max-width:240px;">${r.notes ?? "—"}</td>
      <td style="padding:10px 12px;font-size:11px;color:#9ca3af;">${r.db}</td>
    </tr>
  `
}

// ─── Email: personal (salesperson sees only their own) ─────────
function buildPersonalEmailHtml(person: string, rows: ReminderRow[], today: string): string {
  const todayFmt   = new Date(today + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const totalOverdue = rows.filter((r) => daysOverdue(r.reminder_date!, today) > 0).length
  const rowsHtml     = rows.map((r) => reminderRowHtml(r, today, false)).join("")

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

      <div style="background:#1e3a5f;padding:28px 32px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Hi ${person} 👋</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.65);">
          You have <strong style="color:#fff;">${rows.length} reminder call${rows.length !== 1 ? "s" : ""}</strong> due today · ${todayFmt}
        </p>
      </div>

      <div style="background:#eff6ff;border-bottom:1px solid #dbeafe;padding:14px 32px;display:flex;gap:24px;">
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${rows.length}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Total Due</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#dc2626;">${totalOverdue}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Overdue</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#d97706;">${rows.length - totalOverdue}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Due Today</div>
        </div>
        <div style="margin-left:auto;">
          <a href="https://sales-enquiry-two.vercel.app/activities"
            style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
            padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;">
            Open CRM →
          </a>
        </div>
      </div>

      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Client</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Type</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Reminder</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Notes</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">DB</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>

      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:11px;color:#9ca3af;text-align:center;">
        Sales Bridge CRM · Automated daily reminder · 9:00 AM IST
      </div>
    </div>
    </body></html>
  `
}

// ─── Email: admin full digest (all reminders grouped by person) ─
function buildAdminDigestHtml(all: ReminderRow[], today: string): string {
  const todayFmt    = new Date(today + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
  const totalOverdue = all.filter((r) => daysOverdue(r.reminder_date!, today) > 0).length

  // Group by sales person
  const grouped = new Map<string, ReminderRow[]>()
  for (const r of all) {
    const key = r.sales_person ?? "Unassigned"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  const sections = [...grouped.entries()].map(([person, rows]) => {
    const overdueCount = rows.filter((r) => daysOverdue(r.reminder_date!, today) > 0).length
    const rowsHtml     = rows.map((r) => reminderRowHtml(r, today, false)).join("")

    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#dbeafe;color:#1d4ed8;
            font-size:13px;font-weight:700;display:inline-flex;align-items:center;
            justify-content:center;margin-right:10px;flex-shrink:0;">
            ${person.charAt(0).toUpperCase()}
          </div>
          <span style="font-size:15px;font-weight:700;color:#111827;">${person}</span>
          ${overdueCount > 0 ? `<span style="margin-left:8px;background:#fee2e2;color:#dc2626;border-radius:9999px;
            padding:2px 10px;font-size:11px;font-weight:700;">${overdueCount} overdue</span>` : ""}
          <span style="margin-left:6px;font-size:12px;color:#6b7280;">(${rows.length} total)</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Client</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Type</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Reminder</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Notes</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">DB</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `
  }).join("")

  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:740px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

      <div style="background:#1e3a5f;padding:28px 32px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">📋 Daily Reminder Digest</h1>
        <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.65);">${todayFmt} · Admin Overview</p>
      </div>

      <div style="background:#eff6ff;border-bottom:1px solid #dbeafe;padding:14px 32px;display:flex;gap:24px;align-items:center;">
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${all.length}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Total</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#dc2626;">${totalOverdue}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Overdue</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#d97706;">${all.length - totalOverdue}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Due Today</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:22px;font-weight:800;color:#374151;">${grouped.size}</div>
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">People</div>
        </div>
        <div style="margin-left:auto;">
          <a href="https://sales-enquiry-two.vercel.app/activities"
            style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
            padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;">
            Open CRM →
          </a>
        </div>
      </div>

      <div style="padding:28px 32px;">
        ${sections || '<p style="color:#6b7280;text-align:center;padding:32px 0;">No pending reminders today.</p>'}
      </div>

      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:11px;color:#9ca3af;text-align:center;">
        Sales Bridge CRM · Manilal &amp; Sons · Automated admin digest · 9:00 AM IST
      </div>
    </div>
    </body></html>
  `
}

// ─── GET /api/cron/reminders ──────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().split("T")[0]

  // Fetch users + reminders in parallel
  const [profiles, manilalRows, linksRows] = await Promise.all([
    getUserProfiles(),
    getDueReminders("manilal", "Manilal"),
    getDueReminders("links",   "Links"),
  ])

  const all = [...manilalRows, ...linksRows]

  if (all.length === 0) {
    return NextResponse.json({ sent: false, reason: "No due reminders today", count: 0 })
  }

  // Build lookup maps from user_profiles
  // salesperson field (e.g. "SHRADDHA") → email
  const salesPersonEmailMap = new Map<string, string>()
  const adminEmails: string[] = []

  for (const p of profiles) {
    if (p.role === "admin" && p.email) {
      adminEmails.push(p.email)
    }
    if (p.salesperson && p.email) {
      salesPersonEmailMap.set(p.salesperson.toUpperCase().trim(), p.email)
    }
  }

  // Admin email set — used to avoid sending them a personal email too
  const adminEmailSet = new Set(adminEmails)

  // Group reminders by sales person
  const grouped = new Map<string, ReminderRow[]>()
  for (const r of all) {
    const key = (r.sales_person ?? "Unassigned").toUpperCase().trim()
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  const results: { email: string; type: string; count: number; ok: boolean }[] = []

  // ── Send personal emails to each sales person ──────────────
  for (const [personKey, rows] of grouped.entries()) {
    const email = salesPersonEmailMap.get(personKey)
    if (!email || adminEmailSet.has(email)) continue  // admins get digest instead

    const displayName = rows[0].sales_person ?? personKey
    try {
      await transporter.sendMail({
        from:    `"Sales Bridge CRM" <${process.env.GMAIL_USER}>`,
        to:      email,
        subject: `🔔 ${rows.length} Reminder Call${rows.length !== 1 ? "s" : ""} Due Today — ${formatDate(today)}`,
        html:    buildPersonalEmailHtml(displayName, rows, today),
      })
      results.push({ email, type: "personal", count: rows.length, ok: true })
    } catch (err) {
      results.push({ email, type: "personal", count: rows.length, ok: false })
      console.error(`[cron/reminders] Failed to send to ${email}:`, err)
    }
  }

  // ── Send full digest to all admins ─────────────────────────
  for (const adminEmail of adminEmails) {
    try {
      await transporter.sendMail({
        from:    `"Sales Bridge CRM" <${process.env.GMAIL_USER}>`,
        to:      adminEmail,
        subject: `📋 Admin Digest: ${all.length} Reminder${all.length !== 1 ? "s" : ""} Due Today — ${formatDate(today)}`,
        html:    buildAdminDigestHtml(all, today),
      })
      results.push({ email: adminEmail, type: "admin-digest", count: all.length, ok: true })
    } catch (err) {
      results.push({ email: adminEmail, type: "admin-digest", count: all.length, ok: false })
      console.error(`[cron/reminders] Failed to send admin digest to ${adminEmail}:`, err)
    }
  }

  return NextResponse.json({
    sent:  true,
    today,
    total: all.length,
    emails: results,
  })
}

// ─── POST /api/cron/reminders ─────────────────────────────────
// Manual trigger — admin only, no cron secret needed.
// Returns full result so admins can verify emails were sent.
export async function POST() {
  const auth = await getAuthContext()
  if (!auth)               return NextResponse.json({ error: "Unauthorized" },  { status: 401 })
  if (auth.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  // Re-use the same logic as the cron GET — create a synthetic request with no auth header
  // so the secret check is bypassed (admin session is the gate here).
  const syntheticReq = new NextRequest("http://localhost/api/cron/reminders", {
    headers: process.env.CRON_SECRET
      ? { authorization: `Bearer ${process.env.CRON_SECRET}` }
      : {},
  })
  return GET(syntheticReq)
}
