import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'PIL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.pilship.com/en/index.html'

# Validity
VF_14   = '2026-07-01'; VT_14   = '2026-07-14'   # EA/SA/IO/WA/ECSA/WCSA
VF_END  = '2026-07-01'; VT_END  = '2026-07-31'   # MELL/SPI

# ================================================================
# Surcharge strings per trade
# ================================================================
S_EA   = 'EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect'
S_SA   = 'EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect'
S_IO   = 'EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect'
S_WA   = 'EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect'
S_ECSA = 'EBS:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect'
S_WCSA = 'EBS:incl;LSR:160/teu;Seal:10/ctr;SFF:15/BL;THC:collect'
S_MELL = 'RRS:750/20-1500/40;Seal:10/ctr;SFF:15/BL;THC:collect'
S_SPI  = 'LSR:292/20-584/40;EIS:150/20-300/40;Seal:10/ctr;SFF:15/BL;THC:collect'

# ================================================================
# Clauses per trade
# ================================================================
CL_EA = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Africa rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL"
    "|THC + local charges both ends | Space and equipment subject to availability"
)
CL_SA = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Africa rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL"
    "|THC + local charges both ends | Space and equipment subject to availability"
)
CL_IO = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | Indian Ocean rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL"
    "|THC + local charges both ends | Space and equipment subject to availability"
)
CL_WA = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Africa rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of: EBS | Seal USD 10/container | SFF USD 15/BL"
    "|THC + local charges both ends | Space and equipment subject to availability"
)
CL_ECSA = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | East Coast South America rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates subject to: EBS USD 160/TEU | Seal USD 10/container | SFF USD 15/BL"
    "|THC + local charges both ends | Space and equipment subject to availability"
)
CL_WCSA = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | West Coast South America rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of: EBS | Subject to: LSR USD 160/TEU"
    "|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
)
CL_MELL = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | MELL Ports (PNG/Pacific/AUS) rates"
    "|Validity: 01-31 Jul 2026"
    "|Subject to: Rate Restoration Surcharge (RRS) USD 750/20' USD 1500/40'"
    "|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
)
CL_SPI = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | South Pacific Islands rates"
    "|Validity: 01-31 Jul 2026"
    "|Subject to: LSR USD 292/20' USD 584/40' | EIS USD 150/20' USD 300/40'"
    "|Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
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
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{surch}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def ea(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_EA, CL_EA, notes)

def sa(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_SA, CL_SA, notes)

def io(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_IO, CL_IO, notes)

def wa(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_WA, CL_WA, notes)

def ecsa(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_ECSA, CL_ECSA, notes)

def wcsa(dc, dp, r20, r40, via='SHANGHAI', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, S_WCSA, CL_WCSA, notes)

def mell(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_END, VT_END, via, S_MELL, CL_MELL, notes)

