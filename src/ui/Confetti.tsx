import { useEffect, useRef } from 'react'
import { useReduced } from './motion'

const COLORS = ['#6d3bd6', '#8b6dff', '#b8862e', '#1c8a5b', '#eee8fd']

export function Confetti({ count = 80, colors = COLORS }: { count?: number; colors?: string[] }) {
  const reduced = useReduced()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (reduced || !host) return
    const pieces: HTMLSpanElement[] = []
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span')
      const w = 6 + (i % 5)
      s.style.cssText = `position:absolute;top:40%;left:50%;width:${w}px;height:${
        w * 0.5
      }px;background:${colors[i % colors.length]};border-radius:1px;will-change:transform,opacity`
      host.appendChild(s)
      pieces.push(s)
      if (typeof s.animate !== 'function') continue
      const angle = (i / count) * Math.PI * 2
      const dist = 120 + (i % 7) * 28
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist - 140
      s.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px,${dy + 260}px) rotate(${360 + i * 12}deg)`, opacity: 0 },
        ],
        { duration: 1100 + (i % 6) * 120, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' },
      )
    }
    const t = setTimeout(() => pieces.forEach((p) => p.remove()), 2400)
    return () => {
      clearTimeout(t)
      pieces.forEach((p) => p.remove())
    }
  }, [count, reduced, colors])
  return <div ref={ref} className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden />
}
