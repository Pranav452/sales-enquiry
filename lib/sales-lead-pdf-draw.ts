// Pure Sales Lead PDF renderer — "Shipping Ticket" layout.
//
// Takes a jsPDF document (unit "mm", A4, one blank page), the lead data and
// preloaded assets, and draws the whole document. No DOM access, no fetching:
// the browser wrapper (lib/sales-lead-pdf.ts) loads fonts/images and saves,
// and a Node harness can call this directly to render for inspection.
//
// Layout is authored in CSS px of a 794×1123 mock (96 dpi) and converted to mm
// at draw time, so numbers here can be compared 1:1 with the design.

import type { jsPDF } from "jspdf"

export interface SalesLeadPdfData {
  ref_code?:             string | null
  date_sent?:            string | null
  sent_by?:              string | null
  status?:               string | null
  agent_name?:           string | null
  agent_email?:          string | null
  shipper?:              string | null
  shipper_website?:      string | null
  shipper_address?:      string | null
  city?:                 string | null
  consignee?:            string | null
  consignee_address?:    string | null
  consignee_website?:    string | null
  dest_country?:         string | null
  mode_of_transport?:    string | null
  origin_port?:          string | null
  dest_port?:            string | null
  commodity?:            string | null
  hs_code?:              string | null
  special_requirements?: string | null
  rate_fcl?:             string | null
  rate_lcl?:             string | null
  rate_validity?:        string | null
  remarks?:              string | null
  remarks_2?:            string | null
  notes?:                string | null
  agent_company?:        string | null
  origin_country?:       string | null
  origin_port_code?:     string | null
  dest_port_code?:       string | null
  rate_currency?:        string | null
  rate_20gp?:            string | null
  rate_40hc?:            string | null
  consignee_contact?:    string | null
  consignee_email?:      string | null
  consignee_phone?:      string | null
  sender_designation?:   string | null
  sender_email?:         string | null
  sender_phone?:         string | null
}

/** An image ready for jsPDF: a data URL plus its pixel size (used for aspect ratio). */
export interface PdfImageAsset {
  data:   string
  format: "JPEG" | "PNG"
  width:  number
  height: number
}

/** Base64-encoded TTF files (no data: prefix). */
export interface SalesLeadPdfFonts {
  dmSansRegular:    string
  dmSansBold:       string
  spaceGroteskBold: string
}

export interface SalesLeadPdfAssets {
  fonts?: SalesLeadPdfFonts | null
  /** Header logo, already flattened onto the page colour. */
  logo?:  PdfImageAsset | null
  /** Round seal for the ticket stub (Manilal only), flattened onto the stub navy. */
  seal?:  PdfImageAsset | null
}

export function salesLeadPdfFilename(lead: SalesLeadPdfData): string {
  return `SalesLead_${lead.ref_code ?? "Draft"}_${lead.date_sent || "today"}.pdf`
}

// ── Units & page geometry (CSS px) ────────────────────────────────────────────

const PX = 25.4 / 96
const u = (px: number) => px * PX

const PAGE_W = 210 / PX // ≈ 793.7
const PAGE_H = 297 / PX // ≈ 1122.5
const PAD_T = 38
const PAD_X = 40
const PAD_B = 36
const CONTENT_W = PAGE_W - PAD_X * 2
const HEADER_H = 54
const CONTENT_TOP = PAD_T + HEADER_H + 24
const BLOCK_GAP = 20

const C = {
  page:      "#E9EDF4",
  white:     "#FFFFFF",
  navy:      "#13294B",
  label:     "#5B6474",
  body:      "#3F4859",
  muted:     "#4A5468",
  rule:      "#E3E8F0",
  dots:      "#94A3B8",
  gold:      "#E2B857",
  brown:     "#8A6414",
  perf:      "#8193B3",
  divider:   "#D5DCE6",
  leader:    "#CBD3E0",
  amberBg:   "#FFF1DC",
  amberDot:  "#D97706",
  amberText: "#8A4B00",
  fillLine:  "#8A94A6",
} as const

// ── Fonts & text ──────────────────────────────────────────────────────────────

type Role = "reg" | "bold" | "disp"

interface TextStyle {
  role:  Role
  size:  number  // px
  color: string
  ls?:   number  // letter-spacing, em
  lh?:   number  // line-height multiplier; default = font's normal line height
}

// hhea ascender/descender (units per em = 1000) of the embedded fonts.
const METRICS: Record<Role, { asc: number; desc: number }> = {
  reg:  { asc: 0.992, desc: 0.310 },
  bold: { asc: 0.992, desc: 0.310 },
  disp: { asc: 0.984, desc: 0.292 },
}

type CodeMap = Record<number, number>

// Punctuation the standard (WinAnsi) helvetica can't show via plain latin-1.
const FALLBACK_MAP: Record<string, string> = {
  "—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"',
  "…": "...", "→": "->", "•": "·", "€": "EUR", "₹": "INR",
}

class Pen {
  private families: Record<Role, [string, string]>
  private codeMaps: Record<Role, CodeMap | null> = { reg: null, bold: null, disp: null }
  private custom: Record<Role, boolean> = { reg: false, bold: false, disp: false }

  constructor(readonly doc: jsPDF, fonts: SalesLeadPdfFonts | null | undefined) {
    this.families = { reg: ["helvetica", "normal"], bold: ["helvetica", "bold"], disp: ["helvetica", "bold"] }
    if (!fonts) return
    const reg = (file: string, b64: string, family: string, style: string, roles: Role[]) => {
      try {
        doc.addFileToVFS(file, b64)
        doc.addFont(file, family, style)
        doc.setFont(family, style)
        const meta = doc.getFont().metadata as { cmap?: { unicode?: { codeMap?: CodeMap } } } | undefined
        const map = meta?.cmap?.unicode?.codeMap
        if (doc.getFont().fontName !== family || !map) return
        for (const r of roles) {
          this.families[r] = [family, style]
          this.codeMaps[r] = map
          this.custom[r] = true
        }
      } catch {
        // keep the helvetica fallback for these roles
      }
    }
    reg("DMSans-Regular.ttf", fonts.dmSansRegular, "DMSans", "normal", ["reg"])
    reg("DMSans-Bold.ttf", fonts.dmSansBold, "DMSans", "bold", ["bold"])
    reg("SpaceGrotesk-Bold.ttf", fonts.spaceGroteskBold, "SpaceGrotesk", "bold", ["disp"])
  }

