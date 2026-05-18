import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'WAN HAI'
OC  = 'India'
OP  = 'NHAVA SHEVA'
VF  = '2026-05-01'
VT  = '2026-05-15'
PDF = 'https://www.wanhai.com/'

BASE_CL = (
    "Wan Hai Lines | Nhava Sheva Export Rates | 1-15 May 2026"
    "|Inclusive of WBS/PRS; sub to both end local charges"
    "|Sub to commodity acceptance; Black commodities not accepted: cinnamon/charcoal/carbon/masterbatch/scrap/used goods"
    "|T/S ports for reference only; may change without prior notice"
    "|DG sub to DG approval; no MIX DG shipments; no multiple DG classes"
    "|No Seaway BL; Direct TLX or Original BL only (counter 0900-1500 hrs)"
    "|5% GST applicable on OFT and WBS"
    "|THC General SD: INR 11300/20ft INR 18300/40ft | DG/HAZ: INR 13100/21100"
    "|DOC: INR 4500/BL | TLX: INR 4500 | TTCE: INR 2000/cntr | MUCE: INR 30/BL"
    "|CESE: INR 25/20ft INR 50/40ft | EFSC: INR 150/BL"
    "|Flexi Bag/Tank surcharge additional"
)

FE_CL   = BASE_CL + "|Far East trade|EFS: INR 599/20ft INR 1198/40ft|MTF (ENS/AFR): USD 25/TEU (Japan/China/US/MX)"
GULF_CL = BASE_CL + "|Gulf trade; service IM1 via Jebel Ali|MTF (ENS/AFR): USD 30/TEU"
WCSA_CL = (
    BASE_CL
    + "|WCSA trade|EFS: INR 200/20ft INR 200/40ft"
    + "|MX/GT ICD rates valid up to 28.99 MT (cargo+tare); over 29 MT not acceptable"
)
ICD_CL  = WCSA_CL + "|Inland (ICD/door) rate via gateway port; includes inland transport"

SURCH_FE   = 'WBS:incl;PRS:incl;EFS:INR599/20-INR1198/40;MTF:USD25/teu'
SURCH_GULF = 'WBS:incl;PRS:incl;MTF:USD30/teu'
SURCH_WCSA = 'WBS:incl;PRS:incl;EFS:INR200/teu'

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, cl, via='', surcharges='', notes=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    s = f"'{esc(surcharges)}'" if surcharges else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',{v},{s},{n},'{esc(cl)}','{PDF}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

# Helper: build notes string for 40'GP diff + DG rates
def fe_notes(gen_40gp, gen_40hq, dg20=None, dg_40gp=None, dg_40hq=None, extra=''):
    parts = []
    if gen_40gp != gen_40hq:
        parts.append(f'40GP=${gen_40gp}')
    if dg20 is not None:
        dg_note = f'DG: 20\'=${dg20}'
        if dg_40gp == dg_40hq:
            dg_note += f' 40\'=${dg_40gp}'
        else:
            dg_note += f' 40GP=${dg_40gp} 40HQ=${dg_40hq}'
        parts.append(dg_note)
    if extra:
        parts.append(extra)
    return '; '.join(parts)

# Helper for Far East ports
def fe(dc, dp, via, g20, g40gp, g40hq, dg20=None, dg40gp=None, dg40hq=None, extra_note=''):
    n = fe_notes(g40gp, g40hq, dg20, dg40gp, dg40hq, extra_note)
    return row(dc, dp, g20, g40hq, FE_CL, via=via, surcharges=SURCH_FE, notes=n)

lines = []
lines.append("-- ================================================================")
lines.append("-- Wan Hai Lines — Nhava Sheva Export Rates")
lines.append("-- Validity: 1-15 May 2026")
lines.append("-- Covers: China, Hong Kong, Indonesia, Japan, Cambodia, Korea,")
lines.append("--         Malaysia, Philippines, Singapore, Thailand, Taiwan,")
lines.append("--         Vietnam, Gulf, WCSA, Mexico/Guatemala ICD")
lines.append("-- Inclusive of WBS/PRS; EFS + MTF extra as noted")
lines.append("-- RATE_40 = 40'HQ; where 40'GP differs, noted in NOTES")
lines.append("-- DG rates noted in NOTES field; stored as separate rows where applicable")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# CHINA (service CIX / CI2 / SI8; via HKG / SKU / SHA / KHH / NGB / PKG / direct)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== CHINA (1-15 May 2026) ========")
lines.append("")

