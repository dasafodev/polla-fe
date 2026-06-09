import { Link } from 'react-router-dom'
import { Card } from '../../../ui/Card'
import { signed } from '../../predicciones/format'
import type { PalpitosInfo } from '../liveHome'

// Barra lineal ganados/perdidos: verde = puntos de la revelación, rojo = puntos que quita la decepción.
export function PalpitosBar({ info }: { info: PalpitosInfo }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Tus pálpitos</p>
        {!info.isEmpty && (
          <span className={`font-mono text-sm font-bold ${info.net >= 0 ? 'text-success' : 'text-danger'}`}>
            {signed(info.net)} neto
          </span>
        )}
      </div>

      {info.isEmpty ? (
        <>
          <div className="mt-2.5 h-3.5 rounded-full bg-surface-2" />
          <p className="mt-2 text-xs text-ink-soft">Aún sin puntos de pálpitos</p>
        </>
      ) : (
        <>
          <div className="mt-2.5 flex h-3.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-success" style={{ width: `${info.greenPct}%` }} />
            <div className="h-full bg-danger" style={{ width: `${info.redPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-success">↗ {info.revelacion?.name ?? 'Revelación'} {signed(info.won)}</span>
            <span className="text-danger">↘ {info.decepcion?.name ?? 'Decepción'} −{info.lost}</span>
          </div>
        </>
      )}

      <Link to="/predicciones?tab=powerups" className="mt-3 block text-center text-xs font-bold text-violet">
        Ver mis pálpitos →
      </Link>
    </Card>
  )
}