def spi(dc, dp, r20, r40, via='SINGAPORE', notes=''):
    return row(dc, dp, r20, r40, VF_END, VT_END, via, S_SPI, CL_SPI, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- PIL (India) Pvt. Ltd. — NHAVA SHEVA Multi-Trade July 2026")
lines.append("-- Trades: East Africa | South Africa | Indian Ocean | West Africa")
lines.append("--         ECSA | WCSA | MELL Ports | South Pacific Islands")
lines.append("-- Valid 01-14 Jul: EA/SA/IO/WA/ECSA/WCSA")
lines.append("-- Valid 01-31 Jul: MELL / South Pacific Islands")
lines.append("-- Surcharge details noted per section in CLAUSES")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# EAST AFRICA (01-14 Jul 2026 | EBS $160/TEU extra)
# ============================================================
lines.append("-- ======== EAST AFRICA (01-14 Jul 2026 | EBS $160/teu extra) ========")
lines.append("")
lines.append(ea('Kenya',          'MOMBASA',           3650,  5500))
lines.append(ea('Tanzania',       'DAR ES SALAAM',     3550,  5300))
lines.append(ea('Tanzania',       'ZANZIBAR',          4850,  7900, 'MOMBASA', 'via Singapore/Mombasa'))
lines.append(ea('Mozambique',     'BEIRA',             3450,  5300))
lines.append(ea('Mozambique',     'MAPUTO / NACALA',   3050,  4600, 'SINGAPORE', 'combined Maputo+Nacala rate on source sheet'))
lines.append("")

# ============================================================
# SOUTH AFRICA (01-14 Jul 2026 | EBS $160/TEU extra)
# ============================================================
lines.append("-- ======== SOUTH AFRICA (01-14 Jul 2026 | EBS $160/teu extra) ========")
lines.append("")
lines.append(sa('South Africa',   'DURBAN',            2450,  3100))
lines.append(sa('South Africa',   'CAPE TOWN',         2550,  3300))
lines.append("")

# ============================================================
# INDIAN OCEAN (01-14 Jul 2026 | EBS $160/TEU extra)
# ============================================================
lines.append("-- ======== INDIAN OCEAN (01-14 Jul 2026 | EBS $160/teu extra) ========")
lines.append("")
lines.append(io('Mauritius',      'PORT LOUIS',        2550,  3100))
lines.append(io('France',         'REUNION (POINTE DES GALETS)', 2550, 3100))
lines.append(io('Madagascar',     'TAMATAVE',          2750,  3900))
lines.append("")

# ============================================================
# WEST AFRICA (01-14 Jul 2026 | EBS inclusive)
# ============================================================
lines.append("-- ======== WEST AFRICA (01-14 Jul 2026 | EBS inclusive) ========")
lines.append("")
lines.append(wa('Nigeria',        'ONNE',              3500,  5300))
lines.append(wa('Nigeria',        'APAPA (LAGOS)',      3500,  5300))
lines.append(wa('Togo',           'LOME',              3100,  4900))
lines.append(wa('Ghana',          'TEMA',              3100,  4900))
lines.append(wa("Ivory Coast",    'ABIDJAN',           3300,  5300))
lines.append(wa('Benin',          'COTONOU',           3150,  5000, 'LOME', 'via Singapore & Lome'))
lines.append(wa('Cameroon',       'DOUALA',            3600,  5500, 'LOME', 'via Singapore & Lome'))
lines.append("")

# ============================================================
# EAST COAST SOUTH AMERICA (01-14 Jul 2026 | EBS $160/TEU extra)
# ============================================================
lines.append("-- ======== ECSA (01-14 Jul 2026 | EBS $160/teu extra) ========")
lines.append("")
lines.append(ecsa('Brazil',       'SANTOS',            8000,  8300))
lines.append(ecsa('Brazil',       'PARANAGUA',         8000,  8300))
lines.append(ecsa('Uruguay',      'MONTEVIDEO',        8000,  8300))
lines.append(ecsa('Argentina',    'BUENOS AIRES',      8000,  8300))
lines.append(ecsa('Brazil',       'NAVEGANTES',        8000,  8300))
lines.append(ecsa('Brazil',       'RIO DE JANEIRO',    8000,  8300))
lines.append(ecsa('Brazil',       'ITAPOA',            8000,  8300))
lines.append("")

# ============================================================
# WEST COAST SOUTH AMERICA (01-14 Jul 2026 | EBS incl, LSR $160/TEU extra)
# ============================================================
lines.append("-- ======== WCSA (01-14 Jul 2026 | EBS incl | LSR $160/teu extra) ========")
lines.append("-- Rows 1-8 via Shanghai | Rows 9-12 via Ningbo")
lines.append("")
lines.append(wcsa('Mexico',       'MANZANILLO',        6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Mexico',       'LAZARO CARDENAS',   6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Ecuador',      'GUAYAQUIL',         6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Colombia',     'BUENAVENTURA',      6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Peru',         'CALLAO',            6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Chile',        'VALPARAISO',        6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Chile',        'SAN ANTONIO',       6880,  7150, 'SHANGHAI'))
lines.append(wcsa('Mexico',       'ENSENADA',          7080,  7350, 'SHANGHAI'))
lines.append(wcsa('Guatemala',    'PUERTO QUETZAL',    7880,  8150, 'NINGBO'))
lines.append(wcsa('Costa Rica',   'PUERTO CALDERA',    7880,  8150, 'NINGBO'))
lines.append(wcsa('El Salvador',  'ACAJUTLA',          7880,  8150, 'NINGBO'))
lines.append(wcsa('Nicaragua',    'CORINTO',           7880,  8150, 'NINGBO'))
lines.append("")

# ============================================================
# MELL PORTS — PNG / AUS / Timor-Leste / Marshall Islands
# (01-31 Jul 2026 | RRS $750/20' $1500/40' extra)
# ============================================================
lines.append("-- ======== MELL PORTS (01-31 Jul 2026 | RRS $750/20 $1500/40 extra) ========")
lines.append("")
lines.append(mell('Papua New Guinea', 'PORT LAE',           1500,  3000))
lines.append(mell('Papua New Guinea', 'PORT MORESBY',       1500,  3000))
lines.append(mell('Papua New Guinea', 'RABAUL',             3400,  6800))
lines.append(mell('Australia',        'DARWIN',             1600,  3200))
lines.append(mell('Australia',        'TOWNSVILLE',         1600,  3200))
lines.append(mell('Timor-Leste',      'DILI',               1500,  3000))
lines.append(mell('Marshall Islands', 'MAJURO',             3300,  6600, 'HONG KONG', 'via Singapore & Hong Kong'))
lines.append("")

# ============================================================
# SOUTH PACIFIC ISLANDS
# (01-31 Jul 2026 | LSR $292/20' $584/40' | EIS $150/20' $300/40')
# ============================================================
lines.append("-- ======== SOUTH PACIFIC ISLANDS (01-31 Jul 2026) ========")
lines.append("-- LSR $292/20 $584/40 | EIS $150/20 $300/40 | all via Singapore & Auckland")
lines.append("")
lines.append(spi('Tonga',            'NUKUALOFA',          3600,  7200, 'AUCKLAND', 'via Singapore & Auckland; same rate as Apia'))
lines.append(spi('Samoa',            'APIA',               3600,  7200, 'AUCKLAND', 'via Singapore & Auckland; same rate as Nukualofa'))
lines.append(spi('Fiji',             'SUVA / LAUTOKA',     2500,  5000, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('New Caledonia',    'NOUMEA',             2450,  4900, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('French Polynesia', 'PAPEETE',            3700,  7400, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('Vanuatu',          'SANTO',              3450,  6900, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('Vanuatu',          'PORT VILA',          3150,  6300, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('Cook Islands',     'RAROTONGA',          7400, 14800, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('Kiribati',         'TARAWA',             3750,  7500, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('Tuvalu',           'FUNAFUTI',           6500, 13000, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append(spi('France',           'WALLIS AND FUTUNA',  6250, 12500, 'AUCKLAND', 'via Singapore & Auckland'))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
