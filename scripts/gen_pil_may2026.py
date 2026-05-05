import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SL  = 'PIL'
OC  = 'India'
OP  = 'NHAVA SHEVA'
CUR = 'USD'

PIL_BASE = (
    "PIL (India) Pvt. Ltd | Pacific International Lines | www.pilship.com"
    "|Subject to Seal USD 10/Cntr & SFF USD 15/BL"
    "|Subject to THC & local charges at both ends"
    "|Subject to equipment, space and service availability"
    "|Rates subject to changes in surcharges at time of shipment"
    "|CY/CY basis unless stated otherwise"
)

def esc(s): return s.replace("'", "''")

def row(dc, dp, r20, r40, vf, vt, via='', surcharges='', notes='', clauses=''):
    v  = f"'{esc(via)}'"        if via        else 'NULL'
    s  = f"'{esc(surcharges)}'" if surcharges else 'NULL'
    n  = f"'{esc(notes)}'"      if notes      else 'NULL'
    cl = esc(clauses if clauses else PIL_BASE)
    return (
        f"INSERT INTO [dbo].[FREIGHT_RATES] "
        f"(SHIPPING_LINE,ORIGIN_COUNTRY,ORIGIN_PORT,DEST_COUNTRY,DEST_PORT,"
        f"CURRENCY,RATE_20,RATE_40,VALID_FROM,VALID_TO,VIA_PORT,SURCHARGES,NOTES,CLAUSES,IS_ACTIVE,CREATED_BY,CREATED_AT,UPDATED_AT)\n"
        f"VALUES ('{SL}','{OC}','{OP}','{esc(dc)}','{esc(dp)}',"
        f"'{CUR}',{r20},{r40},'{vf}','{vt}',{v},{s},{n},'{cl}',1,'SYSTEM',GETDATE(),GETDATE());\nGO"
    )

lines = []
lines.append("-- ================================================================")
lines.append("-- PIL (India) Pvt. Ltd — May 2026 Rate Sheet")
lines.append("-- Origin: Nhava Sheva (INNSA) | www.pilship.com")
lines.append("-- Sections: Far East | Red Sea | Australia | New Zealand")
lines.append("--           East Africa | West Africa | South Africa")
lines.append("--           Indian Ocean | East Coast South America")
lines.append("--           West Coast South America | MELL Ports | South Pacific Islands")
lines.append("-- Common: Seal USD 10/Cntr | SFF USD 15/BL | THC & locals both ends")
lines.append("-- ================================================================")
lines.append("")
lines.append("USE [manilal];")
lines.append("GO")
lines.append("")

# ============================================================
# FAR EAST (Subject to EBS USD 80/TEU; Valid till 31 May 2026)
# ============================================================
VF_FE = '2026-05-01'; VT_FE = '2026-05-31'

FE_CL = (
    PIL_BASE
    + "|Far East trade"
    + "|Subject to EBS (Emergency Bunker Surcharge) USD 80/TEU"
    + "|Rates subject to local surcharges at origin and destination"
)

SURCH_FE_DIR  = 'EBS:80/teu;SEAL:10/cntr;SFF:15/bl'     # direct/main ports
SURCH_FE_TS   = 'EBS:80/teu;SEAL:10/cntr;SFF:15/bl'     # transhipment — same structure

lines.append("-- ======== FAR EAST (EBS USD 80/TEU; Valid till 31 May 2026) ========")
lines.append("")

