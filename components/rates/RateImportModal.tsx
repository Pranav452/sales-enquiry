"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────

interface ExtractedRate {
  shipping_line:  string
  origin_country: string
  origin_port:    string | null
  dest_country:   string
  dest_port:      string | null
  currency:       string
  rate_20:        number | null
  rate_40:        number | null
  valid_from:     string | null
  valid_to:       string | null
  transit_days:   number | null
  via_port:       string | null
  surcharges:     string | null
  notes:          string | null
  clauses:        string | null
  pdf_url:        string | null
  // UI state
  _selected: boolean
  _error?:   string
}

interface Props {
  onClose:   () => void
  onImported: (count: number) => void
}

// ─── Helper ───────────────────────────────────────────────────

function pill(label: string, value: string | null, cls = "") {
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

// ─── Row editor ───────────────────────────────────────────────

function RateRow({
  rate,
  index,
  onChange,
  onRemove,
}: {
  rate: ExtractedRate
  index: number
  onChange: (i: number, field: string, value: string | number | null | boolean) => void
  onRemove: (i: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`rounded-lg border text-sm transition-colors ${
        rate._selected ? "border-border bg-background" : "border-border/40 bg-muted/20 opacity-60"
      } ${rate._error ? "border-destructive/40 bg-destructive/5" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={rate._selected}
          onChange={(e) => onChange(index, "_selected", e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-primary"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-semibold text-primary">{rate.shipping_line || "—"}</span>
            <span className="text-muted-foreground">
              {rate.origin_country || "?"} → {rate.dest_country || "?"}
            </span>
            {rate.dest_port && (
              <span className="text-xs text-muted-foreground">({rate.dest_port})</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {rate.rate_20 != null &&
              pill("20'", `${rate.currency ?? "USD"} ${rate.rate_20.toLocaleString()}`)}
            {rate.rate_40 != null &&
              pill("40'", `${rate.currency ?? "USD"} ${rate.rate_40.toLocaleString()}`)}
            {rate.valid_from && pill("from", rate.valid_from)}
            {rate.valid_to   && pill("to",   rate.valid_to)}
            {rate.transit_days != null && pill("TT", `${rate.transit_days}d`)}
            {rate.via_port    && pill("via",  rate.via_port, "text-muted-foreground")}
          </div>

          {rate._error && (
            <p className="mt-1 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {rate._error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Edit details"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent transition-colors"
            title="Remove row"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit form */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(
            [
              ["Shipping Line",   "shipping_line",  "text"],
              ["Origin Country",  "origin_country", "text"],
              ["Origin Port",     "origin_port",    "text"],
              ["Dest Country",    "dest_country",   "text"],
              ["Dest Port",       "dest_port",      "text"],
              ["Currency",        "currency",       "text"],
              ["Rate 20'",        "rate_20",        "number"],
              ["Rate 40'",        "rate_40",        "number"],
              ["Valid From",      "valid_from",     "date"],
              ["Valid To",        "valid_to",       "date"],
              ["Transit Days",    "transit_days",   "number"],
              ["Via Port",        "via_port",       "text"],
              ["Surcharges",      "surcharges",     "text"],
              ["Notes",           "notes",          "text"],
            ] as [string, string, string][]
          ).map(([label, field, type]) => (
            <div key={field} className={field === "notes" || field === "surcharges" ? "col-span-2" : ""}>
              <label className="block text-xs text-muted-foreground mb-0.5">{label}</label>
              <Input
                type={type}
                value={(rate[field as keyof ExtractedRate] as string | number | null) ?? ""}
                onChange={(e) => {
                  const val = type === "number"
                    ? (e.target.value === "" ? null : Number(e.target.value))
                    : (e.target.value || null)
                  onChange(index, field, val)
                }}
                className="h-7 text-xs"
              />
            </div>
          ))}

          {/* Clauses textarea */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <label className="block text-xs text-muted-foreground mb-0.5">
              Clauses <span className="text-muted-foreground/60">(pipe-separated)</span>
            </label>
            <textarea
              value={rate.clauses ?? ""}
              onChange={(e) => onChange(index, "clauses", e.target.value || null)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────

export function RateImportModal({ onClose, onImported }: Props) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const dropRef   = useRef<HTMLDivElement>(null)

  const [file,         setFile]         = useState<File | null>(null)
  const [dragging,     setDragging]     = useState(false)
  const [extracting,   setExtracting]   = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [rates,        setRates]        = useState<ExtractedRate[] | null>(null)
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null)

  // ── Drag & drop ──────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.toLowerCase().endsWith(".pdf")) {
      setFile(f)
      setRates(null)
      setExtractError(null)
    }
  }, [])

  // ── Extract ───────────────────────────────────────────────────
  async function handleExtract() {
    if (!file) return
    setExtracting(true)
    setExtractError(null)
    setRates(null)

    try {
      const fd = new FormData()
      fd.append("file", file)

      const res = await fetch("/api/rates/extract", { method: "POST", body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Extraction failed")

      const extracted: ExtractedRate[] = (data.rates as Partial<ExtractedRate>[]).map((r) => ({
        shipping_line:  (r.shipping_line  ?? "").toUpperCase(),
        origin_country: (r.origin_country ?? "INDIA").toUpperCase(),
        origin_port:    r.origin_port ?? null,
        dest_country:   (r.dest_country  ?? "").toUpperCase(),
        dest_port:      r.dest_port   ?? null,
        currency:       r.currency    ?? "USD",
        rate_20:        typeof r.rate_20 === "number" ? r.rate_20 : null,
        rate_40:        typeof r.rate_40 === "number" ? r.rate_40 : null,
        valid_from:     r.valid_from  ?? null,
        valid_to:       r.valid_to    ?? null,
        transit_days:   typeof r.transit_days === "number" ? r.transit_days : null,
        via_port:       r.via_port    ?? null,
        surcharges:     r.surcharges  ?? null,
        notes:          r.notes       ?? null,
        clauses:        r.clauses     ?? null,
        pdf_url:        r.pdf_url     ?? null,
        _selected:      true,
      }))

      setRates(extracted)
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setExtracting(false)
    }
  }

  // ── Row edits ─────────────────────────────────────────────────
  function handleChange(i: number, field: string, value: string | number | null | boolean) {
    setRates((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[i] = { ...next[i], [field]: value, _error: undefined }
      return next
    })
  }

  function handleRemove(i: number) {
    setRates((prev) => prev?.filter((_, idx) => idx !== i) ?? null)
  }

  function selectAll(val: boolean) {
    setRates((prev) => prev?.map((r) => ({ ...r, _selected: val })) ?? null)
  }

  // ── Import ────────────────────────────────────────────────────
  async function handleImport() {
    if (!rates) return
    const selected = rates.filter((r) => r._selected)
    if (selected.length === 0) return

    setImporting(true)
    let ok = 0
    let fail = 0

    for (let i = 0; i < rates.length; i++) {
      const r = rates[i]
      if (!r._selected) continue

      try {
        const res = await fetch("/api/rates", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shipping_line:  r.shipping_line,
            origin_country: r.origin_country,
            origin_port:    r.origin_port,
            dest_country:   r.dest_country,
            dest_port:      r.dest_port,
            currency:       r.currency,
            rate_20:        r.rate_20,
            rate_40:        r.rate_40,
            valid_from:     r.valid_from,
            valid_to:       r.valid_to,
            transit_days:   r.transit_days,
            via_port:       r.via_port,
            surcharges:     r.surcharges,
            notes:          r.notes,
            clauses:        r.clauses,
            pdf_url:        r.pdf_url,
          }),
        })

        if (res.ok) {
          ok++
          setRates((prev) =>
            prev?.map((row, idx) => (idx === i ? { ...row, _selected: false } : row)) ?? null
          )
        } else {
          const d = await res.json()
          fail++
          setRates((prev) =>
            prev?.map((row, idx) =>
              idx === i ? { ...row, _error: d.error ?? "Insert failed" } : row
            ) ?? null
          )
        }
      } catch {
        fail++
        setRates((prev) =>
          prev?.map((row, idx) =>
            idx === i ? { ...row, _error: "Network error" } : row
          ) ?? null
        )
      }
    }

    setImporting(false)
    setImportResult({ ok, fail })
    if (ok > 0) onImported(ok)
  }

  // ─────────────────────────────────────────────────────────────
  const selectedCount = rates?.filter((r) => r._selected).length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Import Rates from PDF</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload a rate sheet — AI extracts all routes, clauses, and surcharges for your review.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Upload zone */}
          {!rates && (
            <div
              ref={dropRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer p-10 transition-colors ${
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { setFile(f); setRates(null); setExtractError(null) }
                }}
              />
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              {file ? (
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  {file.name}
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium">Drop a PDF rate sheet here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </>
              )}
            </div>
          )}

          {/* Change file button once extracted */}
          {rates && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{file?.name}</span>
              <button
                onClick={() => { setFile(null); setRates(null); setImportResult(null); setExtractError(null) }}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Change file
              </button>
            </div>
          )}

          {/* Extract error */}
          {extractError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {extractError}
            </div>
          )}

          {/* Import result banner */}
          {importResult && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              importResult.fail === 0
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                {importResult.ok} rate{importResult.ok !== 1 ? "s" : ""} imported successfully.
                {importResult.fail > 0 && ` ${importResult.fail} failed — see errors below.`}
              </span>
            </div>
          )}

          {/* Extracted rates review */}
          {rates && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {rates.length} rate{rates.length !== 1 ? "s" : ""} extracted
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCount} selected
                  </Badge>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => selectAll(true)}  className="text-primary hover:underline">Select all</button>
                  <span className="text-muted-foreground">/</span>
                  <button onClick={() => selectAll(false)} className="text-muted-foreground hover:underline">None</button>
                </div>
              </div>

              <div className="space-y-2">
                {rates.map((r, i) => (
                  <RateRow
                    key={i}
                    rate={r}
                    index={i}
                    onChange={handleChange}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          <Button variant="ghost" onClick={onClose} disabled={extracting || importing}>
            Cancel
          </Button>

          <div className="flex gap-2">
            {!rates && file && (
              <Button onClick={handleExtract} disabled={extracting}>
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-1.5" />
                    Extract Rates
                  </>
                )}
              </Button>
            )}

            {rates && selectedCount > 0 && !importResult && (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Import {selectedCount} Rate{selectedCount !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}

            {importResult && importResult.fail === 0 && (
              <Button onClick={onClose}>Done</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
