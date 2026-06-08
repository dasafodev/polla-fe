import { memo } from 'react'
import { motion } from 'framer-motion'
import { useReduced } from './motion'

export const NavyBackdrop = memo(function NavyBackdrop() {
  const reduced = useReduced()
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% -10%, #1a1540 0%, #120f29 60%)' }}
      />
      {!reduced && (
        <>
          <motion.div
            className="absolute -top-1/4 left-1/2 size-[70vmax] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(139,109,255,0.35), transparent 60%)' }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.8, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 -right-1/4 size-[55vmax] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(109,59,214,0.3), transparent 60%)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
      <svg className="absolute inset-0 size-full opacity-[0.06] mix-blend-overlay" aria-hidden>
        <filter id="grain-navy">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-navy)" />
      </svg>
    </div>
  )
})
