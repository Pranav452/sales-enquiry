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

const CARRIER_COLORS: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  "CMA CGM":     { bg: "#e8f4fd", text: "#1a4f7e", border: "#93c5fd", accent: "#2563eb" },
  "Maersk":      { bg: "#ebf5f0", text: "#145c37", border: "#6ee7b7", accent: "#16a34a" },
  "MSC":         { bg: "#fdf3e8", text: "#7c3d12", border: "#fbbf24", accent: "#d97706" },
  "ONE LINE":    { bg: "#f3e8fd", text: "#5b21b6", border: "#c4b5fd", accent: "#7c3aed" },
  "Hapag-Lloyd": { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", accent: "#dc2626" },
  "Evergreen":   { bg: "#f0fdf4", text: "#166534", border: "#86efac", accent: "#15803d" },
}
function carrierColor(carrier: string) {
  if (carrier.startsWith("CMA CGM")) return CARRIER_COLORS["CMA CGM"]
  if (carrier.startsWith("Maersk"))  return CARRIER_COLORS["Maersk"]
  if (carrier.startsWith("MSC"))     return CARRIER_COLORS["MSC"]
  return CARRIER_COLORS[carrier] ?? { bg: "#f3f4f6", text: "#374151", border: "#d1d5db", accent: "#6b7280" }
}

