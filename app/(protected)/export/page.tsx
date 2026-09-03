"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx-js-style"
import { Download, Eye, EyeOff, FileText, Filter, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  BRANCHES,
  STATUSES,
  MANILAL_SALES_PERSONS,
  LINKS_SALES_PERSONS,
  PORT_CITIES,
  expandPortCity,
  displayStatus,
} from "@/lib/constants/dropdowns"

// ─── Types ─────────────────────────────────────────────────────

interface Row {
  id: string
  enq_ref_no: string | null
  enq_receipt_date: string | null
  enq_type: string | null
  mode: string | null
  exim: string | null
  fn: string | null
  sales_person: string | null
  agent_name: string | null
  country: string | null
  branch: string | null
  network: string | null
  pol: string | null
  pod: string | null
  incoterms: string | null
  container_type: string | null
  status: string | null
  email_subject_line: string | null
  shipper: string | null
  consignee: string | null
  remarks: string | null
  mbl_awb_no: string | null
  job_invoice_no: string | null
  gop: string | null
  assigned_user: string | null
  assigned_date: string | null
  due_date: string | null
}

// ─── Column definitions ─────────────────────────────────────────

type ColKey = keyof Row | "days_to_quote"

interface ColDef {
  key: ColKey
  label: string
  defaultOn: boolean
  format?: (v: string | null, row?: Row) => string
}

const ALL_COLUMNS: ColDef[] = [
  { key: "enq_ref_no",        label: "Enq Ref No",        defaultOn: true },
  { key: "enq_receipt_date",  label: "Enquiry Received Date", defaultOn: true,
    format: (v) => v ? new Date(v).toLocaleDateString("en-GB") : "" },
  { key: "mode",              label: "Mode",               defaultOn: true },
  { key: "enq_type",          label: "Enquiry Type",       defaultOn: true },
  { key: "exim",              label: "EXIM",               defaultOn: true },
  { key: "fn",                label: "F/N",                defaultOn: false },
  { key: "sales_person",      label: "Sales Person",       defaultOn: true },
  { key: "branch",            label: "Branch",             defaultOn: true },
  { key: "shipper",           label: "Shipper",            defaultOn: true },
  { key: "consignee",         label: "Consignee",          defaultOn: true },
  { key: "pol",               label: "POL",                defaultOn: true,
    format: (v) => expandPortCity(v) || v || "" },
  { key: "pod",               label: "POD",                defaultOn: true,
    format: (v) => expandPortCity(v) || v || "" },
  { key: "country",           label: "Country",            defaultOn: false },
  { key: "agent_name",        label: "Agent Name",         defaultOn: false },
  { key: "network",           label: "Network",            defaultOn: false },
  { key: "incoterms",         label: "Incoterms",          defaultOn: false },
  { key: "container_type",    label: "Container Type",     defaultOn: false },
  { key: "status",            label: "Status",             defaultOn: true,
    format: (v) => displayStatus(v) },
  { key: "email_subject_line",label: "Email Subject",      defaultOn: false },
  { key: "remarks",           label: "Remarks",            defaultOn: true },
  { key: "mbl_awb_no",        label: "MBL/AWB No",         defaultOn: false },
  { key: "job_invoice_no",    label: "Job/Invoice No",     defaultOn: false },
  { key: "gop",               label: "GOP",                defaultOn: false },
  { key: "assigned_user",     label: "Assigned User",      defaultOn: true },
  { key: "assigned_date",     label: "Quotation Given Date", defaultOn: true,
    format: (v) => v ? new Date(v).toLocaleDateString("en-GB") : "" },
  { key: "due_date",          label: "Due Date",           defaultOn: true,
    format: (v) => v ? new Date(v).toLocaleDateString("en-GB") : "" },
  { key: "days_to_quote",     label: "Days to Quote",      defaultOn: true,
    format: (_v, row) => {
      if (!row?.enq_receipt_date || !row.assigned_date) return ""
      const ms = new Date(row.assigned_date).getTime() - new Date(row.enq_receipt_date).getTime()
      return Number.isFinite(ms) ? String(Math.max(0, Math.round(ms / 86_400_000))) : ""
    } },
]

const ALL_SALES_PERSONS = [...new Set([...LINKS_SALES_PERSONS, ...MANILAL_SALES_PERSONS])].sort()
const MODES = ["AIR", "SEA", "LAND", "COURIER", "RAIL"]
const EXIM_OPTIONS = ["EXPORT", "IMPORT", "CROSS TRADE"]
const ENQ_TYPES = ["LOCAL", "OVERSEAS"]

