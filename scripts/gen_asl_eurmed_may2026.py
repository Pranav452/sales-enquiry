import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'ASL'
OC  = 'India'
CUR = 'USD'
PDF = 'https://www.asl.com.sg/'

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
        f"VALUES ('{SL}','{OC}','{esc(op)}','{esc(dc)}','{esc(dp)}',"
        f"'{CUR}',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{c}','{PDF}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

# ── COMMON ────────────────────────────────────────────────────────────────────
# Rates inclusive of EFS & HCS
# Subject to: ENS USD 25/TEU | ETS EUR 57/TEU | Seal | Locals
# Applicable as per LTD (Last Transit Date) / ICD Handover date for North India ICDs
# T/S port: max 20 TEU/BL | Direct: no limit | No Personal Effects

BASE_CL = (
    "ASL (Arab Shipping Line) | Westbound EU/MED Trade"
    "|Origins: Nhava Sheva & Mundra"
    "|Rates inclusive of EFS & HCS"
    "|Subject to ENS USD 25/TEU | ETS EUR 57/TEU | Seal | Locals/Surcharges as applicable"
    "|Rates applicable as per LTD date"
    "|Rail/ICD shipments (Shipper PDA/Liner PDA): rated per ICD Handover date for all North India ICDs"
    "|T/S port: max 20 TEU per B/L | Direct port: no limitation"
    "|No Personal Effects accepted"
)

EPI3_CL = BASE_CL + "|Service: EPI3 | Validity: 26 Apr - 07 May 2026"
MINA_CL = BASE_CL + "|Service: MINA | Validity: 01 May - 14 May 2026"

SURCH_EPI3 = 'EFS:incl;HCS:incl;ENS:25/teu;ETS:57eur/teu;SEAL:collect;THC:collect'
SURCH_MINA = 'EFS:incl;HCS:incl;ENS:25/teu;ETS:57eur/teu;SEAL:collect;THC:collect'

VF_EPI3 = '2026-04-26'; VT_EPI3 = '2026-05-07'
VF_MINA = '2026-05-01'; VT_MINA = '2026-05-14'

ORIGINS = ['NHAVA SHEVA', 'MUNDRA']

lines = []
lines.append("-- ================================================================")
lines.append("-- ASL (Arab Shipping Line) — EU/MED Westbound Rates")
lines.append("-- EPI3: 26 Apr - 07 May 2026 | MINA: 01 May - 14 May 2026")
lines.append("-- Origins: Nhava Sheva & Mundra")
lines.append("-- Inclusive of EFS & HCS")
lines.append("-- Extra: ENS USD 25/TEU | ETS EUR 57/TEU | Seal | Locals")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# EPI3 — NORTH EUROPE (26 Apr - 07 May 2026)  CY/CY
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== EPI3 — NORTH EUROPE (26 Apr - 07 May 2026) CY/CY ========")
lines.append("")

# Rate tier 1: Base ports — 1725/1725
eur_base = [
    ('Belgium',     'ANTWERP'),
    ('France',      'LE HAVRE'),
    ('Netherlands', 'ROTTERDAM'),
    ('UK',          'SOUTHAMPTON'),
    ('Spain',       'ALGECIRAS'),
    ('Germany',     'HAMBURG'),
]
lines.append("-- Base ports: 1725/1725")
for op in ORIGINS:
    for dc, dp in eur_base:
        lines.append(row(op, dc, dp, 1725, 1725, VF_EPI3, VT_EPI3,
            sur=SURCH_EPI3,
            notes='EPI3 CY/CY; incl EFS+HCS; ENS $25 ETS EUR57 extra; base port tier',
            cl=EPI3_CL))
lines.append("")

