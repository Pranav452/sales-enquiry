import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

origins = [
    ('India', 'MUNDRA'),
    ('India', 'NHAVA SHEVA'),
    ('Pakistan', 'KARACHI'),
    ('Pakistan', 'PORT QASIM'),
    ('Sri Lanka', 'COLOMBO'),
]

NOTES_STD = 'Incl: BUC/PSS/DDC/ACC/PNC/GAS/PTS/SUZ; Subj to CAS'
NOTES_AWT = 'Incl: BUC/PSS/DDC/ACC/PNC/GAS/PTS/SUZ; Subj to CAS; AWT service only; subj to direct call at destination'
CLAUSES = 'FAK Straight excl Garments/Personal Effects/HHG|BUC/PSS/DDC/ACC/PNC/GAS/PTS/SUZ inclusive|Subj to CAS and all other applicable surcharges per governing tariff|Hecny agent rates via IPE/IPE2 service (ONE carrier)'

VALID_FROM = '2026-04-15'
VALID_TO = '2026-04-30'

def inland_notes(via):
    return f'RIPI/IPI through rate incl ocean+inland; via {via}; Incl: BUC/PSS/DDC/ACC/PNC/GAS/PTS/SUZ; Subj to CAS'

def row(oc, op, dc, dp, r20, r40, via='', notes='', extra=''):
    n = notes if notes else NOTES_STD
    if extra:
        n = n + '; ' + extra
    v = f"'{via}'" if via else 'NULL'
    cl = CLAUSES.replace("'", "''")
    n2 = n.replace("'", "''")
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('ONE','{oc}','{op}','{dc}','{dp}',"
        f"'USD',{r20},{r40},'{VALID_FROM}','{VALID_TO}',{v},NULL,'{n2}','{cl}',1,'SYSTEM',GETDATE(),GETDATE());"
    )

