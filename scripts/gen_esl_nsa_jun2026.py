import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ESL'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.emiratesline.com'

# Validity
VF_15   = '2026-06-01'; VT_15   = '2026-06-15'   # EA / RS / NA
VF_END  = '2026-06-01'; VT_END  = '2026-06-30'   # Intra AP / Gulf

# ================================================================
# Surcharge strings
# ================================================================
S_BASE    = 'EBS:incl;Seal:8/ctr'
S_IAP     = 'EBS:incl;Seal:8/ctr'
S_IAP_VN  = 'EBS:incl;Seal:8/ctr;CIC:50/20-100/40'   # Vietnam (non-Haiphong) collect
S_IAP_VNH = 'EBS:incl;Seal:8/ctr;CIC:100/20-200/40'  # Vietnam Haiphong collect
S_IAP_ID  = 'EBS:incl;Seal:8/ctr;CIC:30/unit'         # Indonesia collect
S_NA      = 'EBS:incl;Seal:8/ctr;AMS:30/BL;SEC:17/box'
S_GULF    = 'EBS:incl;Seal:8/ctr;EDO:550/teu'         # Empty Drop-Off collect

# ================================================================
# Clauses per trade
# ================================================================
CL_EA = (
    "Emirates Shipping Line | Nhava Sheva origin | East Africa rates"
    "|Validity: 01-15 Jun 2026"
    "|Rates inclusive of: EBS | Seal USD 8/container"
    "|Local charges both ends | CY/CY basis | Space and equipment subject to availability"
    "|14 Days free time at Mombasa and Dar Es Salaam"
)
CL_RS = (
    "Emirates Shipping Line | Nhava Sheva origin | Red Sea rates"
    "|Validity: 01-15 Jun 2026 | Via Mundra"
    "|Rates inclusive of: EBS | Seal USD 8/container"
    "|Local charges both ends | CY/CY basis | Not accepting HAZ for Jeddah/Aqaba/Sokhna/Djibouti"
    "|14 Days free time at destination"
)
CL_IAP = (
    "Emirates Shipping Line | Nhava Sheva origin | Intra Asia Pacific rates"
    "|Validity: 01-30 Jun 2026"
    "|Rates inclusive of: EBS | Seal USD 8/container"
    "|Local charges both ends | CY/CY basis | Space and equipment subject to availability"
    "|CIC surcharge (where applicable) on collect basis"
)
CL_NA = (
    "Emirates Shipping Line | Nhava Sheva origin | North America (Mexico) rates"
    "|Validity: 01-15 Jun 2026 | Via Qingdao"
    "|Rates inclusive of: EBS | Seal USD 8/container"
    "|Subject to: AMS USD 30/BL | Security Surcharge USD 17/box"
    "|Local charges both ends | CY/CY basis | 14 Days free time at destination"
)
CL_GULF = (
    "Emirates Shipping Line | Nhava Sheva origin | Gulf rates"
    "|Validity: 01-30 Jun 2026"
    "|Rates inclusive of: EBS | Seal USD 8/container"
    "|Empty Drop-Off Charge USD 550/TEU on collect basis"
    "|Local charges both ends | CY/CY basis | Not accepting HAZ for above ports"
    "|14 Days free time at destination"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surch, clauses, notes=''):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def ea(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_15, via, S_BASE, CL_EA, notes)

def rs(dc, dp, r20, r40, via='MUNDRA', notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_15, via, S_BASE, CL_RS, notes)

def iap(dc, dp, r20, r40, via='', surch=None, notes=''):
    s = surch if surch else S_IAP
    return row(dc, dp, r20, r40, VF_END, VT_END, via, s, CL_IAP, notes)

def na(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_15, VT_15, via, S_NA, CL_NA, notes)

