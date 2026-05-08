import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'COSCO'
OC  = 'India'
CUR = 'USD'
PDF = 'https://www.cosco-usa.com/'
VF  = '2026-05-01'
VT  = '2026-05-31'

def esc(s): return s.replace("'", "''")

def row(op, dc, dp, r20, r40, sur='', notes='', cl='', via=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    s = f"'{esc(sur)}'"  if sur  else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    c = esc(cl)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{esc(op)}','{esc(dc)}','{esc(dp)}',"
        f"'{CUR}',{r20},{r40},'{VF}','{VT}',{v},{s},{n},'{c}','{PDF}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

# ── CLAUSES ───────────────────────────────────────────────────────────────────
BASE_CL = (
    "COSCO Shipping Lines | Far East / Intra Asia Rate Sheet | India origin"
    "|Valid 01-31 May 2026 | Ex CY Nhava Sheva / Mundra / Pipavav"
    "|Rates inclusive of CAF/CSF/EFS/LSF as advised"
    "|IAP (China/HK/Japan/Korea/Taiwan/Bangladesh/Sri Lanka): BUC USD 50/TEU extra; FAF included"
    "|IAA (SE Asia — Thailand/Vietnam/Myanmar/SG/MY/PH/BN/KH/ID): FAF USD 50/TEU extra; no BUC/EBS"
    "|ACD USD 30/BL for all Chinese ports"
    "|Manila rates subject to ETC/PCS/PLS USD 350/TEU on collect basis"
    "|Colombo rates inclusive of destination THC"
    "|Seal: USD 5/unit"
    "|Cargo weight >22-23MT: USD 50/TEU additional on ocean freight"
    "|Heavy container: USD 30/20 or USD 45/40 if exceed 27MT/20 or 32MT/40"
    "|Flexi cargo: USD 100/TEU surcharge"
    "|Booking cancellation fee: USD 20/unit"
    "|General containers only; HAZ: additional charges apply; not confirmed on same rates"
    "|Currently NOT accepting: Tawau / Kota Kinabalu / Labuan / Muara / Sibu"
    "|No service to Manila South Harbour"
    "|Weight limitation for Kota Kinabalu / Kuching / Bintulu / Muara"
    "|Rates subject to space/equipment availability; rollover cost/risk on customer"
    "|Subject to THC/Seal/local charges both ends"
)

# IAP surcharge note (BUC extra)
SURCH_IAP = 'CAF:incl;CSF:incl;EFS:incl;LSF:incl;BUC:50/teu;ACD:30/bl-china;SEAL:5/unit;THC:collect'
# IAP China: ACD applies
SURCH_IAP_CH = 'CAF:incl;CSF:incl;EFS:incl;LSF:incl;BUC:50/teu;ACD:30/bl;SEAL:5/unit;THC:collect'
# IAA surcharge note (FAF extra, no BUC)
SURCH_IAA = 'CAF:incl;CSF:incl;EFS:incl;LSF:incl;FAF:50/teu;SEAL:5/unit;THC:collect'
# Manila: ETC/PCS/PLS extra
SURCH_MNL = 'CAF:incl;CSF:incl;EFS:incl;LSF:incl;FAF:50/teu;ETC:350/teu-collect;PCS:incl-ETC;PLS:incl-ETC;SEAL:5/unit;THC:collect'
# Colombo: incl dest THC
SURCH_CMB_IAP = 'CAF:incl;CSF:incl;EFS:incl;LSF:incl;BUC:50/teu;DTHC:incl;SEAL:5/unit;THC:collect'

N_IAP   = 'IAP trade; BUC USD 50/TEU extra; FAF incl; May 2026'
N_IAP_C = 'IAP trade; BUC USD 50/TEU extra; FAF incl; ACD USD 30/BL; May 2026'
N_IAA   = 'IAA trade; FAF USD 50/TEU extra; no BUC/EBS; May 2026'
N_MNL   = 'IAA trade; FAF extra; Manila ETC/PCS/PLS USD 350/TEU collect; May 2026'
N_CMB   = 'IAP trade; BUC extra; incl destination THC; May 2026'

lines = []
lines.append("-- ================================================================")
lines.append("-- COSCO Shipping Lines — Far East / Intra Asia May 2026")
lines.append("-- Origins: Nhava Sheva | Mundra | Pipavav")
lines.append("-- Valid: 01-31 May 2026")
lines.append("-- IAP: BUC USD 50/TEU extra | IAA: FAF USD 50/TEU extra (no BUC)")
lines.append("-- ACD USD 30/BL for China ports | Manila ETC/PCS/PLS USD 350/TEU collect")
lines.append("-- Colombo: incl dest THC | Seal USD 5/unit")
lines.append("-- CASE BY CASE omitted: Chittagong, Incheon")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# NHAVA SHEVA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ================================================================")
lines.append("-- ORIGIN: NHAVA SHEVA")
lines.append("-- ================================================================")
lines.append("")

OP = 'NHAVA SHEVA'

lines.append("-- China (IAP — BUC extra; ACD USD 30/BL)")
nsa_china = [
    ('China', 'SHANGHAI',         25, 25),
    ('China', 'NINGBO',           25, 25),
    ('China', 'NANSHA',           30, 30),   # listed as NANSHA/SHEKOU combined
    ('China', 'SHEKOU',           30, 30),
    ('China', 'QINGDAO',          25, 25),
    ('China', 'XINGANG',          30, 30),
    ('China', 'DALIAN',           30, 30),
    ('China', 'XIAMEN',           30, 30),
]
for dc, dp, r20, r40 in nsa_china:
    lines.append(row(OP, dc, dp, r20, r40, sur=SURCH_IAP_CH, notes=N_IAP_C, cl=BASE_CL))
lines.append("")

lines.append("-- Hong Kong (IAP — BUC extra)")
lines.append(row(OP, 'Hong Kong', 'HONG KONG', 25, 25, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Taiwan (IAP — BUC extra)")
for dp in ['TAICHUNG', 'KAOHSIUNG', 'KEELUNG']:
    lines.append(row(OP, 'Taiwan', dp, 150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- South Korea (IAP — BUC extra); Incheon = case by case — skipped")
lines.append(row(OP, 'South Korea', 'BUSAN',    30, 30, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append(row(OP, 'South Korea', 'GWANGYANG', 30, 30, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Singapore (IAA — FAF extra; SEI1 service)")
lines.append(row(OP, 'Singapore', 'SINGAPORE', 20, 20, sur=SURCH_IAA,
    notes='IAA trade; FAF USD 50/TEU extra; SEI1 service; May 2026', cl=BASE_CL))
lines.append("")

lines.append("-- Malaysia (IAA — FAF extra; Port Kelang SEI1 service)")
lines.append(row(OP, 'Malaysia', 'PORT KLANG',    30, 30, sur=SURCH_IAA,
    notes='IAA trade; FAF USD 50/TEU extra; SEI1 service; May 2026', cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PENANG',         75, 50, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PASIR GUDANG',   75, 50, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Thailand (IAA — FAF extra)")
lines.append(row(OP, 'Thailand', 'BANGKOK (PAT)',   50, 25, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAEM CHA BANG',  25, 25, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAT KRA BANG (ICD)', 200, 200, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Vietnam (IAA — FAF extra)")
lines.append(row(OP, 'Vietnam', 'HO CHI MINH CITY', 100, 75,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'HAIPHONG',          75, 30,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'DANANG',            305, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'QUI NHON',          305, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Indonesia (IAA — FAF extra; Jakarta/Surabaya SEI1 service)")
lines.append(row(OP, 'Indonesia', 'JAKARTA',   120, 85,  sur=SURCH_IAA,
    notes='IAA trade; FAF extra; SEI1 service; May 2026', cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SEMARANG',  150, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SURABAYA',  120, 85,  sur=SURCH_IAA,
    notes='IAA trade; FAF extra; SEI1 service; May 2026', cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'BELAWAN',   150, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Cambodia (IAA — FAF extra)")
lines.append(row(OP, 'Cambodia', 'SIHANOUKVILLE', 150, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Philippines (IAA — FAF extra; Manila ETC/PCS/PLS collect)")
lines.append(row(OP, 'Philippines', 'MANILA (NORTH)', 100, 150, sur=SURCH_MNL, notes=N_MNL, cl=BASE_CL))
lines.append("")

lines.append("-- Myanmar (IAA — FAF extra)")
lines.append(row(OP, 'Myanmar', 'YANGON', 250, 300, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Sri Lanka (IAP — BUC extra; incl dest THC)")
lines.append(row(OP, 'Sri Lanka', 'COLOMBO', 350, 200, sur=SURCH_CMB_IAP, notes=N_CMB, cl=BASE_CL))
lines.append("")
lines.append("-- Chittagong: case by case — skipped | Incheon: case by case — skipped")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# MUNDRA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ================================================================")
lines.append("-- ORIGIN: MUNDRA")
lines.append("-- ================================================================")
lines.append("")

OP = 'MUNDRA'

lines.append("-- China (IAP — BUC extra; ACD USD 30/BL)")
mun_china = [
    ('China', 'SHANGHAI',  100, 50),
    ('China', 'NINGBO',    100, 50),
    ('China', 'QINGDAO',   100, 50),
    ('China', 'DALIAN',    150, 100),
    ('China', 'XINGANG',   150, 100),
    ('China', 'XIAMEN',    150, 100),
    ('China', 'SHEKOU',    150, 100),
    ('China', 'NANSHA',    150, 100),
]
for dc, dp, r20, r40 in mun_china:
    lines.append(row(OP, dc, dp, r20, r40, sur=SURCH_IAP_CH, notes=N_IAP_C, cl=BASE_CL))
lines.append("")

lines.append("-- Hong Kong (IAP — BUC extra)")
lines.append(row(OP, 'Hong Kong', 'HONG KONG', 100, 50, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Taiwan (IAP — BUC extra)")
for dp in ['TAICHUNG', 'KAOHSIUNG', 'KEELUNG']:
    lines.append(row(OP, 'Taiwan', dp, 150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- South Korea (IAP — BUC extra); Incheon = case by case — skipped")
lines.append(row(OP, 'South Korea', 'BUSAN',     150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append(row(OP, 'South Korea', 'GWANGYANG', 150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Singapore (IAA — FAF extra)")
lines.append(row(OP, 'Singapore', 'SINGAPORE', 100, 50, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Malaysia (IAA — FAF extra)")
lines.append(row(OP, 'Malaysia', 'PORT KLANG',    100, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PENANG',         150, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PASIR GUDANG',   150, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'KUCHING',        250, 400, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'BINTULU',        250, 250, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Thailand (IAA — FAF extra)")
lines.append(row(OP, 'Thailand', 'BANGKOK (PAT)',       200, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAEM CHA BANG',      100, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAT KRA BANG (ICD)', 250, 250, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Vietnam (IAA — FAF extra)")
lines.append(row(OP, 'Vietnam', 'HAIPHONG',          175, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'HO CHI MINH CITY',  175, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'DANANG',             250, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'QUI NHON',           250, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Indonesia (IAA — FAF extra)")
lines.append(row(OP, 'Indonesia', 'JAKARTA',   270, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SEMARANG',  250, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SURABAYA',  270, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'BELAWAN',   200, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Philippines (IAA — Manila ETC/PCS/PLS collect)")
lines.append(row(OP, 'Philippines', 'MANILA (NORTH)', 100, 150, sur=SURCH_MNL, notes=N_MNL, cl=BASE_CL))
lines.append("")

lines.append("-- Myanmar (IAA — FAF extra)")
lines.append(row(OP, 'Myanmar', 'YANGON', 400, 400, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Sri Lanka (IAP — BUC extra; incl dest THC)")
lines.append(row(OP, 'Sri Lanka', 'COLOMBO', 425, 275, sur=SURCH_CMB_IAP, notes=N_CMB, cl=BASE_CL))
lines.append("")
lines.append("-- Chittagong: case by case — skipped | Incheon: case by case — skipped")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# PIPAVAV
# Same as Mundra EXCEPT Bangkok,PAT: 40' = 100 (not 150)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ================================================================")
lines.append("-- ORIGIN: PIPAVAV")
lines.append("-- Note: identical to Mundra except Bangkok PAT 40' = 100 (not 150)")
lines.append("-- ================================================================")
lines.append("")

OP = 'PIPAVAV'

lines.append("-- China (IAP — BUC extra; ACD USD 30/BL)")
for dc, dp, r20, r40 in mun_china:   # same as Mundra
    lines.append(row(OP, dc, dp, r20, r40, sur=SURCH_IAP_CH, notes=N_IAP_C, cl=BASE_CL))
lines.append("")

lines.append("-- Hong Kong (IAP — BUC extra)")
lines.append(row(OP, 'Hong Kong', 'HONG KONG', 100, 50, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Taiwan (IAP — BUC extra)")
for dp in ['TAICHUNG', 'KAOHSIUNG', 'KEELUNG']:
    lines.append(row(OP, 'Taiwan', dp, 150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- South Korea (IAP — BUC extra)")
lines.append(row(OP, 'South Korea', 'BUSAN',     150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append(row(OP, 'South Korea', 'GWANGYANG', 150, 100, sur=SURCH_IAP, notes=N_IAP, cl=BASE_CL))
lines.append("")

lines.append("-- Singapore (IAA — FAF extra)")
lines.append(row(OP, 'Singapore', 'SINGAPORE', 100, 50, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Malaysia (IAA — FAF extra)")
lines.append(row(OP, 'Malaysia', 'PORT KLANG',    100, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PENANG',         150, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'PASIR GUDANG',   150, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'KUCHING',        250, 400, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Malaysia', 'BINTULU',        250, 250, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Thailand (IAA — FAF extra); Bangkok PAT 40' = 100 (differs from Mundra)")
lines.append(row(OP, 'Thailand', 'BANGKOK (PAT)',       200, 100, sur=SURCH_IAA,   # 40'=100 not 150
    notes='IAA trade; FAF extra; NOTE: Pipavav 40ft=100 differs from Mundra 40ft=150; May 2026',
    cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAEM CHA BANG',      100, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Thailand', 'LAT KRA BANG (ICD)', 250, 250, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Vietnam (IAA — FAF extra)")
lines.append(row(OP, 'Vietnam', 'HAIPHONG',          175, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'HO CHI MINH CITY',  175, 50,  sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'DANANG',             250, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Vietnam', 'QUI NHON',           250, 150, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Indonesia (IAA — FAF extra)")
lines.append(row(OP, 'Indonesia', 'JAKARTA',   270, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SEMARANG',  250, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'SURABAYA',  270, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append(row(OP, 'Indonesia', 'BELAWAN',   200, 100, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Philippines (IAA — Manila ETC/PCS/PLS collect)")
lines.append(row(OP, 'Philippines', 'MANILA (NORTH)', 100, 150, sur=SURCH_MNL, notes=N_MNL, cl=BASE_CL))
lines.append("")

lines.append("-- Myanmar (IAA — FAF extra)")
lines.append(row(OP, 'Myanmar', 'YANGON', 400, 400, sur=SURCH_IAA, notes=N_IAA, cl=BASE_CL))
lines.append("")

lines.append("-- Sri Lanka (IAP — BUC extra; incl dest THC)")
lines.append(row(OP, 'Sri Lanka', 'COLOMBO', 425, 275, sur=SURCH_CMB_IAP, notes=N_CMB, cl=BASE_CL))
lines.append("")
lines.append("-- Chittagong: case by case — skipped | Incheon: case by case — skipped")
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
