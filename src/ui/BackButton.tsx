import { useNavigate, useNavigationType } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

// Vuelve atrás en el historial cuando llegamos por navegación interna (PUSH).
// Si entraste por deep-link o refrescaste (POP), no hay a dónde volver: cae al fallback.
export function useGoBack(fallback = '/predicciones') {
  const nav = useNavigate()
  const navType = useNavigationType()
  return () => (navType === 'PUSH' ? nav(-1) : nav(fallback))
}

export function BackButton({ label = 'Predicciones' }: { label?: string }) {
  const goBack = useGoBack()
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Volver"
      className="mb-3 inline-flex items-center gap-2 font-display font-semibold text-ink-soft active:scale-95"
    >
      <ArrowLeft size={20} weight="bold" /> {label}
    </button>
  )
}
