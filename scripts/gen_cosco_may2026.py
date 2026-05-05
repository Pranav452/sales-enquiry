import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'COSCO'
OC  = 'India'
CUR = 'USD'
PDF = 'https://www.cosco-usa.com/'

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

# ── BASE CLAUSES ─────────────────────────────────────────────────────────────
IAP_CL = (
    "COSCO Shipping Lines | Intra Asia Pacific (IAP) rates | India origin"
    "|Trade lane: IAP — China, Hong Kong, Japan, South Korea, Taiwan"
    "|BUC (Bunker Surcharge): USD 50/20GP & USD 100/40GP,HQ — additional to freight"
    "|Rates subject to THC/BL/Seal and other local charges at both ends"
    "|Subject to equipment, space and service availability"
    "|Valid till 31 May 2026"
)

IAA_CL = (
    "COSCO Shipping Lines | Intra Asia (IAA) rates | India origin"
    "|Trade lane: IAA — SE Asia (Thailand, Vietnam, Indonesia, Myanmar, Singapore, Malaysia, Philippines, Brunei, Cambodia)"
    "|FAF (Fuel Adjustment Factor): USD 50/20GP & USD 100/40GP,HQ — additional to freight"
    "|Rates subject to THC/BL/Seal and other local charges at both ends"
    "|Subject to equipment, space and service availability"
    "|Valid till 31 May 2026"
)

AU_CL = (
    "COSCO Shipping Lines | Australia rates | India origin"
    "|Rates inclusive of BUC (Bunker Surcharge)"
    "|Subject to FAF USD 325/TEU additional"
    "|Subject to THC/BL/Seal and other local charges at both ends"
    "|Valid till 14 May 2026"
)

NZ_CL = (
    "COSCO Shipping Lines | New Zealand rates | India origin"
    "|Rates inclusive of BUC (Bunker Surcharge)"
    "|Subject to FAF USD 414/TEU additional"
    "|Subject to THC/BL/Seal and other local charges at both ends"
    "|Valid till 14 May 2026"
)

WCSA_CL = (
    "COSCO Shipping Lines | West Coast South America + Central America rates | India origin"
    "|Rates inclusive of BUC/HCS"
    "|Subject to FAF USD 450/TEU | THC | THD | DOC and other local charges at both ends"
    "|Weight limitation (incl tare): <=18T/TEU: no extra; 18-21.9T/TEU: HCS USD 200/TEU; >=22T/TEU: HCS USD 400/TEU"
    "|Subject to containers/space/loading/TS/destination agent acceptance; Capt acceptance"
    "|Valid 1-7 May 2026"
)

ECSA_CL = (
    "COSCO Shipping Lines | East Coast South America rates | India origin"
    "|Rates inclusive of BUC"
    "|Subject to FAF USD 430/TEU | HCS | THC | THD | DOC and other local charges at both ends"
    "|HCS (Heavy Cargo Surcharge): USD 500/20' for tare+cargo >= 18MT/20'"
    "|Paranagua THC/THD: BRL 1650/CNTR effective 1 Feb 2026"
    "|Asuncion rate: FO (Free Out) terms"
    "|For large volume shipments: request case-by-case rate"
    "|Valid 1-7 May 2026"
)

MEX_IPI_CL = (
    "COSCO Shipping Lines | Mexico Inland IPI/RIPI Door Delivery Rates"
    "|Add-on inland rate to be added to ocean port-to-port rate"
    "|Mode: Door delivery via Rail + Truck (TruckRail)"
    "|Cargo: General Cargo (GC) only"
    "|Weight limits: Manzanillo Rail 20GP max 22.5T+tare; LC Rail 20GP max 17T+tare; 40GP max 24T+tare"
    "|Local truck <=24T+tare; 24.01-27.9T+tare subject to acceptance; >=28T+tare NOT accepted"
    "|20GP always loaded in pairs for security"
    "|Effective from 2024-05-15 (confirm current rate before booking)"
)

