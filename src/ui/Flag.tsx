export function Flag({ code, flag, className = 'size-7' }: { code: string; flag?: string | null; className?: string }) {
  const base = `${className} shrink-0 overflow-hidden rounded-md border border-border`
  if (flag) {
    return <img src={flag} alt="" aria-hidden loading="lazy" className={`${base} object-cover`} />
  }
  const hueA = (code.charCodeAt(0) * 47) % 360
  const hueB = (code.charCodeAt(Math.min(1, code.length - 1)) * 83) % 360
  return (
    <span
      className={base}
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 55%), hsl(${hueB} 60% 45%))` }}
    />
  )
}
