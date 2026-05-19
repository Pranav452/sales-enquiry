import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL      = 'ONE'
OC      = 'India'
OP      = 'NHAVA SHEVA'
PDF_URL = 'https://in.one-line.com/standard-page/local-tariffs-and-surcharges'

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via, surcharges, notes, clauses):
    v  = f"'{esc(via)}'" if via else 'NULL'
    cl = esc(clauses)
    s  = esc(surcharges)
    n  = esc(notes)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'USD',{r20},{r40},'{vf}','{vt}',{v},'{s}','{n}','{cl}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

# ================================================================
# MRG — COMPILED EA+WA+RS MRG (MAY 2026)
# ================================================================
MRG_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | EA/WA/RS MRG May 2026"
    "|Rates inclusive of: ISL, OBS, PSF, SLF"
    "|Subject to: EFS USD 60/20' USD 120/40' | THL+THD+DOC+DOF+local charges extra"
    "|CY/CY non-haz | 14 days free detention at POD"
    "|Rates NOT applicable for LOT shipments of Onion, Soya, Agri products & Raw Cotton"
    "|No offer: Jebel Ali, Dammam, Riyadh, Bahrain, Shuaiba, Ajman, Shuwaikh, Sohar, Hamad, Umm Qasr, Abu Dhabi"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
MRG_VF = '2026-05-01'
MRG_VT = '2026-05-31'

S_MRG     = 'ISL:incl;OBS:incl;PSF:incl;SLF:incl;EFS:60/20-120/40;THC:collect;DOC:collect'
S_MRG_YAS = 'ISL:incl;OBS:incl;PSF:incl;SLF:incl;YAS:incl;EFS:60/20-120/40;THC:collect;DOC:collect'
S_MRG_PCO = 'ISL:incl;OBS:incl;PSF:incl;SLF:incl;PCO:incl;EFS:60/20-120/40;THC:collect;DOC:collect'
S_MRG_BD  = 'ISL:incl;OBS:incl;PSF:incl;SLF:incl;THD:incl;CGD:incl;EFS:60/20-120/40;THC:collect;DOC:collect'

N_MRG     = 'Incl ISL,OBS,PSF,SLF; EFS $60/20 $120/40; THC+DOC extra; CY/CY; 14d FD at POD'
N_MRG_YAS = 'Incl ISL,OBS,PSF,SLF,YAS; EFS $60/20 $120/40; THC+DOC extra; CY/CY'
N_MRG_PCO = 'Incl ISL,OBS,PSF,SLF,PCO; EFS $60/20 $120/40; THC+DOC extra; CY/CY'
N_MRG_BD  = 'Incl ISL,OBS,PSF,SLF,THD,CGD; EFS $60/20 $120/40; THC extra; CY/CY'

def mrg(dc, dp, r20, r40, via=None, s=None, n=None, xn=''):
    surch = s or S_MRG
    note  = (n or N_MRG) + (f'; {xn}' if xn else '')
    return row(dc, dp, r20, r40, MRG_VF, MRG_VT, via, surch, note, MRG_CL)

def mjp(dc, dp, r20, r40, via='SINGAPORE', xn=''):
    return mrg(dc, dp, r20, r40, via, S_MRG_YAS, N_MRG_YAS, xn)

def mcn(dc, dp, r20, r40, via='HONG KONG', xn=''):
    return mrg(dc, dp, r20, r40, via, S_MRG_STD, N_MRG, xn)

S_MRG_STD = S_MRG  # alias

# ================================================================
# WEW — EUROPE
# ================================================================
WEW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Europe WEW rates"
    "|Period 1: 07-15 May 2026 | Period 2: 16-31 May 2026 (vessel basis; Gate In date)"
    "|Rates inclusive of: CAF, CSS, HEA, MBS (except Bilbao/Gijon/Vigo: CAF,CSS,MBS only)"
    "|Sub to: OBS USD 117/TEU | EFS USD 120/20' 240/40' | EES USD 95/TEU (not applicable UK ports)"
    "|ESD collect | SLF collect | THC both ends | Docs charges extra"
    "|HEA: USD 300/20DV for net wt >= 16MT"
    "|Rates CY/CY basis | Standard Tariff F/T at POD"
    "|THC/Haulage: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
)
WMW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | MED WMW rates"
    "|Period 1: 01-15 May 2026 | Period 2: 16-31 May 2026 (vessel basis; Gate In date)"
    "|Rates inclusive of: CAF, CSS, MBS"
    "|Sub to: OBS USD 119/TEU | EFS USD 120/20' 240/40' | EES USD 182/TEU"
    "|ESD collect | HEA: USD 300/20DV >=16MT; USD 600/20DV >=18MT | THC both ends | Docs extra"
    "|Rates CY/CY basis | Standard Tariff F/T at POD"
    "|THC/Haulage: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
)

S_EUR      = 'OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ESD:collect;HEA:300/20D>=16mt;SLF:collect;THC:collect;CAF:incl;CSS:incl;HEA:incl;MBS:incl'
S_EUR_UK   = 'OBS:117/teu;EFS:120/20-240/40;ESD:collect;HEA:300/20D>=16mt;SLF:collect;THC:collect;CAF:incl;CSS:incl;HEA:incl;MBS:incl'
S_EUR_NOHE = 'OBS:117/teu;EES:95/teu;EFS:120/20-240/40;ESD:collect;SLF:collect;THC:collect;CAF:incl;CSS:incl;MBS:incl'
S_MED      = 'OBS:119/teu;EES:182/teu;EFS:120/20-240/40;ESD:collect;HEA:300/20D>=16mt-600/20D>=18mt;THC:collect;CAF:incl;CSS:incl;MBS:incl'

N_EUR      = 'Incl CAF,CSS,HEA,MBS; OBS $117/teu; EES $95/teu (not UK); EFS $120/240; ESD+SLF+THC+Docs extra; CY/CY'
N_EUR_UK   = 'Incl CAF,CSS,HEA,MBS; OBS $117/teu; EFS $120/240; EES N/A (UK); ESD+SLF+THC+Docs extra; CY/CY'
N_EUR_NOHE = 'Incl CAF,CSS,MBS; OBS $117/teu; EES $95/teu; EFS $120/240; ESD+SLF+THC+Docs extra; CY/CY'
N_MED      = 'Incl CAF,CSS,MBS; OBS $119/teu; EES $182/teu; EFS $120/240; ESD+HEA+THC+Docs extra; CY/CY'

def eur(dc, dp, r20, r40, vf, vt, via=None, uk=False, nohe=False, xn=''):
    if uk:
        s, n = S_EUR_UK, N_EUR_UK
    elif nohe:
        s, n = S_EUR_NOHE, N_EUR_NOHE
    else:
        s, n = S_EUR, N_EUR
    if xn:
        n += f'; {xn}'
    return row(dc, dp, r20, r40, vf, vt, via, s, n, WEW_CL)

