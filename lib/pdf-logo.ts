// Shared company-aware PDF logo helper — draws the Manilal or Links logo
// contain-fit inside a max box at (x, y) and returns the drawn width so
// callers can place header text clear of it.

import type { jsPDF } from "jspdf"

export const MAX_LOGO_W = 40
export const MAX_LOGO_H = 16

export async function drawCompanyLogo(
  doc: jsPDF,
  company: string | null | undefined,
  x: number,
  y: number,
): Promise<number> {
  try {
    const isLinks = company === "links"
    const blob = await fetch(isLinks ? "/linkslogo.png" : "/logo.jpeg").then((r) => r.blob())
    const logoDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = logoDataUrl
    })
    const natW = img.naturalWidth || MAX_LOGO_W
    const natH = img.naturalHeight || MAX_LOGO_H

    // Contain-fit: scale down to fit the box, keep aspect ratio.
    const scale = Math.min(MAX_LOGO_W / natW, MAX_LOGO_H / natH)
    const logoW = natW * scale
    const logoH = natH * scale

    // Resize to actual display dimensions before embedding.
    // Without this, jsPDF stores the full-size PNG as raw RGBA pixel data,
    // bloating a simple PDF by megabytes. A canvas downscale to the drawn
    // size (2× for crispness) + JPEG export keeps the embedded image tiny.
    const PX_PER_MM = 96 / 25.4
    const cw = Math.max(1, Math.round(logoW * PX_PER_MM * 2))
    const ch = Math.max(1, Math.round(logoH * PX_PER_MM * 2))
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = cw
    tmpCanvas.height = ch
    const ctx = tmpCanvas.getContext("2d")!
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, 0, 0, cw, ch)
    const smallDataUrl = tmpCanvas.toDataURL("image/jpeg", 0.92)
    doc.addImage(smallDataUrl, "JPEG", x, y, logoW, logoH)
    return logoW
  } catch {
    // Logo load failed — return the max box width so header text placement
    // stays sane and the PDF still generates.
    return MAX_LOGO_W
  }
}
