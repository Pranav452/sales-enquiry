// Pure Sales Lead PDF renderer — "Shipping Ticket" layout.
//
// Takes a jsPDF document (unit "mm", A4, one blank page), the lead data and
// preloaded assets, and draws the whole document. No DOM access, no fetching:
// the browser wrapper (lib/sales-lead-pdf.ts) loads fonts/images and saves,
// and a Node harness can call this directly to render for inspection.
//
// Layout is authored in CSS px of a 794×1123 mock (96 dpi) and converted to mm
// at draw time, so numbers here can be compared 1:1 with the design.
//
// Nothing is ever truncated. Every value is word-wrapped in full (tokens too
// long for their column, such as URLs, break by character), every card grows
// to fit its content, and the document is laid out top-down with measured
// heights: a card that does not fit the remaining space moves to the next page,
// and the long-text cards (shipment details, remarks) split between lines.

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
// White cards (shipment details, parties, rates)
const CARD_PAD_V = 20
const CARD_PAD_H = 22
const CARD_R = 14

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
  tile:      "#F1F4F9",
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
        else if (FALLBACK_MAP[ch]) out += FALLBACK_MAP[ch]
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
   * Word-wrap the whole text — never clamped. Break opportunities are spaces
   * and after "-" / "/"; a token wider than `maxW` (URL, e-mail, run-on text)
   * breaks by character. Line breaks in the source are kept; blank lines
   * collapse to one empty string.
   */
  wrap(text: string, st: TextStyle, maxW: number): string[] {
    const src = this.clean(text, st.role)
    const out: string[] = []
    const fits = (s: string) => this.w(s, st) <= maxW
    for (const para of src.split("\n")) {
      const toks: { t: string; sp: boolean }[] = []
      for (const word of para.split(/ +/).filter(Boolean)) {
        // A standalone separator ("/", "//", "—", ":", "&" …) stays on the line of the word before it.
        if (toks.length && /^[-/|·:;,&+=–—]+$/.test(word)) {
          toks[toks.length - 1].t += ` ${word}`
          continue
        }
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
        while (!fits(word) && Array.from(word).length > 1) {
          const chars = Array.from(word)
          // Longest prefix that fits (always at least one character).
          let lo = 1
          let hi = chars.length - 1
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2)
            if (fits(chars.slice(0, mid).join(""))) lo = mid
            else hi = mid - 1
          }
          let n = lo
          // URLs / e-mails: prefer breaking just after a "." "@" "_" in the back half of the line.
          for (let j = n; j > n / 2; j--) if (/[.@_]/.test(chars[j - 1])) { n = j; break }
          out.push(chars.slice(0, n).join("").trimEnd())
          word = chars.slice(n).join("").trimStart()
        }
        line = word
      }
      if (line) out.push(line)
    }
    while (out.length && out[out.length - 1] === "") out.pop()
    return out
  }

  /** Join `items` with " · " into lines no wider than `maxW`; an item too long for a line wraps on its own. */
  pack(items: string[], st: TextStyle, maxW: number): string[] {
    const out: string[] = []
    let line = ""
    for (const item of items) {
      const cand = line ? `${line} · ${item}` : item
      if (this.w(cand, st) <= maxW) { line = cand; continue }
      if (line) out.push(line)
      const parts = this.wrap(item, st, maxW)
      line = parts.pop() ?? ""
      out.push(...parts)
    }
    if (line) out.push(line)
    return out
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

// Placeholder values people type for "nothing here".
const EMPTY_VALUE = /^(?:n\/?a|-|–|—)$/i

/** Trimmed field value; "NA", "N/A", "-" and "—" (any case) count as empty. */
function str(v: string | null | undefined): string {
  const t = (v ?? "").trim()
  return EMPTY_VALUE.test(t) ? "" : t
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

/** True when `text` already ends with `tail` (case-insensitive, trailing punctuation ignored). */
function endsWithText(text: string, tail: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[\s.,;:]+$/, "")
  const a = norm(text)
  const b = norm(tail)
  if (!a || !b) return false
  return a === b || a.endsWith(` ${b}`) || a.endsWith(`,${b}`)
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
  brand:      { role: "bold", size: 14, color: C.navy, ls: 0.2 },
  brandSub:   { role: "reg", size: 12, color: C.muted, ls: 0.12 },
  title:      { role: "disp", size: 26, color: C.navy, ls: -0.01 },
  chip:       { role: "bold", size: 12, color: C.white, ls: 0.16 },
  routeLbl:   { role: "bold", size: 12, color: C.label, ls: 0.16 },
  city:       { role: "reg", size: 14, color: C.body },
  fieldLbl:   { role: "bold", size: 12, color: C.label, ls: 0.12 },
  fieldVal:   { role: "bold", size: 16, color: C.navy, lh: 1.3 },
  fieldMono:  { role: "disp", size: 16, color: C.navy, lh: 1.3 },
  stubLbl:    { role: "bold", size: 12, color: C.gold, ls: 0.14 },
  stubRef:    { role: "disp", size: 14, color: C.white },
  stubVal:    { role: "bold", size: 15, color: C.white },
  stubMono:   { role: "disp", size: 15, color: C.white },
  cardLbl:    { role: "bold", size: 12, color: C.brown, ls: 0.16 },
  detailVal:  { role: "bold", size: 15, color: C.navy, lh: 1.4 },
  detailPara: { role: "reg", size: 14, color: C.body, lh: 1.5 },
  partyName:  { role: "bold", size: 17, color: C.navy },
  partyAddr:  { role: "reg", size: 14, color: C.body, lh: 1.45 },
  partyLine:  { role: "reg", size: 14, color: C.body },
  partyCont:  { role: "bold", size: 14, color: C.navy },
  pillAmber:  { role: "bold", size: 13, color: C.amberText },
  ratesCur:   { role: "bold", size: 12, color: C.label, ls: 0.12 },
  tileLbl:    { role: "bold", size: 13, color: C.body },
  rateVal:    { role: "disp", size: 24, color: C.navy },
  rateLbl:    { role: "bold", size: 14, color: C.body, lh: 1.35 },
  rateText:   { role: "bold", size: 14, color: C.navy, lh: 1.35 },
  rateNone:   { role: "bold", size: 15, color: C.body },
  pillGold:   { role: "bold", size: 13, color: C.navy },
  tearHead:   { role: "disp", size: 21, color: C.navy },
  tearBody:   { role: "reg", size: 14, color: C.body, lh: 1.5 },
  footName:   { role: "bold", size: 15, color: C.navy },
  footRole:   { role: "reg", size: 15, color: C.muted },
  footLine:   { role: "reg", size: 13, color: C.body },
  footSoc:    { role: "reg", size: 13, color: C.muted },
} satisfies Record<string, TextStyle>

const codeStyle = (size: number): TextStyle => ({ role: "disp", size, color: C.navy, ls: -0.02, lh: 1 })

// Big FROM/TO labels: one line from 62 down to 30 px, then two lines down to
// the floor, below which the text keeps the floor size and wraps further.
const BIG_MAX = 62
const BIG_ONE_LINE_MIN = 30
const BIG_FLOOR = 22

// ── Cards & pagination ────────────────────────────────────────────────────────

/** An unbreakable horizontal slice of a card. */
interface Unit {
  h: number
  /** Space above the unit; dropped when the unit starts a page part. */
  gap?: number
  /** Separator / blank line: skipped at the start and end of a page part. */
  edge?: boolean
  draw: (top: number) => void
}

interface Card {
  units: Unit[]
  /**
   * true: may break between units whenever it does not fit the rest of a page.
   * "tall": kept whole (moved to the next page) unless it is taller than a page.
   */
  split: boolean | "tall"
  padT: number
  padB: number
  /** Background, drawn before the units; `part` counts page parts from 0. */
  frame?: (top: number, h: number, part: number) => void
  /** Minimum number of units a page part must hold before a page break. */
  keep?: number
}

function trimUnits(units: Unit[]): Unit[] {
  let a = 0
  let b = units.length
  while (a < b && units[a].edge) a++
  while (b > a && units[b - 1].edge) b--
  return units.slice(a, b)
}

function partHeight(card: Card, units: Unit[]): number {
  let h = card.padT + card.padB
  units.forEach((un, k) => { h += (k ? un.gap ?? 0 : 0) + un.h })
  return h
}

function drawPart(card: Card, units: Unit[], top: number, part: number) {
  const h = partHeight(card, units)
  card.frame?.(top, h, part)
  let y = top + card.padT
  units.forEach((un, k) => {
    if (k) y += un.gap ?? 0
    un.draw(y)
    y += un.h
  })
}

interface Ctx {
  doc: jsPDF
  pen: Pen
  lead: SalesLeadPdfData
  brand: Brand
  assets: SalesLeadPdfAssets
  mode: { chip: string; stub: string; air: boolean }
  contactKnown: boolean
  /** Height available to a card on a fresh page. */
  room: number
}

/**
 * Widths for side-by-side columns sharing `avail`: the split (4 px steps) whose
 * tallest column is lowest, preferring the most even split among ties, so
 * short content keeps equal columns. Each column is at least `minW` wide.
 */
function balanceColumns(heightAt: ((w: number) => number)[], minW: number[], avail: number): number[] {
  const n = heightAt.length
  const even = avail / n
  const STEP = 4
  const lo = minW.map((m) => Math.min(Math.ceil(m), even))
  const memo = heightAt.map(() => new Map<number, number>())
  const hAt = (i: number, w: number) => {
    let v = memo[i].get(w)
    if (v === undefined) { v = heightAt[i](w); memo[i].set(w, v) }
    return v
  }
  let best = heightAt.map(() => even)
  let bestH = Math.max(...heightAt.map((_, i) => hAt(i, even)))
  let bestDev = 0
  const cur: number[] = []
  const visit = (i: number, left: number, maxH: number) => {
    if (i === n - 1) {
      if (left < lo[i]) return
      cur[i] = left
      const H = Math.max(maxH, hAt(i, left))
      const dev = cur.reduce((s, w) => s + Math.abs(w - even), 0)
      if (H < bestH - 0.01 || (H <= bestH + 0.01 && dev < bestDev)) { bestH = H; bestDev = dev; best = [...cur] }
      return
    }
    const restMin = lo.slice(i + 1).reduce((s, w) => s + w, 0)
    for (let w = lo[i]; w <= left - restMin; w += STEP) {
      const H = Math.max(maxH, hAt(i, w))
      if (H > bestH + 0.01) continue
      cur[i] = w
      visit(i + 1, left - w, H)
    }
  }
  visit(0, avail, 0)
  return best
}

function whiteFrame(c: Ctx) {
  return (top: number, h: number) => fillRoundRect(c.doc, PAD_X, top, CONTENT_W, h, CARD_R, C.white)
}

/**
 * A label-column row (label left, value wrapped in full on the right) as units.
 * The first unit carries the label plus as many value lines as the label spans.
 */
function labelRowUnits(
  pen: Pen, label: string, value: string, vst: TextStyle,
  lx: number, lblW: number, vx: number, vw: number, gap: number, lst: TextStyle = S.fieldLbl,
): Unit[] {
  const lLines = pen.wrap(label, lst, lblW - 16)
  const vLines = pen.wrap(value, vst, vw)
  const vLH = pen.lh(vst)
  const lineH = (l: string) => (l ? vLH : vLH * 0.6)
  const off = Math.max(0, pen.baseline(0, vst) - pen.baseline(0, lst))
  const lblH = off + lLines.length * pen.lh(lst)
  let k = 1
  let firstH = lineH(vLines[0] ?? "x")
  while (k < vLines.length && firstH < lblH) firstH += lineH(vLines[k++])
  const first = vLines.slice(0, k)
  const drawLines = (lines: string[], top: number) => {
    let y = top
    for (const l of lines) { pen.text(l, vx, y, vst); y += lineH(l) }
  }
  const units: Unit[] = [{
    h: Math.max(lblH, firstH),
    gap,
    draw: (t) => { pen.lines(lLines, lx, t + off, lst); drawLines(first, t) },
  }]
  for (const l of vLines.slice(k)) {
    units.push(l ? { h: vLH, draw: (t) => pen.text(l, vx, t, vst) } : { h: lineH(l), edge: true, draw: () => {} })
  }
  return units
}

// ── Page chrome ───────────────────────────────────────────────────────────────

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
  const blockH = pen.lh(S.brand) + 2 + pen.lh(S.brandSub)
  const top = PAD_T + (HEADER_H - blockH) / 2
  pen.text(brand.name, tx, top, S.brand)
  pen.text(brand.sub, tx, top + pen.lh(S.brand) + 2, S.brandSub)
  pen.text("Sales Lead", PAGE_W - PAD_X, PAD_T + (HEADER_H - pen.lh(S.title)) / 2, S.title, "right")
}

