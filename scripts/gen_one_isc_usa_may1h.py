import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

VF = '2026-05-01'
VT = '2026-05-14'
SL = 'ONE'

PORTS = {
    'INHZA': ('India', 'HAZIRA'),
    'INMUN': ('India', 'MUNDRA'),
    'INNSA': ('India', 'NHAVA SHEVA'),
    'INCOK': ('India', 'KOCHI'),
    'INIXE': ('India', 'ENNORE'),
    'INVTZ': ('India', 'VISAKHAPATNAM'),
    'INPAV': ('India', 'PIPAVAV'),
    'INMAA': ('India', 'CHENNAI'),
    'INKTP': ('India', 'KRISHNAPATNAM'),
    'INTUT': ('India', 'TUTICORIN'),
    'INCCU': ('India', 'KOLKATA'),
}

INCL = 'Incl OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS'

BASE_CLAUSES = (
    "FAK Straight excl Garments/Personal Effects/HHG"
    "|Garments straight loads (non-WIN svc): add $100/unit (excl Pakistan/Bangladesh origin)"
    "|Garments straight loads (WIN svc): add $50/unit (excl Pakistan/Bangladesh origin)"
    "|HHG/Personal Effects: add $200/unit on top of FAK"
    "|DG Class 3-9: add $240/20 $300/40/40HC/45; subj POL/POD DG approval and vessel/rail planner"
    "|DG Class 2: add $800/unit; subj POL/POD DG approval"
    "|Singapore Transship DG (PSA Group 1/1D and 2): add $538/20 $753/40/40HC/45"
    "|For USSAV HAZ cargo refer Customer Advisory Notice of Surcharge HAZ TPEB"
    "|Incl OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS (Indian Sub Continent; excl Bangladesh/Sri Lanka/Pakistan)"
    "|Rates subject to all other surcharges per governing tariff"
)

def row(oc, op, dc, dp, r20, r40, via='', notes=''):
    v  = f"'{via}'" if via else 'NULL'
    n  = f"'{notes.replace(chr(39), chr(39)*2)}'" if notes else 'NULL'
    cl = BASE_CLAUSES.replace("'", "''")
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{oc}','{op}','{dc}','{dp}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',{v},NULL,{n},'{cl}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

USEC_PORTS = [
    ('USA','NEW YORK'),('USA','NORFOLK'),('USA','CHARLESTON'),
    ('USA','SAVANNAH'),('USA','JACKSONVILLE'),
]
GRP1 = ['INNSA','INPAV','INMUN','INHZA']
GRP2 = ['INMAA','INKTP','INTUT','INIXE','INVTZ','INCOK']

lines = []
lines.append("-- ============================================================")
lines.append("-- ONE (Ocean Network Express) - ISC to USA/Canada FAK Rates")
lines.append("-- Valid: 1-14 May 2026 | Incl OBS")
lines.append("-- Inclusive: OBS/PCT/SCT/THD/SPT/ALM/PSS/EFS/IHD/AGS (ISC)")
lines.append("-- IPI/RIPI add-on rates at bottom (add to ocean base)")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ----------------------------------------------------------
# USEC — WIN service
# ----------------------------------------------------------
lines.append("-- ======== USEC - WIN Service ========")
lines.append("")

lines.append("-- HAZIRA  20:2520  40:2650  45:3355")
for dc,dp in USEC_PORTS:
    lines.append(row('India','HAZIRA',dc,dp,2520,2650,
        notes=f'WIN service; {INCL}; 45ft RAD $3355'))

lines.append("")
lines.append("-- MUNDRA  20:2140  40:2250  45:2850")
for dc,dp in USEC_PORTS:
    lines.append(row('India','MUNDRA',dc,dp,2140,2250,
        notes=f'WIN service; {INCL}; 45ft RAD $2850'))

