// Run: node scripts/import-rate-sheet-data.cjs
// Imports all destinations, rates, and vessel schedules from
// "Vipar Rate Sheet July 2026.xlsx" into both manilal and LinksDB20.
// Safe to re-run — clears and re-inserts on each run.

const sql = require("mssql")

const BASE = {
  port: 1433,
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
  connectionTimeout: 30000,
  requestTimeout: 30000,
}

const DBS = [
  { name: "manilal",  server: "180.179.207.163", user: "jolly_a", password: "Mpprod51", database: "manilal" },
  { name: "LinksDB20", server: "180.179.207.163", user: "jolly_a", password: "Mpprod51", database: "LinksDB20" },
]

// ─── Master data extracted from Vipar Rate Sheet July 2026.xlsx ───────────────

const DATA = [
  // ── ANGOLA ──────────────────────────────────────────────────────────────────
  {
    dest_name: "Angola",
    port_name: "Luanda, Angola",
    continent: "Africa",
    requirements: "CNCA Certificate is Mandatory",
    rates: [
      { carrier: "CMA CGM (via Point Noire)", rate_usd: "USD 3,609 per 40\"HC via Point Noire", free_days: "15 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "CMA CGM (via Durban)",      rate_usd: "USD 3,359 per 40\"HC via Durban",      free_days: "15 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: "USD 2,673 per 40\"HC", free_days: "13 days Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "MSC",     rate_usd: "USD 4,435 per 40\"HC", free_days: "14 days Free Time at POD",  validity: "End of June 2026",                         is_suspended: false },
    ],
    schedules: [
      // Maersk
      { carrier: "Maersk", vessel_name: "MAERSK CUBANGO",        voyage_no: "626W", etd: "9 Jul 2026",  eta: "8 Aug 2026",  transit_days: "30 days", via_port: null,          gate_in: "5 Jul 2026" },
      { carrier: "Maersk", vessel_name: "MAERSK FLORENCE",       voyage_no: "628W", etd: "16 Jul 2026", eta: "22 Aug 2026", transit_days: "37 days", via_port: null,          gate_in: "12 Jul 2026" },
      { carrier: "Maersk", vessel_name: "CMA CGM MASAI MARA",    voyage_no: "630W", etd: "30 Jul 2026", eta: "5 Sep 2026",  transit_days: "37 days", via_port: null,          gate_in: null },
      // CMA CGM (via Point Noire)
      { carrier: "CMA CGM (via Point Noire)", vessel_name: "MAERSK CUBANGO",         voyage_no: null, etd: "6 Jul 2026",  eta: "29 Jul 2026",  transit_days: "23 days", via_port: "Pointe Noire, CG", gate_in: null },
      { carrier: "CMA CGM (via Point Noire)", vessel_name: "MAERSK FLORENCE",        voyage_no: null, etd: "16 Jul 2026", eta: "12 Aug 2026",  transit_days: "28 days", via_port: "Pointe Noire, CG", gate_in: null },
      { carrier: "CMA CGM (via Point Noire)", vessel_name: "CMA CGM MASAI MARA",     voyage_no: null, etd: "30 Jul 2026", eta: "26 Aug 2026",  transit_days: "28 days", via_port: "Pointe Noire, CG", gate_in: null },
      // CMA CGM (via Durban)
      { carrier: "CMA CGM (via Durban)", vessel_name: "CUSSLER",                  voyage_no: null, etd: "5 Jul 2026",  eta: "30 Jul 2026",  transit_days: "25 days", via_port: "Durban, ZA", gate_in: null },
      { carrier: "CMA CGM (via Durban)", vessel_name: "CMA CGM PUERTO ANTIOQUIA", voyage_no: null, etd: "17 Jul 2026", eta: "13 Aug 2026",  transit_days: "27 days", via_port: "Durban, ZA", gate_in: null },
      { carrier: "CMA CGM (via Durban)", vessel_name: "ALIANCA MANAUS",           voyage_no: null, etd: "24 Jul 2026", eta: "20 Aug 2026",  transit_days: "27 days", via_port: "Durban, ZA", gate_in: null },
      { carrier: "CMA CGM (via Durban)", vessel_name: "CMA CGM ZANZIBAR",         voyage_no: null, etd: "31 Jul 2026", eta: "3 Sep 2026",   transit_days: "34 days", via_port: "Durban, ZA", gate_in: null },
      // MSC
      { carrier: "MSC", vessel_name: "MSC SIYA B",    voyage_no: "IW627A", etd: "7 Jul 2026",  eta: "21 Aug 2026", transit_days: "45 days", via_port: null, gate_in: null },
      { carrier: "MSC", vessel_name: "TBN",           voyage_no: "IW628A", etd: "14 Jul 2026", eta: "27 Aug 2026", transit_days: "44 days", via_port: null, gate_in: null },
      { carrier: "MSC", vessel_name: "MSC PRELUDE V", voyage_no: "IW629A", etd: "29 Jul 2026", eta: "10 Sep 2026", transit_days: "43 days", via_port: null, gate_in: null },
    ],
  },

  // ── MADAGASCAR ───────────────────────────────────────────────────────────────
  {
    dest_name: "Madagascar",
    port_name: "Tamatave, Madagascar",
    continent: "Africa",
    requirements: "Engine Number / Chassis Number mandatory on MBL\nMBL Seaway BL allowed / HBL allowed",
    rates: [
      { carrier: "CMA CGM", rate_usd: "USD 2,407 per 40\"HC", free_days: "13 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: null,                   free_days: null,                              validity: null,                                     is_suspended: true },
      { carrier: "MSC",     rate_usd: "USD 2,315 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "End of June 2026",                       is_suspended: false },
    ],
    schedules: [
      // CMA CGM (via Colombo)
      { carrier: "CMA CGM", vessel_name: "CMA CGM CONGO",     voyage_no: null, etd: "29 Jun 2026", eta: "5 Aug 2026",  transit_days: "37 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM GANGES",    voyage_no: null, etd: "6 Jul 2026",  eta: "5 Aug 2026",  transit_days: "30 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO",  voyage_no: null, etd: "7 Jul 2026",  eta: "5 Aug 2026",  transit_days: "29 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM NABUCCO",   voyage_no: null, etd: "9 Jul 2026",  eta: "5 Aug 2026",  transit_days: "28 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "APL ANTWERP",       voyage_no: null, etd: "12 Jul 2026", eta: "18 Aug 2026", transit_days: "37 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM VELA",      voyage_no: null, etd: "16 Jul 2026", eta: "18 Aug 2026", transit_days: "33 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO",  voyage_no: null, etd: "19 Jul 2026", eta: "25 Aug 2026", transit_days: "37 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM AQUILA",    voyage_no: null, etd: "22 Jul 2026", eta: "25 Aug 2026", transit_days: "33 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM VERDI",     voyage_no: null, etd: "26 Jul 2026", eta: "1 Sep 2026",  transit_days: "37 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM BELCODENE", voyage_no: null, etd: "29 Jul 2026", eta: "1 Sep 2026",  transit_days: "34 days", via_port: "Colombo, LK", gate_in: null },
      // MSC
      { carrier: "MSC", vessel_name: "MSC SUAPE VII",    voyage_no: "IV625A", etd: "26 Jun 2026", eta: "28 Jul 2026", transit_days: "32 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC TASMAN VI",    voyage_no: "IV627A", etd: "2 Jul 2026",  eta: "28 Jul 2026", transit_days: "26 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC SOFIA CELESTE",voyage_no: "IV628A", etd: "10 Jul 2026", eta: "13 Aug 2026", transit_days: "34 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC JASMINE X",    voyage_no: "IV629A", etd: "17 Jul 2026", eta: "13 Aug 2026", transit_days: "27 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC RACHELE",      voyage_no: "IV630A", etd: "24 Jul 2026", eta: "13 Aug 2026", transit_days: "20 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "KLEVEN",           voyage_no: "IV631A", etd: "31 Jul 2026", eta: "20 Aug 2026", transit_days: "20 days", via_port: "Transhipment", gate_in: null },
    ],
  },

  // ── DJIBOUTI ─────────────────────────────────────────────────────────────────
  {
    dest_name: "Djibouti",
    port_name: "Port of Djibouti, Djibouti",
    continent: "Africa",
    requirements: "CNCA Certificate is Mandatory",
    rates: [
      { carrier: "CMA CGM", rate_usd: "USD 6,060 per 40\"HC", free_days: "14 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: "USD 2,031 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "MSC",     rate_usd: "USD 3,182 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "End of June 2026",                       is_suspended: false },
    ],
    schedules: [
      // CMA CGM (MEDEX direct service)
      { carrier: "CMA CGM", vessel_name: "CMA CGM COLUMBIA",  voyage_no: null, etd: "26 Jun 2026", eta: "9 Jul 2026",  transit_days: "12 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM CENDRILLON",voyage_no: null, etd: "1 Jul 2026",  eta: "16 Jul 2026", transit_days: "14 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM PELLEAS",   voyage_no: null, etd: "18 Jul 2026", eta: "29 Jul 2026", transit_days: "11 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM BUTTERFLY", voyage_no: null, etd: "23 Jul 2026", eta: "4 Aug 2026",  transit_days: "12 days", via_port: "Direct", gate_in: null },
      // Maersk
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "1 Jul 2026",  eta: "11 Jul 2026", transit_days: "~10 days", via_port: null, gate_in: null },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "13 Jul 2026", eta: "1 Aug 2026",  transit_days: "~19 days", via_port: null, gate_in: null },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "15 Jul 2026", eta: "1 Aug 2026",  transit_days: "~17 days", via_port: null, gate_in: null },
      // MSC
      { carrier: "MSC", vessel_name: "MSC AURORA",     voyage_no: "IS626A", etd: "26 Jun 2026", eta: "16 Jul 2026", transit_days: "20 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC SIMONA",     voyage_no: "IS627A", etd: "6 Jul 2026",  eta: "25 Jul 2026", transit_days: "19 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC VIRGINIA",   voyage_no: "IS628A", etd: "15 Jul 2026", eta: "4 Aug 2026",  transit_days: "20 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC WASHINGTON", voyage_no: "IS629A", etd: "21 Jul 2026", eta: "4 Aug 2026",  transit_days: "14 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "TBN",            voyage_no: "IS630A", etd: "24 Jul 2026", eta: "18 Aug 2026", transit_days: "25 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC VERONA",     voyage_no: "IS631A", etd: "31 Jul 2026", eta: "18 Aug 2026", transit_days: "18 days", via_port: "Transhipment", gate_in: null },
    ],
  },

  // ── MOZAMBIQUE ───────────────────────────────────────────────────────────────
  {
    dest_name: "Mozambique",
    port_name: "Beira, Mozambique",
    continent: "Africa",
    requirements: "CNCA Certificate is Mandatory",
    rates: [
      { carrier: "CMA CGM", rate_usd: "USD 3,720 per 40\"HC", free_days: "10 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: null,                   free_days: null,                              validity: null,                                     is_suspended: true },
      { carrier: "MSC",     rate_usd: "USD 5,700 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "End of June 2026",                       is_suspended: false },
    ],
    schedules: [
      // CMA CGM (via Colombo)
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO", voyage_no: null, etd: "25 Jun 2026", eta: "24 Jul 2026", transit_days: "30 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM CONGO",    voyage_no: null, etd: "29 Jun 2026", eta: "24 Jul 2026", transit_days: "26 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM GANGES",   voyage_no: null, etd: "6 Jul 2026",  eta: "6 Aug 2026",  transit_days: "31 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO", voyage_no: null, etd: "7 Jul 2026",  eta: "6 Aug 2026",  transit_days: "30 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM NABUCCO",  voyage_no: null, etd: "9 Jul 2026",  eta: "27 Jul 2026", transit_days: "19 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "APL ANTWERP",      voyage_no: null, etd: "12 Jul 2026", eta: "6 Aug 2026",  transit_days: "25 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM VELA",     voyage_no: null, etd: "16 Jul 2026", eta: "6 Aug 2026",  transit_days: "21 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO", voyage_no: null, etd: "19 Jul 2026", eta: "12 Aug 2026", transit_days: "24 days", via_port: "Colombo, LK", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM AQUILA",   voyage_no: null, etd: "22 Jul 2026", eta: "12 Aug 2026", transit_days: "20 days", via_port: "Colombo, LK", gate_in: null },
      // MSC
      { carrier: "MSC", vessel_name: "MSC SUAPE VII",    voyage_no: "IV625A", etd: "26 Jun 2026", eta: "24 Jul 2026", transit_days: "28 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC TASMAN VI",    voyage_no: "IV627A", etd: "2 Jul 2026",  eta: "24 Jul 2026", transit_days: "22 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC SOFIA CELESTE",voyage_no: "IV628A", etd: "10 Jul 2026", eta: "2 Aug 2026",  transit_days: "23 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC JASMINE X",    voyage_no: "IV629A", etd: "17 Jul 2026", eta: "2 Aug 2026",  transit_days: "16 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC RACHELE",      voyage_no: "IV630A", etd: "24 Jul 2026", eta: "15 Aug 2026", transit_days: "22 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "KLEVEN",           voyage_no: "IV631A", etd: "31 Jul 2026", eta: "15 Aug 2026", transit_days: "15 days", via_port: "Transhipment", gate_in: null },
    ],
  },

  // ── ZAMBIA ───────────────────────────────────────────────────────────────────
  {
    dest_name: "Zambia",
    port_name: "Lusaka, Zambia (via Beira)",
    continent: "Africa",
    requirements: null,
    rates: [
      { carrier: "CMA CGM", rate_usd: "USD 3,720 (Ocean) + USD 6,296 (ONC) = USD 10,016 per 40\"HC", free_days: "10 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: null,                                                          free_days: null,                              validity: null,                                     is_suspended: true },
      { carrier: "MSC",     rate_usd: "USD 5,700 (Ocean) + USD 4,805 (ONC) = USD 10,505 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "End of June 2026",                       is_suspended: false },
    ],
    schedules: [
      // Ocean leg is identical to Mozambique (Beira) — vessel schedules same
      // CMA CGM (via Colombo → Beira → Lusaka inland)
      { carrier: "CMA CGM", vessel_name: "ZHONG GU RI ZHAO", voyage_no: null, etd: "25 Jun 2026", eta: "24 Jul 2026", transit_days: "30 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM CONGO",    voyage_no: null, etd: "29 Jun 2026", eta: "24 Jul 2026", transit_days: "26 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM GANGES",   voyage_no: null, etd: "6 Jul 2026",  eta: "6 Aug 2026",  transit_days: "31 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM NABUCCO",  voyage_no: null, etd: "9 Jul 2026",  eta: "27 Jul 2026", transit_days: "19 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "APL ANTWERP",      voyage_no: null, etd: "12 Jul 2026", eta: "6 Aug 2026",  transit_days: "25 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM VELA",     voyage_no: null, etd: "16 Jul 2026", eta: "6 Aug 2026",  transit_days: "21 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM AQUILA",   voyage_no: null, etd: "22 Jul 2026", eta: "12 Aug 2026", transit_days: "20 days (ocean)", via_port: "Colombo, LK → Beira", gate_in: null },
      // MSC
      { carrier: "MSC", vessel_name: "MSC SUAPE VII",    voyage_no: "IV625A", etd: "26 Jun 2026", eta: "24 Jul 2026", transit_days: "28 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC TASMAN VI",    voyage_no: "IV627A", etd: "2 Jul 2026",  eta: "24 Jul 2026", transit_days: "22 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC SOFIA CELESTE",voyage_no: "IV628A", etd: "10 Jul 2026", eta: "2 Aug 2026",  transit_days: "23 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC JASMINE X",    voyage_no: "IV629A", etd: "17 Jul 2026", eta: "2 Aug 2026",  transit_days: "16 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC RACHELE",      voyage_no: "IV630A", etd: "24 Jul 2026", eta: "15 Aug 2026", transit_days: "22 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
      { carrier: "MSC", vessel_name: "KLEVEN",           voyage_no: "IV631A", etd: "31 Jul 2026", eta: "15 Aug 2026", transit_days: "15 days (ocean)", via_port: "Transhipment → Beira", gate_in: null },
    ],
  },

  // ── TANZANIA ─────────────────────────────────────────────────────────────────
  {
    dest_name: "Tanzania",
    port_name: "Dar es Salaam, Tanzania",
    continent: "Africa",
    requirements: null,
    rates: [
      { carrier: "CMA CGM", rate_usd: "USD 2,270 per 40\"HC", free_days: "14 days Merged Free Time at POD", validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "Maersk",  rate_usd: "USD 1,880 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "SPOT Rate — subject to change any time", is_suspended: false },
      { carrier: "MSC",     rate_usd: "USD 2,200 per 40\"HC", free_days: "14 days Free Time at POD",        validity: "End of June 2026",                       is_suspended: false },
    ],
    schedules: [
      // CMA CGM (SWAX2 — direct service)
      { carrier: "CMA CGM", vessel_name: "SOL UNITY",             voyage_no: null, etd: "30 Jun 2026", eta: "11 Jul 2026", transit_days: "11 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM MOMBASA",       voyage_no: null, etd: "2 Jul 2026",  eta: "14 Jul 2026", transit_days: "12 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM GOMBE",         voyage_no: null, etd: "9 Jul 2026",  eta: "21 Jul 2026", transit_days: "12 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM SEMARANG",      voyage_no: null, etd: "16 Jul 2026", eta: "28 Jul 2026", transit_days: "12 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM NAMIBE",        voyage_no: null, etd: "23 Jul 2026", eta: "4 Aug 2026",  transit_days: "12 days", via_port: "Direct", gate_in: null },
      { carrier: "CMA CGM", vessel_name: "CMA CGM FORT ST GEORGES",voyage_no: null,etd: "30 Jul 2026", eta: "11 Aug 2026", transit_days: "12 days", via_port: "Direct", gate_in: null },
      // Maersk
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "29 Jun 2026", eta: "19 Jul 2026", transit_days: "20 days", via_port: null, gate_in: "9 Jul 2026" },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "6 Jul 2026",  eta: "26 Jul 2026", transit_days: "20 days", via_port: null, gate_in: "16 Jul 2026" },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "13 Jul 2026", eta: "2 Aug 2026",  transit_days: "20 days", via_port: null, gate_in: "23 Jul 2026" },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "15 Jul 2026", eta: "9 Aug 2026",  transit_days: "25 days", via_port: null, gate_in: "30 Jul 2026" },
      { carrier: "Maersk", vessel_name: "TBN", voyage_no: null, etd: "15 Jul 2026", eta: "2 Aug 2026",  transit_days: "18 days", via_port: null, gate_in: "23 Jul 2026" },
      // MSC
      { carrier: "MSC", vessel_name: "MSC ROBERTA V", voyage_no: "OM626A", etd: "1 Jul 2026",  eta: "19 Jul 2026", transit_days: "18 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC GLORY R",   voyage_no: "OM627A", etd: "8 Jul 2026",  eta: "26 Jul 2026", transit_days: "18 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "TBN",           voyage_no: "OM628A", etd: "15 Jul 2026", eta: "2 Aug 2026",  transit_days: "18 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "TBN",           voyage_no: "OM629A", etd: "22 Jul 2026", eta: "9 Aug 2026",  transit_days: "18 days", via_port: "Transhipment", gate_in: null },
      { carrier: "MSC", vessel_name: "MSC TIA V",     voyage_no: "OM630A", etd: "29 Jul 2026", eta: "17 Aug 2026", transit_days: "19 days", via_port: "Transhipment", gate_in: null },
    ],
  },

  // ── FAR EAST (placeholders — no data in sheet yet) ─────────────────────────
  { dest_name: "Myanmar",   port_name: "Yangon, Myanmar",       continent: "Far East", requirements: null, rates: [], schedules: [] },
  { dest_name: "Cambodia",  port_name: "Sihanoukville, Cambodia",continent: "Far East", requirements: null, rates: [], schedules: [] },
  { dest_name: "Indonesia", port_name: "Jakarta, Indonesia",    continent: "Far East", requirements: null, rates: [], schedules: [] },
  { dest_name: "Sri Lanka", port_name: "Colombo, Sri Lanka",    continent: "Far East", requirements: null, rates: [], schedules: [] },
]

// ─── Import runner ─────────────────────────────────────────────────────────────

async function importToDb(dbCfg) {
  const pool = await sql.connect({ ...BASE, ...dbCfg })
  console.log(`\n▶  Connected to ${dbCfg.name}`)

  // Wipe existing data (re-run safe)
  await pool.request().query(`DELETE FROM [dbo].[TBL_RATE_SHEET_SCHEDULES]`)
  await pool.request().query(`DELETE FROM [dbo].[TBL_RATE_SHEET_RATES]`)
  await pool.request().query(`DELETE FROM [dbo].[TBL_RATE_SHEET_DESTINATIONS]`)
  console.log("   Cleared existing data")

  let totalRates = 0, totalScheds = 0

  for (const dest of DATA) {
    // Insert destination
    const destRes = await pool.request()
      .input("dest_name",    sql.NVarChar(100),     dest.dest_name)
      .input("port_name",    sql.NVarChar(100),     dest.port_name)
      .input("continent",    sql.NVarChar(50),      dest.continent)
      .input("requirements", sql.NVarChar(sql.MAX), dest.requirements)
      .query(`
        INSERT INTO [dbo].[TBL_RATE_SHEET_DESTINATIONS]
          (DEST_NAME, PORT_NAME, CONTINENT, REQUIREMENTS)
        OUTPUT INSERTED.DEST_ID
        VALUES (@dest_name, @port_name, @continent, @requirements)
      `)
    const destId = destRes.recordset[0].DEST_ID

    // Insert rates
    for (const [i, r] of dest.rates.entries()) {
      await pool.request()
        .input("dest_id",        sql.Int,           destId)
        .input("carrier",        sql.NVarChar(50),  r.carrier)
        .input("container_type", sql.NVarChar(20),  "40HC")
        .input("rate_usd",       sql.NVarChar(300), r.rate_usd)
        .input("free_days",      sql.NVarChar(100), r.free_days)
        .input("validity",       sql.NVarChar(200), r.validity)
        .input("is_suspended",   sql.Bit,           r.is_suspended ? 1 : 0)
        .input("updated_by",     sql.NVarChar(200), "Import — Vipar Rate Sheet Jul 2026")
        .query(`
          INSERT INTO [dbo].[TBL_RATE_SHEET_RATES]
            (DEST_ID, CARRIER, CONTAINER_TYPE, RATE_USD, FREE_DAYS, VALIDITY, IS_SUSPENDED, UPDATED_BY)
          VALUES (@dest_id, @carrier, @container_type, @rate_usd, @free_days, @validity, @is_suspended, @updated_by)
        `)
      totalRates++
    }

    // Insert schedules
    for (const [i, s] of dest.schedules.entries()) {
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
      totalScheds++
    }

    console.log(`   ✓  ${dest.dest_name.padEnd(12)} — ${dest.rates.length} rates, ${dest.schedules.length} schedules`)
  }

  console.log(`\n   Total: ${DATA.length} destinations, ${totalRates} rates, ${totalScheds} schedules`)
  await pool.close()
}

;(async () => {
  for (const db of DBS) {
    try {
      await importToDb(db)
    } catch (e) {
      console.error(`\n✗  ${db.name} failed:`, e.message)
    }
  }
  console.log("\n✅  Import complete.\n")
  process.exit(0)
})()
