import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
VF      = '2026-06-01'
VT      = '2026-06-09'
PDF_URL = 'https://in.one-line.com/standard-page/local-tariffs-and-surcharges'

PORT_NAMES = {
    'INHZA': 'HAZIRA',
    'INMUN': 'MUNDRA',
    'INNSA': 'NHAVA SHEVA',
    'INCOK': 'COCHIN',
    'INIXE': 'NEW MANGALORE',
    'INVTZ': 'VISAKHAPATNAM',
    'INPAV': 'PIPAVAV',
    'INMAA': 'CHENNAI',
    'INKTP': 'KATTUPALLI',
    'INTUT': 'TUTICORIN',
    'INCCU': 'KOLKATA',
}

BASE_CL = (
    "ONE (Ocean Network Express) | India ISC Origins | USA & Canada Rates"
    "|Validity: 01-09 Jun 2026 | FAK straight (excl garments/personal effects/HHG)"
    "|Rates inclusive of: OBS, PCT, SCT, THD, SPT, ALM, PSS, EFS, IHD, AGS"
    "|Commodity surcharge: Garments via WIN +$50/unit; via non-WIN +$100/unit (not applicable BD/LK/PK)"
    "|Commodity surcharge: HHG/Personal Effects +$200/unit on top of FAK"
    "|DG Class 3-9: +$240/20' +$300/40'HC +$300/45' (sub to DG approval/vessel/rail acceptance)"
    "|DG Class 2: +$800 per unit (sub to DG approval)"
    "|Singapore T/S DG (PSA Grp1/1D/2): +$538/20' +$753/40'HC"
    "|For POD USSAV HAZ cargo: refer Customer Advisory Notice of Surcharge-HAZ (TPEB)"
    "|Sub to space and equipment availability | Legal weight limits apply"
    "|Tariff Demurrage and Detention applies | WHA inclusive for CAVAN and CAHAL"
    "|THC/Surcharges: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
)

SURCH = 'OBS:incl;PCT:incl;SCT:incl;THD:incl;SPT:incl;ALM:incl;PSS:incl;EFS:incl;IHD:incl;AGS:incl'

def esc(s): return s.replace("'", "''")

def row(op, dc, dp, r20, r40, via='', notes='', xcl=''):
    cl = esc(BASE_CL + ('|' + xcl if xcl else ''))
    v  = f"'{esc(via)}'" if via else 'NULL'
    n  = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{esc(op)}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',{v},'{SURCH}',{n},'{cl}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def expand(codes, dc, dp, r20, r40hc, r45, via='', svc='', remark=''):
    """One INSERT row per origin code for given POD."""
    out = []
    for code in codes:
        op = PORT_NAMES[code]
        parts = [f'45ft=${r45}']
        if svc:    parts.append(f'Service:{svc}')
        if remark: parts.append(remark)
        out.append(row(op, dc, dp, r20, r40hc, via=via, notes='; '.join(parts)))
    return out

lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) — India ISC → USA & Canada Rates")
lines.append("-- Validity: 01-09 Jun 2026")
lines.append("-- Origins: Hazira / Mundra / Nhava Sheva / Cochin / New Mangalore /")
lines.append("--          Visakhapatnam / Pipavav / Chennai / Kattupalli /")
lines.append("--          Tuticorin / Kolkata")
lines.append("-- Inclusive: OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS")
lines.append("-- 45ft rates noted in NOTES field")
lines.append("-- IPI inland rates stored with NHAVA SHEVA as representative origin")
lines.append("-- INHZA: no Halifax rate on this sheet")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# USEC — 5 ports: New York, Norfolk, Charleston, Savannah, Jacksonville
# ============================================================
lines.append("-- ======== USEC (WIN service) ========")
lines.append("")

USEC_PORTS = [
    ('USA', 'NEW YORK, NY'),
    ('USA', 'NORFOLK, VA'),
    ('USA', 'CHARLESTON, SC'),
    ('USA', 'SAVANNAH, GA'),
    ('USA', 'JACKSONVILLE, FL'),
]

# --- INHZA: 2430/2700 all 5 USEC ---
lines.append("-- Hazira → USEC: 2430/2700/2700")
for dc, dp in USEC_PORTS:
    lines += expand(['INHZA'], dc, dp, 2430, 2700, 3420, svc='WIN')
lines.append("")