  /** Normalise whitespace and drop/replace characters the active font has no glyph for. */
  clean(text: string, role: Role): string {
    const s = text
      .replace(/\r\n?/g, "\n")
      .replace(/[\t   ]/g, " ")
      .replace(/[­​-‍﻿]/g, "")
    const map = this.codeMaps[role]
    let out = ""
    for (const ch of s) {
      const cp = ch.codePointAt(0) ?? 0
      if (cp === 10) { out += ch; continue }
      if (map) {
        if (map[cp]) { out += ch; continue }
        const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "")
        if (base && Array.from(base).every((b) => map[b.codePointAt(0) ?? 0])) out += base
        else if (cp > 32) out += "?"
      } else {
        if (cp < 256) { out += ch; continue }
        if (FALLBACK_MAP[ch]) { out += FALLBACK_MAP[ch]; continue }
        const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "")
        out += base && Array.from(base).every((b) => (b.codePointAt(0) ?? 999) < 256) ? base : "?"
      }
    }
    return out
  }

  use(st: TextStyle) {
    const [family, style] = this.families[st.role]
    this.doc.setFont(family, style)
    this.doc.setFontSize(st.size * 0.75)
  }

  /** Visual width in px (letter-spacing between glyphs included, not trailing). */
  w(text: string, st: TextStyle): number {
    const t = this.clean(text, st.role)
    if (!t) return 0
    this.use(st)
    const n = Array.from(t).length
    return this.doc.getTextWidth(t) / PX + (st.ls ?? 0) * st.size * Math.max(0, n - 1)
  }

  lh(st: TextStyle): number {
    const m = METRICS[st.role]
    return (st.lh ?? m.asc + m.desc) * st.size
  }

  /** Baseline y for a line box starting at `top`, CSS-style (half-leading split). */
  baseline(top: number, st: TextStyle): number {
    const m = METRICS[st.role]
    return top + (this.lh(st) - (m.asc + m.desc) * st.size) / 2 + m.asc * st.size
  }

  text(str: string, x: number, top: number, st: TextStyle, align: "left" | "right" | "center" = "left") {
    const t = this.clean(str, st.role).replace(/\n/g, " ")
    if (!t) return
    const w = this.w(t, st)
    const x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x
    this.use(st)
    this.doc.setTextColor(st.color)
    this.doc.text(t, u(x0), u(this.baseline(top, st)), { charSpace: st.ls ? u(st.ls * st.size) : 0 })
  }

  /** Draw pre-wrapped lines; returns the block height. */
  lines(lines: string[], x: number, top: number, st: TextStyle, align: "left" | "right" | "center" = "left"): number {
    const L = this.lh(st)
    lines.forEach((l, i) => this.text(l, x, top + i * L, st, align))
    return lines.length * L
  }

  /**
   * Word-wrap with break opportunities at spaces and after "-" / "/", breaking
   * over-long words by character; clamped to `maxLines` with an ellipsis.
   * Blank lines in the source are kept (collapsed to one).
   */
  wrap(text: string, st: TextStyle, maxW: number, maxLines = Infinity): string[] {
    const src = this.clean(text, st.role)
    const out: string[] = []
    const fits = (s: string) => this.w(s, st) <= maxW
    for (const para of src.split("\n")) {
      const toks: { t: string; sp: boolean }[] = []
      for (const word of para.split(/ +/).filter(Boolean)) {
        const parts = word.match(/[^-/]+[-/]*|[-/]+/g) ?? [word]
        parts.forEach((t, k) => toks.push({ t, sp: k === 0 }))
      }
      if (!toks.length) {
        if (out.length && out[out.length - 1] !== "") out.push("")
        continue
      }
      let line = ""
      for (const tok of toks) {
        const cand = line ? `${line}${tok.sp ? " " : ""}${tok.t}` : tok.t
        if (fits(cand)) { line = cand; continue }
        if (line) out.push(line)
        let word = tok.t
        while (!fits(word)) {
          const chars = Array.from(word)
          let n = chars.length - 1
          while (n > 1 && !fits(chars.slice(0, n).join(""))) n--
          out.push(chars.slice(0, n).join(""))
          word = chars.slice(n).join("")
        }
        line = word
      }
      if (line) out.push(line)
    }
    while (out.length && out[out.length - 1] === "") out.pop()
    if (out.length > maxLines) {
      const kept = out.slice(0, maxLines)
      kept[maxLines - 1] = this.ellipsize(`${kept[maxLines - 1]}`, st, maxW, true)
      return kept
    }
    return out
  }

  ellipsize(text: string, st: TextStyle, maxW: number, force = false): string {
    if (!force && this.w(text, st) <= maxW) return text
    let chars = Array.from(text.trimEnd())
    while (chars.length && this.w(`${chars.join("").trimEnd()}…`, st) > maxW) chars = chars.slice(0, -1)
    return `${chars.join("").trimEnd()}…`
  }
}

// ── Drawing primitives ────────────────────────────────────────────────────────

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: string) {
  doc.setFillColor(color)
  doc.rect(u(x), u(y), u(w), u(h), "F")
}

function fillRoundRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: string) {
  doc.setFillColor(color)
  const rr = Math.min(r, w / 2, h / 2)
  doc.roundedRect(u(x), u(y), u(w), u(h), u(rr), u(rr), "F")
}

/** Rounded rect with per-corner radii [tl, tr, br, bl], filled. */
function fillCornerRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: [number, number, number, number], color: string) {
  const [tl, tr, br, bl] = r
  const k = 0.5523
  doc.setFillColor(color)
  doc.moveTo(u(x + tl), u(y))
  doc.lineTo(u(x + w - tr), u(y))
  if (tr) doc.curveTo(u(x + w - tr + tr * k), u(y), u(x + w), u(y + tr - tr * k), u(x + w), u(y + tr))
  doc.lineTo(u(x + w), u(y + h - br))
  if (br) doc.curveTo(u(x + w), u(y + h - br + br * k), u(x + w - br + br * k), u(y + h), u(x + w - br), u(y + h))
  doc.lineTo(u(x + bl), u(y + h))
  if (bl) doc.curveTo(u(x + bl - bl * k), u(y + h), u(x), u(y + h - bl + bl * k), u(x), u(y + h - bl))
  doc.lineTo(u(x), u(y + tl))
  if (tl) doc.curveTo(u(x), u(y + tl - tl * k), u(x + tl - tl * k), u(y), u(x + tl), u(y))
  doc.close()
  doc.fill()
}