def med(dc, dp, r20, r40, vf, vt, via=None, xn=''):
    n = N_MED + (f'; {xn}' if xn else '')
    return row(dc, dp, r20, r40, vf, vt, via, S_MED, n, WMW_CL)

# WEW periods
WEW_P1_F = '2026-05-07'; WEW_P1_T = '2026-05-15'
WEW_P2_F = '2026-05-16'; WEW_P2_T = '2026-05-31'
# WMW periods
WMW_P1_F = '2026-05-01'; WMW_P1_T = '2026-05-15'
WMW_P2_F = '2026-05-16'; WMW_P2_T = '2026-05-31'

def eur2(dc, dp, r20, r40, via=None, uk=False, nohe=False, xn=''):
    """Insert both WEW periods (same rates)"""
    out = []
    for vf, vt in [(WEW_P1_F, WEW_P1_T), (WEW_P2_F, WEW_P2_T)]:
        out.append(eur(dc, dp, r20, r40, vf, vt, via, uk, nohe, xn))
    return '\n'.join(out)

def med2(dc, dp, r20, r40, via=None, xn=''):
    """Insert both WMW periods (same rates)"""
    out = []
    for vf, vt in [(WMW_P1_F, WMW_P1_T), (WMW_P2_F, WMW_P2_T)]:
        out.append(med(dc, dp, r20, r40, vf, vt, via, xn))
    return '\n'.join(out)

# ================================================================
# AUS / NZS
# ================================================================
AUS_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Australia/NZ AUS/NZS rates"
    "|Period 1: 01-14 May 2026 | Period 2: 15-31 May 2026 (vessel basis)"
    "|Rates inclusive of: MBS, OBS"
    "|Sub to: ISL USD 32/ctr | SLF USD 10/ctr | EFS USD 120/20' 240/40' | THC+DOC both ends extra"
    "|Flexi-tank add-on: USD 100/TEU | Standard freetime at POD"
    "|THC: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
)
S_AUS  = 'MBS:incl;OBS:incl;ISL:32/ctr;SLF:10/ctr;EFS:120/20-240/40;THC:collect;DOC:collect'
N_AUS  = 'Incl MBS,OBS; ISL $32; SLF $10; EFS $120/240; THC+DOC extra; CY/CY'

AUS_P1_F = '2026-05-01'; AUS_P1_T = '2026-05-14'
AUS_P2_F = '2026-05-15'; AUS_P2_T = '2026-05-31'
NZS_P1_F = '2026-05-01'; NZS_P1_T = '2026-05-14'
NZS_P2_F = '2026-05-15'; NZS_P2_T = '2026-05-31'

def aus2(dc, dp, r20, r40, via=None, xn=''):
    n = N_AUS + (f'; {xn}' if xn else '')
    out = []
    for vf, vt in [(AUS_P1_F, AUS_P1_T), (AUS_P2_F, AUS_P2_T)]:
        out.append(row(dc, dp, r20, r40, vf, vt, via, S_AUS, n, AUS_CL))
    return '\n'.join(out)

# ================================================================
# CSE — Caribbean / Central America / LAEC East
# ================================================================
CSE_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Caribbean/LAEC CSE rates"
    "|Period 1: 08-15 May 2026 | Period 2: 16-22 May 2026 (vessel basis)"
    "|Rates inclusive of: EFS, MBS, OBS, PSS"
    "|Sub to: HEA (nil <=17.99t; USD 200/20ft >18t) | PCT $40/teu | CSS $15/unit | SLF $10/unit"
    "|THL+THD+Docs+local charges extra | CY/CY"
    "|San Juan (PR): FMC governed | Haiti: Due Diligence required"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_CSE = 'EFS:incl;MBS:incl;OBS:incl;PSS:incl;PCT:40/teu;CSS:15/unit;SLF:10/unit;HEA:200/20ft>18mt;THC:collect;DOC:collect'
N_CSE = 'Incl EFS,MBS,OBS,PSS; PCT $40/teu; CSS $15; SLF $10; HEA $200/20ft>18mt; THC+Docs extra; CY/CY'

CSE_P1_F = '2026-05-08'; CSE_P1_T = '2026-05-15'
CSE_P2_F = '2026-05-16'; CSE_P2_T = '2026-05-22'

def cse(dc, dp, r20_p1, r20_p2, xn=''):
    # All CSE: 20=40=HC (flat rate per box), different for p1 vs p2
    n = N_CSE + (f'; {xn}' if xn else '')
    out = []
    out.append(row(dc, dp, r20_p1, r20_p1, CSE_P1_F, CSE_P1_T, None, S_CSE, n, CSE_CL))
    out.append(row(dc, dp, r20_p2, r20_p2, CSE_P2_F, CSE_P2_T, None, S_CSE, n, CSE_CL))
    return '\n'.join(out)

# ================================================================
# LEW — LAEC East Coast South America
# ================================================================
LEW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | LAEC LEW rates"
    "|T/S via ESALG or NLRTM: 01-14 May and 15-31 May 2026"
    "|Direct routing: 08-14 May and 15-21 May 2026"
    "|Rates inclusive of: EFS, HEA, MBS, OBS, PSS"
    "|Sub to: CSS $15/unit | SLF $10/unit | THL+THD+Docs+local charges extra"
    "|HEA: Nil <=23.99t; USD 200/20ft cargo wt >18t"
    "|EFS USD 120/20' 240/40' | IFL/IFD: Inland Fuel Charge (Bolivia/Brazil/Chile/CR/Ecuador/Uruguay)"
    "|18 days free detention at dest (LAEC exc Buenos Aires/Asuncion) | 14d Buenos Aires | 21d Asuncion"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_LEW = 'EFS:incl;HEA:incl;MBS:incl;OBS:incl;PSS:incl;CSS:15/unit;SLF:10/unit;THC:collect;DOC:collect'
N_LEW = 'Incl EFS,HEA,MBS,OBS,PSS; CSS $15; SLF $10; HEA nil<=23.99t/$200>18t; THC+Docs extra; CY/CY'

LEW_TS_P1_F = '2026-05-01'; LEW_TS_P1_T = '2026-05-14'
LEW_TS_P2_F = '2026-05-15'; LEW_TS_P2_T = '2026-05-31'
LEW_DR_P1_F = '2026-05-08'; LEW_DR_P1_T = '2026-05-14'
LEW_DR_P2_F = '2026-05-15'; LEW_DR_P2_T = '2026-05-21'

def lew_ts(dc, dp, r20, r40, via):
    """T/S routing via ESALG or NLRTM, both periods"""
    out = []
    for vf, vt in [(LEW_TS_P1_F, LEW_TS_P1_T), (LEW_TS_P2_F, LEW_TS_P2_T)]:
        out.append(row(dc, dp, r20, r40, vf, vt, via, S_LEW, N_LEW, LEW_CL))
    return '\n'.join(out)

