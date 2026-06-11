// ============================================================
// Sales Lead constants — statuses + helpers
// ============================================================

export interface LeadStatusDef {
  value: string
  label: string
  color: string      // badge bg
  textColor: string  // badge text
  chart: string      // hex for charts
}

export const LEAD_STATUSES: LeadStatusDef[] = [
  { value: "LEAD_SENT",         label: "Lead Sent",         color: "bg-blue-100 dark:bg-blue-950/50",     textColor: "text-blue-700 dark:text-blue-300",     chart: "#3b82f6" },
  { value: "RESPONSE_RECEIVED", label: "Response Received", color: "bg-teal-100 dark:bg-teal-950/50",     textColor: "text-teal-700 dark:text-teal-300",     chart: "#14b8a6" },
  { value: "FOLLOW_UP_SENT",    label: "Follow-up Sent",    color: "bg-amber-100 dark:bg-amber-950/50",   textColor: "text-amber-700 dark:text-amber-300",   chart: "#f59e0b" },
  { value: "MEETING_SCHEDULED", label: "Meeting Scheduled", color: "bg-violet-100 dark:bg-violet-950/50", textColor: "text-violet-700 dark:text-violet-300", chart: "#7c3aed" },
  { value: "QUOTED",            label: "Quoted",            color: "bg-indigo-100 dark:bg-indigo-950/50", textColor: "text-indigo-700 dark:text-indigo-300", chart: "#6366f1" },
  { value: "WON",               label: "Won",               color: "bg-green-100 dark:bg-green-950/50",   textColor: "text-green-700 dark:text-green-300",   chart: "#22c55e" },
  { value: "NOT_INTERESTED",    label: "Not Interested",    color: "bg-red-100 dark:bg-red-950/50",       textColor: "text-red-700 dark:text-red-300",       chart: "#ef4444" },
  { value: "NO_RESPONSE",       label: "No Response",       color: "bg-slate-100 dark:bg-slate-800",      textColor: "text-slate-600 dark:text-slate-300",   chart: "#94a3b8" },
  { value: "DEAD",              label: "Dead",              color: "bg-zinc-200 dark:bg-zinc-800",        textColor: "text-zinc-600 dark:text-zinc-400",     chart: "#71717a" },
]

export const LEAD_STATUS_MAP: Record<string, LeadStatusDef> =
  Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s]))

export const LEAD_STATUS_VALUES = new Set(LEAD_STATUSES.map((s) => s.value))
