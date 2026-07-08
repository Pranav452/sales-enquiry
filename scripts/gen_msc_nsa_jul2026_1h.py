import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'MSC'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.msc.com'

# ================================================================
# Validity dates — MSC sheet UPDATED 03.07.2026 (July 1h)
# ================================================================
VF_01 = '2026-07-01'   # RS, WA, CA, CAR, CAN, MEX, NAF, EA
VT_14 = '2026-07-14'   # WA, SA(most), IO(most), AUS/Pacific
VT_15 = '2026-07-15'   # RS, CA, CAR, CAN, MEX, NAF, EA, IO(Mozambique)
VF_26 = '2026-06-26'   # SAEC, SAWC
VT_17 = '2026-07-17'   # USEC
VF_06 = '2026-07-06'   # Middle East core
VT_20 = '2026-07-20'   # Middle East core
VF_ISC = '2026-07-01'  # ISC (Colombo/Chattogram/Male)
VT_ISC = '2026-07-31'

# ================================================================
# Surcharge strings
# ================================================================
S_RS_STD  = 'EFS:88/teu;PRS:40/teu'          # KAP/Jeddah/AlSokhna/Aqaba/Djibouti/Aden/Mukalla
S_RS_SUD  = 'EFS:76/teu;PRS:30/teu'          # Port Sudan (EUR)
S_RS_MOG  = 'EFS:155/teu;EOS:incl'           # Mogadishu
S_RS_BER  = 'EFS:83/teu'                      # Berbera
S_WA      = 'EFS:230/teu'
S_SAEC    = 'EFS:242/teu;ETS:70/teu;FUE:15/teu'
S_SAWC    = 'EFS:238/teu;ETS:103/teu;FUE:22/teu'
S_CA_H    = 'EFS:238/teu;PCS:40/teu'         # Corinto/Acajutla/PCaldera/PQuetzal/Rodman
S_CA_L    = 'EFS:211/teu'                     # PCortes/Moin/PBarrios/Cristobal
S_CAR     = 'EFS:211/teu'
S_CAN     = 'EFS:211/teu'
S_MEX_L   = 'EFS:211/teu'                     # Veracruz, Altamira
S_MEX_H   = 'EFS:238/teu;PCS:40/teu'         # Manzanillo, Lazaro Cardenas
S_NAF     = 'EFS:167/teu;ETS:76/teu;FUE:16/teu'   # GRI dropped in 30.06 update
S_EA      = 'EFS:155/teu;EOS:incl'
S_SA      = 'EFS:125/teu'
S_IO      = 'EFS:125/teu;EOS:incl'
S_IO_MOZ  = 'EFS:155/teu;EOS:incl'           # Beira/Nacala/Maputo
S_AUS     = 'EFS:100/teu'
S_USEC    = 'EFS:211/teu;CUC:110/box'
S_USEC_NOCUC = 'EFS:211/teu'                  # Port Everglades
S_ME      = 'EFS:41/teu'