def lew_dr(dc, dp, r20_p1, r40_p1, r20_p2, r40_p2):
    """Direct routing, two periods with different rates"""
    out = []
    out.append(row(dc, dp, r20_p1, r40_p1, LEW_DR_P1_F, LEW_DR_P1_T, None, S_LEW, N_LEW, LEW_CL))
    out.append(row(dc, dp, r20_p2, r40_p2, LEW_DR_P2_F, LEW_DR_P2_T, None, S_LEW, N_LEW, LEW_CL))
    return '\n'.join(out)

# ================================================================
# LWE — LAWC West Coast South America
# ================================================================
LWE_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | LAWC LWE rates"
    "|Period 1: 01-14 May 2026 | Period 2: 15-31 May 2026 (vessel basis)"
    "|Rates inclusive of: BAF, BRS, EFS, MBS, OBS, PSS"
    "|Sub to: HEA USD 150/20ft (wt 18.01-21t); USD 200/20ft (>21t)"
    "|CSS $15/unit | SLF $10/unit | ENS (for Mexico) | THCS both ends | Docs+local charges"
    "|IFL/IFD: Inland Fuel Charge for carrier inland shipments (eff 02-Apr-2026)"
    "|Freetime: 21d Chile/Peru/Mexico | 20d Colombia | 18d Ecuador | 17d Guatemala | 16d Nicaragua/CR/ES/Honduras | 12d Panama"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_LWE = 'BAF:incl;BRS:incl;EFS:incl;MBS:incl;OBS:incl;PSS:incl;HEA:150/20ft18-21t-200/20ft>21t;CSS:15/unit;SLF:10/unit;THC:collect;DOC:collect'
N_LWE = 'Incl BAF,BRS,EFS,MBS,OBS,PSS; HEA $150/20ft(18-21t)/$200(>21t); CSS $15; SLF $10; THC+Docs extra; CY/CY'

LWE_P1_F = '2026-05-01'; LWE_P1_T = '2026-05-14'
LWE_P2_F = '2026-05-15'; LWE_P2_T = '2026-05-31'

def lwe(dc, dp, r20_p1, r40_p1, r20_p2, r40_p2):
    out = []
    out.append(row(dc, dp, r20_p1, r40_p1, LWE_P1_F, LWE_P1_T, None, S_LWE, N_LWE, LWE_CL))
    out.append(row(dc, dp, r20_p2, r40_p2, LWE_P2_F, LWE_P2_T, None, S_LWE, N_LWE, LWE_CL))
    return '\n'.join(out)

# ================================================================
# EFW — East Africa
# ================================================================
EFW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | East Africa EFW rates"
    "|Period 1: 01-14 May 2026 | Period 2: 15-31 May 2026 (vessel basis)"
    "|Rates inclusive of: AMS, BAF, BRS, CGD, HEA, LSF, MBS, OBS, PSS, WRC"
    "|Sub to: CSS collect | SLF collect | THL+DOC both ends | EFS USD 120/20' 240/40'"
    "|HAZ: USD 200/TEU | 14 days free detention at destination for Dry"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_EFW = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;HEA:incl;LSF:incl;MBS:incl;OBS:incl;PSS:incl;WRC:incl;EFS:120/20-240/40;CSS:collect;SLF:collect;THC:collect;DOC:collect'
N_EFW = 'Incl AMS,BAF,BRS,CGD,HEA,LSF,MBS,OBS,PSS,WRC; EFS $120/240; CSS+SLF+THC+Docs extra; CY/CY'

EFW_P1_F = '2026-05-01'; EFW_P1_T = '2026-05-14'
EFW_P2_F = '2026-05-15'; EFW_P2_T = '2026-05-31'

def efw(dc, dp, r20_p1, r40_p1, r20_p2, r40_p2):
    out = []
    out.append(row(dc, dp, r20_p1, r40_p1, EFW_P1_F, EFW_P1_T, None, S_EFW, N_EFW, EFW_CL))
    out.append(row(dc, dp, r20_p2, r40_p2, EFW_P2_F, EFW_P2_T, None, S_EFW, N_EFW, EFW_CL))
    return '\n'.join(out)

# ================================================================
# WFW — West Africa
# ================================================================
WFW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | West Africa WFW rates"
    "|Period 1: 01-14 May 2026 | Period 2: 15-31 May 2026 (vessel basis)"
    "|Rates inclusive of: AMS, BAF, BRS, CGD, EPH, HEA, LSF, MBS, OBS, PSS, WRC"
    "|Sub to: CSS collect | SLF collect | THL+DOC both ends | EFS USD 120/20' 240/40'"
    "|HAZ: USD 200/TEU | 14 days free detention at destination for Dry"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_WFW = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;EPH:incl;HEA:incl;LSF:incl;MBS:incl;OBS:incl;PSS:incl;WRC:incl;EFS:120/20-240/40;CSS:collect;SLF:collect;THC:collect;DOC:collect'
N_WFW = 'Incl AMS,BAF,BRS,CGD,EPH,HEA,LSF,MBS,OBS,PSS,WRC; EFS $120/240; CSS+SLF+THC+Docs extra; CY/CY'

WFW_P1_F = '2026-05-01'; WFW_P1_T = '2026-05-14'
WFW_P2_F = '2026-05-15'; WFW_P2_T = '2026-05-31'

def wfw(dc, dp, r20_p1, r40_p1, r20_p2, r40_p2):
    out = []
    out.append(row(dc, dp, r20_p1, r40_p1, WFW_P1_F, WFW_P1_T, None, S_WFW, N_WFW, WFW_CL))
    out.append(row(dc, dp, r20_p2, r40_p2, WFW_P2_F, WFW_P2_T, None, S_WFW, N_WFW, WFW_CL))
    return '\n'.join(out)

# ================================================================
# ZFW — Southern Africa
# ================================================================
ZFW_CL = (
    "ONE (Ocean Network Express) | Nhava Sheva origin | Southern Africa ZFW rates"
    "|Period 1: 01-14 May 2026 | Period 2: 15-31 May 2026 (vessel basis)"
    "|Rates inclusive of: AMS, BAF, BRS, CGD, HEA, MBS, OBS, PSS, WRC"
    "|Sub to: CSS collect | SLF collect | THL+DOC both ends | EFS USD 120/20' 240/40'"
    "|PRS: ZAR 52/container (collect) | HAZ: USD 200/TEU | 14 days free detention for Dry"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)
S_ZFW = 'AMS:incl;BAF:incl;BRS:incl;CGD:incl;HEA:incl;MBS:incl;OBS:incl;PSS:incl;WRC:incl;EFS:120/20-240/40;PRS:ZAR52/ctr;CSS:collect;SLF:collect;THC:collect;DOC:collect'
N_ZFW = 'Incl AMS,BAF,BRS,CGD,HEA,MBS,OBS,PSS,WRC; EFS $120/240; PRS ZAR52; CSS+SLF+THC+Docs extra; CY/CY'

ZFW_P1_F = '2026-05-01'; ZFW_P1_T = '2026-05-14'
ZFW_P2_F = '2026-05-15'; ZFW_P2_T = '2026-05-31'