# Rate tier 2: Secondary North Europe — 1975/2125
eur_sec = [
    ('Finland',   'KOTKA'),
    ('Poland',    'GDYNIA'),
    ('Sweden',    'GOTHENBURG'),
    ('Finland',   'HELSINKI'),
    ('Latvia',    'RIGA'),
    ('Norway',    'OSLO'),
    ('Lithuania', 'KLAIPEDA'),
    ('Spain',     'BILBAO'),
    ('Ireland',   'DUBLIN'),
    ('Sweden',    'HELSINGBORG'),
]
lines.append("-- Secondary North Europe ports: 1975/2125")
for op in ORIGINS:
    for dc, dp in eur_sec:
        lines.append(row(op, dc, dp, 1975, 2125, VF_EPI3, VT_EPI3,
            sur=SURCH_EPI3,
            notes='EPI3 CY/CY; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=EPI3_CL))
lines.append("")

# Rate tier 3: Portugal — 2175/2375
lines.append("-- Portugal: 2175/2375")
for op in ORIGINS:
    for dp in ['LEIXOES', 'LISBON']:
        lines.append(row(op, 'Portugal', dp, 2175, 2375, VF_EPI3, VT_EPI3,
            sur=SURCH_EPI3,
            notes='EPI3 CY/CY; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=EPI3_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# MINA — MED PORTS (01 May - 14 May 2026)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== MINA — MED (01 May - 14 May 2026) ========")
lines.append("")

# Tier 1: FOS / BCN / VLC / GOA — CY/CY — 4175/2325
med_t1 = [
    ('France', 'FOS-SUR-MER'),
    ('Spain',  'BARCELONA'),
    ('Spain',  'VALENCIA'),
    ('Italy',  'GENOA'),
]
lines.append("-- Tier 1 CY/CY: 4175/2325")
for op in ORIGINS:
    for dc, dp in med_t1:
        lines.append(row(op, dc, dp, 4175, 2325, VF_MINA, VT_MINA,
            sur=SURCH_MINA,
            notes='MINA CY/CY; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=MINA_CL))
lines.append("")

# Tier 1 CY/FO: PIRAEUS / MALTA — 4175/2325
med_t1_fo = [
    ('Greece', 'PIRAEUS'),
    ('Malta',  'MALTA'),
]
lines.append("-- Tier 1 CY/FO: 4175/2325")
for op in ORIGINS:
    for dc, dp in med_t1_fo:
        lines.append(row(op, dc, dp, 4175, 2325, VF_MINA, VT_MINA,
            sur=SURCH_MINA,
            notes='MINA CY/FO; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=MINA_CL))
lines.append("")

# Tier 2 CY/CY: Turkey/Romania/La Spezia + Adriatic — 4375/2725
med_t2_cycy = [
    ('Turkey',  'KUMPORT'),
    ('Turkey',  'ISKENDERUN'),
    ('Turkey',  'ALIAGA'),
    ('Turkey',  'GEMLIK'),
    ('Turkey',  'IZMIR'),
    ('Turkey',  'DERINCE'),
    ('Turkey',  'MERSIN'),
    ('Romania', 'CONSTANTZA'),
    ('Italy',   'LA SPEZIA'),
    ('Italy',   'NAPLES'),
    ('Slovenia','KOPER'),
    ('Croatia', 'RIJEKA'),
    ('Italy',   'SALERNO'),
    ('Italy',   'ANCONA'),
    ('Italy',   'RAVENNA'),
    ('Italy',   'VENICE'),
    ('Italy',   'BARI'),
    ('Italy',   'LIVORNO'),
]
lines.append("-- Tier 2 CY/CY: 4375/2725")
for op in ORIGINS:
    for dc, dp in med_t2_cycy:
        lines.append(row(op, dc, dp, 4375, 2725, VF_MINA, VT_MINA,
            sur=SURCH_MINA,
            notes='MINA CY/CY; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=MINA_CL))
lines.append("")

# Tier 3 CY/FO: East Med / Egypt / Balkans — 4475/2725
med_t3_cyfo = [
    ('Bulgaria', 'VARNA'),
    ('Greece',   'THESSALONIKI'),
    ('Egypt',    'EL-DIKHEILA'),
    ('Albania',  'DURRES'),
    ('Cyprus',   'LIMASSOL'),
    ('Egypt',    'DAMIETTA (DUMYAT)'),
    ('Egypt',    'PORT SAID WEST'),
]
lines.append("-- Tier 3 CY/FO: 4475/2725")
for op in ORIGINS:
    for dc, dp in med_t3_cyfo:
        lines.append(row(op, dc, dp, 4475, 2725, VF_MINA, VT_MINA,
            sur=SURCH_MINA,
            notes='MINA CY/FO; incl EFS+HCS; ENS $25 ETS EUR57 extra',
            cl=MINA_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# NORTH AFRICA (MINA service; 01 May - 14 May 2026) — all CY/FO — 5975/4125
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== NORTH AFRICA (MINA; 01 May - 14 May 2026) CY/FO: 5975/4125 ========")
lines.append("")

nafr = [
    ('Morocco', 'CASABLANCA'),
    ('Morocco', 'TANGIER'),
    ('Algeria', 'ALGIERS'),
    ('Algeria', 'ANNABA'),
    ('Algeria', 'SKIKDA'),
    ('Algeria', 'ORAN'),
    ('Tunisia', 'TUNIS'),
    ('Libya',   'MISURATA'),
    ('Libya',   'TRIPOLI'),
    ('Libya',   'KHOMS'),
]
for op in ORIGINS:
    for dc, dp in nafr:
        lines.append(row(op, dc, dp, 5975, 4125, VF_MINA, VT_MINA,
            sur=SURCH_MINA,
            notes='MINA CY/FO; incl EFS+HCS; ENS $25 ETS EUR57 extra; North Africa',
            cl=MINA_CL))
lines.append("")
lines.append("-- NOTE: Inland to Bratislava/Budapest/Belgrade/Skopje via Railway — check rates on CTC")
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