lines.append("")
lines.append("-- NHAVA SHEVA  20:2140  40:2250  45:2850")
for dc,dp in USEC_PORTS:
    lines.append(row('India','NHAVA SHEVA',dc,dp,2140,2250,
        notes=f'WIN service; {INCL}; 45ft RAD $2850'))

lines.append("")
lines.append("-- KOCHI (WIN) — via Colombo  20:2340  40:2600  45:3290")
for dc,dp in USEC_PORTS:
    lines.append(row('India','KOCHI',dc,dp,2340,2600,via='COLOMBO',
        notes=f'WIN service; via LKCMB (Colombo); {INCL}; 45ft RAD $3290'))

lines.append("")
lines.append("-- ENNORE / VISAKHAPATNAM / PIPAVAV (WIN)  20:2450  40:2720  45:3445")
for code in ['INIXE','INVTZ','INPAV']:
    oc,op = PORTS[code]
    lines.append(f"-- {op}")
    for dc,dp in USEC_PORTS:
        lines.append(row(oc,op,dc,dp,2450,2720,
            notes=f'WIN service; {INCL}; 45ft RAD $3445'))

lines.append("")
lines.append("-- CHENNAI / KRISHNAPATNAM (WIN)  20:2295  40:2550  45:3230")
for code in ['INMAA','INKTP']:
    oc,op = PORTS[code]
    lines.append(f"-- {op}")
    for dc,dp in USEC_PORTS:
        lines.append(row(oc,op,dc,dp,2295,2550,
            notes=f'WIN service; {INCL}; 45ft RAD $3230'))

lines.append("")
lines.append("-- TUTICORIN (WIN)  20:2295  40:2550  45:3230")
for dc,dp in USEC_PORTS:
    lines.append(row('India','TUTICORIN',dc,dp,2295,2550,
        notes=f'WIN service; {INCL}; 45ft RAD $3230'))

lines.append("")
lines.append("-- KOLKATA (WIN) — all water via Colombo  20:2425  40:2550  45:3230")
for dc,dp in USEC_PORTS:
    lines.append(row('India','KOLKATA',dc,dp,2425,2550,via='COLOMBO',
        notes=f'WIN service; all water routing via LKCMB (Colombo); {INCL}; 45ft RAD $3230'))

lines.append("")

# ----------------------------------------------------------
# USEC — EC3 service
# ----------------------------------------------------------
lines.append("-- ======== USEC - EC3 Service ========")
lines.append("")

lines.append("-- KOCHI (EC3) — via Colombo  20:2340  40:2600  45:3290")
for dc,dp in USEC_PORTS:
    lines.append(row('India','KOCHI',dc,dp,2340,2600,via='COLOMBO',
        notes=f'EC3 service; via LKCMB (Colombo); {INCL}; 45ft RAD $3290'))

lines.append("")
lines.append("-- ENNORE / VISAKHAPATNAM / PIPAVAV (EC3)  20:2450  40:2720  45:3445")
for code in ['INIXE','INVTZ','INPAV']:
    oc,op = PORTS[code]
    lines.append(f"-- {op}")
    for dc,dp in USEC_PORTS:
        lines.append(row(oc,op,dc,dp,2450,2720,
            notes=f'EC3 service; {INCL}; 45ft RAD $3445'))

lines.append("")
lines.append("-- CHENNAI / KRISHNAPATNAM (EC3)  20:2295  40:2550  45:3230")
for code in ['INMAA','INKTP']:
    oc,op = PORTS[code]
    lines.append(f"-- {op}")
    for dc,dp in USEC_PORTS:
        lines.append(row(oc,op,dc,dp,2295,2550,
            notes=f'EC3 service; {INCL}; 45ft RAD $3230'))

lines.append("")
lines.append("-- TUTICORIN (EC3)  20:2295  40:2550  45:3230")
for dc,dp in USEC_PORTS:
    lines.append(row('India','TUTICORIN',dc,dp,2295,2550,
        notes=f'EC3 service; {INCL}; 45ft RAD $3230'))