def zfw(dc, dp, r20_p1, r40_p1, r20_p2, r40_p2):
    out = []
    out.append(row(dc, dp, r20_p1, r40_p1, ZFW_P1_F, ZFW_P1_T, None, S_ZFW, N_ZFW, ZFW_CL))
    out.append(row(dc, dp, r20_p2, r40_p2, ZFW_P2_F, ZFW_P2_T, None, S_ZFW, N_ZFW, ZFW_CL))
    return '\n'.join(out)

# ================================================================
# BUILD OUTPUT
# ================================================================
lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) — NHAVA SHEVA COMPILED May 2026")
lines.append("-- Sections: MRG EA/WA/RS | WEW Europe | WMW MED | AUS/NZS")
lines.append("--            CSE Caribbean | LEW LAEC | LWE LAWC")
lines.append("--            EFW East Africa | WFW West Africa | ZFW Southern Africa")
lines.append("-- Origin: NHAVA SHEVA (INNSA)")
lines.append("-- RATE_40 = 40'HC; where 40'GP differs, noted in NOTES")
lines.append("-- Gulf ports (Jebel Ali/Dammam/Riyadh etc): no offer — skipped")
lines.append("-- Kwangyang 20'=10089 (corrupt) + General Santos 40D=8624 (corrupt): skipped")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# MRG SECTION
# ============================================================
lines.append("-- ======== MRG: EA / WA / RS (May 2026, full month) ========")
lines.append("-- Inclusive: ISL, OBS, PSF, SLF | EFS $60/20 $120/40 extra")
lines.append("")

lines.append("-- Brunei")
lines.append(mrg('Brunei',       'MUARA',                   871,  1649, 'SINGAPORE'))
lines.append("")

lines.append("-- Indonesia")
lines.append(mrg('Indonesia',    'PANJANG TERMINAL',        859,  1601, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'CIKARANG',                740,   905, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'PALEMBANG',               265,   575, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'BELAWAN',                 249,   577, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'JAKARTA',                  79,   125, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'SEMARANG',                195,   250, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'SURABAYA',                163,   160, 'SINGAPORE'))
lines.append(mrg('Indonesia',    'BALIKPAPAN',              750,  1375, 'SINGAPORE'))
lines.append("")

lines.append("-- China — Guangdong (via Hong Kong CIP)")
lines.append(mrg('China',        'QINZHOU',                 156,   365, 'HONG KONG'))
lines.append(mrg('China',        'GUANGZHOU',               585,   805, 'HONG KONG'))
lines.append(mrg('China',        'BEIJIAO',                  25,    50, 'HONG KONG'))
lines.append(mrg('China',        'GAOLAN',                  206,   445, 'HONG KONG'))
lines.append(mrg('China',        'GONGYI',                  100,   150, 'HONG KONG'))
lines.append(mrg('China',        'HUANGPU',                  25,    50, 'HONG KONG'))
lines.append(mrg('China',        'JIANGMEN',                100,    75, 'HONG KONG'))
lines.append(mrg('China',        'NANSHA',                   75,   135, 'HONG KONG'))
lines.append(mrg('China',        'RONGQI',                   50,   185, 'HONG KONG'))
lines.append(mrg('China',        'SANSHAN',                 200,   225, 'HONG KONG'))
lines.append(mrg('China',        'XIAOLAN',                  15,    25, 'HONG KONG'))
lines.append(mrg('China',        'ZHONGSHAN',                15,    25, 'HONG KONG'))
lines.append(mrg('China',        'ZHUHAI',                   15,    25, 'HONG KONG'))
lines.append("")

lines.append("-- China — Fujian (via Hong Kong CIP)")
lines.append(mrg('China',        'FUZHOU',                  290,   240, 'HONG KONG'))
lines.append(mrg('China',        'XIAMEN',                  195,   259, 'HONG KONG', xn='40D=$260'))
lines.append("")

lines.append("-- China — Shenzhen (via Hong Kong CIP)")
lines.append(mrg('China',        'SHEKOU',                  235,   260, 'HONG KONG'))
lines.append(mrg('China',        'YANTIAN',                 215,   265, 'HONG KONG'))
lines.append("")

lines.append("-- China — N.PRC")
lines.append(mrg('China',        'DALIAN',                  260,   300, 'SINGAPORE'))
lines.append(mrg('China',        'QINGDAO',                   5,     5, None))
lines.append(mrg('China',        'XINGANG',                   5,     5, None))
lines.append(mrg('China',        'LIANYUNGANG',             197,   146, 'SHANGHAI'))
lines.append("")

lines.append("-- China — C.PRC (Shanghai area)")
lines.append(mrg('China',        'CHONGQING',               685,   485, 'HONG KONG'))
lines.append(mrg('China',        'NANTONG',                 217,    50, 'SHANGHAI'))
lines.append(mrg('China',        'NINGBO',                    5,     5, None))
lines.append(mrg('China',        'SHANGHAI',                  5,     5, None))
lines.append(mrg('China',        'WUHAN',                    80,    25, 'SHANGHAI', xn='40D=$300 (unusual)'))
lines.append(mrg('China',        'ZHANGJIAGANG',             55,   200, 'SHANGHAI'))
lines.append("")

lines.append("-- Hong Kong")
lines.append(mrg('Hong Kong',    'HONG KONG',                 5,     5, None))
lines.append("")

lines.append("-- Taiwan")
lines.append(mrg('Taiwan',       'KAOHSIUNG',               110,   255, None))
lines.append(mrg('Taiwan',       'KEELUNG',                 495,   680, 'KAOHSIUNG'))
lines.append(mrg('Taiwan',       'TAICHUNG',                210,   525, 'KAOHSIUNG'))
lines.append(mrg('Taiwan',       'TAOYUAN',                 300,   590, 'KAOHSIUNG'))
lines.append("")

lines.append("-- Korea")
lines.append(mrg('South Korea',  'PUSAN',                     5,    10, None))
lines.append(mrg('South Korea',  'INCHEON',                  25,     5, 'SINGAPORE'))
# Kwangyang 20'=10089 corrupt — skipped
lines.append("-- Kwangyang: 20'=10089 (corrupt data on source sheet) — SKIPPED")
lines.append("")

