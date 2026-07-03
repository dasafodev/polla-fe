import { useMemo, useState, type ReactNode } from 'react'
import { ListBullets, TreeStructure, Trophy, Info, Check, X } from '@phosphor-icons/react'
import { useAllKoPredictions } from './hooks'
import { PhaseSummary, PanelSkeleton, PanelError } from './parts'
import { buildColumns, tripleUsesRemaining, predictionProgress } from '../ko/koView'
import { KoListView } from '../ko/KoListView'
import { KoBracketView } from '../ko/KoBracketView'
import { KoPredictionSheet } from '../ko/KoPredictionSheet'
import { Sheet } from '../../ui/Sheet'
import { MAX_TRIPLES } from '../../lib/constants'
import type { KoMatch } from '../../types/api'

type ViewMode = 'lista' | 'llaves'
const VIEWS: { key: ViewMode; label: string; Icon: typeof ListBullets }[] = [
  { key: 'lista', label: 'Lista', Icon: ListBullets },
  { key: 'llaves', label: 'Llaves', Icon: TreeStructure },
]

export function EliminatoriasPanel({ locked }: { locked: boolean }) {
  const { isLoading, isError, rounds, refetch } = useAllKoPredictions()
  const [view, setView] = useState<ViewMode>('lista')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showTripleInfo, setShowTripleInfo] = useState(false)

  // Lista: orden por prioridad (próximos primero, jugados al final). Llaves: orden estructural fijo
  // por matchNumber que NO se reordena al jugarse los partidos.
  const columns = useMemo(() => buildColumns(rounds, view === 'llaves' ? 'bracket' : 'priority'), [rounds, view])
  const triple = tripleUsesRemaining(rounds)
  const progress = predictionProgress(rounds)

  // El partido seleccionado se deriva de las columnas en cada render (datos frescos para el sheet).
  let selectedMatch: KoMatch | null = null
  let selectedRound: string | undefined
  if (selectedId) {
    for (const col of columns) {
      const slot = col.slots.find((s) => s.match?.id === selectedId)
      if (slot?.match) {
        selectedMatch = slot.match
        selectedRound = col.name
        break
      }
    }
  }

  if (isLoading) return <PanelSkeleton />
  // Si ninguna ronda cargó, mostramos error + reintento en vez del cuadro de placeholders "Por
  // definir" (que se confundiría con cruces aún sin clasificados).
  if (isError && rounds.length === 0) return <PanelError message="No pudimos cargar las eliminatorias." onRetry={refetch} />

  const value = `${progress.done}/${progress.total} pronósticos`
  const onPick = (m: KoMatch) => setSelectedId(m.id)

  return (
    <div className="space-y-4">
      <PhaseSummary label="Eliminatorias" value={value} />

      {/* Fallo parcial: algunas rondas sí cargaron. Avisamos sin ocultar lo que sí se pudo mostrar. */}
      {isError && rounds.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface-2 px-3 py-2 text-[13px] text-ink-soft">
          <span>Algunas rondas no cargaron.</span>
          <button type="button" onClick={refetch} className="font-bold text-violet">
            Reintentar
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border bg-surface p-0.5">
          {VIEWS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition ${
                view === key ? 'bg-violet text-white' : 'text-muted'
              }`}
            >
              <Icon size={16} weight="bold" />
              {label}
            </button>
          ))}
        </div>
        {/* Tap → explica la mecánica y el tope de usos por torneo (MAX_TRIPLES). */}
        <button
          type="button"
          onClick={() => setShowTripleInfo(true)}
          aria-label="Cómo funciona Triple o nada"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#f6eed9] py-1.5 pl-2.5 pr-2 text-[13px] font-bold text-gold active:scale-[0.97]"
        >
          <Trophy size={14} weight="fill" />
          <span>Triple o nada</span>
          <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 font-mono text-[10px] font-bold tabular-nums text-navy">
            {triple}
          </span>
          <Info size={13} weight="bold" className="opacity-60" />
        </button>
      </div>

      {view === 'lista' ? (
        <KoListView columns={columns} locked={locked} onPick={onPick} />
      ) : (
        <KoBracketView columns={columns} locked={locked} onPick={onPick} />
      )}

      <KoPredictionSheet match={selectedMatch} roundName={selectedRound} tripleRemaining={triple} onClose={() => setSelectedId(null)} />

      <TripleInfoSheet open={showTripleInfo} onClose={() => setShowTripleInfo(false)} remaining={triple} />
    </div>
  )
}

function InfoRow({ icon, tone, children }: { icon: ReactNode; tone: 'success' | 'danger' | 'gold'; children: ReactNode }) {
  const chip =
    tone === 'success'
      ? 'bg-[#e6f4ee] text-success'
      : tone === 'danger'
        ? 'bg-[#fbe9e7] text-danger'
        : 'bg-[#f6eed9] text-gold'
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${chip}`}>{icon}</span>
      <p className="text-sm leading-snug text-ink-soft">{children}</p>
    </li>
  )
}

// Explica la mecánica de "Triple o nada" y el tope de usos por torneo (se abre al tocar el tag).
function TripleInfoSheet({ open, onClose, remaining }: { open: boolean; onClose: () => void; remaining: number }) {
  return (
    <Sheet open={open} onClose={onClose} title="Triple o nada" ariaLabel="Cómo funciona Triple o nada">
      <div className="space-y-4 px-2 pb-2 pt-1">
        <div className="flex items-center gap-3 rounded-card bg-[#f6eed9] p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gold text-white">
            <Trophy size={22} weight="fill" />
          </span>
          <p className="text-sm font-medium text-ink">
            Una apuesta arriesgada para los partidos en los que confías plenamente en tu marcador.
          </p>
        </div>

        <ul className="space-y-3">
          <InfoRow tone="success" icon={<Check size={15} weight="bold" />}>
            Si clavas el <span className="font-bold text-ink">marcador exacto</span>, ese partido vale el{' '}
            <span className="font-bold text-ink">triple</span> de puntos.
          </InfoRow>
          <InfoRow tone="danger" icon={<X size={15} weight="bold" />}>
            Si no aciertas el marcador exacto, el partido <span className="font-bold text-ink">suma 0</span> — aunque hayas
            acertado quién avanza.
          </InfoRow>
          <InfoRow tone="gold" icon={<Trophy size={14} weight="fill" />}>
            Solo puedes activarlo <span className="font-bold text-ink">{MAX_TRIPLES} veces</span> en todo el torneo.
          </InfoRow>
        </ul>

        <p className="rounded-control bg-surface-2 px-3 py-2.5 text-center text-sm text-ink-soft">
          Te quedan <span className="font-bold text-ink">{remaining} de {MAX_TRIPLES}</span> activaciones.
        </p>
      </div>
    </Sheet>
  )
}
