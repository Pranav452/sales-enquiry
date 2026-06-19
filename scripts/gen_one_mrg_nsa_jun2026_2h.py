import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://one-line.com'

VF_15 = '2026-06-15'   # AUS, NZS, LEW, LWE, EFW, WFW, ZFW
VF_16 = '2026-06-16'   # WEW, WMW
VT_30 = '2026-06-30'

# ================================================================
# Surcharge strings
# ================================================================
S_EUR     = 'MBS:incl;CAF:incl;CSS:incl;HEA:cond;OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_EUR_NHE = 'MBS:incl;CAF:incl;CSS:incl;OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_MED     = 'MBS:incl;CAF:incl;CSS:incl;OBS:119/teu;EES:182/teu;EFS:120/20-240/40;ISL:32/ctr;SLF:10/ctr'
S_AUS     = 'MBS:incl;OBS:incl;ISL:32/ctr;SLF:10/ctr;EFS:120/20-240/40'
S_LEW     = 'MBS:incl;OBS:incl;EFS:120/20-240/40;PSS:incl;HEA:cond;CSS:15/ctr;SLF:10/ctr'
S_LWE     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;EFS:120/20-240/40;PSS:incl;HEA:cond;CSS:15/ctr;SLF:10/ctr'
S_EFW     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;AMS:incl;CGD:incl;HEA:cond;LSF:incl;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'
S_WFW     = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;AMS:incl;CGD:incl;EPH:incl;HEA:cond;LSF:incl;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'
S_ZFW_MPM = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;AMS:incl;CGD:incl;HEA:cond;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'
S_ZFW_DUR = 'MBS:incl;OBS:incl;BAF:incl;BRS:incl;CGD:incl;EPH:incl;HEA:cond;LSF:incl;WRC:incl;EFS:120/20-240/40;CSS:15/ctr;SLF:10/ctr'

# ================================================================
# Clauses per trade
# ================================================================
CL_EUR = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Europe (WEW) rates"
    "|Validity: 16-30 Jun 2026"
    "|Rates inclusive of: MBS, CAF, CSS | OBS USD 117/TEU | EES USD 95/TEU"
    "|EFS USD 120/20' USD 240/40' | ISL USD 32/ctr | SLF USD 10/ctr"
    "|HEA USD 300/20' for net weight >= 16MT (where applicable)"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_MED = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Mediterranean (WMW) rates"
    "|Validity: 16-30 Jun 2026"
    "|Rates inclusive of: MBS, CAF, CSS | OBS USD 119/TEU | EES USD 182/TEU"
    "|EFS USD 120/20' USD 240/40' | ISL USD 32/ctr | SLF USD 10/ctr"
    "|HEA conditional (net weight >= 16MT or 18MT per port)"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_AUS = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Australia (AUS) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS | ISL USD 32/ctr | SLF USD 10/ctr"
    "|EFS USD 120/20' USD 240/40' | Flexi-tank add-on USD 100/TEU"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_NZS = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | New Zealand (NZS) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS | ISL USD 32/ctr | SLF USD 10/ctr"
    "|EFS USD 120/20' USD 240/40' | Flexi-tank add-on USD 100/TEU"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_LEW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | East Coast South America / LAEC (LEW) rates"
    "|LUX service via Algeciras or Rotterdam | Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS, EFS, PSS, HEA (conditional)"
    "|CSS USD 15/ctr | SLF USD 10/ctr | EFS USD 120/20' USD 240/40'"
    "|IFL (Inland Fuel) applicable for inland destinations"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_LWE = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | West Coast South America / LAWC (LWE) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, EFS, PSS | HEA conditional"
    "|HEA USD 150/20' for 18.01-21MT; USD 200/20' above 21MT"
    "|CSS USD 15/ctr | SLF USD 10/ctr | EFS USD 120/20' USD 240/40'"
    "|ENS required for Mexico | IFL (Inland Fuel) applicable"
    "|THC/DOC both ends | Space and equipment subject to availability"
)
CL_EFW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | East Africa (EFW) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, AMS, CGD, HEA, LSF, WRC"
    "|EFS USD 120/20' USD 240/40' | CSS USD 15/ctr | SLF USD 10/ctr"
    "|14 days free detention at destination | THC/DOC both ends"
)
CL_WFW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | West Africa (WFW) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, AMS, CGD, EPH, HEA, LSF, WRC"
    "|EFS USD 120/20' USD 240/40' | CSS USD 15/ctr | SLF USD 10/ctr"
    "|14 days free detention at destination | THC/DOC both ends"
)
CL_ZFW = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | South Africa / Mozambique (ZFW) rates"
    "|Validity: 15-30 Jun 2026"
    "|Rates inclusive of: MBS, OBS, BAF, BRS, CGD, HEA, WRC (see port for EPH/LSF/AMS)"
    "|EFS USD 120/20' USD 240/40' | CSS USD 15/ctr | SLF USD 10/ctr"
    "|PRS ZAR 52/container collect | 14 days free detention at destination"
    "|THC/DOC both ends | Space and equipment subject to availability"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surch, clauses, notes=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def eur(dc, dp, r20, r40, via='', hea=True, notes=''):
    s = S_EUR if hea else S_EUR_NHE
    return row(dc, dp, r20, r40, VF_16, VT_30, via, s, CL_EUR, notes)