lines.append("-- Japan (YAS inclusive)")
lines.append(mjp('Japan',        'HIROSHIMA',               485,   306, 'SINGAPORE'))
lines.append(mjp('Japan',        'OITA',                    380,   950, 'SINGAPORE'))
lines.append(mjp('Japan',        'HAKATA',                  490,   815, 'SINGAPORE'))
lines.append(mjp('Japan',        'NIIGATA',                 332,   375, 'SINGAPORE'))
lines.append(mjp('Japan',        'SHIMIZU',                 345,   220, 'SINGAPORE'))
lines.append(mjp('Japan',        'TOMAKOMAI',               358,   495, 'SINGAPORE'))
lines.append(mjp('Japan',        'KOBE',                     25,    50, 'SINGAPORE'))
lines.append(mjp('Japan',        'MATSUYAMA',               465,   480, 'SINGAPORE'))
lines.append(mjp('Japan',        'MIZUSHIMA',               365,   775, 'SINGAPORE'))
lines.append(mjp('Japan',        'MOJI',                    200,   530, 'SINGAPORE'))
lines.append(mjp('Japan',        'NAGOYA',                  172,    50, 'SINGAPORE'))
lines.append(mjp('Japan',        'OSAKA',                   250,   420, 'SINGAPORE'))
lines.append(mjp('Japan',        'SENDAI',                  690,   660, 'SINGAPORE', xn='40D=$659'))
lines.append(mjp('Japan',        'SHIBUSHI',                510,   745, 'SINGAPORE'))
lines.append(mjp('Japan',        'TOKYO',                   220,   220, 'SINGAPORE'))
lines.append(mjp('Japan',        'YOKKAICHI',               218,    50, 'SINGAPORE'))
lines.append(mjp('Japan',        'YOKOHAMA',                135,    50, 'SINGAPORE'))
lines.append(mjp('Japan',        'HACHINOHE',              1002,  1503, 'SINGAPORE'))
lines.append("")

lines.append("-- Vietnam")
lines.append(mrg('Vietnam',      'HAIPHONG',                 99,   100, 'SINGAPORE'))
lines.append(mrg('Vietnam',      'DANANG',                  435,   470, 'SINGAPORE'))
lines.append(mrg('Vietnam',      'HO CHI MINH',              15,    30, None))
lines.append(mrg('Vietnam',      'HO CHI MINH (CAI MEP)',     5,     5, None))
lines.append("")

lines.append("-- Thailand")
lines.append(mrg('Thailand',     'BANGKOK (BMT/PAT)',         49,    50, 'LAEM CHABANG'))
lines.append(mrg('Thailand',     'LAEM CHABANG',             20,    30, None))
lines.append(mrg('Thailand',     'LAT KRABANG',              25,    35, 'LAEM CHABANG'))
lines.append(mrg('Thailand',     'SONGKHLA',                145,   125, 'SINGAPORE'))
lines.append("")

lines.append("-- Cambodia")
lines.append(mrg('Cambodia',     'PHNOM PENH',              265,   670, 'SINGAPORE'))
lines.append(mrg('Cambodia',     'SIHANOUKVILLE',           274,   200, 'SINGAPORE'))
lines.append("")

lines.append("-- Malaysia")
lines.append(mrg('Malaysia',     'PASIR GUDANG',            100,   100, 'SINGAPORE'))
lines.append(mrg('Malaysia',     'PENANG',                  115,   150, 'SINGAPORE'))
lines.append(mrg('Malaysia',     'PORT KLANG',                5,    10, None))
lines.append(mrg('Malaysia',     'KUCHING',                 720,  1285, 'SINGAPORE'))
lines.append(mrg('Malaysia',     'KOTA KINABALU',           791,  1323, 'SINGAPORE'))
lines.append("")

lines.append("-- Singapore")
lines.append(mrg('Singapore',    'SINGAPORE',                 5,    10, None))
lines.append("")

lines.append("-- Philippines")
lines.append(mrg('Philippines',  'MANILA',                  249,   365, 'SINGAPORE'))
lines.append(mrg('Philippines',  'SUBIC',                   323,   533, 'SINGAPORE'))
lines.append(mrg('Philippines',  'CEBU',                    285,   365, 'SINGAPORE'))
lines.append(mrg('Philippines',  'BATANGAS',                700,   500, None))
# General Santos 40D=8624 HC=8623 (corrupt) — skipped
lines.append("-- General Santos: 40D=8624/HC=8623 (corrupt data) — SKIPPED")
lines.append("")

lines.append("-- Myanmar")
lines.append(mrg('Myanmar',      'YANGON',                  459,   538, 'SINGAPORE'))
lines.append("")

lines.append("-- Bangladesh (THD+CGD inclusive)")
lines.append(mrg('Bangladesh',   'CHITTAGONG',              850,  1000, 'COLOMBO', S_MRG_BD, N_MRG_BD))
lines.append(mrg('Bangladesh',   'DHAKA',                  1635,  2150, 'COLOMBO', S_MRG_BD, N_MRG_BD, '40D=$2615'))
lines.append("")

lines.append("-- Sri Lanka")
lines.append(mrg('Sri Lanka',    'COLOMBO',                 319,   413, None))
lines.append("")

lines.append("-- Maldives")
lines.append(mrg('Maldives',     'MALE',                   1367,  2160, 'COLOMBO'))
lines.append("")

lines.append("-- Red Sea / Indian Ocean")
lines.append(mrg('Egypt',        'AL SOKHNA',              1400,  1800, None))
lines.append(mrg('Saudi Arabia', 'JEDDAH',                 1250,  1650, None))
lines.append("")

lines.append("-- Gulf / Middle East: NO OFFER — all skipped")
lines.append("-- Jebel Ali (UAE), Dammam (SA), Riyadh (SA), Bahrain, Shuaiba (KW)")
lines.append("-- Ajman (UAE), Shuwaikh (KW), Sohar (OM), Hamad (QA), Umm Qasr (IQ), Abu Dhabi (UAE)")
lines.append("")

# ============================================================
# WEW SECTION
# ============================================================
lines.append("-- ======== WEW: EUROPE (07-15 May + 16-31 May 2026) ========")
lines.append("-- Incl CAF,CSS,HEA,MBS | Extra: OBS $117 EES $95 EFS $120/240 ESD SLF THC")
lines.append("-- BILBAO/GIJON/VIGO: Incl CAF,CSS,MBS (no HEA) | UK: EES not applicable")
lines.append("-- RATE_40 = 40'HC; GAVLE 40GP=$1610; OULU 40GP=$3260")
lines.append("")

lines.append("-- Belgium / Germany / Netherlands")
lines.append(eur2('Belgium',     'ANTWERP',               1325, 1060))
lines.append(eur2('Germany',     'HAMBURG',               1325, 1060))
lines.append(eur2('Netherlands', 'ROTTERDAM',             1325, 1060))
lines.append("")

lines.append("-- Denmark")
lines.append(eur2('Denmark',     'AALBORG',               1750, 1635))
lines.append(eur2('Denmark',     'AARHUS',                1525, 1260))
lines.append(eur2('Denmark',     'COPENHAGEN',            1525, 1260))
lines.append(eur2('Denmark',     'FREDERICIA',            1525, 1260, via='HAMBURG'))
lines.append("")

lines.append("-- Estonia / Latvia / Lithuania")
lines.append(eur2('Estonia',     'TALLINN',               1575, 1360))
lines.append(eur2('Latvia',      'RIGA',                  1575, 1360))
lines.append(eur2('Lithuania',   'KLAIPEDA',              1575, 1360))
lines.append("")

