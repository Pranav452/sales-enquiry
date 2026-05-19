import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
VF      = '2026-05-18'
VT      = '2026-05-31'
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
    "|Validity: 18-31 May 2026 | FAK straight (excl garments/personal effects/HHG)"
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
lines.append("-- Validity: 18-31 May 2026")
lines.append("-- Origins: Hazira / Mundra / Nhava Sheva / Cochin / New Mangalore /")
lines.append("--          Visakhapatnam / Pipavav / Chennai / Kattupalli /")
lines.append("--          Tuticorin / Kolkata")
lines.append("-- Inclusive: OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS")
lines.append("-- 45ft rates noted in NOTES field")
lines.append("-- IPI inland rates stored with NHAVA SHEVA as representative origin")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

USEC_PODS = [
    ('USA', 'NEW YORK, NY'),
    ('USA', 'NORFOLK, VA'),
    ('USA', 'CHARLESTON, SC'),
    ('USA', 'SAVANNAH, GA'),
    ('USA', 'JACKSONVILLE, FL'),
]

# ══════════════════════════════════════════════════════════════════════════════
# USEC — US East Coast (WIN / EC3 service) — 5 ports
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== USEC — US East Coast (18-31 May 2026) ========")
lines.append("")

usec_groups = [
    # (origin_codes, r20, r40hc, r45, service, via, remark)
    (['INHZA'],                    2070, 2300, 2910, 'WIN',     '',              ''),
    (['INMUN', 'INNSA'],           1665, 1850, 2340, 'WIN',     '',              ''),
    (['INCOK'],                    2070, 2300, 2910, 'WIN/EC3', 'LAEM CHABANG', 'All water via LKCMB'),
    (['INIXE', 'INVTZ', 'INPAV'], 2360, 2620, 3315, 'WIN/EC3', '',              ''),
    (['INMAA', 'INKTP'],           2070, 2300, 2910, 'WIN/EC3', '',              ''),
    (['INTUT'],                    2070, 2300, 2910, 'WIN/EC3', '',              ''),
    (['INCCU'],                    2070, 2300, 2910, 'WIN/EC3', 'LAEM CHABANG', 'WIN: via LKCMB; EC3: via LKCMB or SGSIN'),
]

for codes, r20, r40, r45, svc, via, remark in usec_groups:
    for dc, dp in USEC_PODS:
        lines.extend(expand(codes, dc, dp, r20, r40, r45, via=via, svc=svc, remark=remark))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# USWC (PS) — US West Coast, Pacific South: LA/LB + Oakland
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== USWC (PS) — Los Angeles/Long Beach & Oakland (18-31 May 2026) ========")
lines.append("")

# Group 1: INNSA, INPAV, INMUN, INHZA
for dp, r20, r40, r45 in [
    ('LOS ANGELES/LONG BEACH, CA', 2160, 2400, 3040),
    ('OAKLAND, CA',                 2250, 2500, 3165),
]:
    lines.extend(expand(['INNSA','INPAV','INMUN','INHZA'],
                        'USA', dp, r20, r40, r45, svc='USWC(PS)'))

# Group 2: INMAA, INKTP, INTUT, INIXE, INVTZ, INCOK
for dp, r20, r40, r45 in [
    ('LOS ANGELES/LONG BEACH, CA', 2430, 2700, 3420),
    ('OAKLAND, CA',                 2430, 2700, 3420),
]:
    lines.extend(expand(['INMAA','INKTP','INTUT','INIXE','INVTZ','INCOK'],
                        'USA', dp, r20, r40, r45, svc='USWC(PS)'))

# Group 3: INCCU (via SGSIN)
for dp, r20, r40, r45 in [
    ('LOS ANGELES/LONG BEACH, CA', 2520, 2800, 3545),
    ('OAKLAND, CA',                 2520, 2800, 3545),
]:
    lines.extend(expand(['INCCU'], 'USA', dp, r20, r40, r45,
                        via='SINGAPORE', svc='USWC(PS)', remark='All water via SGSIN'))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# USWC (PN) — Pacific North: Tacoma + Vancouver, BC
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== USWC (PN) — Tacoma & Vancouver (18-31 May 2026) ========")
lines.append("")

