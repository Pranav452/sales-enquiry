import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'PIL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.pilship.com/en/index.html'
VF_FE   = '2026-07-01'
VT_FE   = '2026-07-31'
VF_14   = '2026-07-01'
VT_14   = '2026-07-14'

CL_FE = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | Far East rates"
    "|Validity: 01-31 Jul 2026"
    "|Rates inclusive of: EBS"
    "|Subject to: Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
    "|Rates can be negotiated for PODs marked in RED on source sheet"
    "|Space and equipment subject to availability"
)
CL_AUS = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | Australia rates"
    "|Validity: 01-14 Jul 2026"
    "|Rates inclusive of: EBS"
    "|Subject to: Seal USD 10/container | SFF USD 15/BL | THC + local charges both ends"
    "|Space and equipment subject to availability"
)
CL_NZ = (
    "PIL (India) Pvt. Ltd. | Nhava Sheva origin | New Zealand rates"
    "|Validity: 01-14 Jul 2026"
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

def aus(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, CL_AUS, notes)

def nz(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_14, VT_14, via, CL_NZ, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- PIL (India) Pvt. Ltd. — NHAVA SHEVA Rates July 2026")
lines.append("-- FAR EAST: valid 01-31 Jul 2026 | Incl EBS | +Seal $10 SFF $15 THC")
lines.append("-- RED SEA:  NOT ACCEPTING 1st half July (2nd leg space constraint) — SKIPPED, no rates on sheet")
lines.append("-- AUSTRALIA: valid 01-14 Jul 2026 | Incl EBS (NOW OFFERED — was 'not accepting' in June)")
lines.append("-- NZ:       valid 01-14 Jul 2026 | Incl EBS")
lines.append("-- Where 20ft > 40ft: stored as-is from source sheet")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# FAR EAST (01-31 Jul 2026)
# ============================================================
lines.append("-- ======== FAR EAST (01-31 Jul 2026) ========")
lines.append("")

lines.append("-- China — Major direct ports")
lines.append(fe('China', 'SHANGHAI',              41,    81))
lines.append(fe('China', 'SHEKOU',                41,    81))
lines.append(fe('China', 'NINGBO',                41,    81))
lines.append("")

lines.append("-- China — via Singapore")
lines.append(fe('China', 'NANSHA',                65,   305, 'SINGAPORE'))
lines.append(fe('China', 'XINGANG',               65,   280, 'SINGAPORE'))
lines.append(fe('China', 'QINGDAO',              115,   380, 'SINGAPORE'))
lines.append(fe('China', 'QINZHOU',              115,   455, 'SINGAPORE'))
lines.append("")

lines.append("-- China — via Shanghai")
lines.append(fe('China', 'YANZHOU',               65,   130, 'SHANGHAI'))
lines.append(fe('China', 'NANTONG',              290,   730, 'SHANGHAI'))
lines.append(fe('China', 'WUHU',                  65,   130, 'SHANGHAI'))
lines.append(fe('China', 'WUHAN',                 65,   205, 'SHANGHAI'))
lines.append(fe('China', 'YICHANG',               65,   355, 'SHANGHAI'))
lines.append(fe('China', 'YUE YANG',             340,   255, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('China', 'NANJING',               65,   130, 'SHANGHAI'))
lines.append(fe('China', 'CHONGQING',            140,   630, 'SHANGHAI'))
lines.append(fe('China', 'LIANYUNGANG',          265,   180, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('China', 'HUANGSHI',             340,   255, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('China', 'CHANGSHA',             365,   330, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- China — via Ningbo")
lines.append(fe('China', 'FUZHOU (MAWEI)',       490,   455, 'NINGBO', '20ft>40ft on source sheet'))
lines.append(fe('China', 'FUZHOU (JIANGYIN)',    140,  1030, 'NINGBO'))
lines.append(fe('China', 'WENZHOU',               90,   180, 'NINGBO'))
lines.append("")

lines.append("-- China — via Shekou")
lines.append(fe('China', 'HUANGPU (GCT)',        190,   480, 'SHEKOU'))
lines.append(fe('China', 'SANSHAN',              265,   555, 'SHEKOU'))
lines.append(fe('China', 'SANSHUI',               65,   105, 'SHEKOU'))
lines.append(fe('China', 'WUZHOU',               240,   580, 'SHEKOU'))
lines.append(fe('China', 'JIUJIANG',              90,   180, 'SHEKOU'))
lines.append(fe('China', 'YUNFU',                240,   505, 'SHEKOU'))
lines.append(fe('China', 'FANGCHENG',            265,   580, 'SHEKOU'))
lines.append(fe('China', 'SHANTOU',              140,   230, 'SHEKOU'))
lines.append(fe('China', 'ZHANJIANG',            365,   130, 'SHEKOU', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Japan (via Shanghai; 20ft > 40ft on source sheet) — no Kobe rate this period")
lines.append(fe('Japan', 'TOKYO',                490,   255, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'YOKOHAMA',             440,   180, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'NAGOYA',               490,   455, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append(fe('Japan', 'OSAKA',                315,   180, 'SHANGHAI', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- Taiwan")
lines.append(fe('Taiwan', 'KAOHSIUNG',           315,   105, 'SINGAPORE', '20ft>40ft on source sheet'))
lines.append("")

lines.append("-- South Korea")
lines.append(fe('South Korea', 'PUSAN',           90,   405, 'SINGAPORE'))
lines.append(fe('South Korea', 'INCHEON',        515,   955, 'SINGAPORE'))
lines.append("")

lines.append("-- Thailand")
lines.append(fe('Thailand', 'LAEM CHA BANG',      65,   255, 'SINGAPORE'))
lines.append(fe('Thailand', 'BANGKOK (PAT)',      65,   180, 'SINGAPORE'))
lines.append("")

lines.append("-- Malaysia — direct and via Port Klang West")
lines.append(fe('Malaysia', 'PORT KLANG (WEST)',  41,    81))
lines.append(fe('Malaysia', 'PENANG',             65,   255, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'PASIR GUDANG',       65,   730, 'SINGAPORE'))
lines.append(fe('Malaysia', 'SANDAKAN',          890,  1680, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'TAWAU',             890,  1680, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'BINTULU',           890,  1680, 'SINGAPORE'))
lines.append(fe('Malaysia', 'KUCHING',           840,  1680, 'SINGAPORE'))
lines.append(fe('Malaysia', 'LABUAN',            890,  1680, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'SIBU',              540,  1480, 'PORT KLANG WEST'))
lines.append(fe('Malaysia', 'KOTA KINABALU',     890,  1680, 'SINGAPORE'))
lines.append("")

lines.append("-- Brunei")
lines.append(fe('Brunei', 'MUARA',               890,  1680, 'SINGAPORE'))
lines.append("")

lines.append("-- Singapore")
lines.append(fe('Singapore', 'SINGAPORE',         41,    81))
lines.append("")

lines.append("-- Vietnam")
lines.append(fe('Vietnam', 'HAIPHONG',            65,   780, 'SINGAPORE'))
lines.append(fe('Vietnam', 'HO CHI MINH (CAT LAI)', 65, 255, 'SINGAPORE'))
lines.append(fe('Vietnam', 'QUI NHON',           115,   455, 'SINGAPORE'))
lines.append("")

lines.append("-- Indonesia")
lines.append(fe('Indonesia', 'JAKARTA',          390,   780, 'SINGAPORE'))
lines.append(fe('Indonesia', 'SURABAYA',          65,   805, 'SINGAPORE'))
lines.append(fe('Indonesia', 'BELAWAN',           65,   255, 'SINGAPORE'))
lines.append(fe('Indonesia', 'SEMARANG',         515,   980, 'SINGAPORE'))
lines.append("")

lines.append("-- Philippines — no General Santos rate this period")
lines.append(fe('Philippines', 'MANILA NORTH',   540,  1105, 'SINGAPORE'))
lines.append(fe('Philippines', 'SUBIC BAY',      665,  1455, 'SINGAPORE'))
lines.append(fe('Philippines', 'DAVAO',          540,  1130, 'SINGAPORE'))
lines.append("")

lines.append("-- Cambodia")
lines.append(fe('Cambodia', 'SIHANOUKVILLE',     515,  1180, 'SINGAPORE'))
lines.append("")

lines.append("-- Myanmar")
lines.append(fe('Myanmar', 'YANGON',             440,  1130, 'SINGAPORE'))
lines.append("")

# ============================================================
# RED SEA — SKIPPED (no rates offered this period)
# ============================================================
lines.append("-- ======== RED SEA — NOT ACCEPTING 1st half July (2nd leg space constraint) ========")
lines.append("-- No rate figures given on source sheet for Djibouti/Jeddah/Ain Sokhna/Aqaba/")
lines.append("-- Port Sudan/Aden/Hodeidah/Berbera — all skipped, no INSERT rows for Red Sea")
lines.append("")

# ============================================================
# AUSTRALIA (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA (01-14 Jul 2026) — now offered (was 'not accepting' in June) ========")
lines.append("")
lines.append(aus('Australia', 'SYDNEY / BRISBANE / MELBOURNE', 1075, 2100, 'SINGAPORE'))
lines.append(aus('Australia', 'FREMANTLE / ADELAIDE',          1075, 2100, 'SINGAPORE'))
lines.append("")

# ============================================================
# NEW ZEALAND (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== NEW ZEALAND (01-14 Jul 2026) ========")
lines.append("")
lines.append(nz('New Zealand', 'AUCKLAND / NAPIER / LYTTELTON', 850, 1600, 'SINGAPORE'))
lines.append(nz('New Zealand', 'WELLINGTON / TAURANGA',          850, 1600, 'SINGAPORE'))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
