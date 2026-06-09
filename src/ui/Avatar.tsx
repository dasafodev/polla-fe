import { memo, useMemo } from 'react'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export const Avatar = memo(function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const style = useMemo(
    () => ({ width: size, height: size, fontSize: size * 0.4, background: 'linear-gradient(135deg, #6d3bd6, #8b6dff)' }),
    [size],
  )
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display font-bold text-white"
      style={style}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
})