def med(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_30, via, S_MED, CL_MED, notes)

def aus(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, via, S_AUS, CL_AUS, notes)

def nzs(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, '', S_AUS, CL_NZS, notes)

def lew_lux(dc, dp, r20, r40, via_ts, notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, via_ts, S_LEW, CL_LEW, notes)

def lwe(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, via, S_LWE, CL_LWE, notes)

def efw(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, '', S_EFW, CL_EFW, notes)

def wfw(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_30, '', S_WFW, CL_WFW, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) — MRG NHAVA SHEVA Rates June 2026 SECOND HALF")
lines.append("-- WEW Europe: 16-30 Jun 2026")
lines.append("-- WMW Mediterranean: 16-30 Jun 2026")
lines.append("-- AUS / NZS / LEW / LWE / EFW / WFW / ZFW: 15-30 Jun 2026")
lines.append("-- IWE Far East (full month, unchanged from 1h): NOT included here")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# EUROPE / WEW (16-30 Jun 2026)
# ============================================================
lines.append("-- ======== EUROPE / WEW (16-30 Jun 2026) ========")
lines.append("-- OBS USD 117/TEU | EES USD 95/TEU | EFS USD 120/240 | ISL USD 32 | SLF USD 10")
lines.append("")

lines.append("-- Belgium")
lines.append(eur('Belgium',        'ANTWERP',                        1670, 1635))
lines.append("")
lines.append("-- Germany")
lines.append(eur('Germany',        'HAMBURG',                        1670, 1635))
lines.append("")
lines.append("-- Denmark")
lines.append(eur('Denmark',        'AALBORG',                        2095, 2210))
lines.append(eur('Denmark',        'AARHUS',                         1870, 1835))
lines.append(eur('Denmark',        'COPENHAGEN',                     1870, 1835))
lines.append(eur('Denmark',        'FREDERICIA',                     1870, 1835, 'HAMBURG'))
lines.append("")
lines.append("-- Estonia")
lines.append(eur('Estonia',        'TALLINN',                        1920, 1935))
lines.append("")
lines.append("-- Spain (no HEA)")
lines.append(eur('Spain',          'BILBAO',                         2595, 2685, hea=False))
lines.append(eur('Spain',          'GIJON',                          2595, 2685, hea=False))
lines.append(eur('Spain',          'VIGO',                           2595, 2685, hea=False))
lines.append("")
lines.append("-- Finland")
lines.append(eur('Finland',        'HELSINKI',                       1820, 1835))
lines.append(eur('Finland',        'KOTKA',                          1820, 1835))
lines.append(eur('Finland',        'OULU',                           3030, 3235))
lines.append(eur('Finland',        'RAUMA',                          1820, 1835))
lines.append("")
lines.append("-- France")
lines.append(eur('France',         'LE HAVRE',                       1720, 1735))
lines.append("")
lines.append("-- United Kingdom")
lines.append(eur('United Kingdom', 'BELFAST',                        2370, 2085))
lines.append(eur('United Kingdom', 'COATBRIDGE',                     2270, 2215))
lines.append(eur('United Kingdom', 'GRANGEMOUTH',                    2170, 2315))
lines.append(eur('United Kingdom', 'IMMINGHAM',                      2170, 2435, 'ROTTERDAM'))
lines.append(eur('United Kingdom', 'SOUTHAMPTON',                    1670, 1635))
lines.append(eur('United Kingdom', 'SOUTH SHIELDS',                  2140, 2515))
lines.append(eur('United Kingdom', 'TEESPORT',                       2170, 2315))
lines.append("")
lines.append("-- Ireland")
lines.append(eur('Ireland',        'DUBLIN',                         2070, 2085))
lines.append(eur('Ireland',        'CORK',                           2070, 2085))
lines.append("")
lines.append("-- Lithuania")
lines.append(eur('Lithuania',      'KLAIPEDA',                       1920, 1935))
lines.append("")
lines.append("-- Latvia")
lines.append(eur('Latvia',         'RIGA',                           1920, 1935))
lines.append("")
lines.append("-- Netherlands")
lines.append(eur('Netherlands',    'ROTTERDAM',                      1670, 1635))
lines.append("")
lines.append("-- Norway")
lines.append(eur('Norway',         'BERGEN',                         2470, 3135))
lines.append(eur('Norway',         'FREDRIKSTAD',                    2395, 2635))
lines.append(eur('Norway',         'KRISTIANSAND',                   2420, 2835))
lines.append(eur('Norway',         'LARVIK',                         2370, 2760))
lines.append(eur('Norway',         'OSLO',                           2620, 2635))
lines.append("")
lines.append("-- Poland")
lines.append(eur('Poland',         'GDANSK',                         1720, 1735))
lines.append(eur('Poland',         'GDYNIA',                         1720, 1735))
lines.append("")
lines.append("-- Portugal (via Rotterdam)")
lines.append(eur('Portugal',       'LEIXOES',                        1820, 1935, 'ROTTERDAM'))
lines.append(eur('Portugal',       'LISBON',                         1820, 1935, 'ROTTERDAM'))
lines.append("")
lines.append("-- Sweden")
lines.append(eur('Sweden',         'AHUS',                           2170, 2185))
lines.append(eur('Sweden',         'GOTHENBURG',                     1720, 1735))
lines.append(eur('Sweden',         'GAVLE',                          1970, 2085))
lines.append(eur('Sweden',         'HELSINGBORG',                    1870, 1885))
lines.append(eur('Sweden',         'NORRKOPING',                     2920, 3285))
lines.append(eur('Sweden',         'SODERTALJE',                     2120, 2335))
lines.append(eur('Sweden',         'STOCKHOLM',                      2870, 3335))
lines.append("")