lines.append("")
lines.append("-- KOLKATA (EC3) — all water via Colombo or Singapore  20:2425  40:2550  45:3230")
for dc,dp in USEC_PORTS:
    lines.append(row('India','KOLKATA',dc,dp,2425,2550,via='COLOMBO/SINGAPORE',
        notes=f'EC3 service; all water routing via LKCMB or SGSIN; {INCL}; 45ft RAD $3230'))

lines.append("")

# ----------------------------------------------------------
# USWC — PS (LA/LGB + Oakland)  — UNCHANGED from Apr 26-30
# ----------------------------------------------------------
lines.append("-- ======== USWC - Pacific Southwest (PS): LA/LGB + Oakland ========")
lines.append("")

lines.append("-- Group 1 (NHAVA SHEVA/PIPAVAV/MUNDRA/HAZIRA)  20:2070/2250  40:2300/2500")
for code in GRP1:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'USA','LOS ANGELES/LONG BEACH',2070,2300,
        notes=f'USWC PS service; {INCL}; 45ft RAD $2910'))
    lines.append(row(oc,op,'USA','OAKLAND',2250,2500,
        notes=f'USWC PS service; {INCL}; 45ft RAD $3165'))

lines.append("")
lines.append("-- Group 2 (CHENNAI/KRISHNAPATNAM/TUTICORIN/ENNORE/VIZAG/KOCHI)  20:2340  40:2600")
for code in GRP2:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'USA','LOS ANGELES/LONG BEACH',2340,2600,
        notes=f'USWC PS service; {INCL}; 45ft RAD $3290'))
    lines.append(row(oc,op,'USA','OAKLAND',2340,2600,
        notes=f'USWC PS service; {INCL}; 45ft RAD $3290'))

lines.append("")
lines.append("-- KOLKATA — all water via Singapore  20:2565  40:2700")
lines.append(row('India','KOLKATA','USA','LOS ANGELES/LONG BEACH',2565,2700,via='SINGAPORE',
    notes=f'USWC PS service; all water routing via SGSIN; {INCL}; 45ft RAD $3420'))
lines.append(row('India','KOLKATA','USA','OAKLAND',2565,2700,via='SINGAPORE',
    notes=f'USWC PS service; all water routing via SGSIN; {INCL}; 45ft RAD $3420'))
lines.append("")

# ----------------------------------------------------------
# USWC — PN (Tacoma)  — UNCHANGED
# ----------------------------------------------------------
lines.append("-- ======== USWC - Pacific Northwest (PN): Tacoma ========")
lines.append("")

for code in GRP1:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'USA','TACOMA',2250,2500,
        notes=f'USWC PN service; {INCL}; 45ft RAD $3165'))
for code in GRP2:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'USA','TACOMA',2340,2600,
        notes=f'USWC PN service; {INCL}; 45ft RAD $3290'))
lines.append(row('India','KOLKATA','USA','TACOMA',2565,2700,via='SINGAPORE',
    notes=f'USWC PN service; all water routing via SGSIN; {INCL}; 45ft RAD $3420'))
lines.append("")

# ----------------------------------------------------------
# CANADA — Vancouver  — UNCHANGED
# ----------------------------------------------------------
lines.append("-- ======== CANADA - Vancouver, BC ========")
lines.append("")

for code in GRP1:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'Canada','VANCOUVER',2250,2500,
        notes=f'USWC PN service; {INCL}; 45ft RAD $3165'))
for code in GRP2:
    oc,op = PORTS[code]
    lines.append(row(oc,op,'Canada','VANCOUVER',2340,2600,
        notes=f'USWC PN service; {INCL}; 45ft RAD $3290'))
lines.append(row('India','KOLKATA','Canada','VANCOUVER',2565,2700,via='SINGAPORE',
    notes=f'USWC PN service; all water routing via SGSIN; {INCL}; 45ft RAD $3420'))
lines.append("")