function fillCircle(doc: jsPDF, cx: number, cy: number, r: number, color: string) {
  doc.setFillColor(color)
  doc.circle(u(cx), u(cy), u(r), "F")
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, width: number, color: string, dash?: [number, number]) {
  doc.setDrawColor(color)
  doc.setLineWidth(u(width))
  if (dash) doc.setLineDashPattern([u(dash[0]), u(dash[1])], 0)
  doc.line(u(x1), u(y1), u(x2), u(y2))
  if (dash) doc.setLineDashPattern([], 0)
}

/** CSS-like dotted line: round dots of diameter `d`, `step` px apart. */
function dottedLine(doc: jsPDF, x1: number, x2: number, y: number, d: number, step: number, color: string) {
  const len = x2 - x1
  if (len < d) return
  const n = Math.floor((len - d) / step) + 1
  const start = x1 + (len - (n - 1) * step) / 2
  doc.setFillColor(color)
  for (let i = 0; i < n; i++) doc.circle(u(start + i * step), u(y), u(d / 2), "F")
}

// Minimal SVG path support (M L H V C Z, absolute + relative) for vector icons.
type Seg = { op: "M" | "L"; x: number; y: number } | { op: "C"; p: number[] } | { op: "Z" }

function parsePath(d: string): Seg[] {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  const out: Seg[] = []
  let i = 0
  let cmd = ""
  let cx = 0, cy = 0, sx = 0, sy = 0
  const num = () => parseFloat(toks[i++])
  while (i < toks.length) {
    if (/^[a-zA-Z]$/.test(toks[i])) cmd = toks[i++]
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? cx : 0
    const oy = rel ? cy : 0
    switch (cmd.toUpperCase()) {
      case "M": {
        cx = sx = num() + ox; cy = sy = num() + oy
        out.push({ op: "M", x: cx, y: cy })
        cmd = rel ? "l" : "L"
        break
      }
      case "L": { cx = num() + ox; cy = num() + oy; out.push({ op: "L", x: cx, y: cy }); break }
      case "H": { cx = num() + ox; out.push({ op: "L", x: cx, y: cy }); break }
      case "V": { cy = num() + oy; out.push({ op: "L", x: cx, y: cy }); break }
      case "C": {
        const p = [num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy]
        out.push({ op: "C", p }); cx = p[4]; cy = p[5]
        break
      }
      case "Z": {
        out.push({ op: "Z" }); cx = sx; cy = sy
        if (i < toks.length && !/^[a-zA-Z]$/.test(toks[i])) i = toks.length
        break
      }
      default: i = toks.length
    }
  }
  return out
}

/** Stroke 24×24-viewBox icon paths at (x, y) with the given rendered size. */
function strokeIcon(doc: jsPDF, paths: string[], x: number, y: number, size: number, strokeW: number, color: string, circles: [number, number, number][] = []) {
  const s = size / 24
  doc.setDrawColor(color)
  doc.setLineWidth(u(strokeW * s))
  doc.setLineCap("round")
  doc.setLineJoin("round")
  for (const d of paths) {
    for (const seg of parsePath(d)) {
      if (seg.op === "M") doc.moveTo(u(x + seg.x * s), u(y + seg.y * s))
      else if (seg.op === "L") doc.lineTo(u(x + seg.x * s), u(y + seg.y * s))
      else if (seg.op === "C") doc.curveTo(...(seg.p.map((v, j) => u((j % 2 ? y : x) + v * s)) as [number, number, number, number, number, number]))
      else doc.close()
    }
    doc.stroke()
  }
  for (const [ccx, ccy, r] of circles) doc.circle(u(x + ccx * s), u(y + ccy * s), u(r * s), "S")
  doc.setLineCap("butt")
  doc.setLineJoin("miter")
}

const ICON_SHIP = ["M2.5 14.5h19l-2.6 5h-13.8z", "M6 14.5V9.5h9v5", "M9 9.5V5.5h3.5v4"]
const ICON_PLANE = [
  "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
]
const ICON_SCISSORS = ["M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"]
const ICON_SCISSORS_CIRCLES: [number, number, number][] = [[6, 6, 3], [6, 18, 3]]

/** Right-pointing arrow (stroke) of width `w`, centred on y. */
function arrow(doc: jsPDF, x: number, y: number, w: number, strokeW: number, color: string) {
  doc.setDrawColor(color)
  doc.setLineWidth(u(strokeW))
  doc.setLineCap("round")
  doc.setLineJoin("round")
  const head = Math.min(3.8, w * 0.35)
  doc.line(u(x), u(y), u(x + w), u(y))
  doc.moveTo(u(x + w - head), u(y - head))
  doc.lineTo(u(x + w), u(y))
  doc.lineTo(u(x + w - head), u(y + head))
  doc.stroke()
  doc.setLineCap("butt")
  doc.setLineJoin("miter")
}

// ── Data helpers ──────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function str(v: string | null | undefined): string {
  return (v ?? "").trim()
}

type DateParts = { d: number; m: number; y: number }

function dateParts(d: number, m: number, y: number): DateParts | null {
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { d, m, y } : null
}

function parseDate(s: string): DateParts | null {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[T ])/)
  if (m) return dateParts(+m[3], +m[2], +m[1])
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return dateParts(+m[1], +m[2], +m[3]) // day-first (India/EU)
  if (/[a-z]/i.test(s) && /\d{4}/.test(s)) {
    const t = new Date(s)
    if (!isNaN(t.getTime())) return { d: t.getDate(), m: t.getMonth() + 1, y: t.getFullYear() }
  }
  return null
}

function formatDate(s: string): string {
  const p = parseDate(s)
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : s
}

function formatRate(v: string): string {
  const t = v.trim()
  if (!/^\d+(\.\d+)?$/.test(t)) return t
  const [int, dec] = t.split(".")
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec ? `.${dec}` : "")
}

function validityPill(v: string): string {
  if (/^\d+\s*(day|days|week|weeks|month|months)$/i.test(v)) return `Valid ${v} from date sent`
  const p = parseDate(v)
  if (p) return `Valid until ${p.d} ${MONTHS[p.m - 1]} ${p.y}`
  return /^valid/i.test(v) ? v : `Valid ${v}`
}