# ============================================================
# MEDITERRANEAN / WMW (16-30 Jun 2026)
# ============================================================
lines.append("-- ======== MEDITERRANEAN / WMW (16-30 Jun 2026) ========")
lines.append("-- OBS USD 119/TEU | EES USD 182/TEU | EFS USD 120/240 | ISL USD 32 | SLF USD 10")
lines.append("")

lines.append(med('Albania',    'DURRES',        1800, 1800))
lines.append(med('Bulgaria',   'BOURGAS',       2845, 3185))
lines.append(med('Bulgaria',   'VARNA',         2710, 2400, notes='20ft>40ft on source sheet'))
lines.append(med('Egypt',      'ALEXANDRIA',    2445, 2385))
lines.append(med('Egypt',      'DAMIETTA',      2345, 2185))
lines.append(med('Spain',      'ALGECIRAS',     2345, 2185))
lines.append(med('Spain',      'BARCELONA',     2345, 2185))
lines.append(med('Spain',      'VALENCIA',      2345, 2185))
lines.append(med('France',     'FOS SUR MER',   2345, 2185))
lines.append(med('Greece',     'PIRAEUS',       2345, 2185))
lines.append(med('Greece',     'THESSALONIKI',  2445, 2385))
lines.append(med('Croatia',    'RIJEKA',        2795, 3085))
lines.append(med('Israel',     'ASHDOD',        2545, 2585))
lines.append(med('Israel',     'HAIFA',         2545, 2585))
lines.append(med('Italy',      'ANCONA',        2395, 2285))
lines.append(med('Italy',      'GENOA',         2345, 2185))
lines.append(med('Italy',      'LIVORNO',       2545, 2585))
lines.append(med('Italy',      'RAVENNA',       2745, 2885))
lines.append(med('Italy',      'LA SPEZIA',     2345, 2185))
lines.append(med('Italy',      'TRIESTE',       2795, 2985))
lines.append(med('Italy',      'VENICE',        2445, 2385))
lines.append(med('Lebanon',    'BEIRUT',        2495, 2485, notes='20ft>40ft on source sheet'))
lines.append(med('Morocco',    'CASABLANCA',    3440, 4540))
lines.append(med('Morocco',    'TANGIER',       2940, 3540))
lines.append(med('Romania',    'CONSTANTA',     2845, 3185))
lines.append(med('Slovenia',   'KOPER',         2395, 2285))
lines.append(med('Turkey',     'ALIAGA',        2395, 2285))
lines.append(med('Turkey',     'GEMLIK',        2595, 2685))
lines.append(med('Turkey',     'ISKENDERUN',    2445, 2385))
lines.append(med('Turkey',     'ISTANBUL',      2395, 2285))
lines.append(med('Turkey',     'IZMIT',         2395, 2285))
lines.append(med('Turkey',     'MERSIN',        2395, 2285))
lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND (15-30 Jun 2026) ========")
lines.append("-- EFS USD 120/240 | MBS, OBS incl | ISL USD 32 | SLF USD 10 | Flexi-tank +USD 100/TEU")
lines.append("")
lines.append(aus('Australia',   'ADELAIDE',               1175, 2350))
lines.append(aus('Australia',   'MELBOURNE / BRISBANE',   1175, 2350, notes='Combined port group rate (AUEC)'))
lines.append(aus('Australia',   'FREMANTLE',              1175, 2350, 'SINGAPORE'))
lines.append(aus('Australia',   'SYDNEY',                 1175, 2350))
lines.append("")
lines.append(nzs('New Zealand', 'AUCKLAND',               1025, 1950))
lines.append(nzs('New Zealand', 'NZ BASE PORTS',          1025, 1950, notes='NZ base ports group rate'))
lines.append("")