lines.append("-- Spain (Bilbao/Gijon/Vigo: CAF,CSS,MBS only — no HEA)")
lines.append(eur2('Spain',       'BILBAO',                1895, 1785, nohe=True))
lines.append(eur2('Spain',       'GIJON',                 1895, 1785, nohe=True))
lines.append(eur2('Spain',       'VIGO',                  1895, 1785, nohe=True))
lines.append("")

lines.append("-- Finland")
lines.append(eur2('Finland',     'HELSINKI',              1475, 1260))
lines.append(eur2('Finland',     'KOTKA',                 1475, 1260))
lines.append(eur2('Finland',     'OULU',                  2685, 2660, xn='40GP=$3260'))
lines.append(eur2('Finland',     'RAUMA',                 1475, 1260))
lines.append("")

lines.append("-- France")
lines.append(eur2('France',      'LE HAVRE (SEINE-MARITIME)', 1375, 1160))
lines.append("")

lines.append("-- UK (EES not applicable)")
lines.append(eur2('UK',          'BELFAST',               2025, 1510, uk=True))
lines.append(eur2('UK',          'COATBRIDGE (NORTH LANARKSHIRE)', 1925, 1640, uk=True))
lines.append(eur2('UK',          'GRANGEMOUTH (FALKIRK)', 1825, 1740, uk=True))
lines.append(eur2('UK',          'IMMINGHAM (LINCOLNSHIRE)', 1825, 1860, uk=True, via='ROTTERDAM'))
lines.append(eur2('UK',          'SOUTHAMPTON',           1325, 1060, uk=True))
lines.append(eur2('UK',          'SOUTH SHIELDS (TYNE AND WEAR)', 1795, 1940, uk=True))
lines.append(eur2('UK',          'TEESPORT (NORTH YORKSHIRE)', 1825, 1740, uk=True))
lines.append("")

lines.append("-- Ireland")
lines.append(eur2('Ireland',     'DUBLIN',                1725, 1510))
lines.append(eur2('Ireland',     'CORK',                  1725, 1510))
lines.append("")

lines.append("-- Norway")
lines.append(eur2('Norway',      'BERGEN',                2125, 2560))
lines.append(eur2('Norway',      'FREDRIKSTAD',           2050, 2060))
lines.append(eur2('Norway',      'KRISTIANSAND S.',       2075, 2260))
lines.append(eur2('Norway',      'LARVIK',                2025, 2185))
lines.append(eur2('Norway',      'OSLO',                  2275, 2060))
lines.append("")

lines.append("-- Poland")
lines.append(eur2('Poland',      'GDANSK',                1375, 1160))
lines.append(eur2('Poland',      'GDYNIA',                1375, 1160))
lines.append("")

lines.append("-- Portugal (via Rotterdam)")
lines.append(eur2('Portugal',    'LEIXOES',               1475, 1360, via='ROTTERDAM'))
lines.append(eur2('Portugal',    'LISBON',                1475, 1360, via='ROTTERDAM'))
lines.append("")

lines.append("-- Sweden")
lines.append(eur2('Sweden',      'AAHUS',                 1825, 1610))
lines.append(eur2('Sweden',      'GOTHENBURG',            1375, 1160))
lines.append(eur2('Sweden',      'GAVLE',                 1625, 1510, xn='40GP=$1610'))
lines.append(eur2('Sweden',      'HELSINGBORG',           1525, 1310))
lines.append(eur2('Sweden',      'NORRKOPING',            2575, 2710))
lines.append(eur2('Sweden',      'SODERTALJE',            1775, 1760))
lines.append(eur2('Sweden',      'STOCKHOLM',             2525, 2760))
lines.append("")

# ============================================================
# WMW SECTION
# ============================================================
lines.append("-- ======== WMW: MED (01-15 May + 16-31 May 2026) ========")
lines.append("-- Incl CAF,CSS,MBS | Extra: OBS $119 EES $182 EFS $120/240 ESD HEA THC")
lines.append("-- VARNA: 20'=$2710 > 40'/HC=$2400 (sheet data stored as-is)")
lines.append("")

lines.append("-- Albania")
lines.append(med2('Albania',     'DURRES',                1800, 1800))
lines.append("")

lines.append("-- Bulgaria")
lines.append(med2('Bulgaria',    'BOURGAS',               2145, 2285))
lines.append(med2('Bulgaria',    'VARNA',                 2710, 2400))   # 20'>40' — store as sheet
lines.append("")

lines.append("-- Croatia")
lines.append(med2('Croatia',     'RIJEKA',                2095, 2185))
lines.append("")

lines.append("-- Egypt")
lines.append(med2('Egypt',       'ALEXANDRIA',            1745, 1485))
lines.append(med2('Egypt',       'DAMIETTA',              1645, 1285))
lines.append("")

lines.append("-- France")
lines.append(med2('France',      'FOS-SUR-MER (BOUCHES DU RHONE)', 1645, 1285))
lines.append("")

lines.append("-- Greece")
lines.append(med2('Greece',      'PIRAEUS',               1645, 1285))
lines.append(med2('Greece',      'THESSALONIKI',          1745, 1485))
lines.append("")

lines.append("-- Israel")
lines.append(med2('Israel',      'ASHDOD',                1845, 1685))
lines.append(med2('Israel',      'HAIFA',                 1845, 1685))
lines.append("")

lines.append("-- Italy")
lines.append(med2('Italy',       'ANCONA',                1695, 1385))
lines.append(med2('Italy',       'GENOA',                 1645, 1285))
lines.append(med2('Italy',       'LA SPEZIA',             1645, 1285))
lines.append(med2('Italy',       'LIVORNO',               1845, 1685))
lines.append(med2('Italy',       'RAVENNA',               2045, 1985))
lines.append(med2('Italy',       'TRIESTE',               2095, 2085))
lines.append(med2('Italy',       'VENICE',                1745, 1485))
lines.append("")

lines.append("-- Lebanon")
lines.append(med2('Lebanon',     'BEIRUT',                1795, 1585))
lines.append("")

lines.append("-- Morocco")
lines.append(med2('Morocco',     'CASABLANCA',            3440, 4540))
lines.append(med2('Morocco',     'TANGIER',               2940, 3540))
lines.append("")

lines.append("-- Romania")
lines.append(med2('Romania',     'CONSTANTA',             2145, 2285))
lines.append("")

lines.append("-- Slovenia")
lines.append(med2('Slovenia',    'KOPER',                 1695, 1385))
lines.append("")

lines.append("-- Spain")
lines.append(med2('Spain',       'ALGECIRAS',             1645, 1285))
lines.append(med2('Spain',       'BARCELONA',             1645, 1285))
lines.append(med2('Spain',       'VALENCIA',              1645, 1285))
lines.append("")

lines.append("-- Turkey")
lines.append(med2('Turkey',      'ALIAGA',                1695, 1385))
lines.append(med2('Turkey',      'GEMLIK',                1895, 1785))
lines.append(med2('Turkey',      'ISKENDERUN',            1745, 1485))
lines.append(med2('Turkey',      'ISTANBUL',              1695, 1385))
lines.append(med2('Turkey',      'IZMIT',                 1695, 1385))
lines.append(med2('Turkey',      'MERSIN',                1695, 1385))
lines.append("")