function displayUrl(v: string): string {
  return v.replace(/^https?:\/\//i, "").replace(/\/+$/, "")
}

/** Append `extra` to `base` unless it already appears in it. */
function withSuffix(base: string, extra: string): string {
  if (!extra) return base
  if (!base) return extra
  return base.toLowerCase().includes(extra.toLowerCase()) ? base : `${base}, ${extra}`
}

const MODE_WORDS: Record<string, string> = { sea: "Sea", air: "Air", road: "Road", rail: "Rail" }

function modeLabels(mode: string): { chip: string; stub: string; air: boolean } {
  if (!mode) return { chip: "", stub: "", air: false }
  const toks = mode.split(/[\s\-/·,|]+/).filter(Boolean)
  const head = MODE_WORDS[toks[0]?.toLowerCase() ?? ""]
  const air = /\bair\b/i.test(mode)
  if (!head) return { chip: mode.toUpperCase(), stub: mode, air }
  const rest = toks.slice(1).filter((t) => !/^freight$/i.test(t))
  const restU = rest.map((t) => (t.length <= 4 ? t.toUpperCase() : t))
  return {
    chip: [`${head.toUpperCase()} FREIGHT`, ...restU.map((t) => t.toUpperCase())].join(" · "),
    stub: [head, ...restU].join(" · "),
    air,
  }
}

interface Brand {
  name: string
  sub: string
  company: string
  website: string
  socials: string
  links: boolean
}

function brandFor(company: string | null | undefined): Brand {
  return company === "links"
    ? { name: "LINKS CARGO", sub: "SEA · AIR · CUSTOMS", company: "Links Cargo", website: "", socials: "", links: true }
    : {
        name: "MANILAL PATEL",
        sub: "MP CARGO · SEA · AIR · CUSTOMS",
        company: "MP Cargo",
        website: "www.manilal.com",
        socials: "Facebook · Instagram · LinkedIn",
        links: false,
      }
}

const DASH = "—"
const DEFAULT_TEAR_COPY =
  "We currently have only the shipper and consignee names. Kindly assist in identifying the consignee's contact details — any help tracing the consignee is highly appreciated."

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  brand:     { role: "bold", size: 14, color: C.navy, ls: 0.2 },
  brandSub:  { role: "reg", size: 12, color: C.muted, ls: 0.12 },
  title:     { role: "disp", size: 26, color: C.navy, ls: -0.01 },
  chip:      { role: "bold", size: 12, color: C.white, ls: 0.16 },
  routeLbl:  { role: "bold", size: 12, color: C.label, ls: 0.16 },
  city:      { role: "reg", size: 14, color: C.body },
  fieldLbl:  { role: "bold", size: 12, color: C.label, ls: 0.12 },
  fieldVal:  { role: "bold", size: 16, color: C.navy, lh: 1.3 },
  fieldMono: { role: "disp", size: 16, color: C.navy, lh: 1.3 },
  stubLbl:   { role: "bold", size: 12, color: C.gold, ls: 0.14 },
  stubRef:   { role: "disp", size: 14, color: C.white },
  stubVal:   { role: "bold", size: 15, color: C.white },
  stubMono:  { role: "disp", size: 15, color: C.white },
  partyLbl:  { role: "bold", size: 12, color: C.brown, ls: 0.16 },
  partyName: { role: "bold", size: 17, color: C.navy },
  partyAddr: { role: "reg", size: 14, color: C.body, lh: 1.45 },
  partyLine: { role: "reg", size: 14, color: C.body },
  partyCont: { role: "bold", size: 14, color: C.navy },
  pillAmber: { role: "bold", size: 13, color: C.amberText },
  ratesCur:  { role: "bold", size: 12, color: C.label, ls: 0.12 },
  rateLbl:   { role: "bold", size: 14, color: C.body },
  rateVal:   { role: "disp", size: 24, color: C.navy },
  rateText:  { role: "bold", size: 14, color: C.navy, lh: 1.35 },
  rateNone:  { role: "bold", size: 15, color: C.body },
  pillGold:  { role: "bold", size: 13, color: C.navy },
  tearHead:  { role: "disp", size: 21, color: C.navy },
  tearBody:  { role: "reg", size: 14, color: C.body, lh: 1.5 },
  footName:  { role: "bold", size: 15, color: C.navy },
  footRole:  { role: "reg", size: 15, color: C.muted },
  footLine:  { role: "reg", size: 13, color: C.body },
  footSoc:   { role: "reg", size: 13, color: C.muted },
} satisfies Record<string, TextStyle>

const codeStyle = (size: number): TextStyle => ({ role: "disp", size, color: C.navy, ls: -0.02, lh: 1 })

// ── Blocks ────────────────────────────────────────────────────────────────────

interface Block {
  h: number
  draw: (top: number) => void
}

interface Ctx {
  doc: jsPDF
  pen: Pen
  lead: SalesLeadPdfData
  brand: Brand
  assets: SalesLeadPdfAssets
  mode: { chip: string; stub: string; air: boolean }
  contactKnown: boolean
}

function drawPageChrome(c: Ctx) {
  const { doc, pen, brand, assets } = c
  fillRect(doc, 0, 0, PAGE_W, PAGE_H, C.page)
  let tx = PAD_X
  const logo = assets.logo
  if (logo && logo.width > 0 && logo.height > 0) {
    const w = Math.min(170, (HEADER_H * logo.width) / logo.height)
    try {
      doc.addImage(logo.data, logo.format, u(PAD_X), u(PAD_T), u(w), u(HEADER_H), "lead-logo", "FAST")
      tx += w + 14
    } catch {
      // logo unusable — header text simply starts at the margin
    }
  }
  const titleW = pen.w("Sales Lead", S.title)
  const brandMax = PAGE_W - PAD_X - titleW - 24 - tx
  const blockH = pen.lh(S.brand) + 2 + pen.lh(S.brandSub)
  const top = PAD_T + (HEADER_H - blockH) / 2
  pen.text(pen.ellipsize(brand.name, S.brand, brandMax), tx, top, S.brand)
  pen.text(pen.ellipsize(brand.sub, S.brandSub, brandMax), tx, top + pen.lh(S.brand) + 2, S.brandSub)
  pen.text("Sales Lead", PAGE_W - PAD_X, PAD_T + (HEADER_H - pen.lh(S.title)) / 2, S.title, "right")
}

interface RouteSide {
  label: string
  big: string
  city: string
  empty: boolean
}

function routeSides(lead: SalesLeadPdfData): [RouteSide, RouteSide] {
  const side = (label: string, code: string, port: string, country: string): RouteSide => {
    if (code) return { label, big: code.toUpperCase(), city: [port, country].filter(Boolean).join(", "), empty: false }
    if (port) return { label, big: port, city: country, empty: false }
    return { label, big: country || DASH, city: "", empty: !country }
  }
  return [
    side("FROM", str(lead.origin_port_code), str(lead.origin_port), str(lead.origin_country)),
    side("TO", str(lead.dest_port_code), str(lead.dest_port), str(lead.dest_country)),
  ]
}