# fmt: (country, port, via, g20, g40gp, g40hq [, dg20, dg40gp, dg40hq])
china = [
    ('China', 'BEICUN',                      'HONG KONG',  175, 550, 350),
    ('China', 'BEIJAO',                       'SHEKOU',     150, 350, 350),
    ('China', 'CHONGQING',                    'SHANGHAI',   375, 950, 850),
    ('China', 'CHANGSHA',                     'SHANGHAI',   325, 850, 750),
    ('China', 'CHIWAN, SHEKOU',               'HONG KONG',  125, 250, 250),
    ('China', 'CHANGZHOU',                    'SHANGHAI',   325, 650, 650),
    ('China', 'DALIAN',                       'HONG KONG',  175, 225, 225),
    ('China', 'DOU MEN, ZUHAI PROVINCE',      'HONG KONG',  125, 250, 250),
    ('China', 'MAWEI, FUZHOU',                'KAOHSIUNG',  100, 250, 150,  200, 350, 350),
    ('China', 'GAOSHA',                       'SHEKOU',     150, 250, 150),
    ('China', 'GAOLAN, ZUHAI PROVINCE',       'SHEKOU',     175, 250, 250),
    ('China', 'GAO MING',                     'SHEKOU',     150, 300, 300),
    ('China', 'GAO YAO',                      'HONG KONG',  175, 350, 350),
    ('China', 'HAIKOU',                       'SHEKOU',     275, 450, 450),
    ('China', 'HEFEI',                        'SHANGHAI',   225, 350, 350),
    ('China', 'HONGWAN, ZUHAI PROVINCE',      'SHEKOU',     125, 250, 250),
    ('China', 'TIANJIN, XINGANG',             'KAOHSIUNG',  125, 175, 175,  225, 250, 375),
    ('China', 'DONGGUAN CONTAINER TERMINAL',  'SHEKOU',     175, 300, 300),
    ('China', 'HUANGPU',                      'SHEKOU',     125, 250, 250),
    ('China', 'HUADU',                        'SHEKOU',     175, 350, 250),
    ('China', 'JING ZHOU',                    'SHANGHAI',   375, 750, 750),
    ('China', 'JIANGYIN, FUJIAN',             'KAOHSIUNG',  125, 250, 250,  225, 450, 450),
    ('China', 'FOSHAN JIUJIANG',              'SHEKOU',     150, 250, 250),
    ('China', 'JIUJIANG',                     'SHANGHAI',   325, 650, 650),
    ('China', 'JIANGMEN NEW PORT',            'SHEKOU',     225, 650, 450),
    ('China', 'JINZHOU',                      'HONG KONG',  325, 650, 650,  None, None, None),   # T/S HKG->DLC noted below
    ('China', 'JIAOXIN',                      'SHEKOU',     125, 300, 300),
    ('China', 'NANCHANG',                     'SHANGHAI',   275, 450, 450),
    ('China', 'LIAN HUA SHAN',                'SHEKOU',     125, 350, 300),
    ('China', 'LIANYUNGANG',                  'KAOHSIUNG',  185, 210, 210,  285, 325, 325),
    ('China', 'SI HUI (MA FANG)',             'SHEKOU',     175, 250, 250),
    ('China', 'NINGBO',                       '',           5,   10,  10,   175, 250, 250),  # direct
    ('China', 'NANJING',                      'SHANGHAI',   150, 250, 200),
    ('China', 'NANSHA NEW PORT',              '',           175, 300, 300,  275, 500, 500),  # direct
    ('China', 'NANTONG',                      'SHANGHAI',   225, 450, 450),
    ('China', 'SHUNDE LELIU WHARF',           'HONG KONG',  125, 250, 250),
    ('China', 'PSA DONGGUAN',                 'SHEKOU',     175, 350, 350),
    ('China', 'QINGYUAN',                     'SHEKOU',     225, 450, 450),
    ('China', 'QINZHOU',                      'PORT KELANG',325, 550, 550),
    ('China', 'SHANGHAI',                     '',           5,   10,  10,   105, 210, 210),  # direct
    ('China', 'SHEKOU, SHENZHEN',             '',           5,   10,  10,   225, 350, 350),  # direct
    ('China', 'SANSHAN',                      'SHEKOU',     125, 250, 250),
    ('China', 'SANSHUI NEW PORT',             'SHEKOU',     125, 250, 250),
    ('China', 'SHATIAN',                      'SHEKOU',     175, 350, 350),
    ('China', 'SHUNDE NEW PORT',              'SHEKOU',     125, 225, 225),
    ('China', 'TAICANG',                      'SHANGHAI',   225, 400, 400),
    ('China', 'QINGDAO',                      '',           15,  30,  30,   125, 230, 230),  # direct
    ('China', 'WUHU',                         'SHANGHAI',   225, 450, 450),
    ('China', 'WUHAN',                        'SHANGHAI',   225, 450, 450),
    ('China', 'WENZHOU',                      'NINGBO',     225, 450, 450),
    ('China', 'WU ZHOU',                      'HONG KONG',  225, 450, 450),
    ('China', 'WUXI',                         'SHANGHAI',   225, 450, 450),
    ('China', 'XINHUI',                       'SHEKOU',     125, 250, 250),
    ('China', 'XIAOLAN',                      'SHEKOU',     125, 250, 250),
    ('China', 'XIAMEN',                       'KAOHSIUNG',  125, 200, 200,  250, 350, 350),
    ('China', 'YICHANG',                      'SHANGHAI',   375, 850, 750),
    ('China', 'YANGPU PORT',                  'SHEKOU',     375, 650, 650),
    ('China', 'YANTIAN, SHENZHEN',            'HONG KONG',  275, 350, 350,  625, 1150, 1150),
    ('China', 'YUEYANG',                      'SHANGHAI',   275, 500, 500),
    ('China', 'YANG ZHOU',                    'SHANGHAI',   175, 350, 250),
    ('China', 'ZHAPU',                        'NINGBO',     125, 200, 200),
    ('China', 'ZHANJIANG',                    'PORT KELANG',225, 400, 400,  325, 600, 600),
    ('China', 'ZHAOQING',                     'SHEKOU',     175, 250, 250),
    ('China', 'ZHAOQING NEW PORT',            'SHEKOU',     125, 250, 250),
    ('China', 'ZHONGSHAN',                    'SHEKOU',     125, 175, 175),
    ('China', 'ZHANGJIAGANG',                 'SHANGHAI',   175, 350, 250),
]
# Special note for JINZHOU: T/S via HKG then tranship to DLC
for entry in china:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20  = entry[6]  if len(entry) > 6 else None
    dg40gp= entry[7]  if len(entry) > 7 else None
    dg40hq= entry[8]  if len(entry) > 8 else None
    extra = 'T/S via HONG KONG then DALIAN' if dp == 'JINZHOU' else ''
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq, extra))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# HONG KONG (direct CIX)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== HONG KONG ========")
lines.append("")
lines.append(fe('Hong Kong', 'HONG KONG', '', 5, 10, 10, 105, 210, 210))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# INDONESIA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== INDONESIA ========")
lines.append("")
indonesia = [
    ('Indonesia', 'BELAWAN',    'PORT KELANG', 75,  100,  100,  275,  400,  400),
    ('Indonesia', 'BALIKPAPAN', 'JAKARTA',     975, 1650, 1650),
    ('Indonesia', 'BATAM',      'SINGAPORE',   525, 1050, 1050),
    ('Indonesia', 'JAKARTA',    '',            60,  100,  100,  160,  300,  300),  # direct
    ('Indonesia', 'PANJANG',    'JAKARTA',     275, 550,  550),
    ('Indonesia', 'PALEMBANG',  'SINGAPORE',   325, 650,  650),
    ('Indonesia', 'PONTIANAK',  'SINGAPORE',   525, 1050, 1050),
    ('Indonesia', 'SEMARANG',   'SHEKOU',      125, 250,  250),
    ('Indonesia', 'SURABAYA',   '',            50,  100,  100,  200,  400,  400),  # direct
    ('Indonesia', 'TARAKAN',    'SURABAYA',    725, 1450, 1450),
]
for entry in indonesia:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20   = entry[6] if len(entry) > 6 else None
    dg40gp = entry[7] if len(entry) > 7 else None
    dg40hq = entry[8] if len(entry) > 8 else None
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# JAPAN (service CIX / CI2 / SI8; via SKU / KHH / PKG)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== JAPAN ========")
lines.append("")
japan = [
    ('Japan', 'FUKUYAMA',            'SHEKOU',     50,  100,  100),
    ('Japan', 'HIROSHIMA',           'SHEKOU',     50,  100,  100),
    ('Japan', 'HAKATA',              'KAOHSIUNG',  50,  100,  100,  150, 300, 300),
    ('Japan', 'KAWASAKI',            'PORT KELANG',125, 200,  200,  225, 350, 350),
    ('Japan', 'MIZUSHIMA',           'SHEKOU',     75,  150,  150),
    ('Japan', 'MOJI',                'KAOHSIUNG',  50,  100,  100,  150, 300, 300),
    ('Japan', 'MATSUYAMA',           'KAOHSIUNG',  675, 1050, 1050),
    ('Japan', 'NAHA, OKINAWA',       'KAOHSIUNG',  575, 1050, 1050),
    ('Japan', 'NAGOYA',              'KAOHSIUNG',  50,  100,  100,  150, 300, 300),
    ('Japan', 'OSAKA',               'PORT KELANG',50,  100,  100,  150, 300, 300),
    ('Japan', 'SENDAI, MIYAGI',      'PORT KELANG',725, 1050, 1050),
    ('Japan', 'SHIMIZU',             'PORT KELANG',50,  100,  100,  150, 300, 300),
    ('Japan', 'TOKUYAMA',            'KAOHSIUNG',  50,  100,  100,  150, 300, 300),
    ('Japan', 'TOKYO',               'PORT KELANG',50,  100,  100,  150, 300, 300),
    ('Japan', 'KOBE',                'PORT KELANG',50,  100,  100,  150, 300, 300),
    ('Japan', 'YOKKAICHI',           'PORT KELANG',50,  100,  100,  150, 300, 300),
    ('Japan', 'YOKOHAMA',            'PORT KELANG',50,  100,  100,  150, 300, 300),
]
for entry in japan:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20   = entry[6] if len(entry) > 6 else None
    dg40gp = entry[7] if len(entry) > 7 else None
    dg40hq = entry[8] if len(entry) > 8 else None
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# CAMBODIA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== CAMBODIA ========")
lines.append("")
# PHNOMPENH: via PORT KELANG -> CLP (river ICD)
lines.append(fe('Cambodia', 'PHNOMPENH',     'PORT KELANG', 175, 300, 300,
                extra_note='ICD via CAT LAI PORT (river barge)'))
