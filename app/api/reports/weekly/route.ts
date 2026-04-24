import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/api-auth"
import { getPool } from "@/lib/mssql/client"
import { SALESPERSON_CODE_MAP } from "@/lib/constants/dropdowns"

interface EnqRow {
  enq_ref_no: string | null
  enq_receipt_date: string | null
  mode: string | null
  exim: string | null
  enq_type: string | null
  sales_person: string | null
  branch: string | null
  shipper: string | null
  consignee: string | null
  pol: string | null
  pod: string | null
  status: string | null
  remarks: string | null
}

interface PersonData {
  name: string
  enquiries: EnqRow[]
  statusCounts: Record<string, number>
  modeCounts: Record<string, number>
}

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc: Record<string, number>, item) => {
    const val = String(item[key] ?? "Unknown")
    acc[val] = (acc[val] ?? 0) + 1
    return acc
  }, {})
}

function fmtDate(v: string | null) {
  if (!v) return "—"
  return new Date(v).toLocaleDateString("en-GB")
}

function statusColor(s: string) {
  switch (s.toUpperCase()) {
    case "WIN": return "#16a34a"
    case "LOSE": return "#dc2626"
    case "FOLLOW UP": return "#d97706"
    case "QUOTED": return "#2563eb"
    case "PENDING": return "#7c3aed"
    case "NO FEEDBACK": return "#64748b"
    default: return "#94a3b8"
  }
}

function modeColor(m: string) {
  switch (m.toUpperCase()) {
    case "AIR": return "#0ea5e9"
    case "SEA": return "#0891b2"
    case "LAND": return "#78716c"
    case "COURIER": return "#f59e0b"
    case "RAIL": return "#8b5cf6"
    default: return "#94a3b8"
  }
}