function layoutRoute(c: Ctx, W: number) {
  const { pen } = c
  const sides = routeSides(c.lead)
  const GAP = 18
  const MIN_MID = 50
  const avail = W - GAP * 2 - MIN_MID
  const natural = sides.map((s) =>
    Math.max(pen.w(s.big, codeStyle(62)), pen.w(s.label, S.routeLbl), pen.w(s.city, S.city)),
  )
  let widths: number[]
  if (natural[0] + natural[1] <= avail) widths = natural
  else {
    const share = avail / 2
    if (natural[0] <= share) widths = [natural[0], avail - natural[0]]
    else if (natural[1] <= share) widths = [avail - natural[1], natural[1]]
    else widths = [share, share]
  }

  // Largest size (≤ 62) at which each big label fits its column; long port
  // names fall back to two lines at a smaller size.
  const fitSize = (text: string, maxW: number): number => {
    for (let s = 62; s >= 30; s -= 2) if (pen.w(text, codeStyle(s)) <= maxW) return s
    for (let s = 34; s >= 18; s -= 2) if (pen.wrap(text, codeStyle(s), maxW).length <= 2) return s
    return 18
  }
  // Missing sides show a small, light placeholder dash and don't drive the size.
  const filled = sides.map((s, i) => (s.empty ? 62 : fitSize(s.big, widths[i])))
  const size = sides.every((s) => s.empty) ? 36 : Math.min(...filled)
  const st = codeStyle(size)
  const bigLines = sides.map((s, i) => (s.empty ? [DASH] : pen.wrap(s.big, st, widths[i], 2)))
  const lineH = (n: number) => (n > 1 ? size * 1.06 : size)
  const bigH = Math.max(...bigLines.map((l) => l.length * lineH(l.length)))
  const cityLines = sides.map((s, i) => (s.city ? pen.wrap(s.city, S.city, widths[i], 2) : []))
  const cityH = Math.max(...cityLines.map((l) => l.length * pen.lh(S.city)))
  const lblH = pen.lh(S.routeLbl)
  const h = lblH + 2 + bigH + (cityH ? 2 + cityH : 0)

  const draw = (x: number, top: number) => {
    const { doc } = c
    sides.forEach((s, i) => {
      const right = i === 1
      const ax = right ? x + W : x
      const align = right ? "right" : "left"
      pen.text(s.label, ax, top, S.routeLbl, align)
      const lines = bigLines[i]
      const blockH = lines.length * lineH(lines.length)
      let y = top + lblH + 2 + (bigH - blockH) / 2
      if (s.empty) {
        pen.text(DASH, ax, y, { ...st, size: size * 0.55, color: C.dots, lh: 1 / 0.55 }, align)
      } else {
        for (const l of lines) {
          pen.text(l, ax, y, { ...st, lh: lineH(lines.length) / size }, align)
          y += lineH(lines.length)
        }
      }
      pen.lines(cityLines[i], ax, top + lblH + 2 + bigH + 2, S.city, align)
    })
    const mx0 = x + widths[0] + GAP
    const mx1 = x + W - widths[1] - GAP
    const cx = (mx0 + mx1) / 2
    const cy = top + lblH + 2 + bigH / 2
    const R = 23
    dottedLine(doc, mx0, cx - R - 8, cy, 2, 4, C.dots)
    dottedLine(doc, cx + R + 8, mx1, cy, 2, 4, C.dots)
    fillCircle(doc, cx, cy, R, C.gold)
    strokeIcon(doc, c.mode.air ? ICON_PLANE : ICON_SHIP, cx - 12, cy - 12, 24, 1.9, C.navy)
  }
  return { h, draw }
}