lines.append(fe('Cambodia', 'SIHANOUKVILLE', 'SHEKOU',      175, 400, 300))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# KOREA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== KOREA ========")
lines.append("")
korea = [
    ('Korea', 'INCHON',     'KAOHSIUNG', 150, 250, 250, 200, 350, 350),
    ('Korea', 'KWANGYANG',  'KAOHSIUNG', 125, 200, 200, 200, 300, 300),
    ('Korea', 'PUSAN',      'KAOHSIUNG', 15,  30,  30,  125, 250, 250),
    ('Korea', 'ULSAN',      'KAOHSIUNG', 30,  60,  60,  130, 260, 260),
]
for dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq in korea:
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# MALAYSIA
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== MALAYSIA ========")
lines.append("")
malaysia = [
    ('Malaysia', 'KOTA KINABALU', 'PORT KELANG', 825,  1700, 1150, 1125, 2300, 1750),
    ('Malaysia', 'BINTULU',       'PORT KELANG', 525,  1100, 1100, 825,  1700, 1700),
    ('Malaysia', 'KUCHING',       'PORT KELANG', 825,  1050, 1050, 1125, 1650, 1650),
    ('Malaysia', 'MIRI',          'PORT KELANG', 1025, 1300, 1300, 1325, 1900, 1900),
    ('Malaysia', 'PENANG',        'PORT KELANG', 10,   20,   20,   110,  220,  220),
    ('Malaysia', 'PASIR GUDANG',  'PORT KELANG', 15,   30,   30,   115,  230,  230),
    ('Malaysia', 'PORT KELANG',   '',            5,    10,   10,   105,  210,  210),  # direct
    ('Malaysia', 'SIBU',          'PORT KELANG', 1025, 1250, 1250, 1325, 1850, 1850),
    ('Malaysia', 'SANDAKAN',      'KAOHSIUNG',   1025, 1250, 1250, 1325, 1850, 1850),
    ('Malaysia', 'TAWAO',         'KAOHSIUNG',   825,  1450, 1550, 1125, 2050, 2150),
]
for entry in malaysia:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20, dg40gp, dg40hq = entry[6], entry[7], entry[8]
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# PHILIPPINES
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== PHILIPPINES ========")
lines.append("")
philippines = [
    ('Philippines', 'CEBU',          'KAOHSIUNG', 50,  100, 100, 200, 300, 300),
    ('Philippines', 'DAVAO',         'KAOHSIUNG', 50,  100, 100, 225, 450, 450),
    ('Philippines', 'MANILA NORTH',  'KAOHSIUNG', 50,  100, 100, 150, 300, 300),
    ('Philippines', 'MANILA SOUTH',  'SHEKOU',    50,  100, 100),
    ('Philippines', 'SUBIC BAY',     'KAOHSIUNG', 100, 200, 200, 200, 300, 300),
]
for entry in philippines:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20   = entry[6] if len(entry) > 6 else None
    dg40gp = entry[7] if len(entry) > 7 else None
    dg40hq = entry[8] if len(entry) > 8 else None
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# SINGAPORE
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== SINGAPORE ========")
lines.append("")
lines.append(fe('Singapore', 'SINGAPORE', '', 5, 10, 10, 150, 250, 250))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# THAILAND
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== THAILAND ========")
lines.append("")
lines.append(fe('Thailand', 'BANGKOK PAT',  'KAOHSIUNG',     25,  50,  50,  150, 300, 300))
lines.append(fe('Thailand', 'LAEM CHABANG', '',              25,  50,  50,  150, 300, 300))  # direct VTI
lines.append(fe('Thailand', 'LAT KRABANG',  'LAEM CHABANG',  150, 250, 250,
                extra_note='ICD via Laem Chabang (road)'))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# TAIWAN
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== TAIWAN ========")
lines.append("")
taiwan = [
    ('Taiwan', 'KEELUNG',   'PORT KELANG', 200, 250, 250, 300, 500, 500,
     'ICD service via TPE (Taipei IPI)'),
    ('Taiwan', 'KAOHSIUNG', '',            50,  75,  75,  125, 250, 250),  # direct
    ('Taiwan', 'TAOYUAN',   'PORT KELANG', 125, 250, 250, 300, 500, 500,
     'ICD service via TPE (Taipei IPI)'),
    ('Taiwan', 'TAIPEI',    'PORT KELANG', 50,  100, 100, 150, 300, 300),
    ('Taiwan', 'TAICHUNG',  'PORT KELANG', 75,  100, 100, 125, 250, 250),
]
for entry in taiwan:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20, dg40gp, dg40hq = entry[6], entry[7], entry[8]
    extra = entry[9] if len(entry) > 9 else ''
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq, extra))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# VIETNAM
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== VIETNAM ========")
lines.append("")
vietnam = [
    ('Vietnam', 'CAT LAI, HCMC',           'PORT KELANG', 50,  75,  75),
    ('Vietnam', 'DANANG',                   'SHEKOU',      225, 450, 450),
    ('Vietnam', 'HAIPHONG',                 'PORT KELANG', 50,  75,  75,  125, 250, 250),
    ('Vietnam', 'TAN CAN, HCMC',            'PORT KELANG', 150, 250, 250, 250, 500, 500,
     'ICD via CAT LAI PORT'),
    ('Vietnam', 'ICD PHUOC LONG 3',         'PORT KELANG', 175, 350, 350, 275, 550, 550,
     'ICD via CAT LAI PORT'),
    ('Vietnam', 'ICD PHUOC LONG 1',         'PORT KELANG', 175, 350, 350, 275, 550, 550,
     'ICD via CAT LAI PORT'),
    ('Vietnam', 'CAI MEP',                  '',            175, 350, 350, 350, 550, 550),  # direct VTI
    ('Vietnam', 'QUY NHON',                 'SINGAPORE',   530, 1000, 850),
    ('Vietnam', 'HOCHIMINH VICT',           'PORT KELANG', 125, 200, 200, 225, 400, 400,
     'ICD via CAT LAI PORT'),
]
for entry in vietnam:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20   = entry[6]  if len(entry) > 6 and isinstance(entry[6], int) else None
    dg40gp = entry[7]  if len(entry) > 7 and isinstance(entry[7], int) else None
    dg40hq = entry[8]  if len(entry) > 8 and isinstance(entry[8], int) else None
    extra  = entry[9]  if len(entry) > 9 else (entry[6] if len(entry) > 6 and isinstance(entry[6], str) else '')
    lines.append(fe(dc, dp, via, g20, g40gp, g40hq, dg20, dg40gp, dg40hq, extra))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# GULF (service IM1; via Jebel Ali for T/S ports)