# ----------------------------------------------------------
# CANADA — Halifax (CAEC)  — RATES UPDATED
# ----------------------------------------------------------
lines.append("-- ======== CANADA - Halifax, NS (CAEC) ========")
lines.append("")

for code in ['INNSA','INMUN']:       # 2635/2925  was 2590/2875
    oc,op = PORTS[code]
    lines.append(row(oc,op,'Canada','HALIFAX',2635,2925,
        notes=f'CAEC service; {INCL}; 45ft RAD $3705'))

for code in ['INMAA','INKTP']:       # 2430/2700  was 2385/2650
    oc,op = PORTS[code]
    lines.append(row(oc,op,'Canada','HALIFAX',2430,2700,
        notes=f'CAEC service; {INCL}; 45ft RAD $3420'))

for code in ['INPAV','INTUT','INIXE','INVTZ','INCOK']:  # 2675/2970  was 2630/2920
    oc,op = PORTS[code]
    lines.append(row(oc,op,'Canada','HALIFAX',2675,2970,
        notes=f'CAEC service; {INCL}; 45ft RAD $3760'))

lines.append(row('India','KOLKATA','Canada','HALIFAX',2565,2700,via='COLOMBO/SINGAPORE',
    notes=f'CAEC service; all water routing via LKCMB or SGSIN; {INCL}; 45ft RAD $3420'))
lines.append("")

# ----------------------------------------------------------
# IPI / RIPI ADD-ON RATES  — UNCHANGED from Apr 26-30
# ----------------------------------------------------------
lines.append("-- ============================================================")
lines.append("-- IPI / RIPI ADD-ON RATES (add to ocean base rate above)")
lines.append("-- Rates UNCHANGED from Apr 26-30 period")
lines.append("-- ============================================================")
lines.append("")

