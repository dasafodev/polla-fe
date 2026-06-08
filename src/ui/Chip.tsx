import { type ReactNode } from 'react'

type Tone = 'neutral' | 'violet' | 'success' | 'lock' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-soft border-border',
  violet: 'bg-tint text-violet-strong border-transparent',
  success: 'bg-[#e6f4ee] text-success border-transparent',
  lock: 'bg-[#fbefd9] text-lock border-transparent',
  gold: 'bg-[#f6eed9] text-gold border-transparent',
}

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
