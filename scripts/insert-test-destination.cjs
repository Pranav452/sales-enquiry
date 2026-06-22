// Run: node scripts/insert-test-destination.cjs
// Inserts a rich TEST destination into both DBs and prints client URLs.

const sql    = require("mssql")
const crypto = require("crypto")

const BASE = {
  port: 1433,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
}
const DBS = [
  { name: "manilal",   server: "180.179.207.163", user: "jolly_a", password: "Mpprod51", database: "manilal",   prefix: "mp" },
  { name: "LinksDB20", server: "180.179.207.163", user: "jolly_a", password: "Mpprod51", database: "LinksDB20", prefix: "lk" },
]

// ─── TEST DATA ────────────────────────────────────────────────────────────────

const DEST = {
  dest_name:    "Hamburg, Germany (Test)",
  port_name:    "Port of Hamburg, Germany",
  continent:    "Europe",
  requirements: "Import License required for restricted goods\nEUR / USD invoicing accepted\nPacking list & Certificate of Origin mandatory\nFumigation certificate required for wooden packaging",
}

const RATES = [
  {
    carrier:        "CMA CGM",
    container_type: "40HC",
    rate_usd:       "USD 4,280 per 40\"HC",
    free_days:      "21 days Merged Free Time at POD",
    validity:       "SPOT Rate — subject to change any time",
    is_suspended:   false,
  },
  {
    carrier:        "Maersk",
    container_type: "40HC",
    rate_usd:       "USD 3,950 per 40\"HC",
    free_days:      "14 days Free Time at POD",
    validity:       "Valid until 31 Jul 2026",
    is_suspended:   false,
  },
  {
    carrier:        "MSC",
    container_type: "40HC",
    rate_usd:       "USD 4,100 per 40\"HC",
    free_days:      "14 days Free Time at POD",
    validity:       "End of July 2026",
    is_suspended:   false,
  },
  {
    carrier:        "ONE LINE",
    container_type: "40HC",
    rate_usd:       "USD 4,510 per 40\"HC",
    free_days:      "10 days Free Time at POD",
    validity:       "SPOT Rate — subject to change any time",
    is_suspended:   false,
  },
  {
    carrier:        "Hapag-Lloyd",
    container_type: "40HC",
    rate_usd:       null,
    free_days:      null,
    validity:       null,
    is_suspended:   true,
  },
  {
    carrier:        "Evergreen",
    container_type: "40HC",
    rate_usd:       "USD 3,780 per 40\"HC",
    free_days:      "14 days Free Time at POD",
    validity:       "Valid until 15 Aug 2026",
    is_suspended:   false,
  },
]