function statusVariant(s: string | null) {
  switch ((s ?? "").toUpperCase()) {
    case "WIN":        return "success"
    case "LOSE":       return "danger"
    case "FOLLOW UP":  return "warning"
    case "QUOTED":
    case "PENDING":
    case "NO FEEDBACK": return "info"
    default:           return "secondary"
  }
}

// Excel cell styles (xlsx-js-style)
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" } },
  fill: { patternType: "solid", fgColor: { rgb: "1E3A8A" } },
  alignment: { horizontal: "center", vertical: "center" },
}
const STATUS_CELL_STYLES: Record<string, object> = {
  "WIN":         { font: { bold: true, color: { rgb: "006100" } }, fill: { patternType: "solid", fgColor: { rgb: "C6EFCE" } } },
  "LOSE":        { font: { bold: true, color: { rgb: "9C0006" } }, fill: { patternType: "solid", fgColor: { rgb: "FFC7CE" } } },
  "FOLLOW UP":   { font: { bold: true, color: { rgb: "9C5700" } }, fill: { patternType: "solid", fgColor: { rgb: "FFEB9C" } } },
  "QUOTED":      { font: { bold: true, color: { rgb: "1F4E79" } }, fill: { patternType: "solid", fgColor: { rgb: "DDEBF7" } } },
  "PENDING":     { font: { bold: true, color: { rgb: "5B2C6F" } }, fill: { patternType: "solid", fgColor: { rgb: "E4DFEC" } } },
  "NO FEEDBACK": { font: { bold: true, color: { rgb: "3A3A3A" } }, fill: { patternType: "solid", fgColor: { rgb: "E7E6E6" } } },
}

function fmt(col: ColDef, row: Row): string {
  const v = (col.key in row ? row[col.key as keyof Row] : null) as string | null
  return col.format ? col.format(v, row) : (v ?? "")
}

// ─── Select component (simple native) ──────────────────────────

