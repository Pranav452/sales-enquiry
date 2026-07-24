import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'MSC'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://www.msc.com'

# ================================================================
# Validity dates — MSC sheet UPDATED 13.07.2026 (July 2h)
# ================================================================
VF_16 = '2026-07-16'; VT_31 = '2026-07-31'   # RS(most), CA, CAR, CAN(std+Vancouver), MEX, NAF, USWC, WA, SA
VF_15 = '2026-07-15'                          # IO(non-Moz) — corrected 15.07 update, was 13th
VF_21 = '2026-07-21'                          # Middle East continuation (unchanged rates, new window)
VF_08 = '2026-07-08'; VT_15 = '2026-07-15'    # Beira amendment (falls within 1h window)
VF_10 = '2026-07-10'                          # AUS/NZ/Pacific — short window
VF_18 = '2026-07-18'                          # USEC
VF_SAEC = '2026-07-16'                        # SAEC/SAWC continuation (source restates 01-31 Jul at unchanged
                                               # rates; 1h script already covers 26 Jun-15 Jul, so this fills
                                               # only the 16-31 Jul gap at the same unchanged rate)

# ================================================================
# Surcharge strings
# ================================================================
S_RS_STD  = 'EFS:88/teu;PRS:40/teu'
S_RS_SUD  = 'EFS:76/teu;PRS:30/teu'
S_WA      = 'EFS:230/teu;GRI:500/ctr'                 # GRI eff 15 Jul (collect)
S_SAEC    = 'EFS:242/teu;ETS:70/teu;FUE:15/teu'
S_SAWC    = 'EFS:238/teu;ETS:103/teu;FUE:22/teu'
S_CA_H    = 'EFS:238/teu;PCS:40/teu'
S_CA_L    = 'EFS:211/teu'
S_CAR     = 'EFS:211/teu'
S_CAN_STD = 'EFS:211/teu;LWS:150/teu'                 # LWS eff 21 Jul (collect)
S_VAN     = 'EFS:418/teu;FUE:18/teu'
S_MEX_L   = 'EFS:211/teu'
S_MEX_H   = 'EFS:238/teu;PCS:40/teu'
S_NAF     = 'EFS:167/teu;ETS:76/teu;FUE:16/teu;GRI:500/ctr'   # GRI re-added, eff 20 Jul (collect)
S_SA      = 'EFS:125/teu'
S_IO      = 'EFS:125/teu;EOS:incl'
S_IO_MOZ  = 'EFS:155/teu;EOS:incl'
S_AUS     = 'EFS:100/teu'
S_USWC    = 'EFS:418/teu;CUC:110/box'
S_USEC    = 'EFS:211/teu;CUC:110/box'
S_USEC_NOCUC = 'EFS:211/teu'
S_ME      = 'EFS:41/teu'

