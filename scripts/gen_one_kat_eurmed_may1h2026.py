import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

OC      = 'India'
OP      = 'KATTUPALLI'
SL      = 'ONE'
VF      = '2026-05-01'
VT      = '2026-05-15'
PDF_URL = 'https://in.one-line.com/standard-page/local-tariffs-and-surcharges'

EUR_CLAUSES = (
    "ONE (Ocean Network Express) | Kattupalli origin | Europe rates"
    "|Validity: 1-15 May 2026 (vessel basis; Gate In date)"
    "|Rates inclusive of: CAF, CSS, HEA, MBS"
    "|Sub to: OBS USD 117/TEU | EFS USD 160/TEU | EES USD 95/TEU (not applicable UK ports)"
    "|ESD USD 35/BL | SLF applicable | THC both ends | Docs charges extra"
    "|Rates CY/CY basis | Standard Tariff F/T at POD based on vessel sailing date"
    "|Multiple containers: last container gate-in date used for rate application"
    "|THC/Haulage: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)

MED_CLAUSES = (
    "ONE (Ocean Network Express) | Kattupalli origin | MED rates"
    "|Validity: 1-15 May 2026 (vessel basis; Gate In date)"
    "|Rates inclusive of: CAF, CSS, MBS"
    "|Sub to: OBS USD 119/TEU | EFS USD 160/TEU | EES USD 182/TEU"
    "|ESD USD 35/BL | HEA USD 300/20'D (cargo wt > 16 MT); USD 600/20'D (cargo wt > 18 MT)"
    "|THC both ends | Docs charges extra"
    "|Rates CY/CY basis | Standard Tariff F/T at POD based on vessel sailing date"
    "|Multiple containers: last container gate-in date used for rate application"
    "|THC/Haulage: https://in.one-line.com/standard-page/local-tariffs-and-surcharges"
    "|Surcharges: https://ecomm.one-line.com/ecom/CUP_HOM_3116.do?sessLocale=en"
)

# Europe: EES not applicable for UK ports
SURCH_EUR     = 'OBS:117/teu;EES:95/teu;EFS:160/teu;ESD:35/bl;SLF:collect;THC:collect;CAF:incl;CSS:incl;HEA:incl;MBS:incl'
SURCH_EUR_UK  = 'OBS:117/teu;EFS:160/teu;ESD:35/bl;SLF:collect;THC:collect;CAF:incl;CSS:incl;HEA:incl;MBS:incl'
SURCH_MED     = 'OBS:119/teu;EES:182/teu;EFS:160/teu;ESD:35/bl;HEA:300/20D>16mt-600/20D>18mt;THC:collect;CAF:incl;CSS:incl;MBS:incl'

NOTES_EUR    = 'Incl CAF,CSS,HEA,MBS; OBS $117/teu; EES $95/teu (not UK); EFS $160/teu; ESD $35/BL; SLF+THC+Docs extra; CY/CY'
NOTES_EUR_UK = 'Incl CAF,CSS,HEA,MBS; OBS $117/teu; EFS $160/teu; ESD $35/BL; EES N/A (UK); SLF+THC+Docs extra; CY/CY'
NOTES_MED    = 'Incl CAF,CSS,MBS; OBS $119/teu; EES $182/teu; EFS $160/teu; ESD $35/BL; HEA $300/20D>16MT or $600/20D>18MT extra; THC+Docs extra; CY/CY'

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, surcharges, notes, clauses):
    cl = esc(clauses)
    s  = esc(surcharges)
    n  = esc(notes)
    dp_e = esc(dp)
    dc_e = esc(dc)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,PDF_URL,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{dc_e}','{dp_e}',"
        f"'USD',{r20},{r40},'{VF}','{VT}',NULL,'{s}','{n}','{cl}','{PDF_URL}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

def eur(dc, dp, r20, r40, uk=False):
    if uk:
        return row(dc, dp, r20, r40, SURCH_EUR_UK, NOTES_EUR_UK, EUR_CLAUSES)
    return row(dc, dp, r20, r40, SURCH_EUR, NOTES_EUR, EUR_CLAUSES)

def med(dc, dp, r20, r40hq):
    return row(dc, dp, r20, r40hq, SURCH_MED, NOTES_MED, MED_CLAUSES)