// ── Ticket ────────────────────────────────────────────────────────────────────

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
  // The port/country line wraps, so it only claims up to half the width.
  const natural = sides.map((s) =>
    Math.max(pen.w(s.big, codeStyle(BIG_MAX)), pen.w(s.label, S.routeLbl), Math.min(pen.w(s.city, S.city), avail / 2)),
  )
  let widths: number[]
  if (natural[0] + natural[1] <= avail) widths = natural
  else {
    const share = avail / 2
    if (natural[0] <= share) widths = [natural[0], avail - natural[0]]
    else if (natural[1] <= share) widths = [avail - natural[1], natural[1]]
    else widths = [share, share]
  }

  const fitSize = (text: string, maxW: number): number => {
    for (let s = BIG_MAX; s >= BIG_ONE_LINE_MIN; s -= 2) if (pen.w(text, codeStyle(s)) <= maxW) return s
    for (let s = 34; s >= BIG_FLOOR; s -= 2) if (pen.wrap(text, codeStyle(s), maxW).length <= 2) return s
    return BIG_FLOOR
  }
  // Missing sides show a small, light placeholder dash and don't drive the size.
  const filled = sides.map((s, i) => (s.empty ? BIG_MAX : fitSize(s.big, widths[i])))
  const size = sides.every((s) => s.empty) ? 36 : Math.min(...filled)
  const st = codeStyle(size)
  const bigLines = sides.map((s, i) => (s.empty ? [DASH] : pen.wrap(s.big, st, widths[i])))
  const lineH = (n: number) => (n > 1 ? size * 1.06 : size)
  const bigH = Math.max(...bigLines.map((l) => l.length * lineH(l.length)))
  const cityLines = sides.map((s, i) => (s.city ? pen.wrap(s.city, S.city, widths[i]) : []))
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

