import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'ONE'
PDF = 'https://www.one-line.com/en/advanced-page/one-quote'

def esc(s): return s.replace("'", "''")

def row(op, dc, dp, r20, r40, vf, vt, via='', sur='', notes='', cl=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    s = f"'{esc(sur)}'" if sur else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    c = esc(cl)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','India','{esc(op)}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{c}','{PDF}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

# ── CONSTANTS ────────────────────────────────────────────────────────────────
SURCH = 'OBS:incl;PCT:incl;SCT:incl;THD:incl;SPT:incl;ALM:incl;PSS:incl;EFS:incl;IHD:incl;AGS:incl'

CL = (
    "ONE ISC to USA & Canada May 2026 | Inclusive of OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS"
    "|For Indian Sub-Continent origins only (Not applicable ex Bangladesh/Sri Lanka/Pakistan)"
    "|FAK Straight — excluding Garments, Personal Effects, and Household Goods"
    "|Garments via WIN service: add USD 50/unit; via non-WIN: add USD 100/unit"
    "|Household Goods & Personal Effects: add USD 200/unit on top of FAK"
    "|DG IMO Class 3-9: add $240/20 $300/40HC $300/45; subject to POL/POD/planner/rail approval"
    "|DG IMO Class 2: add $800/20 $800/40HC $800/45; subject to approval"
    "|DG via SIN PSA Group 1/1D/2: add $538/20 $753/40HC $753/45; subject to approval"
    "|For USSAV HAZ: refer to Customer Advisory Notice of Surcharge HAZ (TPEB)"
    "|Rates subject to all other surcharges in Governing Tariff at time of shipment"
    f"|{PDF}"
)

IPI_CL = (
    "ONE ISC→USA/Canada IPI/RIPI Add-On May 2026 — ADD to ocean port-to-port rate"
    "|IPI rate = inland leg add-on only; total rate = ocean rate + IPI add-on"
    "|Subject to same T&C as ocean rate (OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS incl in ocean leg)"
    f"|{PDF}"
)

IPI_S = 'IPI:add-on'

# ── DESTINATION LISTS ────────────────────────────────────────────────────────
USEC = [
    ('USA', 'NEW YORK, NY'),
    ('USA', 'NORFOLK, VA'),
    ('USA', 'CHARLESTON, SC'),
    ('USA', 'SAVANNAH, GA'),
    ('USA', 'JACKSONVILLE, FL'),
]
NY_NF   = USEC[:2]
CHS_JAX = USEC[2:]

lines = []
lines.append("-- ============================================================")
lines.append("-- ONE ISC→USA & Canada Rates May 2026 (Two-period revision)")
lines.append("-- Block 1: 1-3 May 2026 | Block 2: 4-14 May 2026")
lines.append("-- IPI/RIPI Add-Ons: 1-14 May 2026 (unchanged between periods)")
lines.append("-- All rates inclusive of OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS")
lines.append("-- USEC ports: New York, Norfolk, Charleston, Savannah, Jacksonville")
lines.append("-- USWC ports: LA/Long Beach, Oakland, Tacoma")
lines.append("-- Canada: Vancouver (WC), Halifax (EC)")
lines.append("-- Origins: Hazira/Mundra/Nhava Sheva/Cochin/Mangalore/Vizag/Pipavav")
lines.append("--          Chennai/Krishnapatnam/Tuticorin/Kolkata")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# BLOCK 1 — USEC  Valid: 1-May to 3-May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF1 = '2026-05-01'; VT1 = '2026-05-03'

lines.append("-- ======== BLOCK 1: USEC  1-3 May 2026 ========")
lines.append("")

def usec_block(op, pods, r20, r40, vf, vt, via='', svc='WIN', note_extra=''):
    out = []
    for dc, dp in pods:
        n = f'Service: {svc}; 45ft ${round(r40*1.267)}'
        if note_extra: n += f'; {note_extra}'
        out.append(row(op, dc, dp, r20, r40, vf, vt, via=via, sur=SURCH, notes=n, cl=CL))
    return out

# HAZIRA — WIN only, all 5 USEC
for r in usec_block('HAZIRA',        USEC,   2520, 2650, VF1, VT1, svc='WIN'): lines.append(r)
# MUNDRA — WIN only, all 5 USEC
for r in usec_block('MUNDRA',        USEC,   2140, 2250, VF1, VT1, svc='WIN'): lines.append(r)
# NHAVA SHEVA — WIN, all 5 USEC (same rate both NY/NF and CHS/SAV/JAX in block 1)
for r in usec_block('NHAVA SHEVA',   USEC,   2140, 2250, VF1, VT1, svc='WIN'): lines.append(r)
# COCHIN — WIN + EC3, via LKCMB (Colombo)
for r in usec_block('COCHIN',        USEC,   2340, 2600, VF1, VT1, via='COLOMBO', svc='WIN/EC3', note_extra='All water via Colombo (LKCMB)'): lines.append(r)
# MANGALORE — WIN + EC3
for r in usec_block('MANGALORE',     USEC,   2450, 2720, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# VISAKHAPATNAM — WIN + EC3
for r in usec_block('VISAKHAPATNAM', USEC,   2450, 2720, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# PIPAVAV — WIN + EC3
for r in usec_block('PIPAVAV',       USEC,   2450, 2720, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# CHENNAI — WIN + EC3
for r in usec_block('CHENNAI',       USEC,   2295, 2550, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# KRISHNAPATNAM — WIN + EC3
for r in usec_block('KRISHNAPATNAM', USEC,   2295, 2550, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# TUTICORIN — WIN + EC3
for r in usec_block('TUTICORIN',     USEC,   2295, 2550, VF1, VT1, svc='WIN/EC3'): lines.append(r)
# KOLKATA — WIN + EC3, all water via LKCMB
for r in usec_block('KOLKATA',       USEC,   2425, 2550, VF1, VT1, via='COLOMBO', svc='WIN/EC3', note_extra='All water via Colombo (LKCMB)'): lines.append(r)

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# BLOCK 2 — USEC  Valid: 4-May to 14-May 2026
# ═══════════════════════════════════════════════════════════════════════════════
VF2 = '2026-05-04'; VT2 = '2026-05-14'

lines.append("-- ======== BLOCK 2: USEC  4-14 May 2026 (revised rates) ========")
lines.append("")

# HAZIRA — lower rates
for r in usec_block('HAZIRA',        USEC,   2160, 2400, VF2, VT2, svc='WIN'): lines.append(r)
# MUNDRA — lower rates
for r in usec_block('MUNDRA',        USEC,   1800, 2000, VF2, VT2, svc='WIN'): lines.append(r)
# NHAVA SHEVA — NY/Norfolk at 2025/2250; CHS/SAV/JAX at 1800/2000
for r in usec_block('NHAVA SHEVA',   NY_NF,   2025, 2250, VF2, VT2, svc='WIN'): lines.append(r)
for r in usec_block('NHAVA SHEVA',   CHS_JAX, 1800, 2000, VF2, VT2, svc='WIN'): lines.append(r)
# COCHIN — lower rates, via LKCMB
for r in usec_block('COCHIN',        USEC,   2160, 2400, VF2, VT2, via='COLOMBO', svc='WIN/EC3', note_extra='All water via Colombo (LKCMB)'): lines.append(r)
# MANGALORE — unchanged from block 1
for r in usec_block('MANGALORE',     USEC,   2450, 2720, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# VISAKHAPATNAM — unchanged
for r in usec_block('VISAKHAPATNAM', USEC,   2450, 2720, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# PIPAVAV — unchanged
for r in usec_block('PIPAVAV',       USEC,   2450, 2720, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# CHENNAI — lower rates
for r in usec_block('CHENNAI',       USEC,   2160, 2400, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# KRISHNAPATNAM — lower rates
for r in usec_block('KRISHNAPATNAM', USEC,   2160, 2400, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# TUTICORIN — lower rates
for r in usec_block('TUTICORIN',     USEC,   2160, 2400, VF2, VT2, svc='WIN/EC3'): lines.append(r)
# KOLKATA — lower rates
for r in usec_block('KOLKATA',       USEC,   2160, 2400, VF2, VT2, via='COLOMBO', svc='WIN/EC3', note_extra='All water via LKCMB or SGSIN'): lines.append(r)

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# USWC — Los Angeles/Long Beach, Oakland, Tacoma  (1-14 May 2026)
# Most groups unchanged between blocks; only KOLKATA differs
# ═══════════════════════════════════════════════════════════════════════════════
VF_ALL = '2026-05-01'; VT_ALL = '2026-05-14'

lines.append("-- ======== USWC — LA/Long Beach, Oakland, Tacoma  1-14 May 2026 ========")
lines.append("-- Group 1 (NSA/PAV/MUN/HZA) and Group 2 (MAA/KTP/TUT/IXE/VTZ/COK) unchanged both periods")
lines.append("")

uswc_pods = [
    ('USA', 'LOS ANGELES / LONG BEACH, CA'),
    ('USA', 'OAKLAND, CA'),
    ('USA', 'TACOMA, WA'),
]

# Group 1 origins — LA/OAK/Tacoma (same both periods)
for op in ['NHAVA SHEVA', 'PIPAVAV', 'MUNDRA', 'HAZIRA']:
    for dc, dp in uswc_pods:
        r20, r40 = (2070, 2300) if 'LOS ANGELES' in dp else (2250, 2500)
        lines.append(row(op, dc, dp, r20, r40, VF_ALL, VT_ALL,
            sur=SURCH,
            notes='USWC(PS/PN); Group 1 West/North India origins; 1-14 May 2026',
            cl=CL))

# Group 2 origins — LA/OAK/Tacoma (same both periods)
for op in ['CHENNAI', 'KRISHNAPATNAM', 'TUTICORIN', 'MANGALORE', 'VISAKHAPATNAM', 'COCHIN']:
    for dc, dp in uswc_pods:
        lines.append(row(op, dc, dp, 2340, 2600, VF_ALL, VT_ALL,
            sur=SURCH,
            notes='USWC(PS/PN); Group 2 South/East India origins; 1-14 May 2026',
            cl=CL))

# KOLKATA — USWC — block 1 (2565/2700) and block 2 (2430/2700), via SGSIN
for dc, dp in uswc_pods:
    lines.append(row('KOLKATA', dc, dp, 2565, 2700, VF1, VT1, via='SINGAPORE',
        sur=SURCH,
        notes='USWC via SGSIN (all water); Block 1 rate 1-3 May',
        cl=CL))
    lines.append(row('KOLKATA', dc, dp, 2430, 2700, VF2, VT2, via='SINGAPORE',
        sur=SURCH,
        notes='USWC via SGSIN (all water); Block 2 revised rate 4-14 May',
        cl=CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# CANADA — Vancouver (1-14 May)
# ═══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== CANADA — Vancouver, BC  1-14 May 2026 ========")
lines.append("")

# Group 1 — Vancouver (same both periods)
for op in ['NHAVA SHEVA', 'PIPAVAV', 'MUNDRA', 'HAZIRA']:
    lines.append(row(op, 'Canada', 'VANCOUVER, BC', 2250, 2500, VF_ALL, VT_ALL,
        sur=SURCH, notes='CAEC via USWC(PN); Group 1 origins', cl=CL))

# Group 2 — Vancouver
for op in ['CHENNAI', 'KRISHNAPATNAM', 'TUTICORIN', 'MANGALORE', 'VISAKHAPATNAM', 'COCHIN']:
    lines.append(row(op, 'Canada', 'VANCOUVER, BC', 2340, 2600, VF_ALL, VT_ALL,
        sur=SURCH, notes='CAEC via USWC(PN); Group 2 origins', cl=CL))

# KOLKATA — Vancouver — two periods
lines.append(row('KOLKATA', 'Canada', 'VANCOUVER, BC', 2565, 2700, VF1, VT1, via='SINGAPORE',
    sur=SURCH, notes='CAEC via SGSIN; Block 1 rate 1-3 May', cl=CL))
lines.append(row('KOLKATA', 'Canada', 'VANCOUVER, BC', 2430, 2700, VF2, VT2, via='SINGAPORE',
    sur=SURCH, notes='CAEC via SGSIN; Block 2 revised rate 4-14 May', cl=CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# CANADA — Halifax, NS  (1-14 May; most unchanged between periods)
# ═══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== CANADA — Halifax, NS  1-14 May 2026 ========")
lines.append("")

# INNSA + MUNDRA Halifax — same both periods
for op in ['NHAVA SHEVA', 'MUNDRA']:
    lines.append(row(op, 'Canada', 'HALIFAX, NS', 2635, 2925, VF_ALL, VT_ALL,
        sur=SURCH, notes='CAEC Halifax; 1-14 May 2026', cl=CL))

# CHENNAI + KRISHNAPATNAM Halifax
for op in ['CHENNAI', 'KRISHNAPATNAM']:
    lines.append(row(op, 'Canada', 'HALIFAX, NS', 2430, 2700, VF_ALL, VT_ALL,
        sur=SURCH, notes='CAEC Halifax; 1-14 May 2026', cl=CL))

# PIPAVAV/TUTICORIN/MANGALORE/VISAKHAPATNAM/COCHIN Halifax
for op in ['PIPAVAV', 'TUTICORIN', 'MANGALORE', 'VISAKHAPATNAM', 'COCHIN']:
    lines.append(row(op, 'Canada', 'HALIFAX, NS', 2675, 2970, VF_ALL, VT_ALL,
        sur=SURCH, notes='CAEC Halifax; 1-14 May 2026', cl=CL))

# KOLKATA Halifax — two periods
lines.append(row('KOLKATA', 'Canada', 'HALIFAX, NS', 2565, 2700, VF1, VT1, via='COLOMBO',
    sur=SURCH, notes='CAEC Halifax via LKCMB; Block 1 rate 1-3 May', cl=CL))
lines.append(row('KOLKATA', 'Canada', 'HALIFAX, NS', 2430, 2700, VF2, VT2, via='COLOMBO',
    sur=SURCH, notes='CAEC Halifax via LKCMB or SGSIN; Block 2 revised rate 4-14 May', cl=CL))

lines.append("")

# ═══════════════════════════════════════════════════════════════════════════════
# IPI / RIPI ADD-ONS  (1-14 May 2026, unchanged between periods)
# Rates are ADD-ONS — add to ocean port rate for total door-to-door
# ORIGIN_PORT = NHAVA SHEVA (representative; applicable all ISC origins)
# ═══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== IPI / RIPI ADD-ON RATES  1-14 May 2026 ========")
lines.append("-- ADD these to ocean port-to-port rate for total inland delivery rate")
lines.append("-- Origin = NHAVA SHEVA (representative; applicable to all ISC origins)")
lines.append("")

OP_IPI = 'NHAVA SHEVA'

ipi = [
    # Via LAX/LGB
    ('USA', 'DALLAS, TX',           'LOS ANGELES / LONG BEACH, CA', 2355, 2880),
    ('USA', 'HOUSTON, TX',          'LOS ANGELES / LONG BEACH, CA', 2595, 3160),
    ('USA', 'EL PASO, TX',          'LOS ANGELES / LONG BEACH, CA', 2175, 2645),
    ('USA', 'CHICAGO, IL',          'LOS ANGELES / LONG BEACH, CA', 2445, 3030),
    ('USA', 'CINCINNATI, OH',       'LOS ANGELES / LONG BEACH, CA', 2715, 3030),
    ('USA', 'CLEVELAND, OH',        'LOS ANGELES / LONG BEACH, CA', 2715, 3030),
    ('USA', 'COLUMBUS, OH',         'LOS ANGELES / LONG BEACH, CA', 2930, 3540),
    ('USA', 'MEMPHIS, TN',          'LOS ANGELES / LONG BEACH, CA', 2580, 2915),
    ('USA', 'OMAHA, NE',            'LOS ANGELES / LONG BEACH, CA', 3080, 3865),
    # Via OAK
    ('USA', 'SALT LAKE CITY, UT',   'OAKLAND, CA',                  2355, 2740),
    ('USA', 'DENVER, CO',           'OAKLAND, CA',                  3075, 3695),
    # Via VAN (Vancouver)
    ('Canada', 'CALGARY, AB',       'VANCOUVER, BC',                1695, 1930),
    ('Canada', 'EDMONTON, AB',      'VANCOUVER, BC',                1745, 1891),
    ('Canada', 'TORONTO, ON',       'VANCOUVER, BC',                2760, 3080),
    ('Canada', 'MONTREAL, QC',      'VANCOUVER, BC',                2760, 3080),
    ('Canada', 'WINNIPEG, MB',      'VANCOUVER, BC',                2940, 3280),
    # Via HAL (Halifax)
    ('Canada', 'EDMONTON, AB',      'HALIFAX, NS',                  3440, 3980),
    ('Canada', 'TORONTO, ON',       'HALIFAX, NS',                  1775, 2130),
    ('Canada', 'MONTREAL, QC',      'HALIFAX, NS',                  1775, 2130),
    # Via USNYC
    ('USA', 'TORONTO (via NYC)',     'NEW YORK, NY',                 1725, 2260),
    ('USA', 'MONTREAL (via NYC)',    'NEW YORK, NY',                 1950, 2355),
    ('USA', 'ATLANTA, GA',          'SAVANNAH, GA',                 1055, 1330),
    ('USA', 'BALTIMORE, MD',        'NORFOLK, VA',                  1810, 1980),
    ('USA', 'BOSTON, MA',           'NEW YORK, NY',                 2100, 2380),
    ('USA', 'CHARLOTTE, NC',        'SAVANNAH, GA',                 1190, 1480),
    ('USA', 'CHICAGO, IL',          'NEW YORK, NY',                 1705, 1900),
    ('USA', 'CINCINNATI, OH',       'NEW YORK, NY',                 1870, 2225),
    ('USA', 'CLEVELAND, OH',        'NEW YORK, NY',                 1560, 1880),
    ('USA', 'COLUMBUS, OH',         'NEW YORK, NY',                 1690, 2000),
    ('USA', 'DETROIT, MI',          'NEW YORK, NY',                 1485, 1795),
    ('USA', 'CRANDALL, GA',         'SAVANNAH, GA',                 1925, 2095),
    ('USA', 'GREER, SC',            'CHARLESTON, SC',               1515, 1810),
    ('USA', 'HUNTSVILLE, AL',       'SAVANNAH, GA',                 1460, 1780),
    ('USA', 'INDIANAPOLIS, IN',     'NEW YORK, NY',                 2760, 3035),
    ('USA', 'INDIANAPOLIS, IN',     'HALIFAX, NS',                  2810, 3280),
    ('USA', 'KANSAS CITY, MO',      'NEW YORK, NY',                 2550, 2980),
    ('USA', 'MEMPHIS, TN',          'SAVANNAH, GA',                 1475, 1760),
    ('USA', 'MIAMI, FL',            'JACKSONVILLE, FL',             1460, 1780),
    ('USA', 'RICHMOND, VA',         'NORFOLK, VA',                  1055, 1330),
    ('USA', 'TAMPA, FL',            'SAVANNAH / CHARLESTON',        1190, 1480),
    ('USA', 'NEW ORLEANS, LA',      'SAVANNAH, GA',                 1280, 1525),
    ('USA', 'NASHVILLE, TN',        'SAVANNAH, GA',                 2270, 2680),
    ('USA', 'PITTSBURGH, PA',       'NEW YORK, NY',                 1450, 1680),
    ('USA', 'SAINT LOUIS, MO',      'NEW YORK, NY',                 2010, 2380),
    ('USA', 'OMAHA, NE',            'NEW YORK, NY',                 3090, 3405),
    ('USA', 'MINNEAPOLIS, MN',      'NEW YORK, NY',                 3350, 3880),
    # Via USORF (Norfolk)
    ('USA', 'CHICAGO, IL',          'NORFOLK, VA',                  1325, 1520),
    ('USA', 'CINCINNATI, OH',       'NORFOLK, VA',                  1280, 1770),
    ('USA', 'CLEVELAND, OH',        'NORFOLK, VA',                  1280, 1580),
    ('USA', 'COLUMBUS, OH',         'NORFOLK, VA',                  1315, 1580),
    ('USA', 'KANSAS CITY, MO',      'NORFOLK, VA',                  2270, 2680),
    ('USA', 'LOUISVILLE, KY',       'NORFOLK, VA',                  1550, 1880),
    ('USA', 'SAINT LOUIS, MO',      'NORFOLK, VA',                  1730, 2080),
    # Via USTIW
    ('USA', 'CHICAGO, IL (TIW)',    'TACOMA, WA',                   2530, 3140),
    ('USA', 'DETROIT, MI (TIW)',    'TACOMA, WA',                   2855, 3590),
]

for dc, inland, via_port, r20, r40 in ipi:
    lines.append(row(OP_IPI, dc, inland, r20, r40, VF_ALL, VT_ALL,
        via=via_port,
        sur=IPI_S,
        notes=f'IPI add-on via {via_port}; ADD to ocean port rate for total door rate',
        cl=IPI_CL))

lines.append("")

# ── TOTAL & PRINT ─────────────────────────────────────────────────────────────
total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