SURCH_IAP  = 'BUC:50/20gp-100/40gp'
SURCH_IAA  = 'FAF:50/20gp-100/40gp'
SURCH_AU   = 'BUC:incl;FAF:325/teu'
SURCH_NZ   = 'BUC:incl;FAF:414/teu'
SURCH_WCSA = 'BUC:incl;HCS:incl;FAF:450/teu;HCS_OW:200/teu-18-21.9mt-400/teu-22mt+;THC:collect;THD:collect;DOC:collect'
SURCH_ECSA = 'BUC:incl;FAF:430/teu;HCS:500/20gp>=18mt;THC:collect;THD:collect;DOC:collect'
SURCH_MX   = 'IPI:add-on'

VF_IAP  = '2026-05-01'; VT_IAP  = '2026-05-31'
VF_AU   = '2026-05-01'; VT_AU   = '2026-05-14'
VF_NZ   = '2026-05-01'; VT_NZ   = '2026-05-14'
VF_WCSA = '2026-05-01'; VT_WCSA = '2026-05-07'
VF_ECSA = '2026-05-01'; VT_ECSA = '2026-05-07'
VF_MX   = '2024-05-15'; VT_MX   = '2099-12-31'

lines = []
lines.append("-- ================================================================")
lines.append("-- COSCO Shipping Lines — May 2026 Rate Sheet")
lines.append("-- Sections:")
lines.append("--   IAP (Intra Asia Pacific): China/HK/Japan/Korea/Taiwan — till 31 May 2026")
lines.append("--   IAA (Intra Asia): SE Asia — till 31 May 2026")
lines.append("--   Australia — till 14 May 2026 | New Zealand — till 14 May 2026")
lines.append("--   WCSA (West Coast SA + Central America) — 1-7 May 2026")
lines.append("--   ECSA (East Coast SA) — 1-7 May 2026")
lines.append("--   Mexico Inland IPI (add-on door rates) — effective 2024-05-15")
lines.append("-- Stopped services omitted; '-' rates noted as 0 with NOTES")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# IAP — Intra Asia Pacific (China, HK, Japan, Korea, Taiwan)
# Origin: KATTUPALLI (default; sheet primarily Kattupalli/Chennai context)
# BUC: USD 50/20GP & USD 100/40GP,HQ — EXTRA (not in ocean rate)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== IAP — INTRA ASIA PACIFIC (BUC extra USD 50/20 USD 100/40; till 31 May 2026) ========")
lines.append("")

IAP_ORIGIN = 'KATTUPALLI'
IAP_NOTES  = 'IAP trade; BUC USD 50/20GP USD 100/40GP extra; valid till 31 May 2026'

iap_china = [
    ('China', 'NANSHA',       15,  15),
    ('China', 'XINGANG',      15,  15),
    ('China', 'DALIAN',       15,  15),
    ('China', 'XIAMEN',       10,  10),
    ('China', 'QINGDAO',       5,   5),
    ('China', 'SHANGHAI',      5,   5),
    ('China', 'YANTIAN',      25,  50),
    ('China', 'SHEKOU',       10,  25),
    ('China', 'SHANTOU',      25,  50),
    ('China', 'QINZHOU',      25,  50),
    ('China', 'NINGBO',        5,   5),
    ('China', 'NANTONG',      20,  50),
    ('China', 'YUEYANG',      25,  50),
    ('China', 'WUHAN',        25,  25),
]
lines.append("-- China")
for dc, dp, r20, r40 in iap_china:
    lines.append(row(IAP_ORIGIN, dc, dp, r20, r40, VF_IAP, VT_IAP,
        sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))

# LIANYUNGANG: 40GP="-" → 0 with note
lines.append(row(IAP_ORIGIN, 'China', 'LIANYUNGANG', 15, 0, VF_IAP, VT_IAP,
    sur=SURCH_IAP,
    notes='IAP trade; BUC extra; 40GP rate not available ("-") confirm before booking; valid till 31 May 2026',
    cl=IAP_CL))

# CHONGQING: 20GP="-" → 0 with note
lines.append(row(IAP_ORIGIN, 'China', 'CHONGQING', 0, 100, VF_IAP, VT_IAP,
    sur=SURCH_IAP,
    notes='IAP trade; BUC extra; 20GP rate not available ("-") confirm before booking; valid till 31 May 2026',
    cl=IAP_CL))