# ============================================================
# AUS / NZS SECTION
# ============================================================
lines.append("-- ======== AUS/NZS: Australia & New Zealand (01-14 May + 15-31 May 2026) ========")
lines.append("-- Incl MBS,OBS | Extra: ISL $32 SLF $10 EFS $120/240 THC DOC")
lines.append("-- AUEC (AUMEL AUBNE) = Melbourne + Brisbane East Coast group — stored as separate ports")
lines.append("")

lines.append("-- Australia")
lines.append(aus2('Australia',   'ADELAIDE',                925, 1850))
lines.append(aus2('Australia',   'MELBOURNE',               925, 1850))
lines.append(aus2('Australia',   'BRISBANE',                925, 1850))
lines.append(aus2('Australia',   'FREMANTLE',               925, 1850, via='SINGAPORE', xn='via Singapore WAU service'))
lines.append(aus2('Australia',   'SYDNEY',                  925, 1850))
lines.append("")

lines.append("-- New Zealand")
lines.append(aus2('New Zealand', 'AUCKLAND',                900, 1700))
lines.append(aus2('New Zealand', 'NEW ZEALAND BASE PORTS',  900, 1700))
lines.append("")

# ============================================================
# CSE SECTION
# ============================================================
lines.append("-- ======== CSE: Caribbean / Central America (08-15 May + 16-22 May 2026) ========")
lines.append("-- Incl EFS,MBS,OBS,PSS | Flat rate: 20=40=HC | Rates differ by period")
lines.append("-- Extra: PCT $40/teu CSS $15 SLF $10 HEA THC DOC")
lines.append("")

lines.append("-- Aruba")
lines.append(cse('Aruba',                  'BARCADERA (ORANJESTAD)',    5600, 5800))
lines.append("")
lines.append("-- Barbados")
lines.append(cse('Barbados',               'BRIDGETOWN',                5600, 5800))
lines.append("")
lines.append("-- Brazil")
lines.append(cse('Brazil',                 'MANAUS',                    4400, 5200))
lines.append(cse('Brazil',                 'VILA DO CONDE',             4400, 5200))
lines.append("")
lines.append("-- Colombia")
lines.append(cse('Colombia',               'BARRANQUILLA',              3500, 3800))
lines.append(cse('Colombia',               'CARTAGENA',                 3500, 3800))
lines.append(cse('Colombia',               'SANTA MARTA',               3500, 3800))
lines.append("")
lines.append("-- Costa Rica")
lines.append(cse('Costa Rica',             'MOIN',                      3900, 4100))
lines.append("")
lines.append("-- Curacao")
lines.append(cse('Curacao',                'WILLEMSTAD',                6600, 6800))
lines.append("")
lines.append("-- Dominican Republic")
lines.append(cse('Dominican Republic',     'CAUCEDO',                   3500, 3800))
lines.append(cse('Dominican Republic',     'RIO HAINA',                 4100, 4300))
lines.append("")
lines.append("-- Guatemala")
lines.append(cse('Guatemala',              'SANTO TOMAS DE CASTILLA',   3900, 4100))
lines.append("")
lines.append("-- Guyana")
lines.append(cse('Guyana',                 'GEORGETOWN',                5600, 5800))
lines.append("")
lines.append("-- Haiti")
lines.append(cse('Haiti',                  'PORT AU PRINCE',            4400, 4700, xn='Due Diligence required'))
lines.append("")
lines.append("-- Honduras")
lines.append(cse('Honduras',               'PUERTO CORTES',             3900, 3800))
lines.append("")
lines.append("-- Jamaica")
lines.append(cse('Jamaica',                'KINGSTON',                  4000, 4100))
lines.append("")
lines.append("-- Panama")
lines.append(cse('Panama',                 'COLON FREE ZONE',           3300, 3500))
lines.append(cse('Panama',                 'MANZANILLO',                3200, 3400))
lines.append("")
lines.append("-- Puerto Rico")
lines.append(cse('Puerto Rico',            'SAN JUAN',                  4400, 4700, xn='FMC governed; file SC before gate-in'))
lines.append("")
lines.append("-- Suriname")
lines.append(cse('Suriname',               'PARAMARIBO',                5600, 5800))
lines.append("")
lines.append("-- Trinidad & Tobago")
lines.append(cse('Trinidad & Tobago',      'PORT OF SPAIN',             3500, 3800))
lines.append("")
lines.append("-- Venezuela")
lines.append(cse('Venezuela',              'LA GUAIRA',                 4400, 4800))
lines.append(cse('Venezuela',              'PUERTO CABELLO',            4400, 4800))
lines.append("")

# ============================================================
# LEW SECTION
# ============================================================
lines.append("-- ======== LEW: LAEC East Coast (T/S + Direct routing) ========")
lines.append("-- T/S via ESALG: 01-14 May and 15-31 May | T/S via NLRTM: 01-14 May and 15-31 May")
lines.append("-- Direct: 08-14 May (P1) and 15-21 May (P2)")
lines.append("-- Incl EFS,HEA,MBS,OBS,PSS | Extra: CSS $15 SLF $10 THC DOC")
lines.append("")

lines.append("-- Argentina — Buenos Aires")
lines.append(lew_ts('Argentina',      'BUENOS AIRES',         1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Argentina',      'BUENOS AIRES',         1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Argentina',      'BUENOS AIRES',         3600, 3700, 4200, 4300))
lines.append("")

lines.append("-- Brazil — Santos region")
lines.append(lew_ts('Brazil',         'ITAPOA',               1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Brazil',         'ITAPOA',               1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Brazil',         'ITAPOA',               3600, 3700, 4200, 4300))
lines.append("")
lines.append(lew_dr('Brazil',         'NAVEGANTES',           3600, 3700, 4200, 4300))
lines.append(lew_dr('Brazil',         'PECEM',                5000, 5200, 5600, 5800))
lines.append("")
lines.append(lew_ts('Brazil',         'PARANAGUA',            1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Brazil',         'PARANAGUA',            1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Brazil',         'PARANAGUA',            3600, 3700, 4200, 4300))
lines.append("")
lines.append(lew_dr('Brazil',         'RIO GRANDE',           3600, 3700, 4200, 4300))
lines.append("")
lines.append(lew_ts('Brazil',         'RIO DE JANEIRO',       1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Brazil',         'RIO DE JANEIRO',       1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Brazil',         'RIO DE JANEIRO',       3600, 3700, 4200, 4300))
lines.append("")
lines.append(lew_dr('Brazil',         'SALVADOR',             5000, 5200, 5600, 5800))
lines.append("")
lines.append(lew_ts('Brazil',         'SANTOS',               1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Brazil',         'SANTOS',               1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Brazil',         'SANTOS',               3600, 3700, 4200, 4300))
lines.append("")
lines.append(lew_dr('Brazil',         'SUAPE',                5000, 5200, 5600, 5800))
lines.append("")

