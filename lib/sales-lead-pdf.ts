// Shared Sales Lead PDF generator — used by both the edit form and the list view.
//
// Browser wrapper: loads the embedded fonts, logo and seal from /public, hands
// them to the pure renderer in ./sales-lead-pdf-draw and saves the file. Asset
// loads are cached per page session and each one degrades gracefully (fonts →
// helvetica, missing images → simply not drawn), so a PDF is always produced.

import {
  drawSalesLeadPdf,
  salesLeadPdfFilename,
  type PdfImageAsset,
  type SalesLeadPdfData,
  type SalesLeadPdfFonts,
} from "./sales-lead-pdf-draw"

export type { SalesLeadPdfData } from "./sales-lead-pdf-draw"

const PAGE_BG = "#E9EDF4"
// Header logo is drawn 54 CSS px tall (~14 mm); 3× that keeps it crisp in print.
const LOGO_PX_H = 160

let fontsPromise: Promise<SalesLeadPdfFonts | null> | null = null
let sealPromise: Promise<PdfImageAsset | null> | null = null
const logoPromises = new Map<string, Promise<PdfImageAsset | null>>()

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let bin = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin)
}

function loadFonts(): Promise<SalesLeadPdfFonts | null> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetchBase64("/fonts/DMSans-Regular.ttf"),
      fetchBase64("/fonts/DMSans-Bold.ttf"),
      fetchBase64("/fonts/SpaceGrotesk-Bold.ttf"),
    ])
      .then(([dmSansRegular, dmSansBold, spaceGroteskBold]) => ({ dmSansRegular, dmSansBold, spaceGroteskBold }))
      .catch(() => {
        fontsPromise = null // retry on the next download
        return null
      })
  }
  return fontsPromise
}

function loadSeal(): Promise<PdfImageAsset | null> {
  if (!sealPromise) {
    // Pre-flattened onto the stub navy and downscaled (public/mp-seal-stub.jpg, 200×200).
    sealPromise = fetchBase64("/mp-seal-stub.jpg")
      .then((b64) => ({ data: `data:image/jpeg;base64,${b64}`, format: "JPEG" as const, width: 200, height: 200 }))
      .catch(() => {
        sealPromise = null
        return null
      })
  }
  return sealPromise
}

async function loadImageElement(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  const objectUrl = URL.createObjectURL(await res.blob())
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`${url}: decode failed`))
      img.src = objectUrl
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * Header logo: trim the white margin, downscale to print size and multiply it
 * onto the page colour so the logo's white backdrop disappears into the page.
 * Exported as a small JPEG (same downscale idea as lib/pdf-logo.ts).
 */
async function prepareLogo(url: string): Promise<PdfImageAsset> {
  const img = await loadImageElement(url)
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh) throw new Error(`${url}: empty image`)

  // 1. Content bounding box, found on a small probe copy. A 1% band at every
  //    edge is ignored (linkslogo.png has a hairline border on its right edge).
  const ps = Math.min(1, 600 / Math.max(nw, nh))
  const pw = Math.max(1, Math.round(nw * ps))
  const ph = Math.max(1, Math.round(nh * ps))
  const probe = document.createElement("canvas")
  probe.width = pw
  probe.height = ph
  const pctx = probe.getContext("2d", { willReadFrequently: true })
  if (!pctx) throw new Error("canvas unavailable")
  pctx.drawImage(img, 0, 0, pw, ph)
  const px = pctx.getImageData(0, 0, pw, ph).data
  const ex = Math.ceil(pw * 0.01)
  const ey = Math.ceil(ph * 0.01)
  let minX = pw, minY = ph, maxX = -1, maxY = -1
  for (let y = ey; y < ph - ey; y++) {
    for (let x = ex; x < pw - ex; x++) {
      const i = (y * pw + x) * 4
      if (px[i + 3] > 24 && Math.min(px[i], px[i + 1], px[i + 2]) < 232) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  let sx = 0, sy = 0, sw = nw, sh = nh
  if (maxX >= minX && maxY >= minY) {
    const pad = 2
    sx = Math.max(0, (minX - pad) / ps)
    sy = Math.max(0, (minY - pad) / ps)
    sw = Math.min(nw, (maxX + 1 + pad) / ps) - sx
    sh = Math.min(nh, (maxY + 1 + pad) / ps) - sy
  }

  // 2. Render the crop at print size, multiplied onto the page background.
  const ch = LOGO_PX_H
  const cw = Math.max(1, Math.round((sw / sh) * ch))
  const canvas = document.createElement("canvas")
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas unavailable")
  ctx.fillStyle = PAGE_BG
  ctx.fillRect(0, 0, cw, ch)
  ctx.globalCompositeOperation = "multiply"
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  return { data: canvas.toDataURL("image/jpeg", 0.9), format: "JPEG", width: cw, height: ch }
}

function loadLogo(url: string): Promise<PdfImageAsset | null> {
  let p = logoPromises.get(url)
  if (!p) {
    p = prepareLogo(url).catch(() => {
      logoPromises.delete(url)
      return null
    })
    logoPromises.set(url, p)
  }
  return p
}

export async function generateSalesLeadPdf(
  lead: SalesLeadPdfData,
  company?: string | null,
): Promise<void> {
  const isLinks = company === "links"
  const [{ jsPDF }, fonts, logo, seal] = await Promise.all([
    import("jspdf"),
    loadFonts(),
    loadLogo(isLinks ? "/linkslogo.png" : "/logo.jpeg"),
    isLinks ? Promise.resolve(null) : loadSeal(),
  ])

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  drawSalesLeadPdf(doc, lead, company, { fonts, logo, seal })
  doc.save(salesLeadPdfFilename(lead))
}
