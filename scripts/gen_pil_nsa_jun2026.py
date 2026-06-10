import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'PIL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.pilship.com/en/index.html'
VF_FE   = '2026-06-01'
VT_FE   = '2026-06-30'
VF_RS   = '2026-06-01'
VT_RS   = '2026-06-14'
VF_NZ   = '2026-06-01'
VT_NZ   = '2026-06-14'

CL_FE = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | Far East rates"
    "|Validity: 01-30 Jun 2026"
    "|Rates inclusive of: EBS"
    "|Subject to: Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
    "|Rates can be negotiated for PODs marked in RED on source sheet"
    "|Space and equipment subject to availability"
)
CL_RS = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | Red Sea rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: EBS"
    "|Subject to: Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
    "|Space and equipment subject to availability"
)
CL_NZ = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | New Zealand rates"
    "|Validity: 01-14 Jun 2026"
    "|Rates inclusive of: EBS"
    "|Subject to: Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
    "|Space and equipment subject to availability"
)

SURCH = 'EBS:incl;Seal:10/ctr;SFF:15/BL;THC:collect'

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, clauses, notes=''):
    v  = f"'{esc(via)}'" if via else 'NULL'
    n  = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{SURCH}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def fe(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_FE, VT_FE, via, CL_FE, notes)

def rs(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_RS, VT_RS, via, CL_RS, notes)