def gulf(dc, dp, r20, r40, via='', notes=''):
    return row(dc, dp, r20, r40, VF_END, VT_END, via, S_GULF, CL_GULF, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- Emirates Shipping Line (ESL) — NHAVA SHEVA Rates June 2026")
lines.append("-- Trades: East Africa | Red Sea | Intra Asia Pacific | N America | Gulf")
lines.append("-- EA / RS / NA : valid 01-15 Jun 2026")
lines.append("-- Intra AP / Gulf : valid 01-30 Jun 2026")
lines.append("-- All rates inclusive of EBS | Seal USD 8/ctr")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# EAST AFRICA (01-15 Jun 2026 | Direct | EBS incl)
# ============================================================
lines.append("-- ======== EAST AFRICA (01-15 Jun 2026 | Direct | EBS incl) ========")
lines.append("")
lines.append(ea('Kenya',    'MOMBASA',        1700, 1900))
lines.append(ea('Tanzania', 'DAR ES SALAAM',  1800, 2100))
lines.append("")

# ============================================================
# RED SEA (01-15 Jun 2026 | T/S via Mundra | EBS incl)
# ============================================================
lines.append("-- ======== RED SEA (01-15 Jun 2026 | via Mundra | EBS incl) ========")
lines.append("")
lines.append(rs('Saudi Arabia', 'JEDDAH',     2600, 3600))
lines.append(rs('Egypt',        'AIN SOKHNA', 2600, 3600))
lines.append(rs('Jordan',       'AQABA',      2600, 3600))
lines.append(rs('Djibouti',     'DJIBOUTI',   2500, 3500))
lines.append("")

# ============================================================
# INTRA ASIA PACIFIC (01-30 Jun 2026 | EBS incl)
# ============================================================
lines.append("-- ======== INTRA ASIA PACIFIC (01-30 Jun 2026 | EBS incl) ========")
lines.append("")

lines.append("-- Malaysia")
lines.append(iap('Malaysia', 'PORT KLANG',    55,  110, '',            notes='China Manifest Charges incl'))
lines.append(iap('Malaysia', 'PASIR GUDANG', 200,  300, 'PORT KLANG'))
lines.append(iap('Malaysia', 'PENANG',       200,  300, 'PORT KLANG'))
lines.append("")

lines.append("-- Singapore")
lines.append(iap('Singapore', 'SINGAPORE',   150,  350))
lines.append("")

lines.append("-- Maldives")
lines.append(iap('Maldives', 'MALE',        1300, 2450, 'COLOMBO'))
lines.append("")

lines.append("-- Vietnam")
lines.append(iap('Vietnam', 'CAI MEP',                       75,  150, 'PORT KLANG',           S_IAP_VN,  'CIC USD 50/20 USD 100/40 collect'))
lines.append(iap('Vietnam', 'HO CHI MINH (SP-ITC TERMINAL)', 75,  150, 'PORT KLANG / CAI MEP', S_IAP_VN,  'CIC USD 50/20 USD 100/40 collect'))
lines.append(iap('Vietnam', 'HO CHI MINH (CAT LAI)',         75,  150, 'PORT KLANG / CAI MEP', S_IAP_VN,  'CIC USD 50/20 USD 100/40 collect'))
lines.append(iap('Vietnam', 'HAIPHONG',                      75,  150, 'HONG KONG',            S_IAP_VNH, 'CIC USD 100/20 USD 200/40 collect'))
lines.append("")

lines.append("-- China — direct")
lines.append(iap('China', 'QINGDAO',      55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'SHANGHAI',     55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'NINGBO',       55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'DA CHAN BAY',  55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'NANSHA',       55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'XIAMEN',       55,  110, '',         notes='China Manifest Charges incl'))
lines.append(iap('China', 'XINGANG',      55,  110, '',         notes='China Manifest Charges incl'))
lines.append("")

lines.append("-- China — transhipment")
lines.append(iap('China', 'HUANGPU',      75,  150, 'HONG KONG / DA CHAN BAY', notes='China Manifest Charges incl'))
lines.append(iap('China', 'YUNFU',        75,  150, 'HONG KONG',              notes='China Manifest Charges incl'))
lines.append(iap('China', 'NANJING',      75,  150, 'SHANGHAI',               notes='China Manifest Charges incl'))
lines.append("")

lines.append("-- Hong Kong")
lines.append(iap('Hong Kong', 'HONG KONG', 55, 110, '',         notes='China Manifest Charges incl'))
lines.append("")

lines.append("-- South Korea")
lines.append(iap('South Korea', 'PUSAN',      55,  110))
lines.append(iap('South Korea', 'KWANGYANG',  55,  110))
lines.append(iap('South Korea', 'INCHEON',   150,  250, 'NINGBO'))
lines.append("")

lines.append("-- Indonesia")
lines.append(iap('Indonesia', 'JAKARTA',  200,  400, 'PORT KLANG', S_IAP_ID, 'CIC USD 30/unit collect'))
lines.append(iap('Indonesia', 'SURABAYA', 250,  450, 'PORT KLANG', S_IAP_ID, 'CIC USD 30/unit collect'))
lines.append(iap('Indonesia', 'BELAWAN',  150,  300, 'PORT KLANG', S_IAP_ID, 'CIC USD 30/unit collect'))
lines.append("")

lines.append("-- Thailand")
lines.append(iap('Thailand', 'BANGKOK (PAT)', 200, 350, 'PORT KLANG / LAEM CHABANG'))
lines.append(iap('Thailand', 'LAEM CHABANG',   75, 150, 'PORT KLANG'))
lines.append(iap('Thailand', 'LAT KRABANG',   125, 250, 'PORT KLANG / LAEM CHABANG'))
lines.append("")

# ============================================================
# NORTH AMERICA (01-15 Jun 2026 | Mexico only)
# ============================================================
lines.append("-- ======== NORTH AMERICA / MEXICO (01-15 Jun 2026 | via Qingdao) ========")
lines.append("")
lines.append(na('Mexico', 'MANZANILLO', 4500, 4600, 'QINGDAO'))
lines.append("")

# ============================================================
# GULF (01-30 Jun 2026 | EDO $550/TEU collect | EBS incl)
# ============================================================
lines.append("-- ======== GULF (01-30 Jun 2026 | EDO $550/TEU collect | EBS incl) ========")
lines.append("")
lines.append(gulf('United Arab Emirates', 'KHOR FAKKAN', 2300, 3000))
lines.append(gulf('United Arab Emirates', 'JEBEL ALI',   3500, 4200, 'KHOR FAKKAN', 'Road via Khor Fakkan'))
lines.append(gulf('United Arab Emirates', 'SHARJAH',     3600, 4300, 'KHOR FAKKAN', 'Road via Khor Fakkan'))
lines.append(gulf('United Arab Emirates', 'UMM QASAR',   4500, 6000, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Oman',                 'SOHAR',       2600, 3200, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Bahrain',              'BAHRAIN',     5500, 7000, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Kuwait',               'SHUWAIKH',    4500, 6000, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Qatar',                'HAMAD',       4500, 6000, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Saudi Arabia',         'DAMMAM',      4200, 5500, 'KHOR FAKKAN', 'Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append(gulf('Saudi Arabia',         'RIYADH',      4800, 6200, 'KHOR FAKKAN', '20ft: SAR 700 collect if cargo+tare >25MT; 40HC: SAR 1600 collect if cargo+tare >30MT; Road/Feeder via Khor Fakkan/Jebel Ali'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