for dc, dp, r20_g1, r40_g1, r45_g1, r20_g2, r40_g2, r45_g2, r20_g3, r40_g3, r45_g3 in [
    ('USA',    'TACOMA, WA',     2250, 2500, 3165, 2430, 2700, 3420, 2520, 2800, 3545),
    ('Canada', 'VANCOUVER, BC',  2250, 2500, 3165, 2430, 2700, 3420, 2520, 2800, 3545),
]:
    lines.extend(expand(['INNSA','INPAV','INMUN','INHZA'],
                        dc, dp, r20_g1, r40_g1, r45_g1, svc='USWC(PN)'))
    lines.extend(expand(['INMAA','INKTP','INTUT','INIXE','INVTZ','INCOK'],
                        dc, dp, r20_g2, r40_g2, r45_g2, svc='USWC(PN)'))
    lines.extend(expand(['INCCU'], dc, dp, r20_g3, r40_g3, r45_g3,
                        via='SINGAPORE', svc='USWC(PN)', remark='All water via SGSIN'))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# CAEC — Canada East Coast: Halifax, NS
# Note: INHZA not shown for Halifax in source
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== CAEC — Halifax, NS (18-31 May 2026) ========")
lines.append("-- Note: INHZA (Hazira) not listed for Halifax in source sheet")
lines.append("")

halifax_groups = [
    (['INNSA', 'INMUN'],                    2635, 2925, 3705, '',              ''),
    (['INMAA', 'INKTP'],                    2430, 2700, 3420, '',              ''),
    (['INPAV','INTUT','INIXE','INVTZ','INCOK'], 2675, 2970, 3760, '',         ''),
    (['INCCU'],                             2430, 2700, 3420, 'LAEM CHABANG', 'All water via LKCMB or SGSIN'),
]
for codes, r20, r40, r45, via, remark in halifax_groups:
    lines.extend(expand(codes, 'Canada', 'HALIFAX, NS', r20, r40, r45,
                        via=via, svc='CAEC', remark=remark))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# IPI INLAND — Door rates via US/Canada gateway ports
# Representative origin: NHAVA SHEVA
# Applicable to all ISC origins; inland portion is gateway-to-inland
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== IPI INLAND DOOR RATES (18-31 May 2026) ========")
lines.append("-- Representative origin: NHAVA SHEVA (applicable to all ISC origins)")
lines.append("-- Via gateway port shown in VIA_PORT; rates are all-in door-to-door")
lines.append("")

IPI_CL = "IPI/door rate; all-in via US/Canada gateway; applicable ISC origins per ONE Line tariff"

GW_NAMES = {
    'LAX/LGB': 'LOS ANGELES/LONG BEACH',
    'OAK':     'OAKLAND',
    'VAN':     'VANCOUVER',
    'HAL':     'HALIFAX',
    'USNYC':   'NEW YORK',
    'USORF':   'NORFOLK',
    'USSAV':   'SAVANNAH',
    'USCHS':   'CHARLESTON',
    'USJAX':   'JACKSONVILLE',
    'USTIW':   'TACOMA',
    'CAHAL':   'HALIFAX',
}