def nz(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_NZ, VT_NZ, via, CL_NZ, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- PIL (India) Pvt. Ltd. — NHAVA SHEVA Rates June 2026")
lines.append("-- FAR EAST: valid 01-30 Jun 2026 | Incl EBS | +Seal $10 SFF $15 THC")
lines.append("-- RED SEA:  valid 01-14 Jun 2026 | Incl EBS | +Seal $10 SFF $15 THC")
lines.append("-- NZ:       valid 01-14 Jun 2026 | Incl EBS | +Seal $10 SFF $15 THC")
lines.append("-- AUS: NOT ACCEPTING 1st half June (space constraint) — SKIPPED")
lines.append("-- Where 20ft > 40ft: stored as-is from source sheet")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# FAR EAST
# ============================================================
lines.append("-- ======== FAR EAST (01-30 Jun 2026) ========")
lines.append("")

lines.append("-- China — Major direct ports")
lines.append(fe('China', 'SHANGHAI',              41,    81))
lines.append(fe('China', 'SHEKOU',                41,    81))
lines.append(fe('China', 'NINGBO',                41,    81))
lines.append("")

lines.append("-- China — via Singapore")
lines.append(fe('China', 'NANSHA',                65,   105, 'SINGAPORE'))
lines.append(fe('China', 'XINGANG',              115,   180, 'SINGAPORE'))
lines.append(fe('China', 'QINGDAO',               90,   205, 'SINGAPORE'))
lines.append(fe('China', 'QINZHOU',              165,   255, 'SINGAPORE'))
lines.append("")

lines.append("-- China — via Shanghai")
lines.append(fe('China', 'YANGZHOU',              65,   105, 'SHANGHAI'))
lines.append(fe('China', 'NANTONG',               65,   480, 'SHANGHAI'))
lines.append(fe('China', 'WUHU',                  65,   130, 'SHANGHAI'))
lines.append(fe('China', 'WUHAN',                 65,   205, 'SHANGHAI'))
lines.append(fe('China', 'YICHANG',               65,   330, 'SHANGHAI'))
lines.append(fe('China', 'YUE YANG',              90,   230, 'SHANGHAI'))
lines.append(fe('China', 'NANJING',               65,   105, 'SHANGHAI'))
lines.append(fe('China', 'CHONGQING',            215,   580, 'SHANGHAI'))
lines.append(fe('China', 'LIANYUNGANG',           90,   180, 'SHANGHAI'))
lines.append(fe('China', 'HUANGSHI',             340,   230, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('China', 'CHANGSHA',             340,   330, 'SHANGHAI'))
lines.append("")

lines.append("-- China — via Ningbo")
lines.append(fe('China', 'FUZHOU (MAWEI)',        315,   380, 'NINGBO'))
lines.append(fe('China', 'FUZHOU (JIANGYIN)',      90,   780, 'NINGBO'))
lines.append(fe('China', 'WENZHOU',               90,   180, 'NINGBO'))
lines.append("")

lines.append("-- China — via Shekou")
lines.append(fe('China', 'HUANGPU (GCT)',         190,   105, 'SHEKOU', '20ft>40ft on source sheet'))
lines.append(fe('China', 'SANSHAN',               240,   430, 'SHEKOU'))
lines.append(fe('China', 'SANSHUI',                65,   105, 'SHEKOU'))
lines.append(fe('China', 'WUZHOU',                140,   430, 'SHEKOU'))
lines.append(fe('China', 'JIUJIANG',               90,   180, 'SHEKOU'))
lines.append(fe('China', 'YUNFU',                 215,   330, 'SHEKOU'))
lines.append(fe('China', 'FANGCHENG',             315,   455, 'SHEKOU'))
lines.append(fe('China', 'SHANTOU',               140,   230, 'SHEKOU'))
lines.append(fe('China', 'ZHANJIANG',             315,   130, 'SHEKOU', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Japan (via Shanghai; 20ft > 40ft on source sheet)")
lines.append(fe('Japan', 'TOKYO',                 615,   130, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'YOKOHAMA',              565,   130, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'NAGOYA',                490,   130, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'KOBE',                  415,   130, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'OSAKA',                 415,   130, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Taiwan")
lines.append(fe('Taiwan', 'KAOHSIUNG',            390,    90, 'SINGAPORE', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- South Korea")
lines.append(fe('South Korea', 'PUSAN',            65,   330, 'SINGAPORE'))
lines.append(fe('South Korea', 'INCHEON',         440,   805, 'SINGAPORE'))
lines.append("")

lines.append("-- Thailand")
lines.append(fe('Thailand', 'LAEM CHA BANG',       65,   105, 'SINGAPORE'))
lines.append(fe('Thailand', 'BANGKOK (PAT)',        65,   105, 'SINGAPORE'))
lines.append("")

lines.append("-- Malaysia — direct and via Port Klang West")
lines.append(fe('Malaysia', 'PORT KLANG (WEST)',   41,    81))
lines.append(fe('Malaysia', 'PENANG',             315,   105, 'PORT KLANG WEST', '20ft>40ft on source sheet'))
lines.append(fe('Malaysia', 'PASIR GUDANG',        65,   580, 'SINGAPORE'))
lines.append(fe('Malaysia', 'SANDAKAN',           765,   780, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'TAWAU',              740,   855, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'BINTULU',            340,   730, 'SINGAPORE'))
lines.append(fe('Malaysia', 'LABUAN',             890,  1155, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'SIBU',               390,  1080, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'KUCHING',            790,  1405, 'SINGAPORE'))
lines.append(fe('Malaysia', 'KOTA KINABALU',      565,  1605, 'SINGAPORE'))
lines.append("")

lines.append("-- Brunei")
lines.append(fe('Brunei', 'MUARA',                790,  1280, 'SINGAPORE'))
lines.append("")

lines.append("-- Singapore")
lines.append(fe('Singapore', 'SINGAPORE',          41,    81))
lines.append("")

lines.append("-- Vietnam")
lines.append(fe('Vietnam', 'HAIPHONG',             65,   780, 'SINGAPORE'))
lines.append(fe('Vietnam', 'HO CHI MINH (CAT LAI)', 65,  105, 'SINGAPORE'))
lines.append(fe('Vietnam', 'QUI NHON',             90,   280, 'SINGAPORE'))
lines.append("")

lines.append("-- Cambodia")
lines.append(fe('Cambodia', 'SIHANOUKVILLE',      615,  1055, 'SINGAPORE'))
lines.append("")

lines.append("-- Myanmar")
lines.append(fe('Myanmar', 'YANGON',              615,  1055, 'SINGAPORE'))
lines.append("")

lines.append("-- Indonesia")
lines.append(fe('Indonesia', 'JAKARTA',           540,   630, 'SINGAPORE'))
lines.append(fe('Indonesia', 'SURABAYA',          315,   580, 'SINGAPORE'))
lines.append(fe('Indonesia', 'BELAWAN',            65,   105, 'SINGAPORE'))
lines.append(fe('Indonesia', 'SEMARANG',          515,   755, 'SINGAPORE'))
lines.append("")

lines.append("-- Philippines")
lines.append(fe('Philippines', 'MANILA NORTH',    665,   980, 'SINGAPORE'))
lines.append(fe('Philippines', 'GENERAL SANTOS',  615,   730, 'SINGAPORE'))
lines.append(fe('Philippines', 'SUBIC BAY',       665,  1180, 'SINGAPORE'))
lines.append(fe('Philippines', 'DAVAO',           565,   980, 'SINGAPORE'))
lines.append("")

# ============================================================
# RED SEA (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== RED SEA (01-14 Jun 2026) ========")
lines.append("")

lines.append(rs('Djibouti',   'DJIBOUTI',         3850,  5300, 'SINGAPORE'))
lines.append(rs('Saudi Arabia','JEDDAH',           3900,  5400, 'SINGAPORE'))
lines.append(rs('Egypt',      'AIN SOKHNA',        3700,  5000, 'SINGAPORE'))
lines.append(rs('Jordan',     'AQABA',             3800,  5200, 'SINGAPORE'))
lines.append(rs('Sudan',      'PORT SUDAN',        5100,  6500, 'SINGAPORE', 'via Singapore/Jeddah'))
lines.append(rs('Yemen',      'ADEN',              5100,  6500, 'SINGAPORE', 'via Singapore/Jeddah'))
lines.append(rs('Yemen',      'HODEIDAH',          7700, 11860, 'SINGAPORE', 'via Singapore/Djibouti'))
lines.append(rs('Somalia',    'BERBERA',           5100,  6500, 'SINGAPORE', 'via Singapore/Djibouti'))
lines.append("")

# ============================================================
# AUSTRALIA — SKIPPED (not accepting 1st half June)
# ============================================================
lines.append("-- ======== AUSTRALIA — NOT ACCEPTING 1st half June (space constraint) ========")
lines.append("-- Sydney/Brisbane/Melbourne and Fremantle/Adelaide: no rates offered")
lines.append("")

# ============================================================
# NEW ZEALAND (01-14 Jun 2026)
# ============================================================
lines.append("-- ======== NEW ZEALAND (01-14 Jun 2026) ========")
lines.append("")

lines.append(nz('New Zealand', 'AUCKLAND / NAPIER / LYTTELTON', 875, 1650, 'SINGAPORE'))
lines.append(nz('New Zealand', 'WELLINGTON / TAURANGA',          875, 1650, 'SINGAPORE'))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