function buildHtml(persons: PersonData[], dateFrom: string, dateTo: string, company: string): string {
  const total = persons.reduce((s, p) => s + p.enquiries.length, 0)
  const allEnqs = persons.flatMap((p) => p.enquiries)
  const allStatus = countBy(allEnqs, "status")
  const allMode = countBy(allEnqs, "mode")

  const statusColors = Object.keys(allStatus).map(statusColor)
  const modeColors = Object.keys(allMode).map(modeColor)

  const personSummaryRows = persons
    .map(
      (p) => `
      <tr>
        <td>${p.name}</td>
        <td style="text-align:center;font-weight:600">${p.enquiries.length}</td>
        <td style="text-align:center;color:#16a34a">${p.statusCounts["WIN"] ?? 0}</td>
        <td style="text-align:center;color:#dc2626">${p.statusCounts["LOSE"] ?? 0}</td>
        <td style="text-align:center;color:#d97706">${p.statusCounts["FOLLOW UP"] ?? 0}</td>
        <td style="text-align:center;color:#2563eb">${p.statusCounts["QUOTED"] ?? 0}</td>
        <td style="text-align:center;color:#64748b">${p.statusCounts["NO FEEDBACK"] ?? 0}</td>
      </tr>`
    )
    .join("")

  const personSections = persons
    .map((p) => {
      const statusKeys = Object.keys(p.statusCounts)
      const modeKeys = Object.keys(p.modeCounts)
      const safeId = p.name.replace(/[^a-zA-Z0-9]/g, "_")

      const enqRows = p.enquiries
        .map(
          (e) => `
          <tr>
            <td style="font-family:monospace;font-size:11px">${e.enq_ref_no ?? "—"}</td>
            <td>${fmtDate(e.enq_receipt_date)}</td>
            <td>${e.mode ?? "—"}</td>
            <td>${e.exim ?? "—"}</td>
            <td>${e.shipper ?? "—"}</td>
            <td>${e.consignee ?? "—"}</td>
            <td>${e.pol ?? "—"}</td>
            <td>${e.pod ?? "—"}</td>
            <td><span class="badge" style="background:${statusColor(e.status ?? "")}">${e.status ?? "—"}</span></td>
            <td style="color:#64748b;font-size:11px">${e.remarks ?? ""}</td>
          </tr>`
        )
        .join("")

      return `
      <section class="person-section" id="person-${safeId}">
        <div class="person-header">
          <h2>${p.name}</h2>
          <span class="person-count">${p.enquiries.length} enquiries this week</span>
        </div>
        <div class="chart-row">
          <div class="chart-box">
            <h4>By Status</h4>
            <canvas id="status-${safeId}" width="280" height="220"></canvas>
          </div>
          <div class="chart-box">
            <h4>By Mode</h4>
            <canvas id="mode-${safeId}" width="280" height="220"></canvas>
          </div>
          <div class="chart-box wide">
            <h4>Status Breakdown</h4>
            <canvas id="bar-${safeId}" width="380" height="220"></canvas>
          </div>
        </div>
        <div class="table-wrap">
          <table class="enq-table">
            <thead>
              <tr>
                <th>Ref No</th><th>Date</th><th>Mode</th><th>EXIM</th>
                <th>Shipper</th><th>Consignee</th><th>POL</th><th>POD</th>
                <th>Status</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>${enqRows}</tbody>
          </table>
        </div>
      </section>
      <script>
      (function(){
        var ctx1 = document.getElementById('status-${safeId}').getContext('2d');
        new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify(statusKeys)},
            datasets: [{ data: ${JSON.stringify(statusKeys.map((k) => p.statusCounts[k]))}, backgroundColor: ${JSON.stringify(statusKeys.map(statusColor))}, borderWidth: 2, borderColor: '#fff' }]
          },
          options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } }, cutout: '55%' }
        });
        var ctx2 = document.getElementById('mode-${safeId}').getContext('2d');
        new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify(modeKeys)},
            datasets: [{ data: ${JSON.stringify(modeKeys.map((k) => p.modeCounts[k]))}, backgroundColor: ${JSON.stringify(modeKeys.map(modeColor))}, borderWidth: 2, borderColor: '#fff' }]
          },
          options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } }, cutout: '55%' }
        });
        var ctx3 = document.getElementById('bar-${safeId}').getContext('2d');
        new Chart(ctx3, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(statusKeys)},
            datasets: [{ label: 'Count', data: ${JSON.stringify(statusKeys.map((k) => p.statusCounts[k]))}, backgroundColor: ${JSON.stringify(statusKeys.map(statusColor))}, borderRadius: 4 }]
          },
          options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
      })();
      </script>`
    })
    .join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Weekly Sales Report — ${company.toUpperCase()} — ${dateFrom} to ${dateTo}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; font-size: 13px; }
  .report-header { background: #1e3a5f; color: #fff; padding: 32px 40px; }
  .report-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
  .report-header p { opacity: 0.75; font-size: 13px; }
  .report-meta { display: flex; gap: 32px; margin-top: 16px; }
  .meta-item { }
  .meta-label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
  .toc { background: #fff; border-bottom: 1px solid #e2e8f0; padding: 16px 40px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .toc span { font-size: 12px; color: #64748b; margin-right: 4px; }
  .toc a { font-size: 12px; color: #2563eb; text-decoration: none; padding: 3px 10px; border: 1px solid #dbeafe; border-radius: 999px; }
  .toc a:hover { background: #eff6ff; }
  .summary-section { padding: 28px 40px; }
  .summary-section h2 { font-size: 16px; font-weight: 600; color: #334155; margin-bottom: 16px; }
  .summary-charts { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
  .summary-chart-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; flex: 1; min-width: 260px; }
  .summary-chart-box h4 { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 12px; }
  .summary-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .summary-table-wrap h3 { font-size: 14px; font-weight: 600; color: #334155; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #f1f5f9; }
  th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  tbody tr { border-top: 1px solid #f1f5f9; }
  tbody tr:hover { background: #f8fafc; }
  td { padding: 9px 14px; color: #334155; }
  .person-section { padding: 24px 40px; border-top: 2px solid #e2e8f0; }
  .person-header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 18px; }
  .person-header h2 { font-size: 18px; font-weight: 700; color: #1e293b; }
  .person-count { font-size: 13px; color: #64748b; background: #f1f5f9; padding: 2px 10px; border-radius: 999px; }
  .chart-row { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
  .chart-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; display: flex; flex-direction: column; align-items: center; }
  .chart-box h4 { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em; align-self: flex-start; }
  .chart-box.wide { flex: 1; min-width: 320px; align-items: stretch; }
  .chart-box.wide canvas { width: 100% !important; }
  .table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .enq-table td { font-size: 12px; }
  .badge { display: inline-block; color: #fff; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 8px; }
  @media print {
    .toc { display: none; }
    .person-section { page-break-before: always; }
  }
</style>
</head>
<body>

<header class="report-header">
  <h1>Weekly Sales Report — ${company.toUpperCase()}</h1>
  <p>Period: ${dateFrom} to ${dateTo}</p>
  <div class="report-meta">
    <div class="meta-item">
      <div class="meta-label">Total Enquiries</div>
      <div class="meta-value">${total}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Salespersons</div>
      <div class="meta-value">${persons.length}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Wins</div>
      <div class="meta-value" style="color:#4ade80">${allStatus["WIN"] ?? 0}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Generated</div>
      <div class="meta-value" style="font-size:14px">${new Date().toLocaleString("en-GB")}</div>
    </div>
  </div>
</header>

<nav class="toc">
  <span>Jump to:</span>
  ${persons.map((p) => `<a href="#person-${p.name.replace(/[^a-zA-Z0-9]/g, "_")}">${p.name} (${p.enquiries.length})</a>`).join("")}
</nav>

<section class="summary-section">
  <h2>Overall Summary</h2>
  <div class="summary-charts">
    <div class="summary-chart-box">
      <h4>Enquiries by Status</h4>
      <canvas id="summary-status" width="300" height="230"></canvas>
    </div>
    <div class="summary-chart-box">
      <h4>Enquiries by Mode</h4>
      <canvas id="summary-mode" width="300" height="230"></canvas>
    </div>
    <div class="summary-chart-box" style="flex:1.5;min-width:300px">
      <h4>Enquiries per Salesperson</h4>
      <canvas id="summary-person" width="400" height="230"></canvas>
    </div>
  </div>
  <div class="summary-table-wrap">
    <h3>Salesperson Breakdown</h3>
    <table>
      <thead>
        <tr>
          <th>Salesperson</th><th>Total</th><th>Win</th><th>Lose</th>
          <th>Follow Up</th><th>Quoted</th><th>No Feedback</th>
        </tr>
      </thead>
      <tbody>${personSummaryRows}</tbody>
    </table>
  </div>
</section>

<script>
(function(){
  var ctx = document.getElementById('summary-status').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ${JSON.stringify(Object.keys(allStatus))},
      datasets: [{ data: ${JSON.stringify(Object.values(allStatus))}, backgroundColor: ${JSON.stringify(statusColors)}, borderWidth: 2, borderColor: '#fff' }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } }, cutout: '55%' }
  });
  var ctx2 = document.getElementById('summary-mode').getContext('2d');
  new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ${JSON.stringify(Object.keys(allMode))},
      datasets: [{ data: ${JSON.stringify(Object.values(allMode))}, backgroundColor: ${JSON.stringify(modeColors)}, borderWidth: 2, borderColor: '#fff' }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 8 } } }, cutout: '55%' }
  });
  var ctx3 = document.getElementById('summary-person').getContext('2d');
  new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: ${JSON.stringify(persons.map((p) => p.name))},
      datasets: [{ label: 'Enquiries', data: ${JSON.stringify(persons.map((p) => p.enquiries.length))}, backgroundColor: '#3b82f6', borderRadius: 4 }]
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
})();
</script>

${personSections}

<footer class="footer">
  Generated by Sales CRM &bull; ${company.toUpperCase()} &bull; ${new Date().toLocaleString("en-GB")}
</footer>
</body>
</html>`
}

export async function GET() {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const dateTo = now.toISOString().split("T")[0]
  const from = new Date(now)
  from.setDate(from.getDate() - 7)
  const dateFrom = from.toISOString().split("T")[0]

  try {
    const pool = await getPool(auth.company)
    const request = pool.request()

    request.input("date_from", dateFrom)
    request.input("date_to", dateTo)

    const conditions = ["ENQRECPTDT >= @date_from", "ENQRECPTDT <= @date_to"]

    if (auth.role !== "admin") {
      request.input("created_by", auth.userId)
      request.input("salesperson_me", auth.salesperson ?? "")
      conditions.push("(CREATED_BY = @created_by OR SALESPERSON = @salesperson_me)")
    }

    const where = `WHERE ${conditions.join(" AND ")}`

    const result = await request.query(`
      SELECT
        ENQREFNO                         AS enq_ref_no,
        ENQRECPTDT                       AS enq_receipt_date,
        MODE                             AS mode,
        EXIM                             AS exim,
        ENQTYPE                          AS enq_type,
        SALESPERSON                      AS sales_person,
        BRANCH                           AS branch,
        SHIPPER                          AS shipper,
        CONSIGNEE                        AS consignee,
        POL                              AS pol,
        POD                              AS pod,
        STATUS                           AS status,
        REMARK                           AS remarks
      FROM [dbo].[TBL_ADMIN_SALESENQUIRY]
      ${where}
      ORDER BY SALESPERSON, ENQRECPTDT DESC
    `)

    const rows: EnqRow[] = result.recordset.map((r) => ({
      ...r,
      sales_person: SALESPERSON_CODE_MAP[r.sales_person] ?? r.sales_person,
    }))

    // Group by salesperson
    const byPerson = new Map<string, EnqRow[]>()
    for (const row of rows) {
      const name = row.sales_person ?? "Unknown"
      if (!byPerson.has(name)) byPerson.set(name, [])
      byPerson.get(name)!.push(row)
    }

    const persons: PersonData[] = Array.from(byPerson.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, enquiries]) => ({
        name,
        enquiries,
        statusCounts: countBy(enquiries, "status"),
        modeCounts: countBy(enquiries, "mode"),
      }))

    if (persons.length === 0) {
      const emptyHtml = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center">
        <h2>No enquiries found for the past 7 days (${dateFrom} to ${dateTo})</h2>
      </body></html>`
      return new NextResponse(emptyHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="Weekly_Report_${dateTo}.html"`,
        },
      })
    }

    const html = buildHtml(persons, dateFrom, dateTo, auth.company)

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="Weekly_Report_${dateTo}.html"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