lines.append("")
lines.append("-- Hong Kong")
lines.append(row(IAP_ORIGIN, 'Hong Kong', 'HONG KONG', 5, 10, VF_IAP, VT_IAP,
    sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))

lines.append("")
lines.append("-- Japan")
for dp, r20, r40 in [('OSAKA',25,50),('KOBE',25,50),('NAGOYA',25,50),('TOKYO',25,50),('YOKOHAMA',25,50)]:
    lines.append(row(IAP_ORIGIN, 'Japan', dp, r20, r40, VF_IAP, VT_IAP,
        sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))

lines.append("")
lines.append("-- South Korea")
lines.append(row(IAP_ORIGIN, 'South Korea', 'BUSAN', 5, 5, VF_IAP, VT_IAP,
    sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))
lines.append(row(IAP_ORIGIN, 'South Korea', 'GWANGYANG', 25, 50, VF_IAP, VT_IAP,
    sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))
lines.append(row(IAP_ORIGIN, 'South Korea', 'INCHEON', 25, 50, VF_IAP, VT_IAP,
    sur=SURCH_IAP,
    notes='IAP trade; BUC extra; subject to space; valid till 31 May 2026',
    cl=IAP_CL))

lines.append("")
lines.append("-- Taiwan")
for dp, r20, r40 in [('KAOHSIUNG',30,60),('KEELUNG',30,60),('TAICHUNG',30,60)]:
    lines.append(row(IAP_ORIGIN, 'Taiwan', dp, r20, r40, VF_IAP, VT_IAP,
        sur=SURCH_IAP, notes=IAP_NOTES, cl=IAP_CL))

lines.append("")
lines.append("-- CHITTAGONG and DHAKA: currently stopped — skipped")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# IAA — Intra Asia (SE Asia)
# FAF: USD 50/20GP & USD 100/40GP,HQ — EXTRA
# Where same rate applies to KATTUPALLI + CHENNAI, create two rows
# Where different rates, rows annotated accordingly
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== IAA — INTRA ASIA SE ASIA (FAF extra USD 50/20 USD 100/40; till 31 May 2026) ========")
lines.append("")

def iaa_row(op, dc, dp, r20, r40, notes_extra=''):
    n = f'IAA trade; FAF USD 50/20GP USD 100/40GP extra; valid till 31 May 2026'
    if notes_extra: n += f'; {notes_extra}'
    return row(op, dc, dp, r20, r40, VF_IAP, VT_IAP,
        sur=SURCH_IAA, notes=n, cl=IAA_CL)

def iaa_dual(dc, dp, r20, r40, note=''):
    """Same rate from both KATTUPALLI and CHENNAI"""
    return [iaa_row('KATTUPALLI', dc, dp, r20, r40, note),
            iaa_row('CHENNAI',    dc, dp, r20, r40, note)]

lines.append("-- Malaysia")
for r in iaa_dual('Malaysia', 'PORT KLANG', 1, 1, 'incl THC,BL,Seal; awaiting confirmed May rate from HQ'):
    lines.append(r)