# --- INNSA + INMUN → all 5 USEC: 2025/2250 ---
lines.append("-- Nhava Sheva + Mundra → USEC: 2025/2250/2250")
for dc, dp in USEC_PORTS:
    lines += expand(['INNSA', 'INMUN'], dc, dp, 2025, 2250, 2850, svc='WIN')
lines.append("")

# --- INCOK → all 5 USEC: 2430/2700 via COLOMBO ---
lines.append("-- Cochin → USEC: 2430/2700/2700 via COLOMBO (WIN/EC3)")
for dc, dp in USEC_PORTS:
    lines += expand(['INCOK'], dc, dp, 2430, 2700, 3420,
                    via='COLOMBO', svc='WIN/EC3', remark='via COLOMBO')
lines.append("")

# --- INIXE, INVTZ, INPAV → all 5 USEC: 2720/3020 ---
lines.append("-- New Mangalore / Visakhapatnam / Pipavav → USEC: 2720/3020/3020")
for dc, dp in USEC_PORTS:
    lines += expand(['INIXE', 'INVTZ', 'INPAV'], dc, dp, 2720, 3020, 3825, svc='WIN/EC3')
lines.append("")

# --- INMAA, INKTP → all 5 USEC: 2430/2700 ---
lines.append("-- Chennai / Kattupalli → USEC: 2430/2700/2700")
for dc, dp in USEC_PORTS:
    lines += expand(['INMAA', 'INKTP'], dc, dp, 2430, 2700, 3420, svc='WIN/EC3')
lines.append("")

# --- INTUT → all 5 USEC: 2430/2700 ---
lines.append("-- Tuticorin → USEC: 2430/2700/2700")
for dc, dp in USEC_PORTS:
    lines += expand(['INTUT'], dc, dp, 2430, 2700, 3420, svc='WIN/EC3')
lines.append("")

# --- INCCU → all 5 USEC: 2430/2700 via COLOMBO ---
lines.append("-- Kolkata → USEC: 2430/2700/2700 via COLOMBO/SINGAPORE (WIN/EC3)")
for dc, dp in USEC_PORTS:
    lines += expand(['INCCU'], dc, dp, 2430, 2700, 3420,
                    via='COLOMBO', svc='WIN/EC3', remark='via LKCMB or SGSIN')
lines.append("")

# ============================================================
# USWC (PS) — Los Angeles/Long Beach, Oakland
# ============================================================
lines.append("-- ======== USWC (PS) — Los Angeles/Long Beach, Oakland ========")
lines.append("-- All 11 ISC origins: 4365/4850/4850")
lines.append("")

USWC_PS = [
    ('USA', 'LOS ANGELES/LONG BEACH, CA'),
    ('USA', 'OAKLAND, CA'),
]

for dc, dp in USWC_PS:
    for code in PORT_NAMES:
        via = 'SINGAPORE' if code == 'INCCU' else ''
        rem = 'via SINGAPORE' if code == 'INCCU' else ''
        lines += expand([code], dc, dp, 4365, 4850, 6140, via=via, remark=rem)
lines.append("")

# ============================================================
# USWC (PN) — Tacoma + Vancouver
# ============================================================
lines.append("-- ======== USWC (PN) — Tacoma ========")
lines.append("-- All 11 ISC origins: 4365/4850/4850")
lines.append("")

for code in PORT_NAMES:
    via = 'SINGAPORE' if code == 'INCCU' else ''
    rem = 'via SINGAPORE' if code == 'INCCU' else ''
    lines += expand([code], 'USA', 'TACOMA, WA', 4365, 4850, 6140, via=via, remark=rem)
lines.append("")

lines.append("-- ======== CANADA (PN) — Vancouver ========")
lines.append("-- All 11 ISC origins: 4365/4850/4850")
lines.append("")

for code in PORT_NAMES:
    via = 'SINGAPORE' if code == 'INCCU' else ''
    rem = 'via SINGAPORE' if code == 'INCCU' else ''
    lines += expand([code], 'Canada', 'VANCOUVER, BC', 4365, 4850, 6140, via=via, remark=rem)
lines.append("")

# ============================================================
# CANADA — Halifax
# Note: INHZA has NO Halifax rate on this sheet
# ============================================================
lines.append("-- ======== CANADA — Halifax ========")
lines.append("-- INHZA: no Halifax rate this sheet")
lines.append("")

lines.append("-- Nhava Sheva + Mundra → Halifax: 2995/3325")
lines += expand(['INNSA', 'INMUN'], 'Canada', 'HALIFAX, NS', 2995, 3325, 4210)
lines.append("")