lines.append("-- Via LOS ANGELES/LONG BEACH")
for dp,r20,r40,r45 in [
    ('DALLAS',2355,2880,3230),('HOUSTON',2595,3160,3355),
    ('EL PASO',2175,2645,2975),('CHICAGO',2445,3030,3355),
    ('CINCINNATI',2715,3030,3735),('CLEVELAND',2715,3030,3735),
    ('COLUMBUS',2930,3540,3735),('MEMPHIS',2580,2915,3545),('OMAHA',3080,3865,4240),
]:
    lines.append(row('India','ALL INDIA PORTS','USA',dp,r20,r40,via='LOS ANGELES/LONG BEACH',
        notes=f'IPI/RIPI add-on; add to ocean base; via LAX/LGB; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via OAKLAND")
for dp,r20,r40,r45 in [('SALT LAKE CITY',2355,2740,3230),('DENVER',3075,3695,4240)]:
    lines.append(row('India','ALL INDIA PORTS','USA',dp,r20,r40,via='OAKLAND',
        notes=f'IPI/RIPI add-on; add to ocean base; via OAK; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via VANCOUVER (Canada IPI)")
for dc,dp,r20,r40,r45 in [
    ('Canada','CALGARY',1695,1930,1930),('Canada','EDMONTON',1745,1891,2295),
    ('Canada','TORONTO',2760,3080,3800),('Canada','MONTREAL',2760,3080,3800),
    ('Canada','WINNIPEG',2940,3280,4050),
]:
    lines.append(row('India','ALL INDIA PORTS',dc,dp,r20,r40,via='VANCOUVER',
        notes=f'IPI/RIPI add-on; add to ocean base; via VAN; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via HALIFAX (Canada IPI)")
for dc,dp,r20,r40,r45 in [
    ('Canada','EDMONTON',3440,3980,4940),
    ('Canada','TORONTO',1775,2130,2595),('Canada','MONTREAL',1775,2130,2595),
]:
    lines.append(row('India','ALL INDIA PORTS',dc,dp,r20,r40,via='HALIFAX',
        notes=f'IPI/RIPI add-on; add to ocean base; via HAL; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via NEW YORK (USNYC)")
for dc,dp,r20,r40,r45 in [
    ('Canada','TORONTO',1725,2260,2325),('Canada','MONTREAL',1950,2355,2455),
    ('USA','CHICAGO',1705,1900,2000),('USA','CINCINNATI',1870,2225,2265),
    ('USA','CLEVELAND',1560,1880,2250),('USA','COLUMBUS',1690,2000,2250),
    ('USA','DETROIT',1485,1795,2090),('USA','INDIANAPOLIS',2760,3035,3670),
    ('USA','KANSAS CITY',2550,2980,3645),('USA','PITTSBURGH',1450,1680,2025),
    ('USA','SAINT LOUIS',2010,2380,2885),('USA','OMAHA',3090,3405,4180),
    ('USA','MINNEAPOLIS',3350,3880,4810),('USA','BOSTON',2100,2380,2660),
]:
    lines.append(row('India','ALL INDIA PORTS',dc,dp,r20,r40,via='NEW YORK',
        notes=f'RIPI add-on; add to ocean base; via USNYC; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via NORFOLK (USORF)")
for dc,dp,r20,r40,r45 in [
    ('USA','BALTIMORE',1810,1980,2430),('USA','CHICAGO',1325,1520,1645),
    ('USA','CINCINNATI',1280,1770,1900),('USA','CLEVELAND',1280,1580,1900),
    ('USA','COLUMBUS',1315,1580,1900),('USA','KANSAS CITY',2270,2680,3290),
    ('USA','LOUISVILLE',1550,1880,2280),('USA','SAINT LOUIS',1730,2080,2530),
    ('USA','RICHMOND',1055,1330,1585),
]:
    lines.append(row('India','ALL INDIA PORTS',dc,dp,r20,r40,via='NORFOLK',
        notes=f'RIPI add-on; add to ocean base; via USORF; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via SAVANNAH (USSAV)")
for dc,dp,r20,r40,r45 in [
    ('USA','ATLANTA',1055,1330,1585),('USA','CHARLOTTE',1190,1480,1775),
    ('USA','HUNTSVILLE',1460,1780,2150),('USA','CRANDALL',1925,2095,2470),
    ('USA','MEMPHIS',1475,1760,2025),('USA','NEW ORLEANS',1280,1525,1775),
    ('USA','NASHVILLE',2270,2680,3290),('USA','TAMPA',1190,1480,1775),
]:
    lines.append(row('India','ALL INDIA PORTS',dc,dp,r20,r40,via='SAVANNAH',
        notes=f'RIPI add-on; add to ocean base; via USSAV; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via CHARLESTON (USCHS)")
lines.append(row('India','ALL INDIA PORTS','USA','GREER',1515,1810,via='CHARLESTON',
    notes='RIPI add-on; add to ocean base; via USCHS; 45ft add-on $2150'))
lines.append("")

lines.append("-- Via JACKSONVILLE (USJAX)")
lines.append(row('India','ALL INDIA PORTS','USA','MIAMI',1460,1780,via='JACKSONVILLE',
    notes='RIPI add-on; add to ocean base; via USJAX; 45ft add-on $2150'))
lines.append("")

lines.append("-- Via TACOMA (USTIW)")
for dp,r20,r40,r45 in [('CHICAGO',2530,3140,3355),('DETROIT',2855,3590,3605)]:
    lines.append(row('India','ALL INDIA PORTS','USA',dp,r20,r40,via='TACOMA',
        notes=f'IPI add-on; add to ocean base; via USTIW; 45ft add-on ${r45}'))
lines.append("")

lines.append("-- Via HALIFAX (CAHAL) — Indianapolis")
lines.append(row('India','ALL INDIA PORTS','USA','INDIANAPOLIS',2810,3280,via='HALIFAX',
    notes='RIPI add-on; add to ocean base; via CAHAL; 45ft add-on $4050'))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