# (dest_country, dest_city_state, via_gw_code, r20, r40hc, r45)
ipi = [
    # Via LAX/LGB (US West Coast)
    ('USA',    'DALLAS, TX',           'LAX/LGB', 2355, 2880, 3230),
    ('USA',    'HOUSTON, TX',          'LAX/LGB', 2595, 3160, 3355),
    ('USA',    'EL PASO, TX',          'LAX/LGB', 2175, 2645, 2975),
    ('USA',    'CHICAGO, IL',          'LAX/LGB', 2445, 3030, 3355),
    ('USA',    'CINCINNATI, OH',       'LAX/LGB', 2715, 3030, 3735),
    ('USA',    'CLEVELAND, OH',        'LAX/LGB', 2715, 3030, 3735),
    ('USA',    'COLUMBUS, OH',         'LAX/LGB', 2930, 3540, 3735),
    ('USA',    'MEMPHIS, TN',          'LAX/LGB', 2580, 2915, 3545),
    ('USA',    'OMAHA, NE',            'LAX/LGB', 3080, 3865, 4240),
    # Via OAK
    ('USA',    'SALT LAKE CITY, UT',   'OAK',     2355, 2740, 3230),
    ('USA',    'DENVER, CO',           'OAK',     3075, 3695, 4240),
    # Via VAN (Vancouver)
    ('Canada', 'CALGARY, AB',          'VAN',     1695, 1930, 1930),
    ('Canada', 'EDMONTON, AB',         'VAN',     1745, 1891, 2295),
    ('Canada', 'TORONTO, ON',          'VAN',     2760, 3080, 3800),
    ('Canada', 'MONTREAL, QC',         'VAN',     2760, 3080, 3800),
    ('Canada', 'WINNIPEG, MB',         'VAN',     2940, 3280, 4050),
    # Via HAL (Halifax)
    ('Canada', 'EDMONTON, AB',         'HAL',     3440, 3980, 4940),
    ('Canada', 'TORONTO, ON',          'HAL',     1775, 2130, 2595),
    ('Canada', 'MONTREAL, QC',         'HAL',     1775, 2130, 2595),
    ('USA',    'INDIANAPOLIS, IN',     'CAHAL',   2810, 3280, 4050),
    # Via USNYC (New York)
    ('Canada', 'TORONTO, ON',          'USNYC',   1725, 2260, 2325),
    ('Canada', 'MONTREAL, QC',         'USNYC',   1950, 2355, 2455),
    ('USA',    'BOSTON, MA',           'USNYC',   2100, 2380, 2660),
    ('USA',    'CHICAGO, IL',          'USNYC',   1705, 1900, 2000),
    ('USA',    'CINCINNATI, OH',       'USNYC',   1870, 2225, 2265),
    ('USA',    'CLEVELAND, OH',        'USNYC',   1560, 1880, 2250),
    ('USA',    'COLUMBUS, OH',         'USNYC',   1690, 2000, 2250),
    ('USA',    'DETROIT, MI',          'USNYC',   1485, 1795, 2090),
    ('USA',    'INDIANAPOLIS, IN',     'USNYC',   2760, 3035, 3670),
    ('USA',    'KANSAS CITY',          'USNYC',   2550, 2980, 3645),
    ('USA',    'PITTSBURGH, PA',       'USNYC',   1450, 1680, 2025),
    ('USA',    'SAINT LOUIS, MO',      'USNYC',   2010, 2380, 2885),
    ('USA',    'OMAHA, NE',            'USNYC',   3090, 3405, 4180),
    ('USA',    'MINNEAPOLIS, MN',      'USNYC',   3350, 3880, 4810),
    # Via USORF (Norfolk)
    ('USA',    'BALTIMORE, MD',        'USORF',   1810, 1980, 2430),
    ('USA',    'CHICAGO, IL',          'USORF',   1325, 1520, 1645),
    ('USA',    'CINCINNATI, OH',       'USORF',   1280, 1770, 1900),
    ('USA',    'CLEVELAND, OH',        'USORF',   1280, 1580, 1900),
    ('USA',    'COLUMBUS, OH',         'USORF',   1315, 1580, 1900),
    ('USA',    'KANSAS CITY',          'USORF',   2270, 2680, 3290),
    ('USA',    'LOUISVILLE, KY',       'USORF',   1550, 1880, 2280),
    ('USA',    'RICHMOND, VA',         'USORF',   1055, 1330, 1585),
    ('USA',    'SAINT LOUIS, MO',      'USORF',   1730, 2080, 2530),
    # Via USSAV (Savannah)
    ('USA',    'ATLANTA, GA',          'USSAV',   1055, 1330, 1585),
    ('USA',    'CHARLOTTE, NC',        'USSAV',   1190, 1480, 1775),
    ('USA',    'CRANDALL, GA',         'USSAV',   1925, 2095, 2470),
    ('USA',    'HUNTSVILLE, AL',       'USSAV',   1460, 1780, 2150),
    ('USA',    'MEMPHIS, TN',          'USSAV',   1475, 1760, 2025),
    ('USA',    'NEW ORLEANS, LA',      'USSAV',   1280, 1525, 1775),
    ('USA',    'NASHVILLE, TN',        'USSAV',   2270, 2680, 3290),
    ('USA',    'TAMPA, FL',            'USSAV',   1190, 1480, 1775),
    # Via USCHS (Charleston)
    ('USA',    'GREER, SC',            'USCHS',   1515, 1810, 2150),
    ('USA',    'TAMPA, FL',            'USCHS',   1190, 1480, 1775),
    # Via USJAX (Jacksonville)
    ('USA',    'MIAMI, FL',            'USJAX',   1460, 1780, 2150),
    # Via USTIW (Tacoma)
    ('USA',    'CHICAGO, IL',          'USTIW',   2530, 3140, 3355),
    ('USA',    'DETROIT, MI',          'USTIW',   2855, 3590, 3605),
]

for dc, dp, gw_code, r20, r40hc, r45 in ipi:
    via_name = GW_NAMES[gw_code]
    notes    = f'IPI door rate via {via_name}; 45ft=${r45}; representative ISC origin; FAK'
    lines.append(row('NHAVA SHEVA', dc, dp, r20, r40hc,
                     via=via_name, notes=notes, xcl=IPI_CL))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
