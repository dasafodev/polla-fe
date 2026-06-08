import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { PlayerBreakdown } from './PlayerBreakdown'

export function Breakdown() {
  const { participantId = '' } = useParams()
  const nav = useNavigate()
  return (
    <div>
      <button
        onClick={() => nav('/tabla')}
        aria-label="Volver a la tabla"
        className="mb-3 inline-flex items-center gap-2 font-display font-semibold text-ink-soft active:scale-95"
      >
        <ArrowLeft size={20} weight="bold" /> Tabla
      </button>
      <PlayerBreakdown participantId={participantId} />
    </div>
  )
}