# ================================================================
# Clauses
# ================================================================
CL_RS = (
    "MSC | Nhava Sheva origin | Red Sea / Horn of Africa rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 88/TEU + PRS USD 40/TEU collect (most ports); Port Sudan EFS EUR 76/TEU + PRS EUR 30/TEU;"
    " Mogadishu EFS USD 155/TEU (no PRS); Berbera EFS USD 83/TEU (no PRS)"
    "|Port-specific ETS/FUEL/OCC/WAR charges noted per port"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_WA = (
    "MSC | Nhava Sheva origin | West Africa rates"
    "|Validity: 01-14 Jul 2026"
    "|EFS USD 230/TEU collect | Port-specific surcharges noted per port"
    "|Flexi Bag surcharge FTS USD 14/container (USD 50 additional for Annex B commodities)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SAEC = (
    "MSC | Nhava Sheva origin | South America East Coast / SAEC rates"
    "|Validity: 26 Jun - 15 Jul 2026"
    "|EFS USD 242/TEU | ETS USD 70/TEU | FUE USD 15/TEU — all collect"
    "|RPT/HPT and other port-specific charges noted per port"
    "|Free time options: standard / 14 days (DMG $25/cntr prepaid) / 21 days (DMG $50/cntr prepaid)"
    "|La Guaira / Puerto Cabello: EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SAWC = (
    "MSC | Nhava Sheva origin | South America West Coast / SAWC rates"
    "|Validity: 26 Jun - 15 Jul 2026"
    "|EFS USD 238/TEU | ETS USD 103/TEU | FUE USD 22/TEU — all collect"
    "|Free time: standard / 14 days (DMG $25/cntr prepaid) / 21 days (DMG $50/cntr prepaid)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CA = (
    "MSC | Nhava Sheva origin | Central America rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 238/TEU + PCS USD 40/TEU (Corinto/Acajutla/PCaldera/PQuetzal/Rodman) or USD 211/TEU (others)"
    "|ENS+AMS collect | Port-specific surcharges noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAR = (
    "MSC | Nhava Sheva origin | Caribbean rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 211/TEU collect | ENS+AMS collect | DTHC prepaid where noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAN = (
    "MSC | Nhava Sheva origin | Canada rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 211/TEU (Vancouver USD 418/TEU + FUE USD 18/TEU) | AMS + SPD collect"
    "|Max weight (inland): 47900LBS/20 60000LBS/40HC (OVW limit: 55000LBS/20 65000LBS/40HC)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_MEX = (
    "MSC | Nhava Sheva origin | Mexico rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 211/TEU (Veracruz/Altamira) or USD 238/TEU + PCS USD 40/TEU (Manzanillo/LC) | AMS collect"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_NAF = (
    "MSC | Nhava Sheva origin | North Africa rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 167/TEU | ETS USD 76/TEU | FUE USD 16/TEU — all collect (GRI surcharge dropped per 30.06 update)"
    "|Port-specific surcharges (PSS/CGS) noted per port"
    "|Free time options: standard / 21 days (DMG $50/cntr prepaid)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_EA = (
    "MSC | Nhava Sheva origin | East Africa rates"
    "|Validity: 01-15 Jul 2026"
    "|EFS USD 155/TEU collect | EOS inclusive | Local charges both ends"
)
CL_SA = (
    "MSC | Nhava Sheva origin | South Africa rates"
    "|Validity: 01-14 Jul 2026"
    "|EFS USD 125/TEU collect | CDD USD 30/BL collect | Local charges both ends"
)
CL_IO = (
    "MSC | Nhava Sheva origin | Indian Ocean Island / Mozambique rates"
    "|Validity: 01-14 Jul 2026 (Beira/Nacala/Maputo: 01-15 Jul 2026)"
    "|EFS USD 125/TEU collect (Mozambique ports: USD 155/TEU) | EOS inclusive | Local charges both ends"
    "|DTHC prepaid for inland cargo (Madagascar/Mozambique)"
)
CL_AUS = (
    "MSC | Nhava Sheva origin | Australia / New Zealand / Pacific rates"
    "|Validity: 01-14 Jul 2026"
    "|EFS USD 100/TEU collect | HAZ Packing Group I not accepted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_USEC = (
    "MSC | Nhava Sheva origin | USA East/Gulf Coast (USEC) rates"
    "|Validity: 01-17 Jul 2026"
    "|EFS USD 211/TEU | CUC USD 110/box (Port Everglades: no CUC) | AMS + OTHC + local charges + docs collect"
    "|Non-HAZ cargo only (HAZ case by case)"
)
CL_ME = (
    "MSC | Nhava Sheva origin | Middle East rates"
    "|Validity: 06-20 Jul 2026"
    "|EFS USD 41/TEU collect | Port-specific surcharges (OCC/PAD/EBS/ECL) noted per port"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_ISC = (
    "MSC | Nhava Sheva origin | Indian Sub-Continent (ISC) rates"
    "|Validity: 01-31 Jul 2026"
    "|EFS USD 41/TEU collect | Local charges both ends"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surch, clauses, notes='', currency='USD'):
    v = f"'{esc(via)}'" if via else 'NULL'
    n = f"'{esc(notes)}'" if notes else 'NULL'
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'{currency}',{r20},{r40},'{vf}','{vt}',{v},'{esc(surch)}',{n},'{esc(clauses)}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def rs(dc, dp, r20, r40, surch, notes='', currency='USD'):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', surch, CL_RS, notes, currency)

def wa(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_14, '', S_WA, CL_WA, notes)

def saec(dc, dp, r20, r40, notes='', currency='USD'):
    return row(dc, dp, r20, r40, VF_26, VT_15, '', S_SAEC, CL_SAEC, notes, currency)

def sawc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_26, VT_15, '', S_SAWC, CL_SAWC, notes)

def ca(dc, dp, r20, r40, high_efs=True, notes=''):
    s = S_CA_H if high_efs else S_CA_L
    return row(dc, dp, r20, r40, VF_01, VT_15, '', s, CL_CA, notes)

def car(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', S_CAR, CL_CAR, notes)

def can(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_CAN
    return row(dc, dp, r20, r40, VF_01, VT_15, '', s, CL_CAN, notes)

def mex(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_MEX_L
    return row(dc, dp, r20, r40, VF_01, VT_15, '', s, CL_MEX, notes)

def naf(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', S_NAF, CL_NAF, notes)

def ea(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', S_EA, CL_EA, notes)

def sa(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_14, '', S_SA, CL_SA, notes)

def io(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_14, '', S_IO, CL_IO, notes)

def io_moz(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_15, '', S_IO_MOZ, CL_IO, notes)

def aus(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_01, VT_14, '', S_AUS, CL_AUS, notes)

def usec(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_USEC
    return row(dc, dp, r20, r40, VF_01, VT_17, '', s, CL_USEC, notes)

def me(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_06, VT_20, '', S_ME, CL_ME, notes)

def isc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_ISC, VT_ISC, '', S_ME, CL_ISC, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- MSC — NHAVA SHEVA (Mumbai pickup) Rates July 2026 FIRST HALF")
lines.append("-- Source sheet UPDATED ON 03.07.2026 (supersedes 30.06, 26.06, and 23.06 versions)")
lines.append("-- Includes: Red Sea (all ports) | West Africa (all ports) | East Africa")
lines.append("-- South Africa | Indian Ocean | Australia/NZ/Pacific | ISC (Colombo/Chattogram/Male)")
lines.append("-- Also: SAEC | SAWC | CA | CAR | CAN (no Vancouver) | MEX | NAF | USEC | Middle East")
lines.append("-- Changes vs 30.06: USWC removed (no rates on sheet); Vancouver removed (no rate);")
lines.append("--   Cape Town/Coega rates changed (no longer 20>40 anomaly); Dammam 4150/5150->5000/6000")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# RED SEA / HORN OF AFRICA (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== RED SEA / HORN OF AFRICA (01-15 Jul 2026) ========")
lines.append("-- EFS USD 88/teu + PRS USD 40/teu (most ports) | Mogadishu EFS 155 | Berbera EFS 83 (both no PRS)")
lines.append("")
lines.append(rs('Saudi Arabia', 'KING ABDULLAH PORT (KAP)', 3513, 4513, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC collect'))
lines.append(rs('Saudi Arabia', 'JEDDAH',                   3713, 4713, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC collect'))
lines.append(rs('Sudan',        'PORT SUDAN',               4013, 5013, S_RS_SUD, notes='EUR currency; ETS EUR 63/teu; FUEL EUR 14/teu; DTHC prepaid; WAR EUR 300/teu prepaid', currency='EUR'))
lines.append(rs('Egypt',        'AL SOKHNA',                3713, 4713, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu'))
lines.append(rs('Jordan',       'AQABA',                    3813, 4813, S_RS_STD, notes='PAD on collect; ETS USD 69/teu; FUEL USD 16/teu; JIS inclusive'))
lines.append(rs('Djibouti',     'DJIBOUTI',                 2513, 3513, S_RS_STD, notes='OCC USD 175/20 USD 245/40 prepaid; CER USD 30/teu prepaid'))
lines.append(rs('Somalia',      'MOGADISHU',                1458, 1803, S_RS_MOG, notes='PSS USD 300/cntr; EOS inclusive'))
lines.append(rs('Somalia',      'BERBERA',                  3100, 3900, S_RS_BER, notes='OCC and CAC inclusive; standard free time OR 21 days (DMG USD 100/box prepaid)'))
lines.append(rs('Yemen',        'ADEN',                     4013, 4513, S_RS_STD, notes='OCC USD 299/20 USD 477/40 (CGS+WRS incl); GST on WRS/CGS/OCC'))
lines.append(rs('Yemen',        'MUKALLA',                  4613, 4913, S_RS_STD, notes='OCC USD 335/20 USD 525/40 collect; GST on WRS/CGS/OCC'))
lines.append("")

# ============================================================
# WEST AFRICA (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== WEST AFRICA (01-14 Jul 2026) ========")
lines.append("-- EFS USD 230/TEU collect | Port-specific surcharges noted per port")
lines.append("")
lines.append(wa('Ivory Coast',       'ABIDJAN',         3150, 5000))
lines.append(wa('Gambia',            'BANJUL',          3700, 5900))
lines.append(wa('Guinea',            'CONAKRY',         4800, 7800, notes='CUS USD 75/20 USD 105/40 prepaid; CGS USD 1000/cntr'))
lines.append(wa('Benin',             'COTONOU',         3000, 4700))
lines.append(wa('Senegal',           'DAKAR',           3400, 5600, notes='PSS USD 230/cntr'))
lines.append(wa('Cameroon',          'DOUALA',          3600, 5600, notes='SCC USD 25/teu inclusive'))
lines.append(wa('Sierra Leone',      'FREETOWN',        3800, 6000, notes='ECS USD 1000/cntr'))
lines.append(wa('Gabon',             'LIBREVILLE',      4100, 6100, notes='Carbon Emission Reduction Fee USD 15/teu on collect'))
lines.append(wa('Angola',            'LOBITO',          4550, 6700, notes='AOA USD 75/box collect'))
lines.append(wa('Togo',              'LOME',            3000, 4700))
lines.append(wa('Angola',            'LUANDA',          3700, 5900, notes='AOA USD 75/box collect'))
lines.append(wa('Cape Verde',        'MINDELO/PRAIA',   4950, 7200))
lines.append(wa('Liberia',           'MONROVIA',        3800, 6100))
lines.append(wa('Angola',            'NAMIBE',          4750, 6900))
lines.append(wa('Mauritania',        'NOUADHIBOU',      4600, 6700))
lines.append(wa('Mauritania',        'NOUAKCHOTT',      4600, 6100))
lines.append(wa('Nigeria',           'ONNE',            3700, 6100))
lines.append(wa('Ivory Coast',       'SAN-PEDRO',       4650, 6700))
lines.append(wa('Ghana',             'TAKORADI',        4650, 6700))
lines.append(wa('Ghana',             'TEMA',            3000, 4700, notes='PAD on collect for port-to-port shipments'))
lines.append(wa('Nigeria',           'TIN CAN / APAPA', 3300, 4800, notes='Combined Tin Can Island + Apapa on source sheet'))
lines.append(wa('Republic of Congo', 'POINTE NOIRE',    3900, 5900, notes='CUI USD 160/20 USD 210/40 prepaid'))
lines.append(wa('DR Congo',          'MATADI',          4450, 6300, notes='CGS USD 210/box'))
lines.append(wa('Guinea-Bissau',     'BISSAU',          4300, 6400))
lines.append(wa('Namibia',           'WALVIS BAY',      4213, 6313))
lines.append(wa('Cameroon',          'KRIBI',           4100, 6000, notes='SCC USD 25/teu inclusive'))
lines.append("")

# ============================================================
# SAEC — EAST COAST SOUTH AMERICA (26 Jun - 15 Jul 2026)
# ============================================================
lines.append("-- ======== SAEC — EAST COAST SOUTH AMERICA (26 Jun - 15 Jul 2026) ========")
lines.append("-- EFS USD 242/teu | ETS USD 70/teu | FUE USD 15/teu")
lines.append("-- La Guaira / Puerto Cabello: EUR currency, DTHC EUR 600/cntr prepaid")
lines.append("")
lines.append(saec('Argentina', 'BUENOS AIRES',       7900, 8500, notes='RPT USD 175/cntr additional'))
lines.append(saec('Paraguay',  'ASUNCION',            8900, 9500, notes='CAACUPEMI service; HPT USD 30/cntr'))
lines.append(saec('Paraguay',  'PILAR',               8900, 9500, notes='CAACUPEMI service; HPT USD 30/cntr'))
lines.append(saec('Brazil',    'ITAJAI',              7900, 8500))
lines.append(saec('Brazil',    'ITAPOA',              7900, 8500))
lines.append(saec('Venezuela', 'LA GUAIRA',           9400, 9900, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD', currency='EUR'))
lines.append(saec('Brazil',    'MANAUS',              9400, 9900, notes='ACD applies'))
lines.append(saec('Uruguay',   'MONTEVIDEO',          7900, 8500))
lines.append(saec('Brazil',    'NAVEGANTES',          8000, 8650))
lines.append(saec('Brazil',    'PARANAGUA',           7900, 8500))
lines.append(saec('Brazil',    'PECEM',               8900, 9500))
lines.append(saec('Venezuela', 'PUERTO CABELLO',      9400, 9900, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD', currency='EUR'))
lines.append(saec('Brazil',    'RIO DE JANEIRO',      7900, 8500))
lines.append(saec('Brazil',    'RIO GRANDE',          7900, 8500))
lines.append(saec('Argentina', 'ROSARIO',             8900, 9500))
lines.append(saec('Brazil',    'SALVADOR (DE BAHIA)', 7900, 8500))
lines.append(saec('Brazil',    'SANTOS',              7900, 8500))
lines.append(saec('Brazil',    'SUAPE',               7900, 8500, notes='ACD applies'))
lines.append(saec('Brazil',    'VILA DO CONDE',       9300, 9900, notes='ACD applies'))
lines.append(saec('Brazil',    'VITORIA',             8900, 9500))
lines.append(saec('Argentina', 'ZARATE',              8900, 9500))
lines.append("")

# ============================================================
# SAWC — WEST COAST SOUTH AMERICA (26 Jun - 15 Jul 2026)
# ============================================================
lines.append("-- ======== SAWC — WEST COAST SOUTH AMERICA (26 Jun - 15 Jul 2026) ========")
lines.append("-- EFS USD 238/teu | ETS USD 103/teu | FUE USD 22/teu")
lines.append("")
lines.append(sawc('Chile',    'ARICA',          9700, 10300, notes='ACD applies'))
lines.append(sawc('Colombia', 'BUENAVENTURA',   8700,  8800, notes='ISPS USD 12/cntr; ACD'))
lines.append(sawc('Peru',     'CALLAO',         8700,  8800, notes='ACD applies'))
lines.append(sawc('Colombia', 'CARTAGENA',      8700,  8800, notes='ISPS USD 12/cntr; ACD'))
lines.append(sawc('Chile',    'CORONEL',        8700,  8800, notes='ACD applies'))
lines.append(sawc('Ecuador',  'GUAYAQUIL',      8700,  8800, notes='DTHC prepaid; ACD'))
lines.append(sawc('Chile',    'IQUIQUE',        9700, 10300, notes='ACD applies'))
lines.append(sawc('Peru',     'PAITA',          9900, 10500, notes='ACD applies'))
lines.append(sawc('Chile',    'SAN ANTONIO',    8700,  8800, notes='ACD applies'))
lines.append("")

# ============================================================
# CENTRAL AMERICA (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== CENTRAL AMERICA (01-15 Jul 2026) ========")
lines.append("")
lines.append(ca('Nicaragua',  'CORINTO',        7211, 7322, True,  notes='ENS+AMS collect'))
lines.append(ca('El Salvador','ACAJUTLA',        7000, 7000, True,  notes='ENS+AMS collect; WHA USD 50/teu; PAD USD 130/box'))
lines.append(ca('Costa Rica', 'PUERTO CALDERA', 7000, 7000, True,  notes='ENS+AMS collect; ACD'))
lines.append(ca('Guatemala',  'PUERTO QUETZAL', 7000, 7000, True,  notes='ENS+AMS collect; PAD USD 130/box; SPD USD 12/box'))
lines.append(ca('Panama',     'RODMAN',          7000, 7000, True,  notes='ENS+AMS collect; SPD USD 15/box'))
lines.append(ca('Honduras',   'PUERTO CORTES',  7000, 7000, False, notes='PAD USD 185/box; SPD USD 25/box; ENS+AMS collect'))
lines.append(ca('Costa Rica', 'MOIN',           7000, 7000, False, notes='ENS+AMS collect; CUS USD 60/BL'))
lines.append(ca('Guatemala',  'PUERTO BARRIOS', 7000, 7000, False, notes='PAD USD 130/box; SPD USD 12/box; ENS+AMS collect'))
lines.append(ca('Panama',     'CRISTOBAL',      7000, 7000, False, notes='ENS+AMS collect; SPD USD 8/box'))
lines.append("")

# ============================================================
# CARIBBEAN (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== CARIBBEAN (01-15 Jul 2026) ========")
lines.append("")
lines.append(car('Haiti',               'PORT AU PRINCE', 7000, 7000, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Dominican Republic',  'CAUCEDO',         7000, 7000, notes='AMS+ENS collect; SPD USD 7/box; THC collect'))
lines.append(car('Trinidad and Tobago', 'PORT OF SPAIN',  7000, 7000, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Jamaica',             'KINGSTON',       7000, 7000, notes='AMS+ENS collect; CUI USD 10/box; DTHC collect'))
lines.append(car('Dominican Republic',  'RIO HAINA',      7011, 7011, notes='AMS+ENS collect; SPD USD 7/box; DTHC collect'))
lines.append(car('Bahamas',             'NASSAU',         7011, 7011, notes='AMS+ENS collect; SPD USD 100/box; DTHC collect; WHA USD 5/ton; TUG USD 35/box'))
lines.append(car('Bahamas',             'FREEPORT',       7011, 7011, notes='AMS+ENS collect; SPD USD 25/box; DTHC collect'))
lines.append(car('Barbados',            'BRIDGETOWN',     8011, 7822, notes='AMS+ENS collect; PAD USD 100/teu; LOF USD 10/box; 20ft>40ft on source sheet'))
lines.append(car('Suriname',            'PARAMARIBO',     8011, 7822, notes='ENS collect; WHA USD 92/teu; AMS collect; THC collect; DRT; 20ft>40ft on source sheet'))
lines.append(car('Guyana',              'GEORGETOWN',     7711, 7622, notes='ENS collect; SPD USD 6/20 USD 8/40; THC collect; PAD USD 90/20 USD 150/40; AMS collect; 20ft>40ft on source sheet'))
lines.append("")

# ============================================================
# CANADA (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== CANADA (01-15 Jul 2026) ========")
lines.append("")
lines.append(can('Canada', 'MONTREAL',  6000, 5900, notes='AMS+SPD collect; 20ft>40ft on source sheet'))
lines.append(can('Canada', 'HALIFAX',   6000, 5900, notes='AMS+SPD collect; 20ft>40ft on source sheet'))
lines.append(can('Canada', 'TORONTO',   6200, 6000, notes='AMS+SPD collect; 20ft>40ft on source sheet; max weight 47900LBS/20 60000LBS/40HC (without OVW); 55000LBS/20 65000LBS/40HC (with OVW)'))
lines.append("-- VANCOUVER: no rate figures on 03.07 source sheet (only AMS+SPD+FUE USD18/teu shown) — excluded")
lines.append("")

# ============================================================
# MEXICO (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== MEXICO (01-15 Jul 2026) ========")
lines.append("")
lines.append(mex('Mexico', 'VERACRUZ',        7000, 7000, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'ALTAMIRA',         7000, 7000, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'MANZANILLO',       7000, 7000, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append(mex('Mexico', 'LAZARO CARDENAS', 7000, 7000, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append("")

# ============================================================
# NORTH AFRICA (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== NORTH AFRICA (01-15 Jul 2026) ========")
lines.append("-- EFS USD 167/teu | ETS USD 76/teu | FUE USD 16/teu (GRI dropped in this update)")
lines.append("")
lines.append(naf('Morocco', 'AGADIR',     4700, 4800, notes='DMG USD 50/cntr prepaid for 21 days free time'))
lines.append(naf('Algeria', 'ALGIERS',    4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'ANNABA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'BEJAIA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'BENGHAZI',   4250, 4350, notes='WRS inclusive; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Morocco', 'CASABLANCA', 4200, 4300, notes='PSS USD 150/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'KHOMS',      4250, 4350, notes='WRS inclusive; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'MISURATA',   4250, 4350, notes='WRS inclusive; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Morocco', 'NADOR',      4900, 5000, notes='DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'ORAN',       4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'SKIKDA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'TRIPOLI',    4200, 4300, notes='DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Tunisia', 'TUNIS',      4200, 4300, notes='PSS USD 150/cntr; DMG USD 50/cntr prepaid for 21 days'))
lines.append("")

# ============================================================
# EAST AFRICA (01-15 Jul 2026)
# ============================================================
lines.append("-- ======== EAST AFRICA (01-15 Jul 2026) ========")
lines.append("-- EFS USD 155/teu")
lines.append("")
lines.append(ea('Kenya',   'MOMBASA',       1713, 1963, notes='SPD USD 6/cntr; EOS inclusive'))
lines.append(ea('Tanzania','DAR ES SALAAM', 1758, 1963, notes='TCFB collect additional; EOS inclusive'))
lines.append(ea('Tanzania','TANGA',         2358, 2703, notes='TCFB collect additional; EOS inclusive'))
lines.append(ea('Tanzania','ZANZIBAR',      2658, 3503, notes='PSS USD 700/cntr prepaid; EOS inclusive'))
lines.append("")

# ============================================================
# SOUTH AFRICA (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== SOUTH AFRICA (01-14 Jul 2026) ========")
lines.append("-- EFS USD 125/teu | CDD USD 30/BL collect")
lines.append("")
lines.append(sa('South Africa', 'DURBAN',    2013, 2913, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'COEGA',     2413, 3413, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'CAPE TOWN', 2513, 3413, notes='CDD USD 30/BL collect'))
lines.append("")

# ============================================================
# INDIAN OCEAN / MOZAMBIQUE (01-14 Jul 2026; Mozambique ports 01-15 Jul)
# ============================================================
lines.append("-- ======== INDIAN OCEAN / MOZAMBIQUE ========")
lines.append("-- EFS USD 125/teu (Mozambique: USD 155/teu) | EOS inclusive | DTHC prepaid for inland cargo")
lines.append("")
lines.append(io('Madagascar', 'TAMATAVE',          1588, 1963, notes='PAD additional; EOS inclusive'))
lines.append(io('Mauritius',  'PORT LOUIS',         1488, 1863, notes='EOS inclusive'))
lines.append(io('Madagascar', 'MAJUNGA',            2488, 3063, notes='EOS inclusive'))
lines.append(io('Madagascar', 'DIEGO SUAREZ',       2488, 3063, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('France',     'POINTE DE GALETS (REUNION)', 2388, 3363, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('Comoros',    'MORONI',             2838, 4063, notes='CUI and SPD collect; EOS inclusive'))
lines.append(io('Mayotte',    'LONGONI',            2488, 3063, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io_moz('Mozambique', 'BEIRA',          2058, 2713, notes='EOS USD 500/teu; CGS USD 1000/teu'))
lines.append(io_moz('Mozambique', 'NACALA',         1958, 2403, notes='EOS USD 500/teu'))
lines.append(io_moz('Mozambique', 'MAPUTO',         1908, 2303, notes='SPD USD 10/cntr; EOS USD 500/teu'))
lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND / PACIFIC (01-14 Jul 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND / PACIFIC (01-14 Jul 2026) ========")
lines.append("-- EFS USD 100/teu | HAZ Packing Group I not accepted")
lines.append("")
lines.append(aus('Australia',      'ADELAIDE',       1050, 2100))
lines.append(aus('Australia',      'BELL BAY',       2200, 4000))
lines.append(aus('Australia',      'BRISBANE',       1300, 2450))
lines.append(aus('Australia',      'FREMANTLE',      1050, 2100))
lines.append(aus('Australia',      'MELBOURNE',      1050, 2100))
lines.append(aus('Australia',      'SYDNEY',         1050, 2100))
lines.append(aus('New Zealand',    'AUCKLAND',       3000, 4000))
lines.append(aus('French Polynesia','PAPEETE',       3500, 4500))
lines.append(aus('New Zealand',    'BLUFF',          1150, 2200))
lines.append(aus('New Zealand',    'LYTTELTON',      1150, 2200))
lines.append(aus('New Zealand',    'NAPIER',         1150, 2200))
lines.append(aus('New Zealand',    'NELSON',         2100, 3800))
lines.append(aus('New Zealand',    'PORT CHALMERS',  1350, 2500))
lines.append(aus('New Zealand',    'TAURANGA',       1350, 2500))
lines.append(aus('New Zealand',    'WELLINGTON',     1150, 2200))
lines.append(aus('New Caledonia',  'NOUMEA',         2200, 3950))
lines.append(aus('Fiji',           'LAUTOKA',        2200, 3950))
lines.append(aus('Fiji',           'SUVA',           2200, 3950))
lines.append("")

# ============================================================
# USA WEST COAST — NO RATES on 03.07 source sheet (excluded)
# ============================================================
lines.append("-- ======== USA WEST COAST — no rate figures on 03.07 source sheet ========")
lines.append("-- Long Beach/LA, Seattle, Oakland: only surcharge text shown (CUC/OTHC/locals/docs/AMS), no $ figures — excluded")
lines.append("")

# ============================================================
# USA EAST/GULF COAST (01-17 Jul 2026)
# ============================================================
lines.append("-- ======== USA EAST/GULF COAST (01-17 Jul 2026) ========")
lines.append("-- EFS USD 211/teu | CUC USD 110/box (Port Everglades: no CUC) | Non-HAZ only")
lines.append("")
lines.append(usec('United States', 'NEW YORK',       4800, 5100, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu'))
lines.append(usec('United States', 'NORFOLK',        4800, 5100, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'CHARLESTON',     4800, 5100, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu; LCF USD 13.39/cntr'))
lines.append(usec('United States', 'SAVANNAH',       4800, 5100, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'HOUSTON',        5250, 5600, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BALTIMORE',      5250, 5600, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'NEW ORLEANS',    5400, 5850, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'PORT EVERGLADES',5250, 5600, S_USEC_NOCUC, notes='OTHC+locals+docs+WHA+AMS collect; no CUC on sheet'))
lines.append(usec('United States', 'PHILADELPHIA',   5500, 6000, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BOSTON',         5500, 6000, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'MOBILE',         5400, 5850, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'JACKSONVILLE',   5400, 5850, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append("")

# ============================================================
# MIDDLE EAST (06-20 Jul 2026)
# ============================================================
lines.append("-- ======== MIDDLE EAST (06-20 Jul 2026) ========")
lines.append("-- EFS USD 41/teu (validity shifted a week later vs prior sheet)")
lines.append("")
lines.append(me('Oman',                 'SOHAR',            2200, 2900, notes='PAD and SPD additional on collect'))
lines.append(me('Oman',                 'SALALAH',          3000, 3800))
lines.append(me('United Arab Emirates', 'KHOR AL FAKKAN',   3500, 4500))
lines.append(me('United Arab Emirates', 'JEBEL ALI',        4000, 5200))
lines.append(me('United Arab Emirates', 'ABU DHABI',        4000, 5200))
lines.append(me('United Arab Emirates', 'SHARJAH',          4000, 5200))
lines.append(me('United Arab Emirates', 'RAS AL KHAIMAH',   4000, 5200))
lines.append(me('United Arab Emirates', 'AJMAN',            4000, 5200))
lines.append(me('United Arab Emirates', 'UMM AL QUWAIN',    4000, 5200, notes='EBS additional on collect'))
lines.append(me('Saudi Arabia',         'DAMMAM',           5000, 6000, notes='OCC additional on collect'))
lines.append(me('Bahrain',              'BAHRAIN',          5000, 6000, notes='EBS and ECL additional on collect'))
lines.append(me('Qatar',                'HAMAD',            5000, 6000, notes='OCC additional on collect'))
lines.append(me('Kuwait',               'SHUWAIKH',         5000, 6000))
lines.append(me('Kuwait',               'SHUAIBA',          5000, 6000))
lines.append(me('Iraq',                 'UMM QASR',         5250, 6250, notes='DTHC inclusive'))
lines.append("")

# ============================================================
# ISC — INDIAN SUB-CONTINENT (01-31 Jul 2026)
# ============================================================
lines.append("-- ======== ISC — INDIAN SUB-CONTINENT (01-31 Jul 2026) ========")
lines.append("-- Now has explicit rates (previously marked * no rate)")
lines.append("")
lines.append(isc('Sri Lanka',  'COLOMBO',    750,  650, notes='20ft>40ft on source sheet; DTHC and PAD inclusive'))
lines.append(isc('Bangladesh', 'CHATTOGRAM', 800, 1000, notes='DTHC inclusive'))
lines.append(isc('Maldives',   'MALE',      1650, 1900, notes='PAD and DOF inclusive'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
