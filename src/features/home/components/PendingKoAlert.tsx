import { useNavigate } from 'react-router-dom'
import { Clock } from '@phosphor-icons/react'
import { Button } from '../../../ui/Button'
import { formatDeadline } from '../format'
import type { PendingKoInfo } from '../liveHome'

// Lo accionable manda: si hay partidos KO por pronosticar, esto va al tope del Inicio en vivo.
export function PendingKoAlert({ info }: { info: PendingKoInfo }) {
  const nav = useNavigate()
  const plural = info.count === 1 ? 'partido' : 'partidos'
  return (
    <div className="rounded-card bg-violet p-5 text-white shadow-card">
      <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-violet-light">
        <Clock size={14} weight="bold" /> Tienes {info.count} {plural} por pronosticar
      </p>
      <h2 className="mt-1.5 font-display text-xl font-black">{info.roundName}</h2>
      <p className="mt-0.5 text-sm text-white/80">El primero cierra el {formatDeadline(info.deadline)}</p>
      <Button variant="light" fullWidth className="mt-4" onClick={() => nav('/predicciones?tab=eliminatorias')}>
        Pronosticar ahora →
      </Button>
    </div>
  )
}