# China — direct
lines.append("-- China (Direct ports)")
lines.append(row('China','SHANGHAI',5,5,VF_FE,VT_FE,
    surcharges=SURCH_FE_DIR,
    notes='Direct; transit 20-22 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','SHEKOU',5,5,VF_FE,VT_FE,
    surcharges=SURCH_FE_DIR,
    notes='Direct; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','NINGBO',5,5,VF_FE,VT_FE,
    surcharges=SURCH_FE_DIR,
    notes='Direct; transit 22-23 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# China — via SGSIN
lines.append("-- China (T/S via Singapore)")
lines.append(row('China','NANSHA',50,50,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25-30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','XINGANG',125,125,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 28-35 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','QINGDAO',75,150,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 35 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','QINZHOU',150,200,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 28 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# China — via CNSHA (Shanghai)
lines.append("-- China (T/S via Shanghai)")
lines.append(row('China','YANZHOU',50,50,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','NANTONG',200,375,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 30-32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','WUHU',50,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 35 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','WUHAN',50,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','YICHANG',50,50,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 34 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','YUE YANG',50,50,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 40 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','NANJING',50,50,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 36 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','CHONGQING',275,225,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 29 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','LIANYUNGANG',275,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 31 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','HUANGSHI',325,175,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','CHANGSHA',325,275,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# China — via CNSHK (Shekou/Shenzhen)
lines.append("-- China (T/S via Shekou/Shenzhen)")
lines.append(row('China','HUANGPU (GCT)',175,300,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 29 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','SANSHAN',225,375,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','SANSHUI',50,50,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 33 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','WUZHOU',50,400,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','JIUJIANG',75,125,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','YUNFU',200,275,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 33-40 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','FANGCHENG',300,575,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 31 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','SHANTOU',125,175,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 29 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','ZHANJIANG',300,75,VF_FE,VT_FE,
    via='SHEKOU',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shekou; transit 32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# China — via CNNGB (Ningbo)
lines.append("-- China (T/S via Ningbo)")
lines.append(row('China','FUZHOU (MAWEI)',300,100,VF_FE,VT_FE,
    via='NINGBO',
    surcharges=SURCH_FE_TS,
    notes='T/S via Ningbo; transit 33 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','FUZHOU (JIANGYIN)',75,650,VF_FE,VT_FE,
    via='NINGBO',
    surcharges=SURCH_FE_TS,
    notes='T/S via Ningbo; transit 30-32 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('China','WENZHOU',75,125,VF_FE,VT_FE,
    via='NINGBO',
    surcharges=SURCH_FE_TS,
    notes='T/S via Ningbo; transit 31 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Japan — via CNSHA
lines.append("-- Japan (T/S via Shanghai)")
lines.append(row('Japan','TOKYO',600,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Japan','YOKOHAMA',550,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Japan','NAGOYA',475,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Japan','KOBE',400,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Japan','OSAKA',400,75,VF_FE,VT_FE,
    via='SHANGHAI',
    surcharges=SURCH_FE_TS,
    notes='T/S via Shanghai; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Thailand
lines.append("-- Thailand (T/S via Singapore)")
lines.append(row('Thailand','LAEM CHA BANG',50,50,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Thailand','BANGKOK (PAT)',50,50,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Malaysia
lines.append("-- Malaysia")
lines.append(row('Malaysia','PORT KLANG (WEST)',5,5,VF_FE,VT_FE,
    surcharges=SURCH_FE_DIR,
    notes='Direct; transit 10 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','PASIR GUDANG',50,525,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','PENANG',300,50,VF_FE,VT_FE,
    via='PORT KLANG (WEST)',
    surcharges=SURCH_FE_TS,
    notes='T/S via Port Klang West; transit 19 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','SANDAKAN',800,900,VF_FE,VT_FE,
    via='PORT KLANG (WEST)',
    surcharges=SURCH_FE_TS,
    notes='T/S via Port Klang West; transit 26-28 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','TAWAU',800,875,VF_FE,VT_FE,
    via='PORT KLANG (WEST)',
    surcharges=SURCH_FE_TS,
    notes='T/S via Port Klang West; transit 28 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','BINTULU',400,775,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','KUCHING',850,1425,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 18-21 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','LABUAN',925,1125,VF_FE,VT_FE,
    via='PORT KLANG (WEST)',
    surcharges=SURCH_FE_TS,
    notes='T/S via Port Klang West; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','SIBU',450,1100,VF_FE,VT_FE,
    via='PORT KLANG (WEST)',
    surcharges=SURCH_FE_TS,
    notes='T/S via Port Klang West; transit 25-30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Malaysia','KOTA KINABALU',400,1250,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 21-24 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Brunei
lines.append("-- Brunei (T/S via Singapore)")
lines.append(row('Brunei','MUARA',850,1300,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Vietnam
lines.append("-- Vietnam (T/S via Singapore)")
lines.append(row('Vietnam','HAIPHONG',50,725,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Vietnam','HO CHI MINH (CAT LAI)',50,50,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 22 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Vietnam','QUI NHON',100,225,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Indonesia
lines.append("-- Indonesia (T/S via Singapore)")
lines.append(row('Indonesia','JAKARTA',525,725,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Indonesia','SURABAYA',155,475,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Indonesia','BELAWAN',300,525,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 22 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Indonesia','SEMARANG',454,679,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# South Korea
lines.append("-- South Korea (T/S via Singapore)")
lines.append(row('South Korea','BUSAN (PUSAN)',50,100,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 28 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('South Korea','INCHEON',400,750,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Philippines
lines.append("-- Philippines (T/S via Singapore)")
lines.append(row('Philippines','MANILA (NORTH)',650,1150,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Philippines','GENERAL SANTOS',600,675,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Philippines','SUBIC BAY',650,1125,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append(row('Philippines','DAVAO',550,925,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 30 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Cambodia
lines.append("-- Cambodia (T/S via Singapore)")
lines.append(row('Cambodia','SIHANOUKVILLE',600,1025,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 25 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Singapore
lines.append("-- Singapore (Direct)")
lines.append(row('Singapore','SINGAPORE',5,5,VF_FE,VT_FE,
    surcharges=SURCH_FE_DIR,
    notes='Direct; transit 12 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Myanmar
lines.append("-- Myanmar (T/S via Singapore)")
lines.append(row('Myanmar','YANGON',600,1145,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 24 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# Taiwan
lines.append("-- Taiwan (T/S via Singapore)")
lines.append(row('Taiwan','KAOHSIUNG',375,35,VF_FE,VT_FE,
    via='SINGAPORE',
    surcharges=SURCH_FE_TS,
    notes='T/S via Singapore; transit 26 days; EBS USD 80/TEU',
    clauses=FE_CL))
lines.append("")

# ============================================================
# RED SEA (HEA applicable; Valid till 14 May 2026)
# ============================================================
VF_RS = '2026-05-01'; VT_RS = '2026-05-14'

RS_CL = (
    PIL_BASE
    + "|Red Sea / Middle East trade"
    + "|HEA (Heavy Equipment/Cargo Additional): USD 200/20'GP above 24 MT (Cargo + Tare wt.)"
    + "|Rates subject to port congestion and operational surcharges"
)

SURCH_RS = 'HEA:200/20gp>24mt;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== RED SEA (HEA USD 200/20'GP > 24 MT; Valid till 14 May 2026) ========")
lines.append("")
lines.append(row('Djibouti','DJIBOUTI',2400,4575,VF_RS,VT_RS,
    via='MUNDRA',
    surcharges=SURCH_RS,
    notes='T/S via Mundra; transit 15 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append(row('Saudi Arabia','JEDDAH',2800,4600,VF_RS,VT_RS,
    via='MUNDRA/DJIBOUTI',
    surcharges=SURCH_RS,
    notes='T/S via Mundra/Djibouti; transit 34 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append(row('Egypt','AIN SOKHNA',2950,4875,VF_RS,VT_RS,
    via='MUNDRA/DJIBOUTI',
    surcharges=SURCH_RS,
    notes='T/S via Mundra/Djibouti; transit 32 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append(row('Jordan','AQABA',2900,4750,VF_RS,VT_RS,
    via='MUNDRA/DJIBOUTI',
    surcharges=SURCH_RS,
    notes='T/S via Mundra/Djibouti; transit 34 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))

PORT_SUDAN_CL = (
    RS_CL
    + "|Rate includes DTHC: USD 133/20'ST & USD 205/40'HC"
)
lines.append(row('Sudan','PORT SUDAN',3300,5500,VF_RS,VT_RS,
    via='MUNDRA/DJIBOUTI/JEDDAH',
    surcharges='HEA:200/20gp>24mt;DTHC:133/20st-205/40hc;SEAL:10/cntr;SFF:15/bl',
    notes='T/S via Mundra/Djibouti/Jeddah; transit 50 days; incl DTHC USD 133/20ST & USD 205/40HC; HEA USD 200/20GP above 24MT',
    clauses=PORT_SUDAN_CL))
lines.append(row('Yemen','ADEN',3400,5650,VF_RS,VT_RS,
    via='MUNDRA',
    surcharges=SURCH_RS,
    notes='T/S via Mundra; transit 18 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append(row('Yemen','HODEIDAH',6800,11000,VF_RS,VT_RS,
    via='MUNDRA/DJIBOUTI',
    surcharges=SURCH_RS,
    notes='T/S via Mundra/Djibouti; transit 30 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append(row('Somalia','BERBERA',2500,4600,VF_RS,VT_RS,
    via='MUNDRA',
    surcharges=SURCH_RS,
    notes='T/S via Mundra; transit 20 days; HEA USD 200/20GP above 24MT',
    clauses=RS_CL))
lines.append("")

# ============================================================
# AUSTRALIA (Valid till 14 May 2026)
# ============================================================
VF_AU = '2026-05-01'; VT_AU = '2026-05-14'

AU_CL = (
    PIL_BASE
    + "|Australia trade"
    + "|RFA No: PILSTAUOTH"
    + "|T/S via Port Klang West or Singapore"
)

SURCH_AU = 'RFA:PILSTAUOTH;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== AUSTRALIA (Valid till 14 May 2026) — RFA: PILSTAUOTH ========")
lines.append("")
for dp in ['SYDNEY','BRISBANE','MELBOURNE']:
    lines.append(row('Australia',dp,825,1550,VF_AU,VT_AU,
        via='PORT KLANG (WEST)/SINGAPORE',
        surcharges=SURCH_AU,
        notes='T/S via Port Klang West or Singapore; transit 35 days; RFA No: PILSTAUOTH',
        clauses=AU_CL))
for dp in ['FREMANTLE','ADELAIDE']:
    lines.append(row('Australia',dp,825,1550,VF_AU,VT_AU,
        via='PORT KLANG (WEST)/SINGAPORE',
        surcharges=SURCH_AU,
        notes='T/S via Port Klang West or Singapore; transit 35 days; RFA No: PILSTAUOTH',
        clauses=AU_CL))
lines.append("")

# ============================================================
# NEW ZEALAND (Valid till 31 May 2026)
# ============================================================
VF_NZ = '2026-05-01'; VT_NZ = '2026-05-31'

NZ_CL = (
    PIL_BASE
    + "|New Zealand trade"
    + "|RFA No: PILSTNZOTH"
    + "|T/S via Port Klang West or Singapore"
)

SURCH_NZ = 'RFA:PILSTNZOTH;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== NEW ZEALAND (Valid till 31 May 2026) — RFA: PILSTNZOTH ========")
lines.append("")
for dp in ['AUCKLAND','NAPIER','LYTTELTON']:
    lines.append(row('New Zealand',dp,800,1450,VF_NZ,VT_NZ,
        via='PORT KLANG (WEST)/SINGAPORE',
        surcharges=SURCH_NZ,
        notes='T/S via Port Klang West or Singapore; transit 35 days; RFA No: PILSTNZOTH',
        clauses=NZ_CL))
for dp in ['WELLINGTON','TAURANGA']:
    lines.append(row('New Zealand',dp,800,1450,VF_NZ,VT_NZ,
        via='PORT KLANG (WEST)/SINGAPORE',
        surcharges=SURCH_NZ,
        notes='T/S via Port Klang West or Singapore; transit 35 days; RFA No: PILSTNZOTH',
        clauses=NZ_CL))
lines.append("")

# ============================================================
# EAST AFRICA (HEA applicable; Valid till 14 May 2026)
# ============================================================
VF_EA = '2026-05-01'; VT_EA = '2026-05-14'

EA_CL = (
    PIL_BASE
    + "|East Africa trade; T/S via Singapore"
    + "|HEA (Heavy Cargo): USD 100/20'GP above 15 MT; USD 200/20'GP above 20 MT (Cargo + Tare wt.)"
)

SURCH_EA = 'HEA:100/20gp>15mt-200/20gp>20mt;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== EAST AFRICA (HEA applicable; Valid till 14 May 2026) ========")
lines.append("")
lines.append(row('Kenya','MOMBASA',2950,4100,VF_EA,VT_EA,
    via='SINGAPORE',
    surcharges=SURCH_EA,
    notes='T/S via Singapore; transit 35 days; HEA USD 100/20GP above 15MT; USD 200/20GP above 20MT',
    clauses=EA_CL))
lines.append(row('Tanzania','DAR ES SALAAM',2800,3800,VF_EA,VT_EA,
    via='SINGAPORE',
    surcharges=SURCH_EA,
    notes='T/S via Singapore; transit 30 days; HEA applicable',
    clauses=EA_CL))
lines.append(row('Tanzania','ZANZIBAR',3900,6200,VF_EA,VT_EA,
    via='SINGAPORE/MOMBASA',
    surcharges=SURCH_EA,
    notes='T/S via Singapore/Mombasa; transit 42 days; HEA applicable',
    clauses=EA_CL))
lines.append(row('Mozambique','BEIRA/MAPUTO',3200,4600,VF_EA,VT_EA,
    via='SINGAPORE',
    surcharges=SURCH_EA,
    notes='T/S via Singapore; transit 42 days; HEA applicable',
    clauses=EA_CL))
lines.append(row('Mozambique','NACALA',3000,4200,VF_EA,VT_EA,
    via='SINGAPORE',
    surcharges=SURCH_EA,
    notes='T/S via Singapore; transit 48 days; HEA applicable',
    clauses=EA_CL))
lines.append("")

# ============================================================
# WEST AFRICA (HEA applicable; Valid till 14 May 2026)
# ============================================================
VF_WA = '2026-05-01'; VT_WA = '2026-05-14'

WA_CL = (
    PIL_BASE
    + "|West Africa trade; T/S via Singapore"
    + "|HEA (Heavy Cargo): USD 200/20'GP above 18 MT (Cargo + Tare wt.)"
)

SURCH_WA      = 'HEA:200/20gp>18mt;SEAL:10/cntr;SFF:15/bl'
SURCH_WA_LOME = 'HEA:200/20gp>18mt;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== WEST AFRICA (HEA USD 200/20'GP > 18 MT; Valid till 14 May 2026) ========")
lines.append("")
lines.append(row('Nigeria','ONNE (NGONN)',3200,4400,VF_WA,VT_WA,
    via='SINGAPORE',
    surcharges=SURCH_WA,
    notes='T/S via Singapore; transit 50 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Nigeria','LAGOS (NGLOS)',3200,4400,VF_WA,VT_WA,
    via='SINGAPORE',
    surcharges=SURCH_WA,
    notes='T/S via Singapore; transit 40 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Ghana','TEMA (GHTEM)',2900,4200,VF_WA,VT_WA,
    via='SINGAPORE',
    surcharges=SURCH_WA,
    notes='T/S via Singapore; transit 42 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Togo','LOME (TGLFW)',2900,4200,VF_WA,VT_WA,
    via='SINGAPORE',
    surcharges=SURCH_WA,
    notes='T/S via Singapore; transit 40 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Ivory Coast','ABIDJAN (CIABJ)',2900,4200,VF_WA,VT_WA,
    via='SINGAPORE/LOME',
    surcharges=SURCH_WA_LOME,
    notes='T/S via Singapore & Lome; transit 42 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Benin','COTONOU (BJCOO)',2900,4200,VF_WA,VT_WA,
    via='SINGAPORE/LOME',
    surcharges=SURCH_WA_LOME,
    notes='T/S via Singapore & Lome; transit 50 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append(row('Cameroon','DOUALA (CMDLA)',3400,4800,VF_WA,VT_WA,
    via='SINGAPORE/LOME',
    surcharges=SURCH_WA_LOME,
    notes='T/S via Singapore & Lome; transit 50 days; HEA USD 200/20GP above 18MT',
    clauses=WA_CL))
lines.append("")

# ============================================================
# SOUTH AFRICA (HEA applicable; Valid till 14 May 2026)
# ============================================================
VF_SA_AF = '2026-05-01'; VT_SA_AF = '2026-05-14'

SA_AF_CL = (
    PIL_BASE
    + "|South Africa trade; T/S via Singapore"
    + "|HEA (Heavy Cargo): USD 200/20'GP above 14 MT (Cargo + Tare wt.)"
    + "|Subject to AMS USD 30/BL"
)

SURCH_SA_AF = 'HEA:200/20gp>14mt;AMS:30/bl;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== SOUTH AFRICA (HEA USD 200/20'GP > 14 MT; Valid till 14 May 2026) ========")
lines.append("")
lines.append(row('South Africa','DURBAN',2100,2500,VF_SA_AF,VT_SA_AF,
    via='SINGAPORE',
    surcharges=SURCH_SA_AF,
    notes='T/S via Singapore; transit 34 days; HEA USD 200/20GP above 14MT; AMS USD 30/BL',
    clauses=SA_AF_CL))
lines.append(row('South Africa','CAPE TOWN',2200,2700,VF_SA_AF,VT_SA_AF,
    via='SINGAPORE',
    surcharges=SURCH_SA_AF,
    notes='T/S via Singapore; transit 42 days; HEA USD 200/20GP above 14MT; AMS USD 30/BL',
    clauses=SA_AF_CL))
lines.append("")

# ============================================================
# INDIAN OCEAN (HEA applicable; Valid till 14 May 2026)
# ============================================================
VF_IO = '2026-05-01'; VT_IO = '2026-05-14'

IO_CL = (
    PIL_BASE
    + "|Indian Ocean trade; T/S via Singapore"
    + "|HEA (Heavy Cargo): USD 200/20'GP above 22 MT (Cargo + Tare wt.)"
)

lines.append("-- ======== INDIAN OCEAN (HEA USD 200/20'GP > 22 MT; Valid till 14 May 2026) ========")
lines.append("")
lines.append(row('Mauritius','PORT LOUIS',2300,2700,VF_IO,VT_IO,
    via='SINGAPORE',
    surcharges='HEA:200/20gp>22mt;ENS:25/bl;SEAL:10/cntr;SFF:15/bl',
    notes='T/S via Singapore; transit 35 days; HEA USD 200/20GP above 22MT; ENS USD 25/BL',
    clauses=IO_CL + '|Subject to ENS USD 25/BL'))
lines.append(row('France','REUNION (POINTE DES GALETS)',2300,2700,VF_IO,VT_IO,
    via='SINGAPORE',
    surcharges='HEA:200/20gp>22mt;ENS:25/bl;SEAL:10/cntr;SFF:15/bl',
    notes='T/S via Singapore; transit 30 days; HEA USD 200/20GP above 22MT; ENS USD 25/BL',
    clauses=IO_CL + '|Subject to ENS USD 25/BL'))
lines.append(row('Madagascar','TAMATAVE',2500,3200,VF_IO,VT_IO,
    via='SINGAPORE',
    surcharges='HEA:200/20gp>22mt;EID:67/teu-collect;SEAL:10/cntr;SFF:15/bl',
    notes='T/S via Singapore; transit 42 days; HEA USD 200/20GP above 22MT; EID USD 67/TEU on collect',
    clauses=IO_CL + '|Subject to EID USD 67/TEU on collect basis'))
lines.append("")

# ============================================================
# EAST COAST SOUTH AMERICA (Valid till 14 May 2026)
# ============================================================
VF_ECSA = '2026-05-01'; VT_ECSA = '2026-05-14'

ECSA_CL = (
    PIL_BASE
    + "|East Coast South America trade; T/S via Shanghai"
    + "|RFA No: PILSTECOTH"
)

SURCH_ECSA = 'RFA:PILSTECOTH;SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== EAST COAST SOUTH AMERICA (Valid till 14 May 2026) — RFA: PILSTECOTH ========")
lines.append("")

ecsa_ports = [
    ('Brazil',    'SANTOS'),
    ('Brazil',    'PARANAGUA'),
    ('Uruguay',   'MONTEVIDEO'),
    ('Argentina', 'BUENOS AIRES'),
    ('Brazil',    'NAVEGANTES'),
    ('Brazil',    'RIO DE JANEIRO'),
    ('Brazil',    'ITAPOA'),
]
for dc, dp in ecsa_ports:
    lines.append(row(dc, dp, 3500, 3900, VF_ECSA, VT_ECSA,
        via='SHANGHAI',
        surcharges=SURCH_ECSA,
        notes='T/S via Shanghai; transit 45 days; RFA No: PILSTECOTH',
        clauses=ECSA_CL))
lines.append("")

# ============================================================
# WEST COAST SOUTH AMERICA (Valid till 31 May 2026)
# ============================================================
VF_WCSA = '2026-05-01'; VT_WCSA = '2026-05-31'

WCSA_CL = (
    PIL_BASE
    + "|West Coast South America / Central America trade; T/S via Shanghai or Ningbo"
    + "|Subject to AMS USD 50/BL (select ports)"
)

SURCH_WCSA_AMS = 'AMS:50/bl;SEAL:10/cntr;SFF:15/bl'
SURCH_WCSA     = 'SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== WEST COAST SOUTH AMERICA / CENTRAL AMERICA (Valid till 31 May 2026) ========")
lines.append("")

# SHA/NGB ports — 50-55 days
wcsa_ams = [
    ('Mexico',   'MANZANILLO'),
    ('Mexico',   'LAZARO CARDENAS'),
    ('Ecuador',  'GUAYAQUIL'),
    ('Colombia', 'BUENAVENTURA'),
    ('Peru',     'CALLAO'),
    ('Chile',    'VALPARAISO'),
]
for dc, dp in wcsa_ams:
    lines.append(row(dc, dp, 3100, 3600, VF_WCSA, VT_WCSA,
        via='SHANGHAI/NINGBO',
        surcharges=SURCH_WCSA_AMS,
        notes='T/S via Shanghai/Ningbo; transit 50-55 days; AMS USD 50/BL',
        clauses=WCSA_CL))

lines.append(row('Chile','SAN ANTONIO',3100,3600,VF_WCSA,VT_WCSA,
    via='SHANGHAI/NINGBO',
    surcharges=SURCH_WCSA,
    notes='T/S via Shanghai/Ningbo; transit 50-55 days',
    clauses=WCSA_CL))

# Via Ningbo — 55-60 days
wcsa_ngb = [
    ('Guatemala',   'PUERTO QUETZAL'),
    ('Costa Rica',  'PUERTO CALDERA'),
    ('El Salvador', 'ACAJUTLA'),
    ('Nicaragua',   'CORINTO'),
]
for dc, dp in wcsa_ngb:
    lines.append(row(dc, dp, 4100, 4600, VF_WCSA, VT_WCSA,
        via='NINGBO',
        surcharges=SURCH_WCSA,
        notes='T/S via Ningbo; transit 55-60 days',
        clauses=WCSA_CL))

lines.append(row('Mexico','ENSENADA',3300,3800,VF_WCSA,VT_WCSA,
    via='SHANGHAI',
    surcharges=SURCH_WCSA,
    notes='T/S via Shanghai; transit 55-60 days',
    clauses=WCSA_CL))
lines.append("")

# ============================================================
# MELL PORTS (Valid till 30 Apr 2026)
# NOTE: validity already expired — rates included for reference
# ============================================================
VF_ME = '2026-04-01'; VT_ME = '2026-04-30'

ME_CL = (
    PIL_BASE
    + "|MELL (Melanesia/Pacific Ports) trade; T/S via Singapore"
    + "|Note: Validity till 30 Apr 2026 — confirm current rates with PIL before booking"
)

SURCH_ME = 'SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== MELL PORTS (Valid till 30 Apr 2026 — confirm rates before booking) ========")
lines.append("")

mell_ports = [
    ('Papua New Guinea', 'PORT LAE',       1975, 3850, 45),
    ('Papua New Guinea', 'PORT MORESBY',   1975, 3850, 45),
    ('Papua New Guinea', 'RABAUL',         3875, 7650, 55),
    ('Australia',        'DARWIN',         2075, 4050, 45),
    ('Australia',        'TOWNSVILLE',     2075, 4050, 45),
    ('East Timor',       'DILI',           1975, 3850, 45),
]
for dc, dp, r20, r40, tt in mell_ports:
    lines.append(row(dc, dp, r20, r40, VF_ME, VT_ME,
        via='SINGAPORE',
        surcharges=SURCH_ME,
        notes=f'T/S via Singapore; transit {tt} days; MELL port; validity 30 Apr 2026 — confirm before booking',
        clauses=ME_CL))

lines.append(row('Marshall Islands','MAJURO',3825,7500,VF_ME,VT_ME,
    via='NINGBO/HONG KONG',
    surcharges=SURCH_ME,
    notes='T/S via Ningbo/Hong Kong; transit 40 days; MELL port; validity 30 Apr 2026 — confirm before booking',
    clauses=ME_CL))
lines.append("")

# ============================================================
# SOUTH PACIFIC ISLANDS (Valid till 31 May 2026)
# NPDL is the only service provider for Christmas Island, Wallis & Futuna
# Rates incl: LSR $96/P.TEU & EID $150/P.TEU where noted
# ============================================================
VF_SP = '2026-05-01'; VT_SP = '2026-05-31'

SP_CL = (
    PIL_BASE
    + "|South Pacific Islands trade; T/S via Singapore & Auckland"
    + "|NPDL is the only service provider for Christmas Island, Wallis & Futuna"
    + "|Rates inclusive of LSR USD 96/P.TEU & EID USD 150/P.TEU where applicable"
)

SURCH_SP_INCL = 'LSR:96/teu;EID:150/teu;SEAL:10/cntr;SFF:15/bl'
SURCH_SP      = 'SEAL:10/cntr;SFF:15/bl'

lines.append("-- ======== SOUTH PACIFIC ISLANDS (Valid till 31 May 2026) ========")
lines.append("-- NPDL only: Christmas Island, Wallis & Futuna")
lines.append("-- Rows 1-2: rate incl LSR USD 96/P.TEU & EID USD 150/P.TEU")
lines.append("")

sp_ports = [
    # (dc, dp, r20, r40, surch, notes_extra)
    ('Tonga',            "NUKU'ALOFA (TOTBU)",                  4100, 8190,   SURCH_SP_INCL, 'Rate incl LSR USD 96/TEU & EID USD 150/TEU; transit 50-55 days'),
    ('Samoa',            'APIA (WSAPW)',                         4100, 8190,   SURCH_SP_INCL, 'Rate incl LSR USD 96/TEU & EID USD 150/TEU; transit 50-55 days'),
    ('Fiji',             'SUVA/LAUTOKA (FJSUV/LTK)',             3000, 5990,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Cook Islands',     'AITUTAKI (CKAIT)',                     8600, 17190,  SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('New Caledonia',    'NOUMEA (NCNOU)',                       2950, 5890,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('French Polynesia', 'PAPEETE (PFPPT)',                      4750, 9490,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Vanuatu',          'SANTO (VUSAN)',                        3950, 7890,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Vanuatu',          'PORT VILA (VUVLI)',                    3650, 7290,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Cook Islands',     'RAROTONGA (CKRAR)',                    7900, 15790,  SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Kiribati',         'TARAWA (KITRW)',                       4250, 8490,   SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Kiribati',         'CHRISTMAS/CANTON ISLAND (KICXI)',      11625,23240,  SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days; NPDL only service'),
    ('Tonga',            'VAVAU (TOVAV)',                        7400, 14790,  SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days'),
    ('Tuvalu',           'FUNAFUTI (TVFUN)',                     7000, 0,      SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days; 40ft rate N/A'),
    ('Wallis and Futuna','FUTUNA (WFFUT)',                       6750, 0,      SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days; 40ft rate N/A; NPDL only service'),
    ('Wallis and Futuna','WALLIS (WFWLS)',                       6750, 13490,  SURCH_SP,      'T/S via Singapore & Auckland; transit 50-55 days; NPDL only service'),
]
for dc, dp, r20, r40, surch, n in sp_ports:
    lines.append(row(dc, dp, r20, r40, VF_SP, VT_SP,
        via='SINGAPORE/AUCKLAND',
        surcharges=surch,
        notes=n,
        clauses=SP_CL))

lines.append("")

total = sum(1 for l in lines if l.startswith('INSERT'))
lines.insert(0, f"-- Total INSERT rows: {total}")
lines.insert(1, "")
for l in lines:
    print(l)