# Format: general rates only (20' / 40'GP / 40'HQ); all 40GP=40HQ in this section
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== GULF (1-15 May 2026; service IM1) ========")
lines.append("")

gulf = [
    ('UAE',          'JEBEL ALI',          '',             150,  300,  300),
    ('UAE',          'AJMAN',              'JEBEL ALI',    500,  600,  600),
    ('UAE',          'ABU DHABI',          'JEBEL ALI',    450,  700,  700),
    ('UAE',          'SHARJAH',            'JEBEL ALI',    450,  600,  600),
    ('Oman',         'SOHAR',              'JEBEL ALI',    550,  900,  900),
    ('Qatar',        'HAMAD',              'JEBEL ALI',    300,  600,  600),
    ('Saudi Arabia', 'DAMMAM',             'JEBEL ALI',    400,  650,  650),
    ('Saudi Arabia', 'RIYADH',             'JEBEL ALI',    850,  1200, 1200),  # via Dammam by train
    ('Saudi Arabia', 'JEDDAH',             '',             800,  1200, 1200),  # direct IM1
    ('Egypt',        'SOKHNA PORT',        '',             800,  1200, 1200),  # direct IM1
    ('Jordan',       'AQABA',              'JEDDAH',       850,  1300, 1300),
]
for dc, dp, via, g20, g40gp, g40hq in gulf:
    notes = ''
    if dp == 'RIYADH':
        notes = 'ICD via Dammam; transport by Saudi Rail (train); cargo+tare <24 MT/20ft <28 MT/40ft; excess SAR 700/20ft SAR 1400/40ft'
    elif g40gp != g40hq:
        notes = f'40GP=${g40gp}'
    lines.append(row(dc, dp, g20, g40hq, GULF_CL,
                     via=via, surcharges=SURCH_GULF, notes=notes))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# WCSA — West Coast South America (general + DG rates)
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== WCSA (1-15 May 2026) ========")
lines.append("")