lines = []
lines.append("-- ================================================================")
lines.append("-- ONE (Ocean Network Express) — Kattupalli EUR + MED Rates")
lines.append("-- Validity: 01-15 May 2026 | Vessel basis")
lines.append("-- Origin: Kattupalli (INKAT)")
lines.append("-- EUROPE: Incl CAF,CSS,HEA,MBS | Extra: OBS $117 EES $95 EFS $160 ESD $35 SLF THC Docs")
lines.append("-- MED:    Incl CAF,CSS,MBS      | Extra: OBS $119 EES $182 EFS $160 ESD $35 HEA THC Docs")
lines.append("-- Note: EES not applicable for UK ports")
lines.append("-- Note: 40'HQ rate stored as RATE_40; where 40GP differs it is noted in NOTES")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# EUROPE — 1-15 May 2026
# Rate sheet has 20'GP / 40'GP / 40'HQ
# 40GP = 40HQ in most rows; where they differ, noted below
# RATE_40 stored = 40'HQ
# ============================================================
lines.append("-- ======== EUROPE (1-15 May 2026) ========")
lines.append("")

# Main hub ports — shared rate row (one INSERT per port)
lines.append("-- North Europe hubs")
lines.append(eur('Belgium',     'ANTWERP',                    1630, 1365))
lines.append(eur('Germany',     'HAMBURG',                    1630, 1365))
lines.append(eur('Netherlands', 'ROTTERDAM',                  1630, 1365))
lines.append(eur('UK',          'SOUTHAMPTON',                1630, 1365, uk=True))
lines.append("")

lines.append("-- Denmark")
# AAHUS — listed separately in rate sheet (may be alt spelling of Aarhus with different rate)
lines.append(eur('Denmark',     'AAHUS',                      2130, 1915))
lines.append(eur('Denmark',     'AALBORG',                    2055, 1940))
lines.append(eur('Denmark',     'AARHUS',                     1830, 1565))
lines.append(eur('Denmark',     'COPENHAGEN',                 1830, 1565))
lines.append(eur('Denmark',     'FREDERICIA',                 1830, 1565))
lines.append("")

lines.append("-- Norway")
lines.append(eur('Norway',      'BERGEN',                     2430, 2865))
lines.append(eur('Norway',      'FREDRIKSTAD',                2355, 2365))
lines.append(eur('Norway',      'KRISTIANSAND S.',            2380, 2565))
lines.append(eur('Norway',      'LARVIK',                     2330, 2490))
lines.append("")

lines.append("-- Sweden")
lines.append(eur('Sweden',      'GAVLE',                      1930, 1815))   # 40GP=1915 40HQ=1815; storing 40HQ
lines.append(eur('Sweden',      'GOTHENBURG',                 1680, 1465))
lines.append(eur('Sweden',      'HELSINGBORG',                1830, 1615))
lines.append(eur('Sweden',      'NORRKOPING',                 2880, 3015))
lines.append(eur('Sweden',      'SODERTALJE',                 2080, 2065))
lines.append(eur('Sweden',      'STOCKHOLM',                  2830, 3065))
lines.append("")

lines.append("-- Finland")
lines.append(eur('Finland',     'HELSINKI',                   1780, 1565))
lines.append(eur('Finland',     'KOTKA',                      1780, 1565))
lines.append(eur('Finland',     'OULU',                       2990, 2965))   # 40GP=3565 40HQ=2965; storing 40HQ
lines.append(eur('Finland',     'RAUMA',                      1780, 1565))
lines.append("")

lines.append("-- Baltic States")
lines.append(eur('Lithuania',   'KLAIPEDA',                   1880, 1665))
lines.append(eur('Latvia',      'RIGA',                       1880, 1665))
lines.append(eur('Estonia',     'TALLINN',                    1880, 1665))
lines.append("")

lines.append("-- Poland")
lines.append(eur('Poland',      'GDANSK',                     1680, 1465))
lines.append(eur('Poland',      'GDYNIA',                     1680, 1465))
lines.append("")

lines.append("-- France")
lines.append(eur('France',      'LE HAVRE (SEINE-MARITIME)',  1680, 1465))
lines.append("")

lines.append("-- Portugal")
lines.append(eur('Portugal',    'LEIXOES',                    1780, 1665))
lines.append(eur('Portugal',    'LISBON',                     1780, 1665))
lines.append("")