const SCHEDULES = [
  // ── CMA CGM ─────────────────────────────────────────────
  { carrier: "CMA CGM", vessel_name: "CMA CGM VOLTAIRE",     voyage_no: "FE4-126E", etd: "1 Jul 2026",  eta: "29 Jul 2026",  transit_days: "28 days", via_port: "Port Klang, MY",  gate_in: "27 Jun 2026" },
  { carrier: "CMA CGM", vessel_name: "CMA CGM RABELAIS",     voyage_no: "FE4-127E", etd: "8 Jul 2026",  eta: "5 Aug 2026",   transit_days: "28 days", via_port: "Port Klang, MY",  gate_in: "4 Jul 2026" },
  { carrier: "CMA CGM", vessel_name: "CMA CGM TROCADERO",    voyage_no: "FE4-128E", etd: "15 Jul 2026", eta: "12 Aug 2026",  transit_days: "28 days", via_port: "Port Klang, MY",  gate_in: "11 Jul 2026" },
  { carrier: "CMA CGM", vessel_name: "APL TEMASEK",          voyage_no: "FE4-129E", etd: "22 Jul 2026", eta: "19 Aug 2026",  transit_days: "28 days", via_port: "Port Klang, MY",  gate_in: "18 Jul 2026" },
  { carrier: "CMA CGM", vessel_name: "CMA CGM LOUVRE",       voyage_no: "FE4-130E", etd: "29 Jul 2026", eta: "26 Aug 2026",  transit_days: "28 days", via_port: "Port Klang, MY",  gate_in: "25 Jul 2026" },

  // ── Maersk ──────────────────────────────────────────────
  { carrier: "Maersk", vessel_name: "MARIE MAERSK",          voyage_no: "AE-7 / 621W", etd: "3 Jul 2026",  eta: "1 Aug 2026",  transit_days: "29 days", via_port: "Colombo, LK",     gate_in: "29 Jun 2026" },
  { carrier: "Maersk", vessel_name: "MAERSK ELBA",           voyage_no: "AE-7 / 622W", etd: "10 Jul 2026", eta: "8 Aug 2026",  transit_days: "29 days", via_port: "Colombo, LK",     gate_in: "6 Jul 2026" },
  { carrier: "Maersk", vessel_name: "MAERSK EVORA",          voyage_no: "AE-7 / 623W", etd: "17 Jul 2026", eta: "15 Aug 2026", transit_days: "29 days", via_port: "Colombo, LK",     gate_in: "13 Jul 2026" },
  { carrier: "Maersk", vessel_name: "MAERSK ENPING",         voyage_no: "AE-7 / 624W", etd: "24 Jul 2026", eta: "22 Aug 2026", transit_days: "29 days", via_port: "Colombo, LK",     gate_in: "20 Jul 2026" },
  { carrier: "Maersk", vessel_name: "TBN",                   voyage_no: "AE-7 / 625W", etd: "31 Jul 2026", eta: "29 Aug 2026", transit_days: "29 days", via_port: "Colombo, LK",     gate_in: "27 Jul 2026" },

  // ── MSC ─────────────────────────────────────────────────
  { carrier: "MSC", vessel_name: "MSC ANNA",                 voyage_no: "AE-1 / UX626A", etd: "2 Jul 2026",  eta: "3 Aug 2026",  transit_days: "32 days", via_port: "Salalah, OM",     gate_in: null },
  { carrier: "MSC", vessel_name: "MSC BEATRICE",             voyage_no: "AE-1 / UX627A", etd: "9 Jul 2026",  eta: "10 Aug 2026", transit_days: "32 days", via_port: "Salalah, OM",     gate_in: null },
  { carrier: "MSC", vessel_name: "MSC CRISTINA",             voyage_no: "AE-1 / UX628A", etd: "16 Jul 2026", eta: "17 Aug 2026", transit_days: "32 days", via_port: "Salalah, OM",     gate_in: null },
  { carrier: "MSC", vessel_name: "MSC DIANA",                voyage_no: "AE-1 / UX629A", etd: "23 Jul 2026", eta: "24 Aug 2026", transit_days: "32 days", via_port: "Salalah, OM",     gate_in: "19 Jul 2026" },
  { carrier: "MSC", vessel_name: "TBN",                      voyage_no: "AE-1 / UX630A", etd: "30 Jul 2026", eta: "31 Aug 2026", transit_days: "32 days", via_port: "Salalah, OM",     gate_in: "26 Jul 2026" },

  // ── ONE LINE ────────────────────────────────────────────
  { carrier: "ONE LINE", vessel_name: "ONE STORK",           voyage_no: "IE1-126E",  etd: "5 Jul 2026",  eta: "7 Aug 2026",  transit_days: "33 days", via_port: "Singapore, SG",   gate_in: "1 Jul 2026" },
  { carrier: "ONE LINE", vessel_name: "ONE FALCON",          voyage_no: "IE1-127E",  etd: "12 Jul 2026", eta: "14 Aug 2026", transit_days: "33 days", via_port: "Singapore, SG",   gate_in: "8 Jul 2026" },
  { carrier: "ONE LINE", vessel_name: "ONE HAWK",            voyage_no: "IE1-128E",  etd: "19 Jul 2026", eta: "21 Aug 2026", transit_days: "33 days", via_port: "Singapore, SG",   gate_in: "15 Jul 2026" },
  { carrier: "ONE LINE", vessel_name: "ONE EAGLE",           voyage_no: "IE1-129E",  etd: "26 Jul 2026", eta: "28 Aug 2026", transit_days: "33 days", via_port: "Singapore, SG",   gate_in: "22 Jul 2026" },

  // ── Evergreen ───────────────────────────────────────────
  { carrier: "Evergreen", vessel_name: "EVER GENTLE",        voyage_no: "AEX-0126-E", etd: "4 Jul 2026",  eta: "3 Aug 2026",  transit_days: "30 days", via_port: "Port Klang, MY",  gate_in: "30 Jun 2026" },
  { carrier: "Evergreen", vessel_name: "EVER GRACE",         voyage_no: "AEX-0127-E", etd: "11 Jul 2026", eta: "10 Aug 2026", transit_days: "30 days", via_port: "Port Klang, MY",  gate_in: "7 Jul 2026" },
  { carrier: "Evergreen", vessel_name: "EVER GLORY",         voyage_no: "AEX-0128-E", etd: "18 Jul 2026", eta: "17 Aug 2026", transit_days: "30 days", via_port: "Port Klang, MY",  gate_in: "14 Jul 2026" },
  { carrier: "Evergreen", vessel_name: "EVER GREET",         voyage_no: "AEX-0129-E", etd: "25 Jul 2026", eta: "24 Aug 2026", transit_days: "30 days", via_port: "Port Klang, MY",  gate_in: "21 Jul 2026" },
]

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run(dbCfg) {
  const pool = await sql.connect({ ...BASE, ...dbCfg })
  console.log(`\n▶  ${dbCfg.name}`)

  // Remove any existing test destination to keep it clean
  const existing = await pool.request()
    .input("name", sql.NVarChar(100), DEST.dest_name)
    .query(`SELECT DEST_ID FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS] WHERE DEST_NAME = @name`)
  if (existing.recordset.length > 0) {
    const oldId = existing.recordset[0].DEST_ID
    await pool.request().input("id", sql.Int, oldId)
      .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_TOKENS]    WHERE DEST_ID = @id`)
    await pool.request().input("id", sql.Int, oldId)
      .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_SCHEDULES] WHERE DEST_ID = @id`)
    await pool.request().input("id", sql.Int, oldId)
      .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_RATES]     WHERE DEST_ID = @id`)
    await pool.request().input("id", sql.Int, oldId)
      .query(`DELETE FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS] WHERE DEST_ID = @id`)
    console.log("   Cleaned up previous test entry")
  }

  // Insert destination
  const dRes = await pool.request()
    .input("dest_name",    sql.NVarChar(100),     DEST.dest_name)
    .input("port_name",    sql.NVarChar(100),     DEST.port_name)
    .input("continent",    sql.NVarChar(50),      DEST.continent)
    .input("requirements", sql.NVarChar(sql.MAX), DEST.requirements)
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_DESTINATIONS] (DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS)
      OUTPUT INSERTED.DEST_ID
      VALUES (@dest_name, @port_name, @continent, @requirements)
    `)
  const destId = dRes.recordset[0].DEST_ID

  // Insert rates
  for (const r of RATES) {
    await pool.request()
      .input("dest_id",        sql.Int,           destId)
      .input("carrier",        sql.NVarChar(50),  r.carrier)
      .input("container_type", sql.NVarChar(20),  r.container_type)
      .input("rate_usd",       sql.NVarChar(300), r.rate_usd)
      .input("free_days",      sql.NVarChar(100), r.free_days)
      .input("validity",       sql.NVarChar(200), r.validity)
      .input("is_suspended",   sql.Bit,           r.is_suspended ? 1 : 0)
      .input("updated_by",     sql.NVarChar(200), "Test entry — design preview")
      .query(`
        INSERT INTO [dbo].[TBL_RATE_SHEET_RATES]
          (DEST_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_BY)
        VALUES (@dest_id, @carrier, @container_type, @rate_usd, @free_days, @validity, @is_suspended, @updated_by)
      `)
  }

  // Insert schedules
  for (const [i, s] of SCHEDULES.entries()) {
    await pool.request()
      .input("dest_id",      sql.Int,           destId)
      .input("carrier",      sql.NVarChar(50),  s.carrier)
      .input("vessel_name",  sql.NVarChar(200), s.vessel_name)
      .input("voyage_no",    sql.NVarChar(50),  s.voyage_no)
      .input("etd",          sql.NVarChar(30),  s.etd)
      .input("eta",          sql.NVarChar(30),  s.eta)
      .input("transit_days", sql.NVarChar(30),  s.transit_days)
      .input("via_port",     sql.NVarChar(100), s.via_port)
      .input("gate_in",      sql.NVarChar(30),  s.gate_in)
      .input("sort_order",   sql.Int,           i)
      .query(`
        INSERT INTO [dbo].[TBL_RATE_SHEET_SCHEDULES]
          (DEST_ID, CARRIER, VESSEL_NAME, VOYAGE_NO, ETD, ETA, TRANSIT_DAYS, VIA_PORT, GATE_IN, SORT_ORDER)
        VALUES (@dest_id, @carrier, @vessel_name, @voyage_no, @etd, @eta, @transit_days, @via_port, @gate_in, @sort_order)
      `)
  }

  // Generate a test token
  const token = `${dbCfg.prefix}_${crypto.randomBytes(10).toString("hex")}`
  await pool.request()
    .input("token",      sql.NVarChar(100), token)
    .input("company",    sql.NVarChar(50),  dbCfg.name === "manilal" ? "manilal" : "links")
    .input("dest_id",    sql.Int,           destId)
    .input("client_name",sql.NVarChar(200), "Test Client — Design Preview")
    .input("created_by", sql.NVarChar(200), "Admin — test script")
    .query(`
      INSERT INTO [dbo].[TBL_RATE_SHEET_TOKENS]
        (TOKEN, COMPANY, DEST_ID, CLIENT_NAME, CREATED_BY)
      VALUES (@token, @company, @dest_id, @client_name, @created_by)
    `)

  console.log(`   ✓  ${RATES.length} rates  ·  ${SCHEDULES.length} schedules`)
  console.log(`\n   Client URL (${dbCfg.name}):`)
  console.log(`   http://localhost:3000/r/${token}`)
  console.log(`   https://sales.mpcargo.in/r/${token}`)

  await pool.close()
  return token
}

;(async () => {
  for (const db of DBS) {
    try {
      await run(db)
    } catch (e) {
      console.error(`\n✗  ${db.name}:`, e.message)
    }
  }
  console.log("\n✅  Done.\n")
  process.exit(0)
})()