function ticketCard(c: Ctx): Card {
  const { pen, lead, brand, assets } = c
  const x = PAD_X
  const W = CONTENT_W
  const STUB_W = 192
  const innerX = x + 30
  const innerW = W - STUB_W - 60

  // Left: chip, route, short-field grid, "prepared for" row
  let y = 26
  const chipLines = c.mode.chip ? pen.wrap(c.mode.chip, S.chip, innerW - 28) : []
  const chip = chipLines.length
    ? { y, w: Math.max(...chipLines.map((l) => pen.w(l, S.chip))) + 28, h: chipLines.length * pen.lh(S.chip) + 12 }
    : null
  if (chip) y += chip.h + 22
  const route = layoutRoute(c, innerW)
  const routeY = y
  y += route.h + 22
  const ruleY = y
  y += 1 + 18

  const stack = (a: string, b: string, w: number): string[] => {
    if (!a && !b) return [DASH]
    return [...(a ? pen.wrap(a, S.fieldVal, w) : []), ...(b ? pen.wrap(b, S.fieldVal, w) : [])]
  }
  const defs: { label: string; st: TextStyle; wrap: (w: number) => string[] }[] = [
    { label: "HS CODE", st: S.fieldMono, wrap: (w) => pen.wrap(str(lead.hs_code) || DASH, S.fieldMono, w) },
    { label: "RATE VALIDITY", st: S.fieldVal, wrap: (w) => pen.wrap(formatDate(str(lead.rate_validity)) || DASH, S.fieldVal, w) },
    { label: "PREPARED BY", st: S.fieldVal, wrap: (w) => stack(str(lead.sent_by), str(lead.sender_designation), w) },
  ]
  const GRID_GAP = 20
  const colWs = balanceColumns(
    defs.map((d) => (w: number) => d.wrap(w).length * pen.lh(d.st)),
    defs.map((d) => pen.w(d.label, S.fieldLbl)),
    innerW - GRID_GAP * (defs.length - 1),
  )
  const fields = defs.map((d, i) => ({ label: d.label, st: d.st, lines: d.wrap(colWs[i]) }))
  const fieldTop = pen.lh(S.fieldLbl) + 3
  const gridY = y
  y += Math.max(...fields.map((f) => fieldTop + f.lines.length * pen.lh(f.st))) + 18
  const forLines = stack(str(lead.agent_name), str(lead.agent_company), innerW)
  const forY = y
  y += fieldTop + forLines.length * pen.lh(S.fieldVal) + 28
  const leftH = y

  // Stub: seal + REF / DATE / ROUTE / MODE
  const stubX = x + W - STUB_W
  const stubInX = stubX + 2 + 22
  const stubInW = STUB_W - 2 - 44
  const seal = !brand.links && assets.seal ? assets.seal : null
  type StubItem = { label: string; h: number; draw: (top: number) => void }
  const stubText = (label: string, v: string, st: TextStyle): StubItem => {
    const lines = pen.wrap(v || DASH, st, stubInW)
    return { label, h: lines.length * pen.lh(st), draw: (t) => pen.lines(lines, stubInX, t, st) }
  }
  const ARROW_W = 12
  const ARROW_GAP = 5
  const routeItem = (): StubItem => {
    const st = S.stubMono
    const L = pen.lh(st)
    const [from, to] = routeSides(lead)
    if (from.big === DASH && to.big === DASH) return stubText("ROUTE", DASH, st)
    const arrowAt = (ax: number, t: number) => arrow(c.doc, ax, pen.baseline(t, st) - 0.33 * st.size, ARROW_W, 1.4, C.white)
    if (pen.w(from.big, st) + ARROW_W + ARROW_GAP * 2 + pen.w(to.big, st) <= stubInW) {
      return {
        label: "ROUTE",
        h: L,
        draw: (t) => {
          pen.text(from.big, stubInX, t, st)
          const ax = stubInX + pen.w(from.big, st) + ARROW_GAP
          arrowAt(ax, t)
          pen.text(to.big, ax + ARROW_W + ARROW_GAP, t, st)
        },
      }
    }
    // Origin on its own lines, then "→ destination" with a hanging indent.
    const fromLines = pen.wrap(from.big, st, stubInW)
    const toLines = pen.wrap(to.big, st, stubInW - ARROW_W - ARROW_GAP)
    return {
      label: "ROUTE",
      h: (fromLines.length + toLines.length) * L,
      draw: (t) => {
        pen.lines(fromLines, stubInX, t, st)
        const ty = t + fromLines.length * L
        arrowAt(stubInX, ty)
        pen.lines(toLines, stubInX + ARROW_W + ARROW_GAP, ty, st)
      },
    }
  }
  const stubItems: StubItem[] = [
    stubText("REF NO", str(lead.ref_code), S.stubRef),
    stubText("DATE SENT", formatDate(str(lead.date_sent)), S.stubVal),
    routeItem(),
    stubText("MODE", c.mode.stub, S.stubVal),
  ]
  const stubLblH = pen.lh(S.stubLbl) + 2
  let stubH = 24 + (seal ? 60 + 14 : 0)
  stubItems.forEach((it, i) => { stubH += stubLblH + it.h + (i < stubItems.length - 1 ? 14 : 0) })
  stubH += 24

  const h = Math.max(leftH, stubH)
  if (h > c.room) return ticketFallbackCard(c)

  const draw = (top: number) => {
    const { doc } = c
    fillCornerRect(doc, x, top, W - STUB_W, h, [16, 0, 0, 16], C.white)
    fillCornerRect(doc, stubX, top, STUB_W, h, [0, 16, 16, 0], C.navy)

    if (chip) {
      fillRoundRect(doc, innerX, top + chip.y, chip.w, chip.h, Math.min(chip.h / 2, 14), C.navy)
      pen.lines(chipLines, innerX + 14, top + chip.y + 6, S.chip)
    }
    route.draw(innerX, top + routeY)
    line(doc, innerX, top + ruleY + 0.5, innerX + innerW, top + ruleY + 0.5, 1, C.rule)
    let fx = innerX
    fields.forEach((f, i) => {
      if (i) fx += colWs[i - 1] + GRID_GAP
      pen.text(f.label, fx, top + gridY, S.fieldLbl)
      pen.lines(f.lines, fx, top + gridY + fieldTop, f.st)
    })
    pen.text("PREPARED FOR", innerX, top + forY, S.fieldLbl)
    pen.lines(forLines, innerX, top + forY + fieldTop, S.fieldVal)

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
      sy += stubLblH
      it.draw(sy)
      sy += it.h + 14
    }

    // Perforation + notches
    line(doc, stubX + 1, top, stubX + 1, top + h, 2, C.perf, [4.5, 2.5])
    fillCircle(doc, stubX, top, 14, C.page)
    fillCircle(doc, stubX, top + h, 14, C.page)
  }
  return { units: [{ h, draw }], split: false, padT: 0, padB: 0 }
}

