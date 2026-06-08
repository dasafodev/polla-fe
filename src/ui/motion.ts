import { useReducedMotion, type Transition, type Variants } from 'framer-motion'

export const spring: Transition = { type: 'spring', stiffness: 120, damping: 18 }
export const springSoft: Transition = { type: 'spring', stiffness: 90, damping: 16 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring },
}

export function useReduced(): boolean {
  return useReducedMotion() ?? false
}