# fmt: (country, port, via, g20, g40gp, g40hq [, dg20, dg40gp, dg40hq])
wcsa = [
    ('Mexico',   'MANZANILLO',      'KAOHSIUNG',  2200, 2500, 2500, 2400, 2900, 2900),
    ('Mexico',   'LAZARO CARDENAS', 'KAOHSIUNG',  2200, 2500, 2500, 2400, 2900, 2900),
    ('Mexico',   'ENSENADA',        'QINGDAO',    2400, 2700, 2700),
    ('Colombia', 'BUENAVENTURA',    'KAOHSIUNG',  2200, 2500, 2500, 2400, 2900, 2900),
    ('Ecuador',  'GUAYAQUIL',       'KAOHSIUNG',  2200, 2500, 2500, 2400, 2900, 2900),
    ('Peru',     'CALLAO',          'KAOHSIUNG',  2200, 2500, 2500, 2400, 2900, 2900),
    ('Guatemala','PUERTO QUETZAL',  'KAOHSIUNG',  3700, 4000, 4000, 3900, 4400, 4400),
    ('Chile',    'SAN ANTONIO',     'HONG KONG',  2200, 2500, 2500),
]
for entry in wcsa:
    dc, dp, via = entry[0], entry[1], entry[2]
    g20, g40gp, g40hq = entry[3], entry[4], entry[5]
    dg20   = entry[6] if len(entry) > 6 else None
    dg40gp = entry[7] if len(entry) > 7 else None
    dg40hq = entry[8] if len(entry) > 8 else None
    n_parts = []
    if g40gp != g40hq:
        n_parts.append(f'40GP=${g40gp}')
    if dg20 is not None:
        dg_str = f'DG: 20\'=${dg20}'
        if dg40gp == dg40hq:
            dg_str += f' 40\'=${dg40gp}'
        else:
            dg_str += f' 40GP=${dg40gp} 40HQ=${dg40hq}'
        n_parts.append(dg_str)
    notes = '; '.join(n_parts)
    lines.append(row(dc, dp, g20, g40hq, WCSA_CL,
                     via=via, surcharges=SURCH_WCSA, notes=notes))