// ── Shipment details ──────────────────────────────────────────────────────────

const LABEL_COL_W = 150

/** A full-width white card: brown title, then label | value rows split by rules; splits between lines. */
function rowsCard(c: Ctx, title: string, rows: { label: string; text: string; st: TextStyle }[]): Card {
  const { pen, doc } = c
  const ix = PAD_X + CARD_PAD_H
  const iw = CONTENT_W - CARD_PAD_H * 2
  const vx = ix + LABEL_COL_W
  const vw = iw - LABEL_COL_W
  const units: Unit[] = [{ h: pen.lh(S.cardLbl), draw: (t) => pen.text(title, ix, t, S.cardLbl) }]
  rows.forEach((r, i) => {
    if (i) units.push({ h: 1, gap: 12, edge: true, draw: (t) => line(doc, ix, t + 0.5, ix + iw, t + 0.5, 1, C.rule) })
    units.push(...labelRowUnits(pen, r.label, r.text, r.st, ix, LABEL_COL_W, vx, vw, i ? 12 : 14))
  })
  return { units, split: true, padT: CARD_PAD_V, padB: CARD_PAD_V, frame: whiteFrame(c) }
}

function shipmentCard(c: Ctx): Card | null {
  const { lead } = c
  const rows = [
    { label: "COMMODITY", text: str(lead.commodity), st: S.detailVal },
    { label: "SPECIAL REQUIREMENTS", text: str(lead.special_requirements), st: S.detailPara },
  ].filter((r) => r.text)
  return rows.length ? rowsCard(c, "SHIPMENT DETAILS", rows) : null
}