lines.append(row('KATTUPALLI','Malaysia','PENANG',5,5,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
lines.append(row('KATTUPALLI','Malaysia','PASIR GUDANG',5,5,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
lines.append("")

lines.append("-- Singapore")
for r in iaa_dual('Singapore', 'SINGAPORE', 1, 1, 'incl THC,BL,Seal; awaiting confirmed May rate from HQ'):
    lines.append(r)
lines.append("")

lines.append("-- Thailand")
for r in iaa_dual('Thailand', 'LAEM CHABANG', 1, 1, 'incl THC,BL,Seal'):
    lines.append(r)
lines.append(row('KATTUPALLI','Thailand','BANGKOK',5,5,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
# Lat Krabang IPI: 160/190 total; breakdown USD 20/20GP + IHC 140/USD 20/40HQ + IHC 170 over Laem Chabang
lines.append(row('KATTUPALLI','Thailand','LAT KRABANG (ICD)',160,190,VF_IAP,VT_IAP,
    via='LAEM CHABANG',
    sur='FAF:50/20gp-100/40gp;IHC:collect',
    notes='IAA ICD via Laem Chabang; total rate: USD 20/20GP ocean + IHC USD 140; USD 20/40HQ ocean + IHC USD 170; FAF extra; valid till 31 May 2026',
    cl=IAA_CL))
lines.append("")

lines.append("-- Vietnam")
lines.append(row('KATTUPALLI','Vietnam','HO CHI MINH CITY',5,5,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
lines.append(row('KATTUPALLI','Vietnam','HAIPHONG',5,5,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
lines.append(row('KATTUPALLI','Vietnam','DANANG',20,20,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; awaiting confirmed May rate from HQ; valid till 31 May 2026', cl=IAA_CL))
for r in iaa_dual('Vietnam', 'QUI NHON', 40, 60):
    lines.append(r)
lines.append("")

lines.append("-- Indonesia")
for dp in ['JAKARTA','SURABAYA','BELAWAN','SEMARANG']:
    lines.append(iaa_row('KATTUPALLI','Indonesia',dp,30,15,
        'awaiting confirmed May rate from HQ'))
# Palembang: different rates per origin
lines.append(iaa_row('CHENNAI',    'Indonesia','PALEMBANG', 80, 80))
lines.append(iaa_row('KATTUPALLI', 'Indonesia','PALEMBANG', 50, 75))
lines.append("")

lines.append("-- Myanmar")
lines.append(row('KATTUPALLI','Myanmar','YANGON',200,250,VF_IAP,VT_IAP,
    sur=SURCH_IAA, notes='IAA trade; FAF extra; valid till 31 May 2026', cl=IAA_CL))
lines.append("")

lines.append("-- Philippines")
# Davao City: different rates per origin
lines.append(iaa_row('KATTUPALLI','Philippines','DAVAO CITY',200,300))
lines.append(iaa_row('CHENNAI',   'Philippines','DAVAO CITY',100,150))
# Cebu: via Singapore, total rate
lines.append(row('KATTUPALLI','Philippines','CEBU',770,1400,VF_IAP,VT_IAP,
    via='SINGAPORE',
    sur='FAF:50/20gp-100/40gp;IHC:collect',
    notes='IAA T/S via Singapore; total: USD 30/20GP ocean + IHC USD 737; USD 30/40HQ ocean + IHC USD 1360; FAF extra; valid till 31 May 2026',
    cl=IAA_CL))
lines.append("")

lines.append("-- Cambodia")
# Sihanoukville: different rates per origin
lines.append(iaa_row('KATTUPALLI','Cambodia','SIHANOUKVILLE', 50, 75))
lines.append(iaa_row('CHENNAI',   'Cambodia','SIHANOUKVILLE',150,150))
# Phnom Penh IPI via HCMC
lines.append(row('KATTUPALLI','Cambodia','PHNOM PENH',350,550,VF_IAP,VT_IAP,
    via='HO CHI MINH CITY',
    sur='FAF:50/20gp-100/40gp;IHC:collect',
    notes='IAA ICD via Ho Chi Minh; total: USD 50/20GP ocean + IHC USD 300; USD 50/40HQ ocean + IHC USD 500; FAF extra; valid till 31 May 2026',
    cl=IAA_CL))
lines.append("")

lines.append("-- Brunei")
lines.append(row('KATTUPALLI','Brunei','MUARA',830,1530,VF_IAP,VT_IAP,
    sur='FAF:50/20gp-100/40gp;IHC:collect',
    notes='IAA; total: USD 30/20GP ocean + IHC USD 800; USD 30/40HQ ocean + IHC USD 1500; FAF extra; valid till 31 May 2026',
    cl=IAA_CL))
lines.append("")

lines.append("-- Stopped services: Manila North, Sandakan, Labuan, Tawau, Kota Kinabalu, Bintulu/Kuching, Sibu — skipped")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# AUSTRALIA (valid till 14 May 2026; incl BUC; subj FAF 325/TEU)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== AUSTRALIA (incl BUC; FAF USD 325/TEU extra; till 14 May 2026) ========")
lines.append("")
AU_ORIGINS = ['KATTUPALLI', 'CHENNAI', 'NHAVA SHEVA']
AU_NOTE    = 'Incl BUC; FAF USD 325/TEU extra; valid till 14 May 2026'
for op in AU_ORIGINS:
    for dp in ['BRISBANE','SYDNEY','MELBOURNE','FREMANTLE','ADELAIDE']:
        lines.append(row(op,'Australia',dp,575,1150,VF_AU,VT_AU,
            sur=SURCH_AU, notes=AU_NOTE, cl=AU_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# NEW ZEALAND (valid till 14 May 2026; incl BUC; subj FAF 414/TEU)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== NEW ZEALAND (incl BUC; FAF USD 414/TEU extra; till 14 May 2026) ========")
lines.append("")
NZ_NOTE = 'Incl BUC; FAF USD 414/TEU extra; valid till 14 May 2026'
for op in AU_ORIGINS:
    for dp in ['AUCKLAND','NAPIER','LYTTELTON','TAURANGA','WELLINGTON']:
        lines.append(row(op,'New Zealand',dp,375,750,VF_NZ,VT_NZ,
            sur=SURCH_NZ, notes=NZ_NOTE, cl=NZ_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# WCSA — West Coast South America + Central America (1-7 May 2026)
# Origins Group A: Mundra, Nhava Sheva, Pipavav
# Origins Group B: Chennai, Kattupalli, Visakhapatnam
# Same rates across both groups
# Rates incl BUC/HCS; subj FAF 450/TEU; HCS weight surcharges
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== WCSA + CENTRAL AMERICA (incl BUC/HCS; FAF USD 450/TEU extra; 1-7 May 2026) ========")
lines.append("-- HCS OW: 18-21.9T/TEU add USD 200/TEU; >=22T/TEU add USD 400/TEU (incl tare)")
lines.append("")

WCSA_ORIGINS = ['MUNDRA','NHAVA SHEVA','PIPAVAV','CHENNAI','KATTUPALLI','VISAKHAPATNAM']

wcsa_ports = [
    ('Mexico',      'MANZANILLO',        2150, 1900),
    ('Colombia',    'BUENAVENTURA',       2150, 1900),
    ('Mexico',      'LAZARO CARDENAS',    2150, 1900),
    ('Peru',        'CALLAO',             2150, 1900),
    ('Peru',        'CHANCAY',            2150, 1900),
    ('Peru',        'MATARANI',           3150, 2900),
    ('Ecuador',     'GUAYAQUIL',          2150, 1900),
    ('Ecuador',     'POSORJA',            2150, 1900),
    ('Chile',       'SAN ANTONIO',        2150, 1900),
    ('Mexico',      'ENSENADA',           2150, 1900),
    ('Chile',       'VALPARAISO',         2150, 1900),
    ('Chile',       'LIRQUEN',            2150, 1900),
    ('Chile',       'IQUIQUE',            2450, 2200),
    ('Chile',       'ARICA',              2450, 2200),
    ('Guatemala',   'PUERTO QUETZAL',     2950, 2700),
    ('El Salvador', 'ACAJUTLA',           2950, 2700),
    ('Costa Rica',  'PUERTO CALDERA',     2650, 2400),
    ('Honduras',    'SAN LORENZO',        2950, 2700),
    ('Nicaragua',   'CORINTO',            2950, 2700),
]

WCSA_NOTE = 'Incl BUC/HCS; FAF USD 450/TEU extra; HCS OW: 18-21.9T+$200/TEU, >=22T+$400/TEU (incl tare); 1-7 May 2026'
for op in WCSA_ORIGINS:
    for dc, dp, r20, r40 in wcsa_ports:
        lines.append(row(op, dc, dp, r20, r40, VF_WCSA, VT_WCSA,
            sur=SURCH_WCSA, notes=WCSA_NOTE, cl=WCSA_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# ECSA — East Coast South America (1-7 May 2026)
# Origins: Mundra, Nhava Sheva, Chennai, Pipavav (all same rates)
# Rates incl BUC; subj FAF 430/TEU; HCS weight surcharge
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== ECSA (incl BUC; FAF USD 430/TEU extra; 1-7 May 2026) ========")
lines.append("-- HCS: USD 500/20' for tare+cargo >= 18MT; Paranagua THC BRL 1650/CNTR")
lines.append("")

ECSA_ORIGINS = ['MUNDRA','NHAVA SHEVA','CHENNAI','PIPAVAV']

ecsa_ports = [
    # Group base rate 3170/2940
    ('Brazil',    'SANTOS',                   3170, 2940),
    ('Brazil',    'PARANAGUA',                3170, 2940),
    ('Brazil',    'NAVEGANTES',               3170, 2940),
    ('Uruguay',   'MONTEVIDEO',               3170, 2940),
    ('Brazil',    'RIO DE JANEIRO',           3170, 2940),
    ('Brazil',    'ITAPOA',                   3170, 2940),
    ('Argentina', 'BUENOS AIRES',             3170, 2940),
    # Vitoria: base + 1020/1740 = 4190/4680
    ('Brazil',    'VITORIA',                  4190, 4680),
    # Salvador: base + 1020/1740 = 4190/4680
    ('Brazil',    'SALVADOR',                 4190, 4680),
    # Asuncion: base + 1000/1800 = 4170/4740; FO terms
    ('Paraguay',  'ASUNCION',                 4170, 4740),
]

ECSA_NOTE  = 'Incl BUC; FAF USD 430/TEU extra; HCS USD 500/20GP if tare+cargo>=18MT; Paranagua THC BRL 1650/CNTR; 1-7 May 2026'
ECSA_NOTE_ASN = ECSA_NOTE + '; Asuncion: FO (Free Out) terms; inland via Montevideo'
for op in ECSA_ORIGINS:
    for dc, dp, r20, r40 in ecsa_ports:
        n = ECSA_NOTE_ASN if dp == 'ASUNCION' else ECSA_NOTE
        v = 'MONTEVIDEO' if dp == 'ASUNCION' else ''
        lines.append(row(op, dc, dp, r20, r40, VF_ECSA, VT_ECSA,
            via=v, sur=SURCH_ECSA, notes=n, cl=ECSA_CL))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# MEXICO INLAND IPI — Door delivery add-on rates
# Via Manzanillo or Lazaro Cardenas; effective 2024-05-15
# Stored as IPI add-on rates; RATE_20 = 20GP inland; RATE_40 = 40GP/40HQ inland
# N/A entries skipped
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== MEXICO INLAND IPI ADD-ON RATES (effective 2024-05-15; add to ocean rate) ========")
lines.append("-- Mode: TruckRail Door | Confirm current rates before booking")
lines.append("")

MX_NOTE = 'Mexico inland IPI add-on; add to ocean port-to-port rate; TruckRail Door; GC only; effective 2024-05-15'

mex_ipi = [
    # (city, state, via, r20, r40)
    ('APODACA, NUEVO LEON',              'MANZANILLO',      1810, 2100),
    ('APODACA, NUEVO LEON',              'LAZARO CARDENAS', 1700, 2120),
    ('ARTEAGA, COAHUILA',                'MANZANILLO',      2130, 2410),
    ('ARTEAGA, COAHUILA',                'LAZARO CARDENAS', 2010, 2440),
    ('ATIZAPAN DE ZARAGOZA, MEXICO STATE','MANZANILLO',     1510, 1730),
    ('CADEREYTA JIMENEZ, NUEVO LEON',    'MANZANILLO',      1990, 2280),
    ('CUAUTITLAN IZCALLI, MEXICO STATE', 'MANZANILLO',      1510, 1730),
    ('EL SALTO, JALISCO',                'MANZANILLO',      1140, 1200),
    ('ESCOBEDO, NUEVO LEON',             'MANZANILLO',      1810, 2100),
    ('ESCOBEDO, NUEVO LEON',             'LAZARO CARDENAS', 1700, 2120),
    ('GUADALAJARA, JALISCO',             'MANZANILLO',      1000, 1060),
    ('GUADALUPE, NUEVO LEON',            'MANZANILLO',      1810, 2100),
    ('GUADALUPE, NUEVO LEON',            'LAZARO CARDENAS', 1700, 2120),
    ('MEXICO CITY PANTACO (MEX31)',      'MANZANILLO',      1510, 1730),
    ('MEXICO CITY CUAUTITLAN (MEX33)',   'MANZANILLO',      1610, 1830),
    ('MEXICO CITY PANTACO (MEX31)',      'LAZARO CARDENAS', 1520, 1930),
    ('MEXICO CITY CUAUTITLAN (MEX33)',   'LAZARO CARDENAS', 1570, 2020),
    ('MONTERREY, NUEVO LEON',            'MANZANILLO',      1810, 2100),
    ('MONTERREY, NUEVO LEON',            'LAZARO CARDENAS', 1700, 2120),
    ('NAUCALPAN DE JUAREZ, MEXICO STATE','MANZANILLO',      1510, 1730),
    ('QUERETARO',                        'LAZARO CARDENAS', 1480, 1720),
    ('RAMOS ARIZPE, COAHUILA',           'MANZANILLO',      2130, 2410),
    ('RAMOS ARIZPE, COAHUILA',           'LAZARO CARDENAS', 2010, 2440),
    ('SALINAS VICTORIA, NUEVO LEON',     'MANZANILLO',      1810, 2100),
    ('SALINAS VICTORIA, NUEVO LEON',     'LAZARO CARDENAS', 1700, 2120),
    ('SAN NICOLAS DE LOS GARZA, NUEVO LEON','MANZANILLO',   1810, 2100),
    ('SAN NICOLAS DE LOS GARZA, NUEVO LEON','LAZARO CARDENAS',1700,2120),
    ('SANTA CATARINA, NUEVO LEON',       'MANZANILLO',      1810, 2100),
    ('SANTA CATARINA, NUEVO LEON',       'LAZARO CARDENAS', 1700, 2120),
    ('TEPOTZOTLAN, MEXICO STATE',        'MANZANILLO',      1760, 1980),
    ('TEXCOCO, MEXICO STATE',            'MANZANILLO',      1760, 1980),
    ('TLAJOMULCO DE ZUNIGA, JALISCO',    'MANZANILLO',      1000, 1060),
    ('TLALNEPANTLA DE BAZ, MEXICO STATE','MANZANILLO',      1510, 1730),
    ('TLAQUEPAQUE, JALISCO',             'MANZANILLO',      1140, 1200),
    ('TOLUCA DE LERDO, MEXICO STATE',    'LAZARO CARDENAS', 1400, 1620),
    ('ZAPOPAN, JALISCO',                 'MANZANILLO',      1000, 1060),
    ('COLON, QUERETARO',                 'LAZARO CARDENAS', 1580, 1820),
    ('IXTAPALUCA, MEXICO STATE',         'LAZARO CARDENAS', 1690, 2110),
    ('IXTAPALUCA, MEXICO STATE',         'MANZANILLO',      1680, 1900),
    ('TULTITLAN, MEXICO CITY',           'MANZANILLO',      1510, 1730),
    ('TULTITLAN, MEXICO CITY',           'LAZARO CARDENAS', 1520, 1930),
    ('IZTAPALAPA, MEXICO CITY',          'MANZANILLO',      1760, 1980),
    ('IZTAPALAPA, MEXICO CITY',          'LAZARO CARDENAS', 1760, 2180),
    ('TEOLOYUCAN, MEXICO STATE',         'MANZANILLO',      1700, 1920),
    ('TEOLOYUCAN, MEXICO STATE',         'LAZARO CARDENAS', 1710, 2120),
    # N/A entries skipped: Atotonilco de Tula, Tultepec
]
lines.append("-- N/A entries skipped: Atotonilco de Tula (both), Tultepec (both)")
for dp, via, r20, r40 in mex_ipi:
    lines.append(row('NHAVA SHEVA', 'Mexico', dp, r20, r40, VF_MX, VT_MX,
        via=via,
        sur=SURCH_MX,
        notes=f'Mexico inland IPI add-on via {via}; TruckRail Door; add to ocean rate; effective 2024-05-15; confirm current rate',
        cl=MEX_IPI_CL))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