lines.append("-- Chennai + Kattupalli → Halifax: 2790/3100")
lines += expand(['INMAA', 'INKTP'], 'Canada', 'HALIFAX, NS', 2790, 3100, 3925)
lines.append("")

lines.append("-- Pipavav / Tuticorin / New Mangalore / Visakhapatnam / Cochin → Halifax: 3035/3370")
lines += expand(['INPAV', 'INTUT', 'INIXE', 'INVTZ', 'INCOK'],
                'Canada', 'HALIFAX, NS', 3035, 3370, 4265)
lines.append("")

lines.append("-- Kolkata → Halifax: 2790/3100 via COLOMBO/SINGAPORE")
lines += expand(['INCCU'], 'Canada', 'HALIFAX, NS', 2790, 3100, 3925,
                via='COLOMBO', remark='via LKCMB or SGSIN')
lines.append("")

# ============================================================
# IPI — Inland Door Rates (NHAVA SHEVA as representative origin)
# ============================================================
IPI_CL = (
    "IPI Inland door rate | Origin: India ISC (representative: NHAVA SHEVA)"
    "|Via gateway noted in VIA_PORT | Rate inclusive of: OBS,PCT,SCT,THD,SPT,ALM,PSS,EFS,IHD,AGS"
    "|FAK straight excl garments/HHG | Subject to rail operator acceptance"
)
IPI_ORIG = 'NHAVA SHEVA'
IPI_N_PFX = 'IPI door rate; 45ft='

def ipi(dc, dp, r20, r40hc, r45, via_gw):
    notes = f'{IPI_N_PFX}${r45}; via {via_gw}'
    return row(IPI_ORIG, dc, dp, r20, r40hc, via=via_gw, notes=notes, xcl=IPI_CL)

lines.append("-- ======== IPI — USA Inland Door Rates (via USWC gateways) ========")
lines.append("")

lines.append("-- Via Los Angeles/Long Beach")
lines.append(ipi('USA', 'DALLAS, TX',          2355, 2880, 3230, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'HOUSTON, TX',          2595, 3160, 3355, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'EL PASO, TX',          2175, 2645, 2975, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'CHICAGO, IL',          2445, 3030, 3355, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'CINCINNATI, OH',       2715, 3030, 3735, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'CLEVELAND, OH',        2715, 3030, 3735, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'COLUMBUS, OH',         2930, 3540, 3735, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'MEMPHIS, TN',          2580, 2915, 3545, 'LOS ANGELES/LONG BEACH'))
lines.append(ipi('USA', 'OMAHA, NE',            3080, 3865, 4240, 'LOS ANGELES/LONG BEACH'))
lines.append("")

lines.append("-- Via Oakland")
lines.append(ipi('USA', 'SALT LAKE CITY, UT',  2355, 2740, 3230, 'OAKLAND'))
lines.append(ipi('USA', 'DENVER, CO',           3075, 3695, 4240, 'OAKLAND'))
lines.append("")

lines.append("-- ======== IPI — USA Inland Door Rates (via USEC gateways) ========")
lines.append("")

lines.append("-- Via New York")
lines.append(ipi('USA', 'BOSTON, MA',           2100, 2380, 2660, 'NEW YORK'))
lines.append(ipi('USA', 'CHICAGO, IL',          1705, 1900, 2000, 'NEW YORK'))
lines.append(ipi('USA', 'CINCINNATI, OH',       1870, 2225, 2265, 'NEW YORK'))
lines.append(ipi('USA', 'CLEVELAND, OH',        1560, 1880, 2250, 'NEW YORK'))
lines.append(ipi('USA', 'COLUMBUS, OH',         1690, 2000, 2250, 'NEW YORK'))
lines.append(ipi('USA', 'DETROIT, MI',          1485, 1795, 2090, 'NEW YORK'))
lines.append(ipi('USA', 'INDIANAPOLIS, IN',     2760, 3035, 3670, 'NEW YORK'))
lines.append(ipi('USA', 'KANSAS CITY',          2550, 2980, 3645, 'NEW YORK'))
lines.append(ipi('USA', 'PITTSBURGH, PA',       1450, 1680, 2025, 'NEW YORK'))
lines.append(ipi('USA', 'SAINT LOUIS, MO',      2010, 2380, 2885, 'NEW YORK'))
lines.append(ipi('USA', 'OMAHA, NE',            3090, 3405, 4180, 'NEW YORK'))
lines.append(ipi('USA', 'MINNEAPOLIS, MN',      3350, 3880, 4810, 'NEW YORK'))
lines.append("")