lines.append("")

# ══════════════════════════════════════════════════════════════════════════════
# MEXICO / GUATEMALA ICD (inland door rates from gateway port)
# Valid up to 28.99 MT (cargo+tare); over 29 MT not acceptable
# ══════════════════════════════════════════════════════════════════════════════
lines.append("-- ======== MEXICO / GUATEMALA ICD (1-15 May 2026) ========")
lines.append("-- Door/ICD rates; valid <=28.99 MT (cargo+tare); over 29 MT not acceptable")
lines.append("")

# fmt: (dest_country, dest_port, via_gateway, transport_mode, r20, r40gp, r40hq)
icd = [
    ('Mexico',    'MEXICO CITY',    'MANZANILLO',       'Truck',           6280, 6900, 6100),
    ('Mexico',    'MEXICO CITY',    'MANZANILLO',       'Rail',            3955, 4840, 4190),
    ('Mexico',    'MEXICO CITY',    'MANZANILLO',       'Rail+Truck',      4735, 5620, 4970),
    ('Mexico',    'MEXICO CITY',    'LAZARO CARDENAS',  'Truck',           7160, 8100, 7300),
    ('Mexico',    'MEXICO CITY',    'LAZARO CARDENAS',  'Rail',            4085, 5295, 4645),
    ('Mexico',    'MEXICO CITY',    'LAZARO CARDENAS',  'Rail+Truck',      4735, 5945, 5295),
    ('Mexico',    'MONTERREY',      'MANZANILLO',       'Truck',           7480, 8420, 7620),
    ('Mexico',    'MONTERREY',      'MANZANILLO',       'Rail',            4540, 5750, 5100),
    ('Mexico',    'MONTERREY',      'MANZANILLO',       'Rail+Truck',      5255, 6465, 5815),
    ('Mexico',    'MONTERREY',      'LAZARO CARDENAS',  'Truck',           9080, 10180,9380),
    ('Mexico',    'MONTERREY',      'LAZARO CARDENAS',  'Rail',            4410, 5880, 5230),
    ('Mexico',    'MONTERREY',      'LAZARO CARDENAS',  'Rail+Truck',      5060, 6530, 5880),
    ('Guatemala', 'GUATEMALA CITY', 'PUERTO QUETZAL',   'Truck',           4880, 5230, 5230),
]
for dc, dp, via_gw, mode, r20, r40gp, r40hq in icd:
    n_parts = [f'Mode: {mode}; gateway: {via_gw}']
    if r40gp != r40hq:
        n_parts.append(f'40GP=${r40gp}')
    n = '; '.join(n_parts)
    lines.append(row(dc, dp, r20, r40hq, ICD_CL,
                     via=via_gw, surcharges=SURCH_WCSA, notes=n))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