# ============================================================
# LEW — LUX service via Algeciras / Rotterdam (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== LEW — LUX SERVICE LAEC (15-30 Jun 2026) ========")
lines.append("-- Two T/S options per port: ALGECIRAS and ROTTERDAM")
lines.append("")
lines.append("-- via ALGECIRAS")
lines.append(lew_lux('Argentina', 'BUENOS AIRES',   1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',    'ITAJAI',         1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',    'PARANAGUA',      1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',    'RIO DE JANEIRO', 1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Brazil',    'SANTOS',         1500, 1700, 'ALGECIRAS'))
lines.append(lew_lux('Paraguay',  'ASUNCION',       3200, 3400, 'ALGECIRAS'))
lines.append(lew_lux('Uruguay',   'MONTEVIDEO',     1500, 1700, 'ALGECIRAS'))
lines.append("")
lines.append("-- via ROTTERDAM")
lines.append(lew_lux('Argentina', 'BUENOS AIRES',   1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',    'ITAJAI',         1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',    'PARANAGUA',      1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',    'RIO DE JANEIRO', 1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Brazil',    'SANTOS',         1500, 1700, 'ROTTERDAM'))
lines.append(lew_lux('Paraguay',  'ASUNCION',       3200, 3400, 'ROTTERDAM'))
lines.append(lew_lux('Uruguay',   'MONTEVIDEO',     1500, 1700, 'ROTTERDAM'))
lines.append("")