lines = []
lines.append("-- ============================================================")
lines.append("-- ONE (Ocean Network Express) - ISC to USA Hecny Agent Rates")
lines.append("-- Validity: 15-30 Apr 2026")
lines.append("-- Source: Hecny Transportation Ltd (Eddy Ng), via IPE/IPE2 service")
lines.append("-- POL Group 1: Mundra / Nhava Sheva (India)")
lines.append("-- POL Group 2: Karachi / Port Qasim (Pakistan) / Colombo (Sri Lanka)")
lines.append("-- Inclusive: BUC, PSS, DDC, ACC, PNC, GAS, PTS, SUZ")
lines.append("-- Subject to: CAS and all other tariff surcharges")
lines.append("-- ============================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

for oc, op in origins:
    lines.append(f"-- ======== {op} ({oc}) ========")
    lines.append("")
    lines.append("-- Ocean BP / Direct Port Rates")
    lines.append(row(oc,op,'USA','LOS ANGELES/LONG BEACH',1520,1900))
    lines.append(row(oc,op,'USA','OAKLAND',1520,1900))
    lines.append(row(oc,op,'USA','SEATTLE',1520,1900))
    lines.append(row(oc,op,'USA','TACOMA',1520,1900))
    lines.append(row(oc,op,'USA','USWC INLAND DOOR (IPI)',3280,4100,'LOS ANGELES/LONG BEACH',notes=NOTES_STD,extra='USWC IPI generic through rate'))
    lines.append(row(oc,op,'USA','NEW YORK',2168,2550))
    lines.append(row(oc,op,'USA','SAVANNAH',2168,2550))
    lines.append(row(oc,op,'USA','CHARLESTON',2168,2550))
    lines.append(row(oc,op,'USA','NORFOLK',2168,2550))
    lines.append(row(oc,op,'USA','USEC INLAND DOOR (RIPI)',2508,2950,'USEC GATEWAY',notes=NOTES_STD,extra='USEC RIPI generic through rate'))
    lines.append(row(oc,op,'USA','BALTIMORE',2168,2550,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','BOSTON',2168,2550,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','MIAMI',2168,2550,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','HOUSTON',2253,2650,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','MOBILE',2338,2750,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','NEW ORLEANS',2253,2650,notes=NOTES_AWT))
    lines.append(row(oc,op,'USA','TAMPA',2253,2650,notes=NOTES_AWT))
    lines.append("")
    lines.append("-- Inland CY via LOS ANGELES/LONG BEACH (USWC gateway)")
    for city, r20, r40 in [
        ('CHICAGO',3690,4100),('FORT WORTH',3600,4000),('KANSAS CITY',3600,4000),
        ('MEMPHIS',3690,4100),('CLEVELAND',4230,4700),('COLUMBUS',4230,4700),
        ('CINCINNATI',4230,4700),('DETROIT',4410,4900),('LOUISVILLE',5220,5800),
        ('OMAHA',4140,4600),('SAINT LOUIS',4140,4600),('ATLANTA',7000,7000),
        ('BALTIMORE',7500,7500),('CHARLOTTE',7400,7400),('NEW YORK',6200,6200),
        ('HOUSTON',6100,6100),('NASHVILLE',6700,6700),('NEW ORLEANS',6600,6600),
        ('PITTSBURGH',7550,7550),
    ]:
        lines.append(row(oc,op,'USA',city,r20,r40,'LOS ANGELES/LONG BEACH',notes=inland_notes('LOS ANGELES/LONG BEACH')))
    lines.append("")
    lines.append("-- Inland CY via SEATTLE/TACOMA")
    lines.append(row(oc,op,'USA','MINNEAPOLIS',3780,4200,'SEATTLE/TACOMA',notes=inland_notes('SEATTLE/TACOMA')))
    lines.append("")
    lines.append("-- Inland CY via OAKLAND")
    lines.append(row(oc,op,'USA','DENVER',4950,5500,'OAKLAND',notes=inland_notes('OAKLAND')))
    lines.append(row(oc,op,'USA','SALT LAKE CITY',4230,4700,'OAKLAND',notes=inland_notes('OAKLAND')))
    lines.append("")
    lines.append("-- Inland CY via PRR (Prince Rupert)")
    for city, r20, r40 in [
        ('CHICAGO',3420,3800),('CHICAGO (JOLIET)',3465,3850),
        ('CHIPPEWA FALLS',4140,4600),('CINCINNATI',4005,4450),
        ('CLEVELAND',4005,4450),('COLUMBUS',4005,4450),
        ('DETROIT',3780,4200),('INDIANAPOLIS',4320,4800),
        ('LOUISVILLE',4590,5100),('MEMPHIS',3420,3800),
        ('PITTSBURGH',7900,7900),
    ]:
        lines.append(row(oc,op,'USA',city,r20,r40,'PRINCE RUPERT',notes=inland_notes('PRINCE RUPERT')))
    lines.append("")
    lines.append("-- Inland CY via VCR (Vancouver)")
    lines.append(row(oc,op,'USA','CHICAGO',3510,3900,'VANCOUVER',notes=inland_notes('VANCOUVER')))
    lines.append(row(oc,op,'USA','CHICAGO (JOLIET)',3555,3950,'VANCOUVER',notes=inland_notes('VANCOUVER'),extra='only via OPNW service'))
    lines.append(row(oc,op,'USA','MEMPHIS',3510,3900,'VANCOUVER',notes=inland_notes('VANCOUVER')))
    lines.append(row(oc,op,'USA','MINNEAPOLIS',3330,3700,'VANCOUVER',notes=inland_notes('VANCOUVER')))
    lines.append("")
    lines.append("-- Inland CY via USEC gateway")
    for city, r20, r40 in [
        ('ATLANTA',3555,3950),('CHARLOTTE',3555,3950),
        ('CINCINNATI',3960,4400),('CLEVELAND',3960,4400),
        ('COLUMBUS',3960,4400),('DETROIT',3960,4400),
        ('LOUISVILLE',3960,4400),('MEMPHIS',3960,4400),
        ('NASHVILLE',3960,4400),('PITTSBURGH',3600,4000),
    ]:
        lines.append(row(oc,op,'USA',city,r20,r40,'USEC GATEWAY',notes=inland_notes('USEC GATEWAY')))
    lines.append("")
    lines.append("-- Inland CY via MOBILE")
    lines.append(row(oc,op,'USA','MEMPHIS',5085,5650,'MOBILE',notes=inland_notes('MOBILE')))
    lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
