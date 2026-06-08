export interface Segment {
  label: string
  fill: number
  active: boolean
}

export function SegmentedProgress({ segments }: { segments: Segment[] }) {
  return (
    <div className="flex gap-2">
      {segments.map((s, i) => (
        <div key={i} className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-violet transition-[width] duration-500"
              style={{ width: `${Math.round(s.fill * 100)}%` }}
            />
          </div>
          <span className={`mt-1 block text-[11px] font-medium ${s.active ? 'text-violet' : 'text-muted'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