# ================================================================
# Clauses
# ================================================================
CL_RS = (
    "MSC | Nhava Sheva origin | Red Sea / Horn of Africa rates"
    "|Validity: 16-31 Jul 2026 (Mogadishu unchanged at 01-15 Jul; Berbera extended to 01-31 Jul, same rate — see 1h script)"
    "|EFS USD 88/TEU + PRS USD 40/TEU collect (most ports); Port Sudan EFS EUR 76/TEU + PRS EUR 30/TEU"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_WA = (
    "MSC | Nhava Sheva origin | West Africa rates"
    "|Validity: 16-31 Jul 2026 (corrected per 16.07 update, was 13-31 Jul)"
    "|EFS/GRI no longer restated on the 16.07 sheet — rates up ~500 vs prior, likely GRI rolled into base freight"
    "|Port-specific surcharges noted per port | Local charges both ends | Space and equipment subject to availability"
)
CL_SAEC = (
    "MSC | Nhava Sheva origin | South America East Coast / SAEC rates"
    "|Validity: 16-31 Jul 2026 — rates corrected per 16.07 update (down significantly vs 13.07/15.07 sheets)"
    "|EFS/ETS/FUE no longer restated on the 16.07 sheet — see NOTES for the carried-forward caveat"
    "|La Guaira / Puerto Cabello: EUR currency; DTHC EUR 600/cntr prepaid"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SAWC = (
    "MSC | Nhava Sheva origin | South America West Coast / SAWC rates"
    "|Validity: 16-31 Jul 2026 — rates corrected per 16.07 update (down significantly vs 13.07/15.07 sheets)"
    "|EFS/ETS/FUE no longer restated on the 16.07 sheet — see NOTES for the carried-forward caveat"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CA = (
    "MSC | Nhava Sheva origin | Central America rates"
    "|Validity: 16-31 Jul 2026"
    "|EFS USD 238/TEU + PCS USD 40/TEU (Corinto/Acajutla/PCaldera/PQuetzal/Rodman) or USD 211/TEU (others)"
    "|ENS+AMS collect | Port-specific surcharges noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAR = (
    "MSC | Nhava Sheva origin | Caribbean rates"
    "|Validity: 16-31 Jul 2026"
    "|EFS USD 211/TEU collect | ENS+AMS collect | DTHC prepaid where noted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_CAN = (
    "MSC | Nhava Sheva origin | Canada rates"
    "|Validity: 16-31 Jul 2026"
    "|EFS USD 211/TEU + LWS USD 150/TEU (eff 21 Jul, Montreal/Halifax/Toronto) | Vancouver: EFS USD 418/TEU + FUE USD 18/TEU"
    "|AMS + SPD collect | Max weight (inland): 47900LBS/20 60000LBS/40HC (OVW: 55000LBS/20 65000LBS/40HC)"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_MEX = (
    "MSC | Nhava Sheva origin | Mexico rates"
    "|Validity: 16-31 Jul 2026"
    "|EFS USD 211/TEU (Veracruz/Altamira) or USD 238/TEU + PCS USD 40/TEU (Manzanillo/LC) | AMS collect"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_NAF = (
    "MSC | Nhava Sheva origin | North Africa rates"
    "|Validity: 16-31 Jul 2026 (base rates unchanged from 1h; GRI USD 500/cntr re-added, collect, eff 20 Jul)"
    "|EFS USD 167/TEU | ETS USD 76/TEU | FUE USD 16/TEU | GRI USD 500/cntr (eff 20 Jul) — all collect"
    "|Port-specific surcharges (PSS/CGS) noted per port"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_SA = (
    "MSC | Nhava Sheva origin | South Africa rates"
    "|Validity: 16-31 Jul 2026 (corrected per 16.07 update, was 13-31 Jul)"
    "|EFS USD 125/TEU collect | CDD USD 30/BL collect | Local charges both ends"
)
CL_IO = (
    "MSC | Nhava Sheva origin | Indian Ocean Island rates"
    "|Validity: 15-31 Jul 2026 (corrected per 15.07 update, was 13-31 Jul)"
    "|EFS USD 125/TEU collect | EOS inclusive | Local charges both ends"
    "|DTHC prepaid for inland cargo (Madagascar)"
)
CL_BEIRA = (
    "MSC | Nhava Sheva origin | Mozambique (Beira) rate amendment"
    "|Validity: 08-15 Jul 2026 — amends the Beira segment of the 1h Indian Ocean / Mozambique rate (falls within the already-inserted 01-15 Jul window)"
    "|EFS USD 155/TEU collect | EOS USD 500/teu | CGS USD 1000/teu"
    "|20ft > 40ft on source sheet | Local charges both ends"
)
CL_AUS = (
    "MSC | Nhava Sheva origin | Australia / New Zealand / Pacific rates"
    "|Validity: 10-15 Jul 2026 (short window)"
    "|EFS USD 100/TEU collect | HAZ Packing Group I not accepted"
    "|Local charges both ends | Space and equipment subject to availability"
)
CL_USEC = (
    "MSC | Nhava Sheva origin | USA East/Gulf Coast (USEC) rates"
    "|Validity: 18-31 Jul 2026"
    "|EFS USD 211/TEU | CUC USD 110/box (Port Everglades: no CUC) | AMS + OTHC + local charges + docs collect"
    "|Non-HAZ cargo only (HAZ case by case)"
)
CL_USWC = (
    "MSC | Nhava Sheva origin | USA West Coast (USWC) rates"
    "|Validity: 16-31 Jul 2026 — resumed with new rate this update (was blank on both 03.07 and 13.07 sheets)"
    "|EFS USD 418/TEU | CUC USD 110/box | AMS + OTHC + local charges + docs collect"
    "|Non-HAZ cargo only (HAZ case by case)"
)
CL_ME_SAJA = (
    "MSC | Nhava Sheva origin | Middle East rates — ICD Saja'a (new port, first appeared on 15.07 sheet)"
    "|Validity: 14-31 Jul 2026 (extended per 16.07 update, was 14-20 Jul on 15.07 sheet)"
    "|EFS USD 41/TEU collect | Local charges both ends | Space and equipment subject to availability"
)
CL_ME_CONT = (
    "MSC | Nhava Sheva origin | Middle East rates — continuation"
    "|Validity: 21-31 Jul 2026 (new window per 16.07 update; rates unchanged from 1h script's 06-20 Jul window)"
    "|EFS USD 41/TEU collect | Port-specific surcharges (OCC/PAD/EBS/ECL) noted per port"
    "|Local charges both ends | Space and equipment subject to availability"
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
    return row(dc, dp, r20, r40, VF_16, VT_31, '', surch, CL_RS, notes, currency)

def wa(dc, dp, r20, r40, vf=VF_16, notes=''):
    return row(dc, dp, r20, r40, vf, VT_31, '', S_WA, CL_WA, notes)

def saec(dc, dp, r20, r40, notes='', currency='USD'):
    return row(dc, dp, r20, r40, VF_SAEC, VT_31, '', S_SAEC, CL_SAEC, notes, currency)

def sawc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_SAEC, VT_31, '', S_SAWC, CL_SAWC, notes)

def ca(dc, dp, r20, r40, high_efs=True, notes=''):
    s = S_CA_H if high_efs else S_CA_L
    return row(dc, dp, r20, r40, VF_16, VT_31, '', s, CL_CA, notes)

def car(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_CAR, CL_CAR, notes)

def can(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_CAN_STD, CL_CAN, notes)

def van(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_VAN, CL_CAN, notes)

def mex(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_MEX_L
    return row(dc, dp, r20, r40, VF_16, VT_31, '', s, CL_MEX, notes)

def naf(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_NAF, CL_NAF, notes)

def sa(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_SA, CL_SA, notes)

def io(dc, dp, r20, r40, vf=VF_15, notes=''):
    return row(dc, dp, r20, r40, vf, VT_31, '', S_IO, CL_IO, notes)

def beira(r20, r40, notes=''):
    return row('Mozambique', 'BEIRA', r20, r40, VF_08, VT_15, '', S_IO_MOZ, CL_BEIRA, notes)

def aus(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_10, VT_15, '', S_AUS, CL_AUS, notes)

def usec(dc, dp, r20, r40, surch=None, notes=''):
    s = surch if surch else S_USEC
    return row(dc, dp, r20, r40, VF_18, VT_31, '', s, CL_USEC, notes)

def uswc(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_16, VT_31, '', S_USWC, CL_USWC, notes)

def me_saja(r20, r40, notes=''):
    return row('United Arab Emirates', "ICD SAJA'A", r20, r40, '2026-07-14', VT_31, '', S_ME, CL_ME_SAJA, notes)

def me_cont(dc, dp, r20, r40, notes=''):
    return row(dc, dp, r20, r40, VF_21, VT_31, '', S_ME, CL_ME_CONT, notes)

lines = []
lines.append("-- ================================================================")
lines.append("-- MSC — NHAVA SHEVA (Mumbai pickup) Rates July 2026 SECOND HALF")
lines.append("-- Source sheet UPDATED ON 16.07.2026 (supersedes 15.07 build for WA/SAEC/SAWC/SA rates, adds ME continuation)")
lines.append("-- Validity windows vary by trade — see CLAUSES per row:")
lines.append("--   16-31 Jul: Red Sea(most)|WA|SA|CA|CAR|CAN(incl Vancouver)|MEX|NAF|USWC|SAEC/SAWC(continuation)")
lines.append("--   15-31 Jul: Indian Ocean(non-Moz)")
lines.append("--   14-31 Jul: Middle East — ICD Saja'a (new port, validity extended per 16.07 update)")
lines.append("--   21-31 Jul: Middle East — continuation for the standard 14 ports (Sharjah absent this window)")
lines.append("--   10-15 Jul: AUS/NZ/Pacific (short window; NO further rates after 15 Jul)")
lines.append("--   08-15 Jul: Beira (amends 1h Indian Ocean segment)")
lines.append("--   18-31 Jul: USEC")
lines.append("-- 16.07 corrections applied: West Africa/SAEC/SAWC rates changed and EFS/ETS/FUE/GRI no longer")
lines.append("--   restated on the sheet (carried forward as a caveat in NOTES); South Africa rate+validity fixed")
lines.append("--   (was 13-31 Jul); ICD Saja'a validity extended 14-20 -> 14-31 Jul; Middle East gets a new 21-31")
lines.append("--   Jul continuation window at unchanged rates")
lines.append("-- NO LONGER HAS RATES on 16.07 sheet (nothing to insert, not re-inserted here):")
lines.append("--   East Africa (Mombasa/DarEsSalaam/Tanga/Zanzibar) | Mozambique (Beira/Nacala/Maputo)")
lines.append("--   AUS/NZ/Pacific (all 18 ports)")
lines.append("-- UNCHANGED, not re-inserted here (still covered by 1h script or earlier 2h inserts):")
lines.append("--   Mogadishu (1-15 Jul) | Berbera (extended to 1-31 Jul, same rate)")
lines.append("--   ISC Colombo/Chattogram/Male (1-31 Jul, same rates)")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# RED SEA / HORN OF AFRICA (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== RED SEA / HORN OF AFRICA (16-31 Jul 2026) ========")
lines.append("-- EFS USD 88/teu + PRS USD 40/teu (most); Port Sudan EFS EUR76 + PRS EUR30")
lines.append("-- Mogadishu (1-15 Jul unchanged) and Berbera (extended 1-31 Jul, same rate) NOT re-inserted")
lines.append("")
lines.append(rs('Saudi Arabia', 'KING ABDULLAH PORT (KAP)', 4013, 5013, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC collect'))
lines.append(rs('Saudi Arabia', 'JEDDAH',                   4213, 5213, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu; OCC collect'))
lines.append(rs('Sudan',        'PORT SUDAN',               4513, 5513, S_RS_SUD, notes='EUR currency; ETS EUR 63/teu; FUEL EUR 14/teu; DTHC prepaid; WAR EUR 300/teu prepaid', currency='EUR'))
lines.append(rs('Egypt',        'AL SOKHNA',                4213, 5213, S_RS_STD, notes='ETS USD 74/teu; FUEL USD 16/teu'))
lines.append(rs('Jordan',       'AQABA',                    4213, 5213, S_RS_STD, notes='PAD on collect; ETS USD 69/teu; FUEL USD 16/teu; JIS inclusive'))
lines.append(rs('Djibouti',     'DJIBOUTI',                 2513, 3513, S_RS_STD, notes='OCC USD 175/20 USD 245/40 prepaid; CER USD 30/teu prepaid'))
lines.append(rs('Yemen',        'ADEN',                     4013, 4513, S_RS_STD, notes='OCC USD 299/20 USD 477/40 (CGS+WRS incl); GST on WRS/CGS/OCC'))
lines.append(rs('Yemen',        'MUKALLA',                  4613, 4913, S_RS_STD, notes='OCC USD 335/20 USD 525/40 collect; GST on WRS/CGS/OCC'))
lines.append("")

# ============================================================
# WEST AFRICA (16-31 Jul 2026) — corrected per 16.07 update
# ============================================================
lines.append("-- ======== WEST AFRICA (16-31 Jul 2026) ========")
lines.append("-- Corrected per 16.07 update: rates up ~500 (validity was 13-31 Jul with explicit EFS/GRI on the")
lines.append("-- 13.07/15.07 sheets); this update no longer restates EFS/GRI in the additionals column, and the")
lines.append("-- rate jump roughly matches the prior GRI amount — likely rolled into the base freight rate.")
lines.append("-- Surcharge structure carried forward as a caveat pending carrier confirmation.")
lines.append("")
_WA_CAVEAT = 'EFS/GRI not restated on 16.07 sheet — carried forward from prior structure (EFS 230/teu + GRI 500/cntr), confirm before quoting'
lines.append(wa('Ivory Coast',       'ABIDJAN',         4700, 5800, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Nigeria',           'TIN CAN / APAPA', 5000, 5800, VF_16, notes='Combined Tin Can Island + Apapa on source sheet; ' + _WA_CAVEAT))
lines.append(wa('Gambia',            'BANJUL',          5200, 6500, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Guinea-Bissau',     'BISSAU',          5800, 7000, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Guinea',            'CONAKRY',         5000, 6200, VF_16, notes='CUS USD 75/20 USD 105/40 prepaid; CGS USD 1000/cntr; ' + _WA_CAVEAT))
lines.append(wa('Benin',             'COTONOU',         4500, 5500, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Senegal',           'DAKAR',           4800, 6100, VF_16, notes='PSS USD 230/cntr; ' + _WA_CAVEAT))
lines.append(wa('Cameroon',          'DOUALA',          5100, 6600, VF_16, notes='SCC USD 25/teu inclusive; ' + _WA_CAVEAT))
lines.append(wa('Sierra Leone',      'FREETOWN',        5000, 6000, VF_16, notes='ECS USD 1000/cntr; ' + _WA_CAVEAT))
lines.append(wa('Gabon',             'LIBREVILLE',      5600, 7200, VF_16, notes='Carbon Emission Reduction Fee USD 15/teu on collect; ' + _WA_CAVEAT))
lines.append(wa('Angola',            'LOBITO',          6200, 7800, VF_16, notes='AOA USD 75/box collect; ' + _WA_CAVEAT))
lines.append(wa('Cameroon',          'KRIBI',           5100, 6600, VF_16, notes='SCC USD 25/teu inclusive; ' + _WA_CAVEAT))
lines.append(wa('Togo',              'LOME',            4500, 5500, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Angola',            'LUANDA',          5200, 6800, VF_16, notes='AOA USD 75/box collect; ' + _WA_CAVEAT))
lines.append(wa('DR Congo',          'MATADI',          5000, 6300, VF_16, notes='CGS USD 210/box; ' + _WA_CAVEAT))
lines.append(wa('Cape Verde',        'MINDELO/PRAIA',   6500, 8000, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Liberia',           'MONROVIA',        5300, 7000, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Angola',            'NAMIBE',          6500, 8300, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Mauritania',        'NOUADHIBOU',      6200, 7500, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Mauritania',        'NOUAKCHOTT',      5800, 6700, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Nigeria',           'ONNE',            5200, 7000, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Republic of Congo', 'POINTE NOIRE',    5200, 7000, VF_16, notes='CUI USD 160/20 USD 210/40 prepaid; ' + _WA_CAVEAT))
lines.append(wa('Ivory Coast',       'SAN-PEDRO',       6500, 8100, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Ghana',             'TAKORADI',        6500, 8100, VF_16, notes=_WA_CAVEAT))
lines.append(wa('Ghana',             'TEMA',            4500, 5500, VF_16, notes='PAD on collect for port-to-port shipments; ' + _WA_CAVEAT))
lines.append(wa('Namibia',           'WALVIS BAY',      5713, 7313, VF_16, notes='No validity/ref shown for this row on source sheet — assumed same window as rest of West Africa; ' + _WA_CAVEAT))
lines.append("")

# ============================================================
# SAEC / SAWC — CONTINUATION (16-31 Jul 2026) — corrected per 16.07 update
# ============================================================
lines.append("-- ======== SAEC — EAST COAST SOUTH AMERICA continuation (16-31 Jul 2026) ========")
lines.append("-- Corrected per 16.07 update: rates down significantly vs 13.07/15.07 sheets, and EFS/ETS/FUE")
lines.append("-- (previously $242/$70/$15 per teu) are no longer restated in the additionals column.")
lines.append("-- Surcharge structure carried forward as a caveat pending carrier confirmation.")
lines.append("")
_SAEC_CAVEAT = 'EFS/ETS/FUE not restated on 16.07 sheet — carried forward from prior structure (EFS 242/ETS 70/FUE 15 per teu), confirm before quoting'
lines.append(saec('Argentina', 'BUENOS AIRES',       6000, 6100, notes='RPT USD 175/cntr additional; ' + _SAEC_CAVEAT))
lines.append(saec('Paraguay',  'ASUNCION',            7000, 7100, notes='CAACUPEMI service; HPT USD 30/cntr; ' + _SAEC_CAVEAT))
lines.append(saec('Paraguay',  'PILAR',               7000, 7100, notes='CAACUPEMI service; HPT USD 30/cntr; ' + _SAEC_CAVEAT))
lines.append(saec('Brazil',    'ITAJAI',              6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'ITAPOA',              6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Venezuela', 'LA GUAIRA',           7500, 7500, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD; ' + _SAEC_CAVEAT, currency='EUR'))
lines.append(saec('Brazil',    'MANAUS',              7500, 7500, notes='ACD applies; ' + _SAEC_CAVEAT))
lines.append(saec('Uruguay',   'MONTEVIDEO',          6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'NAVEGANTES',          6100, 6250, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'PARANAGUA',           6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'PECEM',               7000, 7100, notes=_SAEC_CAVEAT))
lines.append(saec('Venezuela', 'PUERTO CABELLO',      7500, 7500, notes='EUR currency; DTHC EUR 600/cntr prepaid (SCS+WAR incl); ACD; ' + _SAEC_CAVEAT, currency='EUR'))
lines.append(saec('Brazil',    'RIO DE JANEIRO',      6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'RIO GRANDE',          6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Argentina', 'ROSARIO',             7000, 7100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'SALVADOR (DE BAHIA)', 6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'SANTOS',              6000, 6100, notes=_SAEC_CAVEAT))
lines.append(saec('Brazil',    'SUAPE',               6000, 6100, notes='ACD applies; ' + _SAEC_CAVEAT))
lines.append(saec('Brazil',    'VILA DO CONDE',       7400, 7500, notes='ACD applies; ' + _SAEC_CAVEAT))
lines.append(saec('Brazil',    'VITORIA',             7000, 7100, notes=_SAEC_CAVEAT))
lines.append(saec('Argentina', 'ZARATE',              7000, 7100, notes=_SAEC_CAVEAT))
lines.append("")

lines.append("-- ======== SAWC — WEST COAST SOUTH AMERICA continuation (16-31 Jul 2026) ========")
lines.append("-- Corrected per 16.07 update: rates down vs 13.07/15.07 sheets; EFS/ETS/FUE no longer restated")
lines.append("")
_SAWC_CAVEAT = 'EFS/ETS/FUE not restated on 16.07 sheet — carried forward from prior structure (EFS 238/ETS 103/FUE 22 per teu), confirm before quoting'
lines.append(sawc('Chile',    'ARICA',          8000, 8600, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append(sawc('Colombia', 'BUENAVENTURA',   7000, 7100, notes='ISPS USD 12/cntr; ACD; ' + _SAWC_CAVEAT))
lines.append(sawc('Peru',     'CALLAO',         7000, 7100, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append(sawc('Colombia', 'CARTAGENA',      7000, 7100, notes='ISPS USD 12/cntr; ACD; ' + _SAWC_CAVEAT))
lines.append(sawc('Chile',    'CORONEL',        7000, 7100, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append(sawc('Ecuador',  'GUAYAQUIL',      7000, 7100, notes='DTHC prepaid; ACD; ' + _SAWC_CAVEAT))
lines.append(sawc('Chile',    'IQUIQUE',        8000, 8600, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append(sawc('Peru',     'PAITA',          8200, 8800, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append(sawc('Chile',    'SAN ANTONIO',    7000, 7100, notes='ACD applies; ' + _SAWC_CAVEAT))
lines.append("")

# ============================================================
# CENTRAL AMERICA (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== CENTRAL AMERICA (16-31 Jul 2026) ========")
lines.append("")
lines.append(ca('Nicaragua',  'CORINTO',        7711, 7822, True,  notes='ENS+AMS collect'))
lines.append(ca('El Salvador','ACAJUTLA',        7500, 7500, True,  notes='ENS+AMS collect; WHA USD 50/teu; PAD USD 130/box'))
lines.append(ca('Costa Rica', 'PUERTO CALDERA', 7500, 7500, True,  notes='ENS+AMS collect; ACD'))
lines.append(ca('Guatemala',  'PUERTO QUETZAL', 7500, 7500, True,  notes='ENS+AMS collect; PAD USD 130/box; SPD USD 12/box'))
lines.append(ca('Panama',     'RODMAN',          7500, 7500, True,  notes='ENS+AMS collect; SPD USD 15/box'))
lines.append(ca('Honduras',   'PUERTO CORTES',  7500, 7500, False, notes='PAD USD 185/box; SPD USD 25/box; ENS+AMS collect'))
lines.append(ca('Costa Rica', 'MOIN',           7500, 7500, False, notes='ENS+AMS collect; CUS USD 60/BL'))
lines.append(ca('Guatemala',  'PUERTO BARRIOS', 7500, 7500, False, notes='PAD USD 130/box; SPD USD 12/box; ENS+AMS collect'))
lines.append(ca('Panama',     'CRISTOBAL',      7500, 7500, False, notes='ENS+AMS collect; SPD USD 8/box'))
lines.append("")

# ============================================================
# CARIBBEAN (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== CARIBBEAN (16-31 Jul 2026) ========")
lines.append("")
lines.append(car('Haiti',               'PORT AU PRINCE', 7500, 7500, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Dominican Republic',  'CAUCEDO',         7500, 7500, notes='AMS+ENS collect; SPD USD 7/box; THC collect'))
lines.append(car('Trinidad and Tobago', 'PORT OF SPAIN',  7500, 7500, notes='ENS+AMS collect; DTHC prepaid; standard free time'))
lines.append(car('Jamaica',             'KINGSTON',       7500, 7500, notes='AMS+ENS collect; CUI USD 10/box; DTHC collect'))
lines.append(car('Dominican Republic',  'RIO HAINA',      7511, 7511, notes='AMS+ENS collect; SPD USD 7/box; DTHC collect'))
lines.append(car('Bahamas',             'NASSAU',         7511, 7511, notes='AMS+ENS collect; SPD USD 100/box; DTHC collect; WHA USD 5/ton; TUG USD 35/box'))
lines.append(car('Bahamas',             'FREEPORT',       7511, 7511, notes='AMS+ENS collect; SPD USD 25/box; DTHC collect'))
lines.append(car('Barbados',            'BRIDGETOWN',     8511, 8322, notes='AMS+ENS collect; PAD USD 100/teu; LOF USD 10/box; 20ft>40ft on source sheet'))
lines.append(car('Suriname',            'PARAMARIBO',     8511, 8322, notes='ENS collect; WHA USD 92/teu; AMS collect; THC collect; DRT; 20ft>40ft on source sheet'))
lines.append(car('Guyana',              'GEORGETOWN',     8211, 8122, notes='ENS collect; SPD USD 6/20 USD 8/40; THC collect; PAD USD 90/20 USD 150/40; AMS collect; 20ft>40ft on source sheet'))
lines.append("")

# ============================================================
# CANADA (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== CANADA (16-31 Jul 2026) ========")
lines.append("-- Montreal/Halifax/Toronto: NEW LWS USD150/teu eff 21 Jul")
lines.append("-- Vancouver: corrected per 15.07 update (was 7500/9000 valid 03-31 Jul on 13.07 sheet — data-entry glitch, now fixed)")
lines.append("")
lines.append(can('Canada', 'MONTREAL',  6500, 6400, notes='AMS+SPD collect; LWS USD 150/teu eff 21 Jul; 20ft>40ft on source sheet'))
lines.append(can('Canada', 'HALIFAX',   6500, 6400, notes='AMS+SPD collect; LWS USD 150/teu eff 21 Jul; 20ft>40ft on source sheet'))
lines.append(can('Canada', 'TORONTO',   6700, 6500, notes='AMS+SPD collect; LWS USD 150/teu eff 21 Jul; 20ft>40ft on source sheet; max weight 47900LBS/20 60000LBS/40HC (without OVW); 55000LBS/20 65000LBS/40HC (with OVW)'))
lines.append(van('Canada', 'VANCOUVER', 6000, 7000, notes='AMS+SPD collect; FUE USD 18/teu; corrected per 15.07 update'))
lines.append("")

# ============================================================
# MEXICO (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== MEXICO (16-31 Jul 2026) ========")
lines.append("")
lines.append(mex('Mexico', 'VERACRUZ',        7500, 7500, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'ALTAMIRA',         7500, 7500, S_MEX_L, notes='AMS collect'))
lines.append(mex('Mexico', 'MANZANILLO',       7500, 7500, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append(mex('Mexico', 'LAZARO CARDENAS', 7500, 7500, S_MEX_H, notes='AMS collect; PCS USD 40/teu'))
lines.append("")

# ============================================================
# NORTH AFRICA (16-31 Jul 2026)
# ============================================================
lines.append("-- ======== NORTH AFRICA (16-31 Jul 2026) ========")
lines.append("-- Base rates unchanged from 1h | GRI USD 500/cntr re-added, collect, eff 20 Jul")
lines.append("")
lines.append(naf('Morocco', 'AGADIR',     4700, 4800, notes='GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days free time'))
lines.append(naf('Algeria', 'ALGIERS',    4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'ANNABA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'BEJAIA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'BENGHAZI',   4250, 4350, notes='WRS inclusive; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Morocco', 'CASABLANCA', 4200, 4300, notes='PSS USD 150/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'KHOMS',      4250, 4350, notes='WRS inclusive; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'MISURATA',   4250, 4350, notes='WRS inclusive; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Morocco', 'NADOR',      4900, 5000, notes='GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'ORAN',       4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Algeria', 'SKIKDA',     4200, 4300, notes='PSS USD 150/cntr; CGS USD 400/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Libya',   'TRIPOLI',    4200, 4300, notes='GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append(naf('Tunisia', 'TUNIS',      4200, 4300, notes='PSS USD 150/cntr; GRI USD 500/cntr eff 20 Jul; DMG USD 50/cntr prepaid for 21 days'))
lines.append("")

# ============================================================
# SOUTH AFRICA (16-31 Jul 2026) — corrected per 16.07 update
# ============================================================
lines.append("-- ======== SOUTH AFRICA (16-31 Jul 2026) ========")
lines.append("-- EFS USD 125/teu | CDD USD 30/BL collect | Corrected per 16.07 update, was 13-31 Jul")
lines.append("")
lines.append(sa('South Africa', 'DURBAN',    4013, 4513, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'COEGA',     4113, 4613, notes='CDD USD 30/BL collect'))
lines.append(sa('South Africa', 'CAPE TOWN', 4213, 4713, notes='CDD USD 30/BL collect'))
lines.append("")

# ============================================================
# INDIAN OCEAN — non-Mozambique (15-31 Jul 2026)
# ============================================================
lines.append("-- ======== INDIAN OCEAN — non-Mozambique (15-31 Jul 2026) ========")
lines.append("-- EFS USD 125/teu | EOS inclusive | DTHC prepaid for inland cargo (Madagascar)")
lines.append("-- Corrected per 15.07 update: rates nearly doubled, validity shifted from 13-31 to 15-31 Jul")
lines.append("")
lines.append(io('Madagascar', 'TAMATAVE',          4113, 5213, VF_15, notes='PAD additional; EOS inclusive'))
lines.append(io('Mauritius',  'PORT LOUIS',         4013, 5013, VF_15, notes='EOS inclusive'))
lines.append(io('Madagascar', 'MAJUNGA',            4813, 5713, VF_15, notes='EOS inclusive'))
lines.append(io('Madagascar', 'DIEGO SUAREZ',       4713, 5513, VF_15, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('France',     'POINTE DE GALETS (REUNION)', 4513, 5313, VF_15, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append(io('Comoros',    'MORONI',             5013, 6013, VF_15, notes='CUI and SPD collect; EOS inclusive'))
lines.append(io('Mayotte',    'LONGONI',            4813, 5713, VF_15, notes='CDD USD 30/BL collect; EOS inclusive'))
lines.append("")

# ============================================================
# BEIRA — rate amendment within 1h window (08-15 Jul 2026)
# ============================================================
lines.append("-- ======== BEIRA — rate amendment (08-15 Jul 2026) ========")
lines.append("-- Falls within the 1h Mozambique window; supersedes the Beira segment 08-15 Jul at a new (higher, 20>40) rate")
lines.append("-- Nacala/Maputo unchanged at 1-15 Jul rate — not re-inserted")
lines.append("")
lines.append(beira(3358, 3190, notes='EOS USD 500/teu; CGS USD 1000/teu; 20ft>40ft on source sheet'))
lines.append("")

# ============================================================
# AUSTRALIA / NEW ZEALAND / PACIFIC (10-15 Jul 2026)
# ============================================================
lines.append("-- ======== AUSTRALIA / NEW ZEALAND / PACIFIC (10-15 Jul 2026 — short window) ========")
lines.append("-- EFS USD 100/teu | HAZ Packing Group I not accepted")
lines.append("")
lines.append(aus('Australia',      'ADELAIDE',       1750, 3100))
lines.append(aus('Australia',      'BELL BAY',       2900, 5000))
lines.append(aus('Australia',      'BRISBANE',       2150, 3900))
lines.append(aus('Australia',      'FREMANTLE',      1750, 3100))
lines.append(aus('Australia',      'MELBOURNE',      1750, 3100))
lines.append(aus('Australia',      'SYDNEY',         1750, 3100))
lines.append(aus('New Zealand',    'AUCKLAND',       3500, 5500))
lines.append(aus('French Polynesia','PAPEETE',       4500, 6500))
lines.append(aus('New Zealand',    'BLUFF',          2000, 3400))
lines.append(aus('New Zealand',    'LYTTELTON',      2000, 3400))
lines.append(aus('New Zealand',    'NAPIER',         2950, 5000))
lines.append(aus('New Zealand',    'NELSON',         2000, 3400))
lines.append(aus('New Zealand',    'PORT CHALMERS',  2000, 3400))
lines.append(aus('New Zealand',    'TAURANGA',       2000, 3400))
lines.append(aus('New Zealand',    'WELLINGTON',     2000, 3400))
lines.append(aus('New Caledonia',  'NOUMEA',         2900, 4900))
lines.append(aus('Fiji',           'LAUTOKA',        2900, 4900))
lines.append(aus('Fiji',           'SUVA',           2900, 4900))
lines.append("")

# ============================================================
# USA EAST/GULF COAST (18-31 Jul 2026)
# ============================================================
lines.append("-- ======== USA EAST/GULF COAST (18-31 Jul 2026) ========")
lines.append("-- EFS USD 211/teu | CUC USD 110/box (Port Everglades: no CUC) | Non-HAZ only")
lines.append("")
lines.append(usec('United States', 'NEW YORK',       6000, 6500, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu'))
lines.append(usec('United States', 'NORFOLK',        6000, 6500, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'CHARLESTON',     6000, 6500, notes='OTHC+locals+docs+AMS collect; CFC USD 14.05/teu; LCF USD 13.39/cntr'))
lines.append(usec('United States', 'SAVANNAH',       6000, 6500, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'HOUSTON',        6500, 7000, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BALTIMORE',      6500, 7000, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'NEW ORLEANS',    6600, 7250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'PORT EVERGLADES',6500, 7000, S_USEC_NOCUC, notes='OTHC+locals+docs+WHA+AMS collect; no CUC on sheet'))
lines.append(usec('United States', 'PHILADELPHIA',   6700, 7350, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'BOSTON',         6700, 7350, notes='OTHC+locals+docs+AMS collect'))
lines.append(usec('United States', 'MOBILE',         6600, 7250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append(usec('United States', 'JACKSONVILLE',   6600, 7250, notes='OTHC+locals+docs+WHA+AMS collect'))
lines.append("")

# ============================================================
# USA WEST COAST (16-31 Jul 2026) — resumed with new rate this update
# ============================================================
lines.append("-- ======== USA WEST COAST (16-31 Jul 2026) — resumed (blank on 03.07 and 13.07 sheets) ========")
lines.append("-- EFS USD 418/teu | CUC USD 110/box | Non-HAZ only")
lines.append("")
lines.append(uswc('United States', 'LONG BEACH / LOS ANGELES', 6200, 7300, notes='OTHC + local charges + docs + AMS collect'))
lines.append(uswc('United States', 'SEATTLE',                   6200, 7300, notes='OTHC + local charges + docs + AMS collect'))
lines.append(uswc('United States', 'OAKLAND',                   6200, 7300, notes='OTHC + local charges + docs + AMS collect'))
lines.append("")

# ============================================================
# MIDDLE EAST — new port (14-20 Jul 2026)
# ============================================================
lines.append("-- ======== MIDDLE EAST — ICD SAJA'A, new port (14-31 Jul 2026) ========")
lines.append("-- First appeared on 15.07 sheet at 14-20 Jul; extended to 14-31 Jul per 16.07 update. EFS USD 41/teu")
lines.append("")
lines.append(me_saja(3500, 4500))
lines.append("")

# ============================================================
# MIDDLE EAST — continuation (21-31 Jul 2026, unchanged rates)
# ============================================================
lines.append("-- ======== MIDDLE EAST — continuation (21-31 Jul 2026) ========")
lines.append("-- New window per 16.07 update, filling the gap after the 1h script's 06-20 Jul window. Rates unchanged.")
lines.append("-- NOTE: Sharjah does not appear on the 16.07 sheet for this window (was present 06-20 Jul) — excluded, not an oversight")
lines.append("")
lines.append(me_cont('Oman',                 'SOHAR',              2200, 2900, notes='PAD and SPD additional on collect'))
lines.append(me_cont('Oman',                 'SALALAH',            3000, 3800))
lines.append(me_cont('United Arab Emirates', 'KHOR AL FAKKAN',     3500, 4500))
lines.append(me_cont('United Arab Emirates', 'JEBEL ALI',          4000, 5200))
lines.append(me_cont('United Arab Emirates', 'ABU DHABI',          4000, 5200))
lines.append(me_cont('United Arab Emirates', 'RAS AL KHAIMAH',     4000, 5200))
lines.append(me_cont('United Arab Emirates', 'AJMAN',              4000, 5200))
lines.append(me_cont('United Arab Emirates', 'UMM AL QUWAIN',      4000, 5200, notes='EBS additional on collect'))
lines.append(me_cont('Saudi Arabia',         'DAMMAM',             5000, 6000, notes='OCC additional on collect'))
lines.append(me_cont('Bahrain',              'BAHRAIN',            5000, 6000, notes='EBS and ECL additional on collect'))
lines.append(me_cont('Qatar',                'HAMAD',              5000, 6000, notes='OCC additional on collect'))
lines.append(me_cont('Kuwait',               'SHUWAIKH',           5000, 6000))
lines.append(me_cont('Kuwait',               'SHUAIBA',            5000, 6000))
lines.append(me_cont('Iraq',                 'UMM QASR',           5250, 6250, notes='DTHC inclusive'))
lines.append("")

full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