function layoutTicket(c: Ctx): Block {
  const { pen, lead, brand, assets } = c
  const x = PAD_X
  const W = CONTENT_W
  const STUB_W = 192
  const innerX = x + 30
  const innerW = W - STUB_W - 60

  // Left: chip, route, field grid
  let y = 26
  const chipText = c.mode.chip ? pen.ellipsize(c.mode.chip, S.chip, innerW - 28) : ""
  const chip = chipText ? { y, w: pen.w(chipText, S.chip) + 28, h: pen.lh(S.chip) + 12 } : null
  if (chip) y += chip.h + 22
  const route = layoutRoute(c, innerW)
  const routeY = y
  y += route.h + 22
  const ruleY = y
  y += 1 + 18

  const colW = (innerW - 40) / 3
  const val = (v: string, st: TextStyle, max: number) => pen.wrap(v || DASH, st, colW, max)
  const stack = (a: string, b: string): string[] => {
    if (!a && !b) return [DASH]
    return [...(a ? pen.wrap(a, S.fieldVal, colW, 2) : []), ...(b ? pen.wrap(b, S.fieldVal, colW, 2) : [])]
  }
  const fields: { label: string; lines: string[]; st: TextStyle }[] = [
    { label: "COMMODITY", lines: val(str(lead.commodity), S.fieldVal, 3), st: S.fieldVal },
    { label: "HS CODE", lines: val(str(lead.hs_code), S.fieldMono, 2), st: S.fieldMono },
    { label: "REQUIREMENTS", lines: val(str(lead.special_requirements), S.fieldVal, 3), st: S.fieldVal },
    { label: "PREPARED FOR", lines: stack(str(lead.agent_name), str(lead.agent_company)), st: S.fieldVal },
    { label: "PREPARED BY", lines: stack(str(lead.sent_by), str(lead.sender_designation)), st: S.fieldVal },
    { label: "RATE VALIDITY", lines: val(formatDate(str(lead.rate_validity)), S.fieldVal, 2), st: S.fieldVal },
  ]
  const fh = (f: (typeof fields)[number]) => pen.lh(S.fieldLbl) + 3 + f.lines.length * pen.lh(f.st)
  const row1H = Math.max(...fields.slice(0, 3).map(fh))
  const row2H = Math.max(...fields.slice(3).map(fh))
  const gridY = y
  y += row1H + 16 + row2H + 28
  const leftH = y

  // Stub: seal + REF / DATE / ROUTE / MODE
  const stubX = x + W - STUB_W
  const stubInX = stubX + 2 + 22
  const stubInW = STUB_W - 2 - 44
  const seal = !brand.links && assets.seal ? assets.seal : null
  const [from, to] = routeSides(lead)
  const routeOne = from.big === DASH && to.big === DASH ? null : { from: from.big, to: to.big }
  const ARROW_W = 12
  const ARROW_GAP = 5
  let routeLines: { text: string; arrow: boolean }[]
  if (!routeOne) routeLines = [{ text: DASH, arrow: false }]
  else if (pen.w(routeOne.from, S.stubMono) + ARROW_W + ARROW_GAP * 2 + pen.w(routeOne.to, S.stubMono) <= stubInW)
    routeLines = [{ text: `${routeOne.from}\u0000${routeOne.to}`, arrow: true }]
  else
    routeLines = [
      { text: pen.ellipsize(routeOne.from, S.stubMono, stubInW), arrow: false },
      { text: `\u0000${pen.ellipsize(routeOne.to, S.stubMono, stubInW - ARROW_W - ARROW_GAP)}`, arrow: true },
    ]
  const stubItems: { label: string; lines: string[]; st: TextStyle; route?: boolean }[] = [
    { label: "REF NO", lines: pen.wrap(str(lead.ref_code) || DASH, S.stubRef, stubInW, 3), st: S.stubRef },
    { label: "DATE SENT", lines: pen.wrap(formatDate(str(lead.date_sent)) || DASH, S.stubVal, stubInW, 2), st: S.stubVal },
    { label: "ROUTE", lines: routeLines.map((l) => l.text), st: S.stubMono, route: true },
    { label: "MODE", lines: pen.wrap(c.mode.stub || DASH, S.stubVal, stubInW, 2), st: S.stubVal },
  ]
  let stubH = 24 + (seal ? 60 + 14 : 0)
  stubItems.forEach((it, i) => {
    stubH += pen.lh(S.stubLbl) + 2 + it.lines.length * pen.lh(it.st) + (i < stubItems.length - 1 ? 14 : 0)
  })
  stubH += 24

  const h = Math.max(leftH, stubH)

  const draw = (top: number) => {
    const { doc } = c
    fillCornerRect(doc, x, top, W - STUB_W, h, [16, 0, 0, 16], C.white)
    fillCornerRect(doc, stubX, top, STUB_W, h, [0, 16, 16, 0], C.navy)

    if (chip) {
      fillRoundRect(doc, innerX, top + chip.y, chip.w, chip.h, chip.h / 2, C.navy)
      pen.text(chipText, innerX + 14, top + chip.y + 6, S.chip)
    }
    route.draw(innerX, top + routeY)
    line(doc, innerX, top + ruleY + 0.5, innerX + innerW, top + ruleY + 0.5, 1, C.rule)
    fields.forEach((f, i) => {
      const fx = innerX + (i % 3) * (colW + 20)
      const fy = top + gridY + (i < 3 ? 0 : row1H + 16)
      pen.text(f.label, fx, fy, S.fieldLbl)
      pen.lines(f.lines, fx, fy + pen.lh(S.fieldLbl) + 3, f.st)
    })

    // Stub contents
    let sy = top + 24
    if (seal) {
      try {
        doc.addImage(seal.data, seal.format, u(stubInX), u(sy), u(60), u(60), "lead-seal", "FAST")
      } catch {
        // seal unusable — leave the space
      }
      sy += 60 + 14
    }
    for (const it of stubItems) {
      pen.text(it.label, stubInX, sy, S.stubLbl)
      sy += pen.lh(S.stubLbl) + 2
      for (const ln of it.lines) {
        if (it.route && ln.includes("\u0000")) {
          const [a, b] = ln.split("\u0000")
          let lx = stubInX
          if (a) { pen.text(a, lx, sy, it.st); lx += pen.w(a, it.st) + ARROW_GAP }
          arrow(doc, lx, pen.baseline(sy, it.st) - 0.33 * it.st.size, ARROW_W, 1.4, C.white)
          pen.text(b, lx + ARROW_W + ARROW_GAP, sy, it.st)
        } else {
          pen.text(ln, stubInX, sy, it.st)
        }
        sy += pen.lh(it.st)
      }
      sy += 14
    }

    // Perforation + notches
    line(doc, stubX + 1, top, stubX + 1, top + h, 2, C.perf, [4.5, 2.5])
    fillCircle(doc, stubX, top, 14, C.page)
    fillCircle(doc, stubX, top + h, 14, C.page)
  }
  return { h, draw }
}