lines.append("-- Via Norfolk")
lines.append(ipi('USA', 'CHICAGO, IL',          1325, 1520, 1645, 'NORFOLK'))
lines.append(ipi('USA', 'CINCINNATI, OH',       1280, 1770, 1900, 'NORFOLK'))
lines.append(ipi('USA', 'CLEVELAND, OH',        1280, 1580, 1900, 'NORFOLK'))
lines.append(ipi('USA', 'COLUMBUS, OH',         1315, 1580, 1900, 'NORFOLK'))
lines.append(ipi('USA', 'KANSAS CITY',          2270, 2680, 3290, 'NORFOLK'))
lines.append(ipi('USA', 'LOUISVILLE, KY',       1550, 1880, 2280, 'NORFOLK'))
lines.append(ipi('USA', 'RICHMOND, VA',         1055, 1330, 1585, 'NORFOLK'))
lines.append(ipi('USA', 'SAINT LOUIS, MO',      1730, 2080, 2530, 'NORFOLK'))
lines.append("")

lines.append("-- Via Savannah")
lines.append(ipi('USA', 'ATLANTA, GA',          1055, 1330, 1585, 'SAVANNAH'))
lines.append(ipi('USA', 'CHARLOTTE, NC',        1190, 1480, 1775, 'SAVANNAH'))
lines.append(ipi('USA', 'CRANDALL, GA',         1925, 2095, 2470, 'SAVANNAH'))
lines.append(ipi('USA', 'HUNTSVILLE, AL',       1460, 1780, 2150, 'SAVANNAH'))
lines.append(ipi('USA', 'MEMPHIS, TN',          1475, 1760, 2025, 'SAVANNAH'))
lines.append(ipi('USA', 'NEW ORLEANS, LA',      1280, 1525, 1775, 'SAVANNAH'))
lines.append(ipi('USA', 'NASHVILLE, TN',        2270, 2680, 3290, 'SAVANNAH'))
lines.append(ipi('USA', 'TAMPA, FL',            1190, 1480, 1775, 'SAVANNAH'))
lines.append("")

lines.append("-- Via Charleston")
lines.append(ipi('USA', 'GREER, SC',            1515, 1810, 2150, 'CHARLESTON'))
lines.append("")

lines.append("-- Via Jacksonville")
lines.append(ipi('USA', 'MIAMI, FL',            1460, 1780, 2150, 'JACKSONVILLE'))
lines.append("")

lines.append("-- Via Tacoma")
lines.append(ipi('USA', 'CHICAGO, IL',          2530, 3140, 3355, 'TACOMA'))
lines.append(ipi('USA', 'DETROIT, MI',          2855, 3590, 3605, 'TACOMA'))
lines.append("")

lines.append("-- ======== IPI — Canada Inland Door Rates ========")
lines.append("")

lines.append("-- Via Vancouver")
lines.append(ipi('Canada', 'CALGARY, AB',       1695, 1930, 1930, 'VANCOUVER'))
lines.append(ipi('Canada', 'EDMONTON, AB',      1745, 1891, 2295, 'VANCOUVER'))
lines.append(ipi('Canada', 'TORONTO, ON',       2760, 3080, 3800, 'VANCOUVER'))
lines.append(ipi('Canada', 'MONTREAL, QC',      2760, 3080, 3800, 'VANCOUVER'))
lines.append(ipi('Canada', 'WINNIPEG, MB',      2940, 3280, 4050, 'VANCOUVER'))
lines.append("")

lines.append("-- Via Halifax")
lines.append(ipi('Canada', 'EDMONTON, AB',      3440, 3980, 4940, 'HALIFAX'))
lines.append(ipi('Canada', 'TORONTO, ON',       1775, 2130, 2595, 'HALIFAX'))
lines.append(ipi('Canada', 'MONTREAL, QC',      1775, 2130, 2595, 'HALIFAX'))
lines.append(ipi('Canada', 'INDIANAPOLIS, IN',  2810, 3280, 4050, 'HALIFAX'))
lines.append("")

lines.append("-- Via New York (US gateway for Canada)")
lines.append(ipi('Canada', 'TORONTO, ON',       1725, 2260, 2325, 'NEW YORK'))
lines.append(ipi('Canada', 'MONTREAL, QC',      1950, 2355, 2455, 'NEW YORK'))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