export default async function ClientRatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const company = token.startsWith("lk_") ? "links" : "manilal"
  let pool
  try { pool = await getPool(company) } catch { notFound() }

  const tokenResult = await pool!.request()
    .input("token", token)
    .query(`SELECT TOKEN_ID, DEST_ID, CLIENT_NAME, ACTIVE FROM [dbo].[TBL_RATE_SHEET_TOKENS] WHERE TOKEN = @token`)

  const tok = tokenResult.recordset[0]
  if (!tok || !tok.ACTIVE) notFound()

  const destId: number = tok.DEST_ID

  pool!.request()
    .input("token", token)
    .query(`UPDATE [dbo].[TBL_RATE_SHEET_TOKENS] SET LAST_VIEWED = GETDATE() WHERE TOKEN = @token`)
    .catch(() => {})

  const [destRes, ratesRes, schedRes] = await Promise.all([
    pool!.request().input("dest_id", destId)
      .query(`SELECT DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS] WHERE DEST_ID = @dest_id AND ACTIVE = 1`),
    pool!.request().input("dest_id", destId)
      .query(`SELECT RATE_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_AT FROM [dbo].[TBL_RATE_SHEET_RATES] WHERE DEST_ID = @dest_id ORDER BY CARRIER`),
    pool!.request().input("dest_id", destId)
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

  const destShortName = destination.PORT_NAME?.split(",")[0] ?? destination.DEST_NAME
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
          .topbar-inner { max-width: 740px; margin: 0 auto; display: flex; align-items: center; gap: 14px; }
          .logo-box { height: 44px; width: 44px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; padding: 4px; }
          .logo-box img { height: 100%; width: 100%; object-fit: contain; }
          .brand-name { color: white; font-weight: 700; font-size: 16px; line-height: 1.2; }
          .brand-sub { color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 2px; }

          .hero { background: white; border-bottom: 1px solid #e2e8f0; padding: 20px; }
          .hero-inner { max-width: 740px; margin: 0 auto; }
          .dest-name { font-size: 24px; font-weight: 800; color: #0f172a; }
          .dest-port { font-size: 14px; color: #64748b; margin-top: 4px; }
          .pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
          .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; border: 1px solid #e2e8f0; background: #f1f5f9; color: #475569; }
          .pill-green { background: #f0fdf4; color: #166534; border-color: #86efac; }
          .greeting { font-size: 13px; color: #475569; margin-top: 8px; }
          .updated { font-size: 11px; color: #94a3b8; margin-top: 4px; }

          .container { max-width: 740px; margin: 0 auto; padding: 0 16px 48px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: #94a3b8; margin: 24px 0 10px; }

          .req-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; display: flex; gap: 10px; align-items: flex-start; }
          .req-content ul { list-style: none; }
          .req-content li { font-size: 13px; color: #78350f; padding: 2px 0; }
          .req-content li::before { content: "• "; font-weight: 700; }

          /* ── Rates ─────────────────────────────────────── */
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

          /* ── Vessel Schedule Timeline ──────────────────── */
          .sched-carrier-head {
            padding: 10px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .sched-carrier-name { font-weight: 700; font-size: 13px; }
          .sched-count { font-size: 11px; font-weight: 600; background: rgba(0,0,0,0.07); border-radius: 999px; padding: 2px 8px; }

          .sailing-list { border-top: 1px solid #f1f5f9; }

          .sc { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; }
          .sc:last-child { border-bottom: none; }

          /* vessel header */
          .sc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
          .sc-vessel { display: flex; align-items: center; gap: 8px; }
          .sc-ship-icon { font-size: 17px; line-height: 1; flex-shrink: 0; }
          .sc-name { font-weight: 700; font-size: 13px; color: #0f172a; }
          .sc-tags { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 4px; padding-left: 25px; }
          .sc-tag { font-size: 10px; font-weight: 600; background: #f1f5f9; border-radius: 4px; padding: 1px 7px; color: #64748b; }
          .sc-gatein {
            font-size: 10px;
            font-weight: 700;
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 999px;
            padding: 3px 10px;
            color: #92400e;
            white-space: nowrap;
            flex-shrink: 0;
          }

          /* journey bar */
          .journey { display: flex; align-items: center; gap: 8px; }

          .jport { flex-shrink: 0; }
          .jport-right { text-align: right; }
          .jport-date { font-weight: 700; font-size: 12px; color: #0f172a; white-space: nowrap; }
          .jport-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; margin-top: 1px; }

          .jtrack { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
          .jtrack-line { display: flex; align-items: center; width: 100%; }
          .jdot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #1e3a5f;
            flex-shrink: 0;
            box-shadow: 0 0 0 2px rgba(30,58,95,0.18);
          }
          .jdot-dest { background: #0369a1; box-shadow: 0 0 0 2px rgba(3,105,161,0.18); }
          .jdash {
            flex: 1;
            height: 2px;
            background: repeating-linear-gradient(
              to right,
              #94a3b8 0, #94a3b8 4px,
              transparent 4px, transparent 9px
            );
          }
          .jship-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-shrink: 0;
            padding: 0 4px;
          }
          .jship { font-size: 20px; line-height: 1; }
          .jtime { font-size: 10px; font-weight: 700; color: #334155; letter-spacing: 0.02em; white-space: nowrap; margin-top: 2px; }
          .jvia { font-size: 10px; color: #64748b; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: center; }

          .footer { text-align: center; padding: 32px 16px 24px; border-top: 1px solid #e2e8f0; margin-top: 32px; }
          .footer p { font-size: 11px; color: #94a3b8; line-height: 1.7; }

          @media (max-width: 560px) {
            .rate-grid { grid-template-columns: 1fr; }
            .rate-cell { border-right: none; border-bottom: 1px solid #f1f5f9; }
            .rate-cell:last-child { border-bottom: none; }
            .dest-name { font-size: 20px; }
            .jport-date { font-size: 11px; }
            .jship { font-size: 16px; }
            .sc-name { font-size: 12px; }
            .journey { gap: 5px; }
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
            {clientName && <p className="greeting">Prepared exclusively for <strong>{clientName}</strong></p>}
            {lastUpdated && (
              <p className="updated">
                Rates last updated: {lastUpdated.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
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

          {/* Schedules — timeline view per carrier */}
          {carriers.filter(c => schedules.some(s => s.CARRIER === c)).map(carrier => {
            const carrierScheds = schedules.filter(s => s.CARRIER === carrier)
            const col = carrierColor(carrier)
            return (
              <div key={`sched-${carrier}`}>
                <div className="section-title">{carrier} — Upcoming Sailings</div>
                <div className="carrier-card" style={{ borderColor: col.border }}>
                  <div className="sched-carrier-head" style={{ background: col.bg }}>
                    <span className="sched-carrier-name" style={{ color: col.text }}>
                      🗓 Vessel Schedule
                    </span>
                    <span className="sched-count" style={{ color: col.text }}>
                      {carrierScheds.length} sailing{carrierScheds.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="sailing-list">
                    {carrierScheds.map(s => (
                      <div className="sc" key={s.SCHED_ID}>
                        {/* Vessel name + meta */}
                        <div className="sc-top">
                          <div>
                            <div className="sc-vessel">
                              <span className="sc-ship-icon">🚢</span>
                              <span className="sc-name">{s.VESSEL_NAME || "TBN — To Be Named"}</span>
                            </div>
                            {s.VOYAGE_NO && (
                              <div className="sc-tags">
                                <span className="sc-tag">{s.VOYAGE_NO}</span>
                              </div>
                            )}
                          </div>
                          {s.GATE_IN && (
                            <div className="sc-gatein">⏰ Gate-in: {s.GATE_IN}</div>
                          )}
                        </div>

                        {/* Journey timeline bar */}
                        <div className="journey">
                          {/* Origin */}
                          <div className="jport">
                            <div className="jport-date">{s.ETD || "—"}</div>
                            <div className="jport-label">Departure · India</div>
                          </div>

                          {/* Track */}
                          <div className="jtrack">
                            <div className="jtrack-line">
                              <div className="jdot" />
                              <div className="jdash" />
                              <div className="jship-wrap">
                                <span className="jship">🚢</span>
                              </div>
                              <div className="jdash" />
                              <div className="jdot jdot-dest" />
                            </div>
                            {s.TRANSIT_DAYS && (
                              <div className="jtime">{s.TRANSIT_DAYS}</div>
                            )}
                            {s.VIA_PORT && s.VIA_PORT !== "—" && (
                              <div className="jvia">via {s.VIA_PORT}</div>
                            )}
                          </div>

                          {/* Destination */}
                          <div className="jport jport-right">
                            <div className="jport-date">{s.ETA || "—"}</div>
                            <div className="jport-label">Arrival · {destShortName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