/**
 * Safety net for extreme text only: when the ticket would be taller than a
 * page it cannot split, so its fields print as a splittable label | value card.
 */
function ticketFallbackCard(c: Ctx): Card {
  const { lead } = c
  const [from, to] = routeSides(lead)
  const side = (s: RouteSide) => (s.empty ? "" : [s.big, s.city].filter(Boolean).join(", "))
  const pair = (a: string, b: string) => [a, b].filter(Boolean).join("\n")
  const rows = [
    { label: "MODE", text: str(lead.mode_of_transport) },
    { label: "FROM", text: side(from) },
    { label: "TO", text: side(to) },
    { label: "REF NO", text: str(lead.ref_code) },
    { label: "DATE SENT", text: formatDate(str(lead.date_sent)) },
    { label: "HS CODE", text: str(lead.hs_code) },
    { label: "RATE VALIDITY", text: formatDate(str(lead.rate_validity)) },
    { label: "PREPARED BY", text: pair(str(lead.sent_by), str(lead.sender_designation)) },
    { label: "PREPARED FOR", text: pair(str(lead.agent_name), str(lead.agent_company)) },
  ].filter((r) => r.text).map((r) => ({ ...r, st: S.detailVal }))
  return rowsCard(c, "LEAD DETAILS", rows)
}

// ── Parties ───────────────────────────────────────────────────────────────────

