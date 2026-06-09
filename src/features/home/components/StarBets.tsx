import { Link } from 'react-router-dom'
import { TrendUp, TrendDown } from '@phosphor-icons/react'
import { usePowerups } from '../../powerups/hooks'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import type { PowerupTeam } from '../../../types/api'

// Resumen de las apuestas estrella (revelación / decepción). Es lo único "jugoso" de la polla
// que no se resume en otra pantalla; aparece en el estado "lista, esperando el cierre".
export function StarBets() {
  const pw = usePowerups()
  const data = pw.data
  if (pw.isLoading || (!data?.darkHorse && !data?.disappointment)) return null

  return (
    <Card className="p-4">
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Tus apuestas estrella</p>
      <div className="space-y-3">
        <BetRow kind="up" label="La revelación" team={data?.darkHorse ?? null} />
        <BetRow kind="down" label="La decepción" team={data?.disappointment ?? null} />
      </div>
      <Link to="/predicciones?tab=powerups" className="mt-3 block text-center text-sm font-bold text-violet">
        Revisar mi polla →
      </Link>
    </Card>
  )
}

function BetRow({ kind, label, team }: { kind: 'up' | 'down'; label: string; team: PowerupTeam | null }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${
          kind === 'up' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}
      >
        {kind === 'up' ? <TrendUp size={18} weight="bold" /> : <TrendDown size={18} weight="bold" />}
      </span>
      <span className="flex-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <span className="block text-sm font-bold text-ink">{team?.name ?? '—'}</span>
      </span>
      {team && <Flag code={team.code} flag={team.flag} className="size-6" />}
    </div>
  )
}