function layoutCoupons(c: Ctx): Block {
  const { pen, lead } = c
  const x = PAD_X
  const leftW = ((CONTENT_W - 16) * 1.55) / 2.55
  const rightW = CONTENT_W - 16 - leftW
  const rightX = x + leftW + 16
  const PAD_V = 20
  const PAD_H = 22

  // ── Parties
  const pw = leftW - PAD_H * 2
  type Piece = { kind: "text"; lines: string[]; st: TextStyle; gapBefore: number } | { kind: "divider" } | { kind: "pill"; text: string; gapBefore: number }
  const pieces: Piece[] = []
  const add = (lines: string[], st: TextStyle, gapBefore: number) => {
    if (lines.length) pieces.push({ kind: "text", lines, st, gapBefore })
  }
  add(["SHIPPER"], S.partyLbl, 0)
  add(pen.wrap(str(lead.shipper) || DASH, S.partyName, pw, 2), S.partyName, 4)
  // Clamps keep the coupon row short enough to follow the ticket on page 1.
  add(pen.wrap(withSuffix(str(lead.shipper_address), str(lead.city)), S.partyAddr, pw, 4), S.partyAddr, 4)
  const shipperWeb = displayUrl(str(lead.shipper_website))
  add(shipperWeb ? [pen.ellipsize(shipperWeb, S.partyLine, pw)] : [], S.partyLine, 4)
  pieces.push({ kind: "divider" })
  add(["CONSIGNEE"], S.partyLbl, 0)
  add(pen.wrap(str(lead.consignee) || DASH, S.partyName, pw, 2), S.partyName, 4)
  const where = withSuffix(str(lead.consignee_address), str(lead.dest_country))
  const web = displayUrl(str(lead.consignee_website)) || "Website not available"
  add(pen.wrap(where ? `${where} · ${web}` : web, S.partyAddr, pw, 4), S.partyAddr, 4)
  if (c.contactKnown) {
    add(pen.wrap(str(lead.consignee_contact), S.partyCont, pw, 2), S.partyCont, 6)
    const email = str(lead.consignee_email)
    const phone = str(lead.consignee_phone)
    const both = [email, phone].filter(Boolean).join(" · ")
    const reach = pen.w(both, S.partyLine) <= pw
      ? [both]
      : [email, phone].filter(Boolean).map((v) => pen.ellipsize(v, S.partyLine, pw))
    add(both ? reach : [], S.partyLine, str(lead.consignee_contact) ? 2 : 6)
  } else {
    pieces.push({ kind: "pill", text: "Contact details to be traced", gapBefore: 8 })
  }
  const pillH = pen.lh(S.pillAmber) + 10
  let partiesH = PAD_V
  for (const p of pieces) {
    if (p.kind === "divider") partiesH += 14 + 2 + 14
    else if (p.kind === "pill") partiesH += p.gapBefore + pillH
    else partiesH += p.gapBefore + p.lines.length * pen.lh(p.st)
  }
  partiesH += PAD_V

  // ── Rates
  const rw = rightW - PAD_H * 2
  // Air leads reuse the LCL / free-text rate fields, so relabel them rather than print "per CBM"
  const isAir = modeLabels(str(lead.mode_of_transport)).air
  const rateRows = [
    ["FCL 20' GP", str(lead.rate_20gp)],
    ["FCL 40' HC", str(lead.rate_40hc)],
    [isAir ? "Air freight" : "LCL per CBM", str(lead.rate_lcl)],
    [isAir ? "Other" : "FCL other", str(lead.rate_fcl)],
  ].filter(([, v]) => v)
  const hasRates = rateRows.length > 0
  const currency = hasRates ? str(lead.rate_currency).toUpperCase() || "USD" : ""
  const rowLH = pen.lh(S.rateVal)
  type RateRow =
    | { kind: "inline"; label: string; value: string; size: number; h: number }
    | { kind: "stacked"; label: string; lines: string[]; h: number }
  const rows: RateRow[] = rateRows.map(([label, raw]) => {
    const value = formatRate(raw)
    const room = rw - pen.w(label, S.rateLbl) - 8 - 8 - 16
    for (let s = 24; s >= 16; s--) {
      if (pen.w(value, { ...S.rateVal, size: s }) <= room)
        return { kind: "inline", label, value, size: s, h: rowLH }
    }
    const lines = pen.wrap(value, S.rateText, rw, 3)
    return { kind: "stacked", label, lines, h: pen.lh(S.rateLbl) + 2 + lines.length * pen.lh(S.rateText) }
  })
  const validity = str(lead.rate_validity)
  const goldLines = hasRates && validity ? pen.wrap(validityPill(validity), S.pillGold, rw - 24, 2) : []
  const goldH = goldLines.length ? goldLines.length * pen.lh(S.pillGold) + 16 : 0
  let ratesH = PAD_V + pen.lh(S.partyLbl)
  if (hasRates) for (const r of rows) ratesH += 12 + r.h
  else ratesH += 12 + pen.lh(S.rateNone)
  if (goldH) ratesH += 12 + goldH
  ratesH += PAD_V

  const h = Math.max(partiesH, ratesH)

  const draw = (top: number) => {
    const { doc } = c
    // Parties
    fillRoundRect(doc, x, top, leftW, h, 14, C.white)
    const px = x + PAD_H
    let y = top + PAD_V
    for (const p of pieces) {
      if (p.kind === "divider") {
        line(doc, px, y + 14 + 1, px + pw, y + 14 + 1, 2, C.divider, [6, 4])
        y += 30
      } else if (p.kind === "pill") {
        y += p.gapBefore
        const tw = pen.w(p.text, S.pillAmber)
        fillRoundRect(doc, px, y, 12 + 8 + 8 + tw + 12, pillH, pillH / 2, C.amberBg)
        fillCircle(doc, px + 12 + 4, y + pillH / 2, 4, C.amberDot)
        pen.text(p.text, px + 12 + 8 + 8, y + 5, S.pillAmber)
        y += pillH
      } else {
        y += p.gapBefore
        y += pen.lines(p.lines, px, y, p.st)
      }
    }

    // Rates
    fillRoundRect(doc, rightX, top, rightW, h, 14, C.white)
    const rx = rightX + PAD_H
    const rEnd = rightX + rightW - PAD_H
    y = top + PAD_V
    pen.text("RATES", rx, y, S.partyLbl)
    if (currency) {
      // baseline-align the two 12px labels (same size → same top)
      pen.text(pen.ellipsize(currency, S.ratesCur, rw - pen.w("RATES", S.partyLbl) - 12), rEnd, y, S.ratesCur, "right")
    }
    y += pen.lh(S.partyLbl)
    if (!hasRates) {
      y += 12
      pen.text("Rates on request", rx, y, S.rateNone)
    }
    for (const r of rows) {
      y += 12
      if (r.kind === "inline") {
        const vst = { ...S.rateVal, size: r.size }
        const base = pen.baseline(y, S.rateVal)
        const lw = pen.w(r.label, S.rateLbl)
        const vw = pen.w(r.value, vst)
        pen.text(r.label, rx, base - (pen.baseline(0, S.rateLbl)), S.rateLbl)
        pen.text(r.value, rEnd, base - pen.baseline(0, vst), vst, "right")
        dottedLine(doc, rx + lw + 8, rEnd - vw - 8, base - 1, 2, 4, C.leader)
      } else {
        pen.text(r.label, rx, y, S.rateLbl)
        pen.lines(r.lines, rx, y + pen.lh(S.rateLbl) + 2, S.rateText)
      }
      y += r.h
    }
    if (goldH) {
      const gy = top + h - PAD_V - goldH
      fillRoundRect(doc, rx, gy, rw, goldH, 8, C.gold)
      pen.lines(goldLines, rx + rw / 2, gy + 8, S.pillGold, "center")
    }
  }
  return { h, draw }
}

interface TearLayout {
  heading: string[]
  body: string[]
  grid: boolean
}

function layoutTear(c: Ctx): TearLayout | null {
  const { pen, lead } = c
  const remarks = [str(lead.remarks), str(lead.remarks_2)].filter(Boolean).join("\n\n")
  const innerW = CONTENT_W - 4 - 48
  if (c.contactKnown) {
    if (!remarks) return null
    return { heading: pen.wrap("Remarks", S.tearHead, innerW, 2), body: pen.wrap(remarks, S.tearBody, innerW), grid: false }
  }
  return {
    heading: pen.wrap(`Consignee contact ${DASH} please complete & reply`, S.tearHead, innerW, 2),
    body: pen.wrap(remarks || DEFAULT_TEAR_COPY, S.tearBody, innerW),
    grid: true,
  }
}