function partiesCard(c: Ctx): Card {
  const { pen, lead, doc } = c
  const ix = PAD_X + CARD_PAD_H
  const iw = CONTENT_W - CARD_PAD_H * 2
  const MID = 44
  const colW = (iw - MID) / 2
  const pillText = "Contact details to be traced"
  const pillH = pen.lh(S.pillAmber) + 10

  type Piece = { kind: "text"; lines: string[]; st: TextStyle; gap: number } | { kind: "pill"; gap: number }
  const columns = (w: number): [Piece[], Piece[]] => {
    const ship: Piece[] = []
    const cons: Piece[] = []
    const add = (col: Piece[], text: string, st: TextStyle, gap: number) => {
      if (text) col.push({ kind: "text", lines: pen.wrap(text, st, w), st, gap })
    }
    add(ship, "SHIPPER", S.cardLbl, 0)
    add(ship, str(lead.shipper) || DASH, S.partyName, 4)
    const sAddr = str(lead.shipper_address)
    const sCity = str(lead.city)
    add(ship, sAddr, S.partyAddr, 4)
    if (!endsWithText(sAddr, sCity)) add(ship, sCity, S.partyAddr, sAddr ? 0 : 4)
    add(ship, displayUrl(str(lead.shipper_website)), S.partyLine, 4)

    add(cons, "CONSIGNEE", S.cardLbl, 0)
    add(cons, str(lead.consignee) || DASH, S.partyName, 4)
    const cAddr = str(lead.consignee_address)
    const cCountry = str(lead.dest_country)
    add(cons, cAddr, S.partyAddr, 4)
    if (!endsWithText(cAddr, cCountry)) add(cons, cCountry, S.partyAddr, cAddr ? 0 : 4)
    add(cons, displayUrl(str(lead.consignee_website)) || "Website not available", S.partyLine, 4)
    if (c.contactKnown) {
      let gap = 8
      for (const [v, st] of [
        [str(lead.consignee_contact), S.partyCont],
        [str(lead.consignee_email), S.partyLine],
        [str(lead.consignee_phone), S.partyLine],
      ] as const) {
        if (!v) continue
        add(cons, v, st, gap)
        gap = 2
      }
    } else {
      cons.push({ kind: "pill", gap: 10 })
    }
    return [ship, cons]
  }
  const drawPill = (px: number, y: number) => {
    const tw = pen.w(pillText, S.pillAmber)
    fillRoundRect(doc, px, y, 12 + 8 + 8 + tw + 12, pillH, pillH / 2, C.amberBg)
    fillCircle(doc, px + 12 + 4, y + pillH / 2, 4, C.amberDot)
    pen.text(pillText, px + 12 + 8 + 8, y + 5, S.pillAmber)
  }

  // Normal layout: Shipper | Consignee side by side, one unbreakable unit.
  const [ship, cons] = columns(colW)
  const colH = (pieces: Piece[]) =>
    pieces.reduce((h, p) => h + p.gap + (p.kind === "pill" ? pillH : p.lines.length * pen.lh(p.st)), 0)
  const h = Math.max(colH(ship), colH(cons))
  if (CARD_PAD_V * 2 + h <= c.room) {
    const drawCol = (pieces: Piece[], px: number, top: number) => {
      let y = top
      for (const p of pieces) {
        y += p.gap
        if (p.kind === "pill") { drawPill(px, y); y += pillH }
        else y += pen.lines(p.lines, px, y, p.st)
      }
    }
    const draw = (top: number) => {
      drawCol(ship, ix, top)
      const dx = ix + colW + MID / 2
      line(doc, dx, top, dx, top + h, 2, C.divider, [6, 4])
      drawCol(cons, ix + colW + MID, top)
    }
    return { units: [{ h, draw }], split: false, padT: CARD_PAD_V, padB: CARD_PAD_V, frame: whiteFrame(c) }
  }

  // Taller than a page (only with extreme text): stack Shipper over Consignee
  // at full width, one unit per line, so the card can split across pages.
  const units: Unit[] = []
  const [shipW, consW] = columns(iw)
  const toUnits = (pieces: Piece[]) => {
    for (const p of pieces) {
      if (p.kind === "pill") { units.push({ h: pillH, gap: p.gap, draw: (t) => drawPill(ix, t) }); continue }
      const L = pen.lh(p.st)
      p.lines.forEach((l, k) => units.push({ h: L, gap: k ? 0 : p.gap, draw: (t) => pen.text(l, ix, t, p.st) }))
    }
  }
  toUnits(shipW)
  units.push({ h: 2, gap: 14, edge: true, draw: (t) => line(doc, ix, t + 1, ix + iw, t + 1, 2, C.divider, [6, 4]) })
  const consUnits = units.length
  toUnits(consW)
  if (units[consUnits]) units[consUnits].gap = 14
  return { units, split: true, padT: CARD_PAD_V, padB: CARD_PAD_V, frame: whiteFrame(c) }
}

// ── Rates ─────────────────────────────────────────────────────────────────────