lines.append("-- Paraguay — Asuncion")
lines.append(lew_ts('Paraguay',       'ASUNCION',             3200, 3400, 'ALGECIRAS'))
lines.append(lew_ts('Paraguay',       'ASUNCION',             3200, 3400, 'ROTTERDAM'))
lines.append(lew_dr('Paraguay',       'ASUNCION',             4900, 5400, 5500, 6000))
lines.append("")

lines.append("-- Uruguay — Montevideo")
lines.append(lew_ts('Uruguay',        'MONTEVIDEO',           1500, 1700, 'ALGECIRAS'))
lines.append(lew_ts('Uruguay',        'MONTEVIDEO',           1500, 1700, 'ROTTERDAM'))
lines.append(lew_dr('Uruguay',        'MONTEVIDEO',           3600, 3700, 4200, 4300))
lines.append("")

# ============================================================
# LWE SECTION
# ============================================================
lines.append("-- ======== LWE: LAWC West Coast (01-14 May P1 + 15-31 May P2) ========")
lines.append("-- Incl BAF,BRS,EFS,MBS,OBS,PSS | Extra: HEA CSS $15 SLF $10 ENS(MX) THC DOC")
lines.append("")

lines.append("-- Chile")
lines.append(lwe('Chile',         'ARICA',               2575, 3350, 2875, 3650))
lines.append(lwe('Chile',         'CORONEL',             2275, 2650, 2575, 2950))
lines.append(lwe('Chile',         'IQUIQUE',             2475, 3350, 2775, 3650))
lines.append(lwe('Chile',         'LIRQUEN',             2275, 2650, 2575, 2950))
lines.append(lwe('Chile',         'PUERTO ANGAMOS',      2475, 3350, 2775, 3650))
lines.append(lwe('Chile',         'SAN ANTONIO',         2175, 2550, 2475, 2850))
lines.append(lwe('Chile',         'SAN VICENTE',         2275, 2650, 2575, 2950))
lines.append(lwe('Chile',         'VALPARAISO',          2175, 2550, 2475, 2850))
lines.append("")

lines.append("-- Colombia")
lines.append(lwe('Colombia',      'BUENAVENTURA',        2175, 2550, 2475, 2850))
lines.append("")

lines.append("-- Costa Rica")
lines.append(lwe('Costa Rica',    'PUERTO CALDERA',      2575, 3350, 2875, 3650))
lines.append("")

lines.append("-- Ecuador")
lines.append(lwe('Ecuador',       'GUAYAQUIL',           2175, 2550, 2475, 2850))
lines.append(lwe('Ecuador',       'POSORJA',             1975, 2350, 2275, 2650))
lines.append("")

lines.append("-- El Salvador")
lines.append(lwe('El Salvador',   'ACAJUTLA',            2575, 3350, 2875, 3650))
lines.append("")

lines.append("-- Guatemala")
lines.append(lwe('Guatemala',     'PUERTO QUETZAL',      2475, 3350, 2775, 3650))
lines.append("")

lines.append("-- Honduras")
lines.append(lwe('Honduras',      'SAN LORENZO',         4898, 5673, 5198, 5973))
lines.append("")

lines.append("-- Mexico")
lines.append(lwe('Mexico',        'ENSENADA',            2475, 3350, 2775, 3650))
lines.append(lwe('Mexico',        'LAZARO CARDENAS',     2175, 2550, 2475, 2850))
lines.append(lwe('Mexico',        'MANZANILLO',          2175, 2550, 2475, 2850))
lines.append("")

lines.append("-- Nicaragua")
lines.append(lwe('Nicaragua',     'CORINTO',             2575, 3350, 2875, 3650))
lines.append("")

lines.append("-- Panama")
lines.append(lwe('Panama',        'PANAMA CITY',         2725, 3600, 3025, 3900))
lines.append(lwe('Panama',        'RODMAN',              2575, 3550, 2875, 3850))
lines.append("")

lines.append("-- Peru")
lines.append(lwe('Peru',          'CALLAO',              2175, 2550, 2475, 2850))
lines.append("")

# ============================================================
# EFW SECTION
# ============================================================
lines.append("-- ======== EFW: East Africa (01-14 May P1 + 15-31 May P2) ========")
lines.append("-- Incl AMS,BAF,BRS,CGD,HEA,LSF,MBS,OBS,PSS,WRC | Extra: EFS CSS SLF THC DOC")
lines.append("")

lines.append(efw('Kenya',         'MOMBASA',             1850, 1850, 1400, 1500))
lines.append(efw('Tanzania',      'DAR ES SALAAM',       1950, 1950, 1500, 1600))
lines.append("")

# ============================================================
# WFW SECTION
# ============================================================
lines.append("-- ======== WFW: West Africa (01-14 May P1 + 15-31 May P2) ========")
lines.append("-- Incl AMS,BAF,BRS,CGD,EPH,HEA,LSF,MBS,OBS,PSS,WRC | Extra: EFS CSS SLF THC DOC")
lines.append("")

lines.append("-- Benin")
lines.append(wfw('Benin',         'COTONOU',             3200, 4200, 3200, 4200))
lines.append("")

lines.append("-- Ivory Coast")
lines.append(wfw("Ivory Coast",   'ABIDJAN',             3200, 4200, 1700, 2100))
lines.append("")

lines.append("-- Ghana")
lines.append(wfw('Ghana',         'TEMA',                1800, 2250, 1500, 1900))
lines.append("")

lines.append("-- Nigeria")
lines.append(wfw('Nigeria',       'APAPA',               2200, 2550, 1900, 2100))
lines.append(wfw('Nigeria',       'LEKKI',               3800, 5000, 2400, 2800))
lines.append(wfw('Nigeria',       'ONNE',                3800, 5000, 3800, 5000))
lines.append(wfw('Nigeria',       'TIN CAN',             2200, 2550, 1900, 2100))
lines.append("")

lines.append("-- Senegal")
lines.append(wfw('Senegal',       'DAKAR',               4600, 5000, 2200, 3100))
lines.append("")

lines.append("-- Togo")
lines.append(wfw('Togo',          'LOME',                3200, 4200, 3200, 4200))
lines.append("")

# ============================================================
# ZFW SECTION
# ============================================================
lines.append("-- ======== ZFW: Southern Africa (01-14 May P1 + 15-31 May P2) ========")
lines.append("-- Incl AMS,BAF,BRS,CGD,HEA,MBS,OBS,PSS,WRC | Extra: EFS PRS ZAR52 CSS SLF THC DOC")
lines.append("")

lines.append(zfw('Mozambique',    'MAPUTO',              2200, 2400, 2000, 2200))
lines.append(zfw('South Africa', 'DURBAN',               1400, 1400, 1100, 1100))
lines.append("")

# Count actual INSERT statements (each appended element may contain multiple lines)
full_text = '\n'.join(lines)
total = full_text.count('\nINSERT ') + (1 if full_text.startswith('INSERT ') else 0)
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
