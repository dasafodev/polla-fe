export function Flag({ code, className = 'size-7' }: { code: string; className?: string }) {
  const hueA = (code.charCodeAt(0) * 47) % 360
  const hueB = (code.charCodeAt(Math.min(1, code.length - 1)) * 83) % 360
  return (
    <span
      className={`${className} shrink-0 overflow-hidden rounded-md border border-border`}
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 55%), hsl(${hueB} 60% 45%))` }}
    />
  )
}
