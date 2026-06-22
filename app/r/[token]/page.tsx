import { notFound } from "next/navigation"
import { getPool, sql } from "@/lib/mssql/client"

interface Rate {
  RATE_ID: number
  CARRIER: string
  CONTAINER_TYPE: string
  RATE_USD: string | null
  FREE_DAYS: string | null
  VALIDITY: string | null
  IS_SUSPENDED: boolean
  UPDATED_AT: string
}

interface Schedule {
  SCHED_ID: number
  CARRIER: string
  VESSEL_NAME: string | null
  VOYAGE_NO: string | null
  ETD: string | null
  ETA: string | null
  TRANSIT_DAYS: string | null
  VIA_PORT: string | null
  GATE_IN: string | null
}

interface Destination {
  DEST_NAME: string
  PORT_NAME: string | null
  CONTINENT: string | null
  REQUIREMENTS: string | null
}

const CARRIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "CMA CGM":     { bg: "#e8f4fd", text: "#1a4f7e", border: "#93c5fd" },
  "Maersk":      { bg: "#ebf5f0", text: "#145c37", border: "#6ee7b7" },
  "MSC":         { bg: "#fdf3e8", text: "#7c3d12", border: "#fbbf24" },
  "ONE LINE":    { bg: "#f3e8fd", text: "#5b21b6", border: "#c4b5fd" },
  "Hapag-Lloyd": { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  "Evergreen":   { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
}
function carrierColor(carrier: string) {
  return CARRIER_COLORS[carrier] ?? { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" }
}

export default async function ClientRatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const company = token.startsWith("lk_") ? "links" : "manilal"
  let pool
  try { pool = await getPool(company) } catch { notFound() }

  // Validate token
  const tokenResult = await pool!.request()
    .input("token", sql.NVarChar(100), token)
    .query(`SELECT TOKEN_ID, DEST_ID, CLIENT_NAME, ACTIVE FROM [dbo].[TBL_RATE_SHEET_TOKENS] WHERE TOKEN = @token`)

  const tok = tokenResult.recordset[0]
  if (!tok || !tok.ACTIVE) notFound()

  const destId: number = tok.DEST_ID

  // Fire-and-forget last viewed update
  pool!.request()
    .input("token", sql.NVarChar(100), token)
    .query(`UPDATE [dbo].[TBL_RATE_SHEET_TOKENS] SET LAST_VIEWED = GETDATE() WHERE TOKEN = @token`)
    .catch(() => {})

  const [destRes, ratesRes, schedRes] = await Promise.all([
    pool!.request().input("dest_id", sql.Int, destId)
      .query(`SELECT DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS] WHERE DEST_ID = @dest_id AND ACTIVE = 1`),
    pool!.request().input("dest_id", sql.Int, destId)
      .query(`SELECT RATE_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_AT FROM [dbo].[TBL_RATE_SHEET_RATES] WHERE DEST_ID = @dest_id ORDER BY CARRIER`),
    pool!.request().input("dest_id", sql.Int, destId)
      .query(`SELECT SCHED_ID, CARRIER, VESSEL_NAME, VOYAGE_NO, ETD, ETA, TRANSIT_DAYS, VIA_PORT, GATE_IN FROM [dbo].[TBL_RATE_SHEET_SCHEDULES] WHERE DEST_ID = @dest_id ORDER BY CARRIER, SORT_ORDER, CREATED_AT`),
  ])

  const destination: Destination = destRes.recordset[0]
  if (!destination) notFound()

  const rates: Rate[] = ratesRes.recordset
  const schedules: Schedule[] = schedRes.recordset
  const clientName: string | null = tok.CLIENT_NAME
  const isLinks = company === "links"

  const carriers = [...new Set([...rates.map(r => r.CARRIER), ...schedules.map(s => s.CARRIER)])]

  const lastUpdated = rates.length > 0
    ? new Date(rates.slice().sort((a, b) => new Date(b.UPDATED_AT).getTime() - new Date(a.UPDATED_AT).getTime())[0].UPDATED_AT)
    : null

  const requirements = destination.REQUIREMENTS
    ? destination.REQUIREMENTS.split("\n").map(r => r.trim()).filter(Boolean)
    : []

  const year = new Date().getFullYear()

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{destination.DEST_NAME} — Freight Rates</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased; }
          a { color: inherit; text-decoration: none; }

          .topbar { background: #1e3a5f; padding: 14px 20px; }
          .topbar-inner { max-width: 720px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
          .logo-box { height: 44px; width: 44px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px; }
          .logo-box img { height: 100%; width: 100%; object-fit: contain; }
          .brand-name { color: white; font-weight: 700; font-size: 16px; line-height: 1.2; }
          .brand-sub { color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 2px; }

          .hero { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px; }
          .hero-inner { max-width: 720px; margin: 0 auto; }
          .dest-name { font-size: 24px; font-weight: 800; color: #0f172a; }
          .dest-port { font-size: 14px; color: #64748b; margin-top: 4px; }
          .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
          .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; background: #f1f5f9; color: #475569; }
          .pill-green { background: #f0fdf4; color: #166534; border-color: #86efac; }
          .greeting { font-size: 13px; color: #475569; margin-top: 8px; }
          .updated { font-size: 11px; color: #94a3b8; margin-top: 4px; }

          .container { max-width: 720px; margin: 0 auto; padding: 0 16px 48px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: #94a3b8; margin: 24px 0 10px; }

          .req-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start; }
          .req-content ul { list-style: none; }
          .req-content li { font-size: 13px; color: #78350f; padding: 2px 0; }
          .req-content li::before { content: "• "; font-weight: 700; }

          .carrier-card { background: white; border-radius: 12px; overflow: hidden; margin-bottom: 14px; border: 1px solid #e2e8f0; }
          .carrier-head { padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
          .carrier-name { font-weight: 700; font-size: 14px; }
          .suspended-badge { background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; letter-spacing: 0.05em; }
          .rate-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid #f1f5f9; }
          .rate-cell { padding: 12px 16px; border-right: 1px solid #f1f5f9; }
          .rate-cell:last-child { border-right: none; }
          .rate-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 5px; }
          .rate-value { font-size: 14px; font-weight: 700; color: #0f172a; }
          .rate-value.accent { color: #0369a1; font-size: 15px; }
          .container-tag { font-size: 10px; color: #94a3b8; margin-top: 2px; }

          .sched-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .sched-table th { background: #f8fafc; color: #94a3b8; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em; padding: 9px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .sched-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
          .sched-table tr:last-child td { border-bottom: none; }
          .vessel-name { font-weight: 600; color: #0f172a; font-size: 13px; }
          .voyage-no { font-size: 11px; color: #64748b; margin-top: 1px; }
          .gate-in-label { font-size: 10px; font-weight: 700; color: #d97706; margin-top: 3px; }
          .etd { font-weight: 600; font-size: 13px; }
          .eta, .transit, .via { font-size: 12px; color: #475569; }

          .footer { text-align: center; padding: 32px 16px 24px; border-top: 1px solid #e2e8f0; margin-top: 32px; }
          .footer p { font-size: 11px; color: #94a3b8; line-height: 1.7; }

          @media (max-width: 580px) {
            .rate-grid { grid-template-columns: 1fr; }
            .rate-cell { border-right: none; border-bottom: 1px solid #f1f5f9; }
            .rate-cell:last-child { border-bottom: none; }
            .sched-table th:nth-child(4), .sched-table td:nth-child(4) { display: none; }
            .dest-name { font-size: 20px; }
          }
        `}</style>
      </head>
      <body>

        {/* Top bar */}
        <div className="topbar">
          <div className="topbar-inner">
            <div className="logo-box">
              <img src={isLinks ? "/linkslogo.png" : "/logo.jpeg"} alt={isLinks ? "Links" : "MP Cargo"} />
            </div>
            <div>
              <div className="brand-name">{isLinks ? "Links Group of Companies" : "MP Cargo"}</div>
              <div className="brand-sub">Freight Rate Sheet</div>
            </div>
          </div>
        </div>

        {/* Destination hero */}
        <div className="hero">
          <div className="hero-inner">
            <div className="dest-name">{destination.DEST_NAME}</div>
            {destination.PORT_NAME && <div className="dest-port">{destination.PORT_NAME}</div>}
            <div className="pills">
              {destination.CONTINENT && <span className="pill">{destination.CONTINENT}</span>}
              <span className="pill pill-green">40&quot; HC Container</span>
            </div>
            {clientName && <p className="greeting">Prepared for <strong>{clientName}</strong></p>}
            {lastUpdated && (
              <p className="updated">
                Last updated: {lastUpdated.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        </div>

        <div className="container">

          {/* Requirements */}
          {requirements.length > 0 && (
            <>
              <div className="section-title">Country Requirements</div>
              <div className="req-box">
                <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
                <div className="req-content">
                  <ul>{requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              </div>
            </>
          )}

          {/* Rates */}
          {rates.length > 0 && (
            <>
              <div className="section-title">Freight Rates</div>
              {carriers.filter(c => rates.some(r => r.CARRIER === c)).map(carrier => {
                const r = rates.find(r => r.CARRIER === carrier)!
                const col = carrierColor(carrier)
                return (
                  <div className="carrier-card" key={carrier} style={{ borderColor: col.border }}>
                    <div className="carrier-head" style={{ background: col.bg }}>
                      <span className="carrier-name" style={{ color: col.text }}>{carrier}</span>
                      {r.IS_SUSPENDED && <span className="suspended-badge">Service Suspended</span>}
                    </div>
                    {!r.IS_SUSPENDED && (
                      <div className="rate-grid">
                        <div className="rate-cell">
                          <div className="rate-label">Freight Rate</div>
                          <div className="rate-value accent">{r.RATE_USD || "—"}</div>
                          <div className="container-tag">{r.CONTAINER_TYPE}</div>
                        </div>
                        <div className="rate-cell">
                          <div className="rate-label">Free Days at POD</div>
                          <div className="rate-value">{r.FREE_DAYS || "—"}</div>
                        </div>
                        <div className="rate-cell">
                          <div className="rate-label">Rate Validity</div>
                          <div className="rate-value">{r.VALIDITY || "—"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Schedules per carrier */}
          {carriers.filter(c => schedules.some(s => s.CARRIER === c)).map(carrier => {
            const carrierScheds = schedules.filter(s => s.CARRIER === carrier)
            const col = carrierColor(carrier)
            return (
              <div key={`sched-${carrier}`}>
                <div className="section-title">{carrier} — Vessel Schedule</div>
                <div className="carrier-card" style={{ borderColor: col.border }}>
                  <table className="sched-table">
                    <thead>
                      <tr>
                        <th>Vessel / Voyage</th>
                        <th>Departure</th>
                        <th>Arrival</th>
                        <th>Transit</th>
                        <th>Via</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrierScheds.map(s => (
                        <tr key={s.SCHED_ID}>
                          <td>
                            <div className="vessel-name">{s.VESSEL_NAME || "TBN"}</div>
                            {s.VOYAGE_NO && <div className="voyage-no">{s.VOYAGE_NO}</div>}
                            {s.GATE_IN && <div className="gate-in-label">Gate-in: {s.GATE_IN}</div>}
                          </td>
                          <td><span className="etd">{s.ETD || "—"}</span></td>
                          <td><span className="eta">{s.ETA || "—"}</span></td>
                          <td><span className="transit">{s.TRANSIT_DAYS || "—"}</span></td>
                          <td><span className="via">{s.VIA_PORT || "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {rates.length === 0 && schedules.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8", fontSize: "14px" }}>
              Rates and schedules for this destination are being updated. Please check back soon.
            </div>
          )}

        </div>

        <div className="footer">
          <p>Rates are indicative and subject to change without prior notice.</p>
          <p>{isLinks ? "Links Group of Companies" : "MP Cargo"} · {year} · All rights reserved</p>
        </div>

      </body>
    </html>
  )
}

export const dynamic = "force-dynamic"