/** Draws one (possibly partial) tear-off box. Returns its height. */
function drawTearPart(c: Ctx, top: number, heading: string[], body: string[], grid: boolean, scissors: boolean, measureOnly = false): number {
  const { doc, pen } = c
  const x = PAD_X
  const W = CONTENT_W
  const ix = x + 2 + 24
  const iw = W - 4 - 48
  let y = top + 2 + 22
  const blocks: (() => void)[] = []
  if (heading.length) {
    const hy = y
    blocks.push(() => pen.lines(heading, ix, hy, S.tearHead))
    y += heading.length * pen.lh(S.tearHead)
  }
  if (body.length) {
    if (heading.length) y += 8
    const by = y
    blocks.push(() => pen.lines(body, ix, by, S.tearBody))
    y += body.length * pen.lh(S.tearBody)
  }
  if (grid) {
    y += 16
    const gy = y
    const colW = (iw - 40) / 3
    blocks.push(() => {
      const labels = ["CONTACT PERSON", "EMAIL", "PHONE"]
      labels.forEach((lbl, i) => {
        const gx = ix + i * (colW + 20)
        pen.text(lbl, gx, gy, S.fieldLbl)
        const ly = gy + pen.lh(S.fieldLbl) + 4 + 26 - 0.75
        line(doc, gx, ly, gx + colW, ly, 1.5, C.fillLine)
      })
    })
    y += pen.lh(S.fieldLbl) + 4 + 26
  }
  y += 22 + 2
  const h = y - top
  if (measureOnly) return h

  doc.setDrawColor(C.dots)
  doc.setLineWidth(u(2))
  doc.setLineDashPattern([u(6), u(4)], 0)
  doc.roundedRect(u(x + 1), u(top + 1), u(W - 2), u(h - 2), u(13), u(13), "S")
  doc.setLineDashPattern([], 0)
  if (scissors) {
    fillRect(doc, x + 2 + 28, top - 10, 30, 22, C.page)
    strokeIcon(doc, ICON_SCISSORS, x + 2 + 28 + 4, top - 10, 22, 2, C.muted, ICON_SCISSORS_CIRCLES)
  }
  blocks.forEach((b) => b())
  return h
}

function layoutFooter(c: Ctx) {
  const { pen, lead, brand } = c
  const name = str(lead.sent_by)
  const roleText = [str(lead.sender_designation), brand.company].filter(Boolean).join(", ")
  const contact = [str(lead.sender_email), str(lead.sender_phone), brand.website].filter(Boolean).join(" · ")
  const socials = brand.socials
  const h1 = pen.lh(S.footName)
  const h2 = contact || socials ? pen.lh(S.footLine) : 0
  const h = h1 + (h2 ? 4 + h2 : 0)
  const draw = () => {
    const top = PAGE_H - PAD_B - h
    const sw = socials ? pen.w(socials, S.footSoc) : 0
    let lx = PAD_X
    if (name) {
      const n = pen.ellipsize(name, S.footName, CONTENT_W * 0.6)
      pen.text(n, lx, top, S.footName)
      lx += pen.w(n, S.footName)
    }
    if (roleText) {
      const t = name ? ` · ${roleText}` : roleText
      pen.text(pen.ellipsize(t, name ? S.footRole : S.footName, PAD_X + CONTENT_W - lx), lx, top, name ? S.footRole : S.footName)
    }
    if (h2) {
      const y2 = top + h1 + 4
      if (contact) pen.text(pen.ellipsize(contact, S.footLine, CONTENT_W - (sw ? sw + 24 : 0)), PAD_X, y2, S.footLine)
      if (socials) pen.text(socials, PAD_X + CONTENT_W, y2, S.footSoc, "right")
    }
  }
  return { h, draw }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Draw the Sales Lead into `doc` (unit "mm", A4 portrait, with one blank page).
 * Adds pages if the content does not fit; the footer sits at the bottom of the
 * last page.
 */
export function drawSalesLeadPdf(
  doc: jsPDF,
  lead: SalesLeadPdfData,
  company: string | null | undefined,
  assets: SalesLeadPdfAssets = {},
): void {
  const pen = new Pen(doc, assets.fonts)
  const contactKnown = Boolean(str(lead.consignee_contact) || str(lead.consignee_email) || str(lead.consignee_phone))
  const c: Ctx = {
    doc, pen, lead, assets, contactKnown,
    brand: brandFor(company),
    mode: modeLabels(str(lead.mode_of_transport)),
  }

  const footer = layoutFooter(c)
  const contentBottom = PAGE_H - PAD_B - footer.h - BLOCK_GAP
  let y = CONTENT_TOP

  drawPageChrome(c)
  const newPage = () => {
    pen.text("Continued on next page", PAGE_W - PAD_X, PAGE_H - PAD_B - pen.lh(S.footSoc), S.footSoc, "right")
    doc.addPage()
    drawPageChrome(c)
    y = CONTENT_TOP
  }

  for (const block of [layoutTicket(c), layoutCoupons(c)]) {
    if (y + block.h > contentBottom && y > CONTENT_TOP) newPage()
    block.draw(y)
    y += block.h + BLOCK_GAP
  }

  const tear = layoutTear(c)
  if (tear) {
    const bodyLH = pen.lh(S.tearBody)
    let i = 0
    let first = true
    // Safety bound: every iteration either finishes, or places ≥ 3 lines, or
    // moves to a fresh page (where ≥ 3 lines always fit).
    for (let guard = 0; guard < 200; guard++) {
      while (!first && tear.body[i] === "") i++ // no blank line at the top of a continuation
      const rest = tear.body.slice(i)
      const heading = first ? tear.heading : []
      const fullH = drawTearPart(c, y, heading, rest, tear.grid, first, true)
      if (y + fullH <= contentBottom) {
        drawTearPart(c, y, heading, rest, tear.grid, first)
        y += fullH
        break
      }
      const fixedH = drawTearPart(c, y, heading, [], false, first, true) + (heading.length ? 8 : 0)
      let take = Math.floor((contentBottom - y - fixedH) / bodyLH)
      take = Math.min(take, rest.length - 1)
      if (take < 3) {
        if (y > CONTENT_TOP) { newPage(); continue }
        take = Math.max(1, Math.min(rest.length - 1, take))
      }
      const chunk = rest.slice(0, take)
      while (chunk.length > 1 && chunk[chunk.length - 1] === "") chunk.pop()
      drawTearPart(c, y, heading, chunk, false, first)
      i += take
      first = false
      newPage()
    }
  }

  footer.draw()
}
