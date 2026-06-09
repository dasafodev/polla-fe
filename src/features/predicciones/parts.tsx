export function PhaseSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-sm font-bold text-ink">{value}</span>
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-surface-2" aria-busy />
      ))}
    </div>
  )
}