function ratesCard(c: Ctx): Card {
  const { pen, lead, doc } = c
  const ix = PAD_X + CARD_PAD_H
  const rw = CONTENT_W - CARD_PAD_H * 2
  const rEnd = ix + rw
  // Air leads reuse the LCL / free-text rate fields, so relabel them rather than print "per CBM"
  const isAir = c.mode.air
  const slots = [
    { label: "FCL 20' GP", raw: str(lead.rate_20gp) },
    { label: "FCL 40' HC", raw: str(lead.rate_40hc) },
    { label: isAir ? "Air freight" : "LCL per CBM", raw: str(lead.rate_lcl) },
  ].filter((s) => s.raw)
  const other = str(lead.rate_fcl)
  const hasRates = slots.length > 0 || Boolean(other)
  const currency = hasRates ? str(lead.rate_currency).toUpperCase() || "USD" : ""

  // Short values become big tiles; anything that would not fit a tile on one
  // line at ≥ 18 px gets a full-width label + text row under the tiles.
  const TILE_GAP = 12
  const TILE_PAD_X = 16
  const TILE_PAD_Y = 14
  const tileW = (rw - TILE_GAP * 2) / 3
  const tiles: { label: string[]; value: string; st: TextStyle }[] = []
  const rows: { label: string; value: string }[] = []
  for (const s of slots) {
    const value = formatRate(s.raw)
    let st: TextStyle | null = null
    for (let z = S.rateVal.size; z >= 18 && !st; z--) {
      if (pen.w(value, { ...S.rateVal, size: z }) <= tileW - TILE_PAD_X * 2) st = { ...S.rateVal, size: z }
    }
    if (st) tiles.push({ label: pen.wrap(s.label, S.tileLbl, tileW - TILE_PAD_X * 2), value, st })
    else rows.push({ label: s.label, value })
  }
  if (other) rows.push({ label: isAir ? "Other" : "FCL other", value: formatRate(other) })

  const units: Unit[] = []
  const curLines = currency ? pen.wrap(currency, S.ratesCur, rw - pen.w("RATES", S.cardLbl) - 24) : []
  units.push({
    h: Math.max(pen.lh(S.cardLbl), curLines.length * pen.lh(S.ratesCur)),
    draw: (t) => {
      pen.text("RATES", ix, t, S.cardLbl)
      pen.lines(curLines, rEnd, t, S.ratesCur, "right")
    },
  })
  if (!hasRates) units.push({ h: pen.lh(S.rateNone), gap: 12, draw: (t) => pen.text("Rates on request", ix, t, S.rateNone) })

  if (tiles.length) {
    const tileLblH = Math.max(...tiles.map((t) => t.label.length)) * pen.lh(S.tileLbl)
    const tileH = TILE_PAD_Y + tileLblH + 4 + pen.lh(S.rateVal) + TILE_PAD_Y
    units.push({
      h: tileH,
      gap: 14,
      draw: (top) => tiles.forEach((t, i) => {
        const tx = ix + i * (tileW + TILE_GAP)
        fillRoundRect(doc, tx, top, tileW, tileH, 10, C.tile)
        pen.lines(t.label, tx + TILE_PAD_X, top + TILE_PAD_Y, S.tileLbl)
        // Shrunk values share the 24 px baseline so the row stays aligned.
        const vTop = top + TILE_PAD_Y + tileLblH + 4
        pen.text(t.value, tx + TILE_PAD_X, pen.baseline(vTop, S.rateVal) - pen.baseline(0, t.st), t.st)
      }),
    })
  }

  rows.forEach((r, i) => {
    if (i || tiles.length) units.push({ h: 1, gap: 12, edge: true, draw: (t) => line(doc, ix, t + 0.5, rEnd, t + 0.5, 1, C.rule) })
    units.push(...labelRowUnits(pen, r.label, r.value, S.rateText, ix, LABEL_COL_W, ix + LABEL_COL_W, rw - LABEL_COL_W, 12, S.rateLbl))
  })

  const validity = str(lead.rate_validity)
  const goldLines = hasRates && validity ? pen.wrap(validityPill(validity), S.pillGold, rw - 28) : []
  if (goldLines.length) {
    const goldW = Math.max(...goldLines.map((l) => pen.w(l, S.pillGold))) + 28
    const goldH = goldLines.length * pen.lh(S.pillGold) + 16
    units.push({
      h: goldH,
      gap: 16,
      draw: (t) => {
        fillRoundRect(doc, ix, t, goldW, goldH, 8, C.gold)
        pen.lines(goldLines, ix + goldW / 2, t + 8, S.pillGold, "center")
      },
    })
  }
  return { units, split: "tall", padT: CARD_PAD_V, padB: CARD_PAD_V, frame: whiteFrame(c) }
}

// ── Tear-off box ──────────────────────────────────────────────────────────────

function tearCard(c: Ctx): Card | null {
  const { pen, lead, doc } = c
  const remarks = [str(lead.remarks), str(lead.remarks_2)].filter(Boolean).join("\n\n")
  const x = PAD_X
  const W = CONTENT_W
  const ix = x + 2 + 24
  const iw = W - 4 - 48
  let heading: string
  let body: string
  let grid: boolean
  if (c.contactKnown) {
    if (!remarks) return null
    heading = "Remarks"
    body = remarks
    grid = false
  } else {
    heading = `Consignee contact ${DASH} please complete & reply`
    body = remarks || DEFAULT_TEAR_COPY
    grid = true
  }

  const units: Unit[] = []
  const headLines = pen.wrap(heading, S.tearHead, iw)
  units.push({ h: headLines.length * pen.lh(S.tearHead), draw: (t) => pen.lines(headLines, ix, t, S.tearHead) })
  const bodyLH = pen.lh(S.tearBody)
  pen.wrap(body, S.tearBody, iw).forEach((ln, k) => {
    units.push(ln
      ? { h: bodyLH, gap: k === 0 ? 8 : 0, draw: (t) => pen.text(ln, ix, t, S.tearBody) }
      : { h: bodyLH * 0.6, edge: true, draw: () => {} })
  })
  if (grid) {
    const colW = (iw - 40) / 3
    units.push({
      h: pen.lh(S.fieldLbl) + 4 + 26,
      gap: 16,
      draw: (t) => {
        const labels = ["CONTACT PERSON", "EMAIL", "PHONE"]
        labels.forEach((lbl, i) => {
          const gx = ix + i * (colW + 20)
          pen.text(lbl, gx, t, S.fieldLbl)
          const ly = t + pen.lh(S.fieldLbl) + 4 + 26 - 0.75
          line(doc, gx, ly, gx + colW, ly, 1.5, C.fillLine)
        })
      },
    })
  }

  const frame = (top: number, h: number, part: number) => {
    doc.setDrawColor(C.dots)
    doc.setLineWidth(u(2))
    doc.setLineDashPattern([u(6), u(4)], 0)
    doc.roundedRect(u(x + 1), u(top + 1), u(W - 2), u(h - 2), u(13), u(13), "S")
    doc.setLineDashPattern([], 0)
    if (part === 0) {
      fillRect(doc, x + 2 + 28, top - 10, 30, 22, C.page)
      strokeIcon(doc, ICON_SCISSORS, x + 2 + 28 + 4, top - 10, 22, 2, C.muted, ICON_SCISSORS_CIRCLES)
    }
  }
  return { units, split: true, padT: 2 + 22, padB: 22 + 2, frame }
}

