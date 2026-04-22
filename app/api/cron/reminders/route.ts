import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mssql/client"
import { transporter } from "@/lib/email/mailer"

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

// ─── Query ────────────────────────────────────────────────────
async function getDueReminders(company: "manilal" | "links", label: "Manilal" | "Links"): Promise<ReminderRow[]> {
  try {
    const pool   = await getPool(company)
    const today  = new Date().toISOString().split("T")[0]
    const result = await pool.request().query(`
      SELECT
        CAST(ID AS varchar(20))         AS id,
        CLIENT_NAME                     AS client_name,
        SALES_PERSON                    AS sales_person,
        ACTIVITY_TYPE                   AS activity_type,
        CONVERT(varchar(10), ACTIVITY_DATE, 120) AS activity_date,
        REMINDER_DATE                   AS reminder_date,
        NOTES                           AS notes
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

function daysOverdue(reminderDate: string): number {
  const today = new Date().toISOString().split("T")[0]
  if (reminderDate >= today) return 0
  return Math.round((new Date(today).getTime() - new Date(reminderDate).getTime()) / 86400000)
}

// ─── Email HTML builder ───────────────────────────────────────
function buildEmailHtml(reminders: ReminderRow[], today: string): string {
  // Group by sales person
  const grouped = new Map<string, ReminderRow[]>()
  for (const r of reminders) {
    const key = r.sales_person ?? "Unassigned"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  const todayFmt = new Date(today + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  let sections = ""
  for (const [person, rows] of grouped.entries()) {
    const overdueRows  = rows.filter((r) => r.reminder_date! < today)
    const todayRows    = rows.filter((r) => r.reminder_date === today)

    const rowsHtml = rows.map((r) => {
      const overdue = daysOverdue(r.reminder_date!)
      const statusColor = overdue > 0 ? "#dc2626" : "#d97706"
      const statusLabel = overdue > 0 ? `${overdue}d overdue` : "Today"

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #111827;">
            ${r.client_name ?? "—"}
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #6b7280;">
            ${TYPE_LABELS[r.activity_type ?? ""] ?? r.activity_type ?? "—"}
          </td>
          <td style="padding: 10px 12px; font-size: 12px;">
            <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
            <br/><span style="color: #9ca3af; font-size: 11px;">${formatDate(r.reminder_date)}</span>
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #4b5563; max-width: 260px;">
            ${r.notes ?? "—"}
          </td>
          <td style="padding: 10px 12px; font-size: 11px; color: #9ca3af;">${r.db}</td>
        </tr>
      `
    }).join("")

    const badge = `<span style="display:inline-block;background:#fee2e2;color:#dc2626;border-radius:9999px;
      padding:2px 10px;font-size:11px;font-weight:700;margin-left:8px;">
      ${overdueRows.length} overdue
    </span>`

    sections += `
      <div style="margin-bottom: 28px;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:#dbeafe;color:#1d4ed8;
            font-size:13px;font-weight:700;display:inline-flex;align-items:center;
            justify-content:center;margin-right:10px;flex-shrink:0;">
            ${person.charAt(0).toUpperCase()}
          </div>
          <span style="font-size:15px;font-weight:700;color:#111827;">${person}</span>
          ${overdueRows.length > 0 ? badge : ""}
          <span style="margin-left:6px;font-size:12px;color:#6b7280;">
            (${rows.length} reminder${rows.length !== 1 ? "s" : ""} — ${todayRows.length} today)
          </span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;
                color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Client</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;
                color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Type</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;
                color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Reminder</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;
                color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Notes</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;
                color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">DB</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `
  }

  const totalOverdue = reminders.filter((r) => daysOverdue(r.reminder_date!) > 0).length

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"/></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:740px;margin:32px auto;background:#ffffff;border-radius:12px;
        overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

        <!-- Header -->
        <div style="background:#1e3a5f;padding:28px 32px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:22px;">🔔</div>
            <div>
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">
                Daily Reminder Digest
              </h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.65);">
                ${todayFmt} · Sales Bridge CRM
              </p>
            </div>
          </div>
        </div>

        <!-- Summary bar -->
        <div style="background:#eff6ff;border-bottom:1px solid #dbeafe;padding:14px 32px;
          display:flex;gap:24px;align-items:center;">
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#1d4ed8;">${reminders.length}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Total</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#dc2626;">${totalOverdue}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Overdue</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#d97706;">${reminders.length - totalOverdue}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Due Today</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#374151;">${grouped.size}</div>
            <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Sales People</div>
          </div>
          <div style="margin-left:auto;">
            <a href="https://sales-enquiry-two.vercel.app/activities"
              style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;
              padding:8px 18px;border-radius:6px;font-size:13px;font-weight:600;">
              Open CRM →
            </a>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;">
          ${sections || '<p style="color:#6b7280;text-align:center;padding:32px 0;">No pending reminders today.</p>'}
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;
          font-size:11px;color:#9ca3af;text-align:center;">
          Sales Bridge CRM · Manilal &amp; Sons · Automated daily digest<br/>
          This email is sent every morning at 9:00 AM IST.
        </div>
      </div>
    </body>
    </html>
  `
}

// ─── GET /api/cron/reminders ──────────────────────────────────
export async function GET(req: NextRequest) {
  // Verify Vercel cron secret (set CRON_SECRET in Vercel env vars)
  const authHeader = req.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date().toISOString().split("T")[0]

  // Fetch from both DBs in parallel
  const [manilalRows, linksRows] = await Promise.all([
    getDueReminders("manilal", "Manilal"),
    getDueReminders("links",   "Links"),
  ])

  const all = [...manilalRows, ...linksRows]

  if (all.length === 0) {
    return NextResponse.json({ sent: false, reason: "No due reminders today", count: 0 })
  }

  // Build email
  const html = buildEmailHtml(all, today)

  // Recipients: comma-separated env var
  const recipients = (process.env.REMINDER_EMAIL_TO ?? "").split(",").map((e) => e.trim()).filter(Boolean)
  if (recipients.length === 0) {
    return NextResponse.json({ error: "REMINDER_EMAIL_TO not configured" }, { status: 500 })
  }

  try {
    await transporter.sendMail({
      from:    `"Sales Bridge CRM" <${process.env.GMAIL_USER}>`,
      to:      recipients.join(", "),
      subject: `📋 ${all.length} Reminder${all.length !== 1 ? "s" : ""} Due Today — ${new Date(today + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      html,
    })

    return NextResponse.json({ sent: true, count: all.length, recipients })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Mail send failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