lines.append("-- UK (EES not applicable)")
lines.append(eur('UK',          'BELFAST',                    2330, 1815, uk=True))
lines.append(eur('UK',          'GRANGEMOUTH (FALKIRK)',      2130, 2045, uk=True))
lines.append(eur('UK',          'IMMINGHAM (LINCOLNSHIRE)',   2130, 2165, uk=True))
lines.append(eur('UK',          'TEESPORT (NORTH YORKSHIRE)', 2130, 2045, uk=True))
lines.append("")

lines.append("-- Ireland")
lines.append(eur('Ireland',     'CORK',                       2030, 1815))
lines.append(eur('Ireland',     'DUBLIN',                     2030, 1815))
lines.append("")

# ============================================================
# MED — 1-15 May 2026
# Rate sheet has 20'GP / 40'HQ only (no separate 40'GP column)
# RATE_40 = 40'HQ
# ============================================================
lines.append("-- ======== MED (1-15 May 2026) ========")
lines.append("")

lines.append("-- Spain")
lines.append(med('Spain',       'ALGECIRAS',                  1940, 1785))
lines.append(med('Spain',       'BARCELONA',                  1940, 1785))
lines.append(med('Spain',       'BILBAO',                     2190, 2285))
lines.append(med('Spain',       'GIJON',                      2190, 2285))
lines.append(med('Spain',       'VALENCIA',                   1940, 1785))
lines.append(med('Spain',       'VIGO',                       2190, 2285))
lines.append("")

lines.append("-- France")
lines.append(med('France',      'FOS-SUR-MER (BOUCHES DU RHONE)', 1940, 1785))
lines.append("")

lines.append("-- Italy")
lines.append(med('Italy',       'ANCONA',                     1990, 1885))
lines.append(med('Italy',       'GENOA',                      1940, 1785))
lines.append(med('Italy',       'LA SPEZIA',                  1940, 1785))
lines.append(med('Italy',       'LIVORNO',                    2140, 2185))
lines.append(med('Italy',       'RAVENNA',                    2340, 2485))
lines.append(med('Italy',       'TRIESTE',                    2390, 2585))
lines.append(med('Italy',       'VENICE',                     2040, 1985))
lines.append("")

lines.append("-- Greece")
lines.append(med('Greece',      'PIRAEUS',                    1940, 1785))
lines.append(med('Greece',      'THESSALONIKI',               2040, 1985))
lines.append("")

lines.append("-- Turkey")
lines.append(med('Turkey',      'GEBZE',                      1990, 1885))
lines.append(med('Turkey',      'GEMLIK',                     2190, 2285))
lines.append(med('Turkey',      'ISKENDERUN',                 2040, 1985))
lines.append(med('Turkey',      'ISTANBUL',                   1990, 1885))
lines.append(med('Turkey',      'IZMIT',                      1990, 1885))
lines.append(med('Turkey',      'MERSIN',                     1990, 1885))
lines.append("")

lines.append("-- Israel")
lines.append(med('Israel',      'ASHDOD',                     2140, 2185))
lines.append(med('Israel',      'HAIFA',                      2140, 2185))
lines.append("")

lines.append("-- Egypt")
lines.append(med('Egypt',       'ALEXANDRIA',                 2040, 1985))
lines.append(med('Egypt',       'DAMIETTA',                   1940, 1785))
lines.append("")

lines.append("-- Adriatic / Balkans")
lines.append(med('Slovenia',    'KOPER',                      1990, 1885))
lines.append(med('Croatia',     'RIJEKA',                     2390, 2685))
lines.append(med('Albania',     'DURRES',                     2450, 2450))
lines.append("")

lines.append("-- Bulgaria / Romania")
lines.append(med('Bulgaria',    'BOURGAS',                    2440, 2785))
lines.append(med('Bulgaria',    'VARNA',                      2440, 2785))
lines.append(med('Romania',     'CONSTANTA',                  2440, 2785))
lines.append("")

lines.append("-- Lebanon")
lines.append(med('Lebanon',     'BEIRUT',                     2090, 2085))
lines.append("")

lines.append("-- Morocco")
lines.append(med('Morocco',     'CASABLANCA',                 3850, 5240))
lines.append(med('Morocco',     'TANGIER',                    3350, 4240))
lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