// ── Footer ────────────────────────────────────────────────────────────────────

function layoutFooter(c: Ctx) {
  const { pen, lead, brand } = c
  const W = CONTENT_W
  const name = str(lead.sent_by)
  const roleText = [str(lead.sender_designation), brand.company].filter(Boolean).join(", ")
  const contact = [str(lead.sender_email), str(lead.sender_phone), brand.website].filter(Boolean)
  const socials = brand.socials

  // Line 1: "Name · Role, Company" on one line when it fits, else name, then role.
  type Seg = { text: string; st: TextStyle }
  const top: Seg[][] = []
  const tail = name && roleText ? ` · ${roleText}` : ""
  if (name && pen.w(name, S.footName) + pen.w(tail, S.footRole) <= W) {
    top.push([{ text: name, st: S.footName }, ...(tail ? [{ text: tail, st: S.footRole }] : [])])
  } else {
    if (name) for (const l of pen.wrap(name, S.footName, W)) top.push([{ text: l, st: S.footName }])
    const rst = name ? S.footRole : S.footName
    if (roleText) for (const l of pen.wrap(roleText, rst, W)) top.push([{ text: l, st: rst }])
  }

  // Line 2: contact details left, socials right (own line when space is short).
  const sw = socials ? pen.w(socials, S.footSoc) : 0
  let contactLines = pen.pack(contact, S.footLine, socials ? W - sw - 24 : W)
  let socialsOwnLine = false
  if (socials && contactLines.length > 1 && W - sw - 24 < W * 0.55) {
    contactLines = pen.pack(contact, S.footLine, W)
    socialsOwnLine = true
  }
  const topLH = pen.lh(S.footName)
  const lineLH = pen.lh(S.footLine)
  const bottomRows = contactLines.length + (socialsOwnLine ? 1 : 0) || (socials ? 1 : 0)
  const h = top.length * topLH + (bottomRows ? (top.length ? 4 : 0) + bottomRows * lineLH : 0)

  const draw = () => {
    let y = PAGE_H - PAD_B - h
    for (const segs of top) {
      let lx = PAD_X
      for (const s of segs) {
        pen.text(s.text, lx, y, s.st)
        lx += pen.w(s.text, s.st)
      }
      y += topLH
    }
    if (!bottomRows) return
    if (top.length) y += 4
    contactLines.forEach((l, i) => pen.text(l, PAD_X, y + i * lineLH, S.footLine))
    if (socials) {
      const sy = socialsOwnLine ? y + contactLines.length * lineLH : y
      pen.text(socials, PAD_X + W, sy, S.footSoc, "right")
    }
  }
  return { h, draw }
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Draw the Sales Lead into `doc` (unit "mm", A4 portrait, with one blank page).
 * Cards are placed top-down; a card that does not fit the rest of the page
 * starts on a new page (header repeated), and the shipment-details and
 * tear-off cards split between lines when needed. The footer sits at the
 * bottom of the last page.
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
    room: 0,
  }

  const footer = layoutFooter(c)
  const bottom = PAGE_H - PAD_B - footer.h - BLOCK_GAP
  c.room = bottom - CONTENT_TOP
  let y = CONTENT_TOP

  drawPageChrome(c)
  const newPage = () => {
    pen.text("Continued on next page", PAGE_W - PAD_X, PAGE_H - PAD_B - pen.lh(S.footSoc), S.footSoc, "right")
    doc.addPage()
    drawPageChrome(c)
    y = CONTENT_TOP
  }

  const place = (card: Card) => {
    let rest = trimUnits(card.units)
    let part = 0
    const keep = card.keep ?? 3
    // Every iteration draws something or moves to a fresh page, where at least
    // one unit is always placed, so this terminates well within the bound.
    for (let guard = 0; guard < 1000 && rest.length; guard++) {
      const fullH = partHeight(card, rest)
      const split = card.split === "tall" ? fullH > c.room : card.split
      if (y + fullH <= bottom || (y <= CONTENT_TOP && !split)) {
        // Fits (or is an unsplittable card taller than a whole page: drawn from the top).
        drawPart(card, rest, y, part)
        y += fullH + BLOCK_GAP
        return
      }
      if (!split) { newPage(); continue }
      let take = 0
      while (take < rest.length && y + partHeight(card, rest.slice(0, take + 1)) <= bottom) take++
      if (take < Math.min(keep, rest.length) && y > CONTENT_TOP) { newPage(); continue }
      take = Math.max(1, take)
      if (rest.length - take === 1 && take > keep) take-- // no single orphan line on the next page
      const chunk = trimUnits(rest.slice(0, take))
      if (chunk.length) drawPart(card, chunk, y, part++)
      rest = trimUnits(rest.slice(take))
      newPage()
    }
  }

  for (const card of [ticketCard(c), shipmentCard(c), partiesCard(c), ratesCard(c), tearCard(c)]) {
    if (card) place(card)
  }

  footer.draw()
}