# ============================================================
# LWE — WEST COAST SOUTH AMERICA (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== LWE — WEST COAST SOUTH AMERICA (15-30 Jun 2026) ========")
lines.append("-- BAF, BRS, EFS, PSS, HEA, MBS, OBS incl | EFS USD 120/240 | ENS for MEX")
lines.append("")
lines.append("-- Chile")
lines.append(lwe('Chile',       'ARICA',            5575, 6450))
lines.append(lwe('Chile',       'CORONEL',          5275, 5650))
lines.append(lwe('Chile',       'IQUIQUE',          5475, 6350))
lines.append(lwe('Chile',       'LIRQUEN',          5275, 5650))
lines.append(lwe('Chile',       'PUERTO ANGAMOS',   5475, 6350))
lines.append(lwe('Chile',       'SAN ANTONIO',      5175, 5550))
lines.append(lwe('Chile',       'SAN VICENTE',      5275, 5650))
lines.append(lwe('Chile',       'VALPARAISO',       5175, 5550))
lines.append("")
lines.append("-- Colombia")
lines.append(lwe('Colombia',    'BUENAVENTURA',     5175, 5550))
lines.append("")
lines.append("-- Costa Rica")
lines.append(lwe('Costa Rica',  'PUERTO CALDERA',   5575, 6350))
lines.append("")
lines.append("-- Ecuador")
lines.append(lwe('Ecuador',     'GUAYAQUIL',        5175, 5550))
lines.append(lwe('Ecuador',     'POSORJA',          4975, 5350))
lines.append("")
lines.append("-- Guatemala")
lines.append(lwe('Guatemala',   'PUERTO QUETZAL',   5475, 6350))
lines.append("")
lines.append("-- Honduras (via Corinto)")
lines.append(lwe('Honduras',    'SAN LORENZO',      8366, 9141, 'CORINTO', notes='T/S via Corinto; IFD applicable'))
lines.append("")
lines.append("-- Mexico")
lines.append(lwe('Mexico',      'ENSENADA',         5475, 6350, notes='ENS required'))
lines.append(lwe('Mexico',      'LAZARO CARDENAS',  5175, 5550, notes='ENS required; IFD applicable'))
lines.append(lwe('Mexico',      'MANZANILLO',       5175, 5550, notes='ENS required; IFD applicable'))
lines.append("")
lines.append("-- Nicaragua")
lines.append(lwe('Nicaragua',   'CORINTO',          5575, 6350))
lines.append("")
lines.append("-- Panama")
lines.append(lwe('Panama',      'RODMAN',           5575, 6550))
lines.append(lwe('Panama',      'PANAMA CITY',      5725, 6600, 'RODMAN', notes='Door delivery; IFD applicable'))
lines.append("")
lines.append("-- Peru")
lines.append(lwe('Peru',        'CALLAO',           5175, 5550))
lines.append("")
lines.append("-- El Salvador")
lines.append(lwe('El Salvador', 'ACAJUTLA',         5575, 6350))
lines.append("")

# ============================================================
# EFW — EAST AFRICA (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== EAST AFRICA / EFW (15-30 Jun 2026) ========")
lines.append("-- AMS, BAF, BRS, CGD, HEA, LSF, MBS, OBS, WRC incl | EFS USD 120/240")
lines.append("")
lines.append(efw('Kenya',    'MOMBASA',       1400, 1500))
lines.append(efw('Tanzania', 'DAR ES SALAAM', 1500, 1600, notes='THD inclusive'))
lines.append("")

# ============================================================
# WFW — WEST AFRICA (15-30 Jun 2026)
# ============================================================
lines.append("-- ======== WEST AFRICA / WFW (15-30 Jun 2026) ========")
lines.append("-- AMS, BAF, BRS, CGD, EPH, HEA, LSF, MBS, OBS, WRC incl | EFS USD 120/240")
lines.append("")
lines.append(wfw('Benin',       'COTONOU',     3200, 4200))
lines.append(wfw('Ivory Coast', 'ABIDJAN',     1600, 2000))
lines.append(wfw('Ghana',       'TEMA',        1600, 2000))
lines.append(wfw('Nigeria',     'APAPA',       2000, 2200))
lines.append(wfw('Nigeria',     'LEKKI',       2400, 2800))
lines.append(wfw('Nigeria',     'ONNE',        3800, 5000))
lines.append(wfw('Nigeria',     'TIN CAN',     2000, 2200))
lines.append(wfw('Senegal',     'DAKAR',       2100, 3000))
lines.append(wfw('Togo',        'LOME',        3200, 4200))
lines.append("")

# ============================================================
# ZFW — SOUTH AFRICA / MOZAMBIQUE (15-30 Jun 2026) — NEW TRADE
# ============================================================
lines.append("-- ======== SOUTH AFRICA / MOZAMBIQUE / ZFW (15-30 Jun 2026) — NEW ========")
lines.append("-- PRS ZAR 52/container collect | EFS USD 120/240 | 14 days free detention")
lines.append("")
lines.append(row('Mozambique',   'MAPUTO', 2000, 2200, VF_15, VT_30, '',
                 S_ZFW_MPM, CL_ZFW,
                 'AMS incl; EPH and LSF not applicable; PRS ZAR 52/cntr collect'))
lines.append(row('South Africa', 'DURBAN', 1100, 1100, VF_15, VT_30, '',
                 S_ZFW_DUR, CL_ZFW,
                 'EPH and LSF incl; AMS not applicable; PRS ZAR 52/cntr collect'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