function FilterSelect({
  label, value, options, onChange, placeholder, labelFor,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
  labelFor?: (o: string) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 rounded-md border border-input bg-background px-2 text-xs",
          "text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
          "transition-colors"
        )}
      >
        <option value="">{placeholder ?? `All ${label}`}</option>
        {options.map((o) => (
          <option key={o} value={o}>{labelFor ? labelFor(o) : o}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────

export default function ExportPage() {
  // — Filters
  const [dateFrom, setDateFrom]       = useState("")
  const [dateTo, setDateTo]           = useState("")
  const [salesPerson, setSalesPerson] = useState("")
  const [mode, setMode]               = useState("")
  const [exim, setExim]               = useState("")
  const [branch, setBranch]           = useState("")
  const [status, setStatus]           = useState("")
  const [enqType, setEnqType]         = useState("")
  const [pol, setPol]                 = useState("")
  const [pod, setPod]                 = useState("")
  const [assignedUser, setAssignedUser] = useState("")

  // — Data
  const [rows, setRows]     = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // — Column visibility
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key))
  )

  // — Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // — Preview
  const [showPreview, setShowPreview] = useState(false)

  // — Weekly report
  const [weeklyLoading, setWeeklyLoading] = useState(false)

  async function downloadWeeklyReport() {
    setWeeklyLoading(true)
    try {
      const res = await fetch("/api/reports/weekly")
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? "Failed to generate report")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const dateStr = new Date().toISOString().split("T")[0]
      a.href = url
      a.download = `Weekly_Report_${dateStr}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to download report")
    } finally {
      setWeeklyLoading(false)
    }
  }

  // — Search within results
  const [search, setSearch] = useState("")

  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleCols.has(c.key)),
    [visibleCols]
  )

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((r) =>
      activeColumns.some((col) => fmt(col, r).toLowerCase().includes(q))
    )
  }, [rows, search, activeColumns])

  const allSelected = filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id))
  const someSelected = filteredRows.some((r) => selectedIds.has(r.id))
  const exportRows = filteredRows.filter((r) => selectedIds.has(r.id))

  // Auto-select all when data loads
  useEffect(() => {
    setSelectedIds(new Set(rows.map((r) => r.id)))
  }, [rows])

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setFetched(false)
    setShowPreview(false)

    const params = new URLSearchParams()
    if (dateFrom)    params.set("date_from",    dateFrom)
    if (dateTo)      params.set("date_to",      dateTo)
    if (salesPerson) params.set("sales_person", salesPerson)
    if (mode)        params.set("mode",         mode)
    if (exim)        params.set("exim",         exim)
    if (branch)      params.set("branch",       branch)
    if (status)      params.set("status",       status)
    if (enqType)     params.set("enq_type",     enqType)
    if (pol)          params.set("pol",          pol)
    if (pod)          params.set("pod",          pod)
    if (assignedUser) params.set("assigned_user", assignedUser)

    try {
      const res = await fetch(`/api/enquiries/export?${params}`)
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? "Failed to fetch")
      }
      const data: Row[] = await res.json()
      setRows(data)
      setFetched(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, salesPerson, mode, exim, branch, status, enqType, pol, pod, assignedUser])

  // ─── Selection helpers ────────────────────────────────────
  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredRows.forEach((r) => next.delete(r.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filteredRows.forEach((r) => next.add(r.id))
        return next
      })
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ─── Export ──────────────────────────────────────────────
  function doExport() {
    if (exportRows.length === 0) return

    const data = exportRows.map((row) => {
      const obj: Record<string, string> = {}
      activeColumns.forEach((col) => {
        obj[col.label] = fmt(col, row)
      })
      return obj
    })

    const ws = XLSX.utils.json_to_sheet(data)

    // Header row styling
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1")
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })]
      if (cell) cell.s = HEADER_STYLE
    }
    // Status column colour coding (sheet rows follow exportRows order)
    const statusIdx = activeColumns.findIndex((col) => col.key === "status")
    if (statusIdx >= 0) {
      exportRows.forEach((row, i) => {
        const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: statusIdx })]
        const style = STATUS_CELL_STYLES[(row.status ?? "").toUpperCase()]
        if (cell && style) cell.s = style
      })
    }

    // Column widths
    const colWidths = activeColumns.map((col) => {
      const maxLen = Math.max(
        col.label.length,
        ...exportRows.map((r) => fmt(col, r).length)
      )
      return { wch: Math.min(maxLen + 2, 40) }
    })
    ws["!cols"] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Enquiries")

    const dateStr = new Date().toISOString().split("T")[0]
    XLSX.writeFile(wb, `Enquiries_Export_${dateStr}.xlsx`)
  }

  // ─── Quick date presets ─────────────────────────────────
  function setPreset(months: number) {
    const to   = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    setDateFrom(from.toISOString().split("T")[0])
    setDateTo(to.toISOString().split("T")[0])
  }

  function clearFilters() {
    setDateFrom(""); setDateTo(""); setSalesPerson(""); setMode("")
    setExim(""); setBranch(""); setStatus(""); setEnqType("")
    setPol(""); setPod(""); setAssignedUser("")
  }

  const hasFilters = dateFrom || dateTo || salesPerson || mode || exim || branch || status || enqType || pol || pod || assignedUser

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Export Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Filter, preview, and download enquiries as Excel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadWeeklyReport}
            disabled={weeklyLoading}
            className="gap-1.5"
          >
            {weeklyLoading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating...</>
              : <><FileText className="h-3.5 w-3.5" /> Download Weekly Report</>
            }
          </Button>
          {fetched && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview((v) => !v)}
                className="gap-1.5"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </Button>
              <Button
                size="sm"
                onClick={doExport}
                disabled={exportRows.length === 0}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export {exportRows.length > 0 ? `(${exportRows.length})` : ""}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Date Range</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground invisible">Presets</label>
              <div className="flex gap-1">
                {[
                  { label: "This month", action: () => {
                    const now = new Date()
                    setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0])
                    setDateTo(now.toISOString().split("T")[0])
                  }},
                  { label: "3 months",   action: () => setPreset(3) },
                  { label: "6 months",   action: () => setPreset(6) },
                  { label: "1 year",     action: () => setPreset(12) },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    className="h-8 px-2.5 rounded-md border border-input text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <FilterSelect label="Sales Person" value={salesPerson} options={ALL_SALES_PERSONS} onChange={setSalesPerson} />
          <FilterSelect label="Mode"         value={mode}        options={MODES}              onChange={setMode} />
          <FilterSelect label="EXIM"         value={exim}        options={EXIM_OPTIONS}       onChange={setExim} />
          <FilterSelect label="Branch"       value={branch}      options={BRANCHES}           onChange={setBranch} />
          <FilterSelect label="Status"       value={status}      options={STATUSES}           onChange={setStatus} labelFor={displayStatus} />
          <FilterSelect label="Enquiry Type" value={enqType}     options={ENQ_TYPES}          onChange={setEnqType} />
          <FilterSelect label="POL"          value={pol}         options={PORT_CITIES}        onChange={setPol} />
          <FilterSelect label="POD"          value={pod}         options={PORT_CITIES}        onChange={setPod} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Assigned User</label>
            <Input
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              placeholder="Any assigned user"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={fetchData} disabled={loading} size="sm" className="gap-1.5">
            {loading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading...</>
              : <><Filter className="h-3.5 w-3.5" /> Apply &amp; Fetch</>
            }
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {fetched && (
        <>
          {/* ── Column selection ────────────────────────── */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Columns to export</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleCols(new Set(ALL_COLUMNS.map((c) => c.key)))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  All
                </button>
                <span className="text-xs text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={() => setVisibleCols(new Set(ALL_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)))}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Default
                </button>
                <span className="text-xs text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={() => setVisibleCols(new Set())}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_COLUMNS.map((col) => {
                const on = visibleCols.has(col.key)
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleCol(col.key)}
                    className={cn(
                      "h-7 px-3 rounded-full text-xs border transition-colors",
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {col.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Results summary + search ────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{rows.length}</span> records found
                {filteredRows.length !== rows.length && (
                  <> · <span className="font-medium text-foreground">{filteredRows.length}</span> shown</>
                )}
                {someSelected && (
                  <> · <span className="font-medium text-blue-600">{exportRows.length}</span> selected</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="search"
                placeholder="Search results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs w-52"
              />
              {!showPreview && (
                <Button variant="outline" size="sm" onClick={() => setShowPreview(true)} className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Button>
              )}
              <Button
                size="sm"
                onClick={doExport}
                disabled={exportRows.length === 0}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export {exportRows.length > 0 ? `(${exportRows.length})` : ""}
              </Button>
            </div>
          </div>

          {/* ── Preview table ───────────────────────────── */}
          {showPreview && (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">
                  Preview
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    showing {Math.min(filteredRows.length, 200)} of {filteredRows.length} rows
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                    <tr className="border-b border-border">
                      {/* Checkbox column */}
                      <th className="px-3 py-2.5 text-left w-8">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allSelected && someSelected
                          }}
                          onChange={toggleAll}
                          className="h-3.5 w-3.5 rounded border-border"
                          aria-label="Select all"
                        />
                      </th>
                      {activeColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeColumns.length + 1}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No records match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.slice(0, 200).map((row) => {
                        const selected = selectedIds.has(row.id)
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "border-b border-border/50 hover:bg-accent/50 transition-colors",
                              selected && "bg-blue-50/40 dark:bg-blue-950/20"
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleRow(row.id)}
                                className="h-3.5 w-3.5 rounded border-border"
                                aria-label={`Select ${row.enq_ref_no ?? row.id}`}
                              />
                            </td>
                            {activeColumns.map((col) => {
                              const val = fmt(col, row)
                              if (col.key === "status") {
                                return (
                                  <td key={col.key} className="px-3 py-2.5 whitespace-nowrap">
                                    <Badge
                                      variant={
                                        statusVariant(row.status) as
                                          | "success" | "danger" | "warning" | "info" | "secondary"
                                      }
                                    >
                                      {val || "—"}
                                    </Badge>
                                  </td>
                                )
                              }
                              return (
                                <td
                                  key={col.key}
                                  className={cn(
                                    "px-3 py-2.5",
                                    col.key === "enq_ref_no" && "font-mono font-medium whitespace-nowrap",
                                    col.key === "remarks" && "max-w-[200px] whitespace-normal break-words text-muted-foreground",
                                    (col.key === "shipper" || col.key === "consignee") && "max-w-[120px] truncate",
                                    !["enq_ref_no", "remarks", "shipper", "consignee"].includes(col.key) && "whitespace-nowrap"
                                  )}
                                >
                                  {val || "—"}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {filteredRows.length > 200 && (
                <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground bg-muted/30">
                  Preview limited to 200 rows. All {filteredRows.length} selected records will be included in the export.
                </div>
              )}
            </div>
          )}

          {/* ── Bottom export bar ───────────────────────── */}
          {!showPreview && filteredRows.length > 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="select-all-bottom"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-border"
                />
                <label htmlFor="select-all-bottom" className="text-sm cursor-pointer select-none">
                  {allSelected ? "Deselect all" : "Select all"}{" "}
                  <span className="text-muted-foreground">({filteredRows.length})</span>
                </label>
              </div>
              <Button
                size="sm"
                onClick={doExport}
                disabled={exportRows.length === 0}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download Excel ({exportRows.length})
              </Button>
            </div>
          )}
        </>
      )}

      {!fetched && !loading && (
        <div className="rounded-lg border border-dashed border-border p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Download className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Set your filters above and click <strong>Apply &amp; Fetch</strong> to load data.
          </p>
          <p className="text-xs text-muted-foreground/70">
            You can also leave all filters empty to load all enquiries.
          </p>
        </div>
      )}
    </div>
  )
}
