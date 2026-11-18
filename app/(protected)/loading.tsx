// Shown instantly on navigation between protected pages while the next page's
// code/data loads, so a click always gets immediate visual feedback.
export default function Loading() {
  return (
    <div className="mx-auto max-w-screen-xl space-y-4 p-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted/70" />
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-11 border-b border-border bg-muted/40" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted/70" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
