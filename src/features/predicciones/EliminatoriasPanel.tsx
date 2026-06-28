import { useMemo, useState } from 'react'
import { ListBullets, TreeStructure } from '@phosphor-icons/react'
import { useAllKoPredictions, useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import { buildColumns, tripleUsesRemaining, predictionProgress } from '../ko/koView'
import { KoListView } from '../ko/KoListView'
import { KoBracketView } from '../ko/KoBracketView'
import { KoPredictionSheet } from '../ko/KoPredictionSheet'
import type { KoMatch } from '../../types/api'

type ViewMode = 'lista' | 'llaves'
const VIEWS: { key: ViewMode; label: string; Icon: typeof ListBullets }[] = [
  { key: 'lista', label: 'Lista', Icon: ListBullets },
  { key: 'llaves', label: 'Llaves', Icon: TreeStructure },
]

export function EliminatoriasPanel({ locked }: { locked: boolean }) {
  const { isLoading, rounds } = useAllKoPredictions()
  const totals = useMyTotals()
  const [view, setView] = useState<ViewMode>('lista')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const columns = useMemo(() => buildColumns(rounds), [rounds])
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

  const value = locked && totals.data ? `${signed(totals.data.breakdown.ko)} pts` : `${progress.done}/${progress.total} pronósticos`
  const onPick = (m: KoMatch) => setSelectedId(m.id)

  return (
    <div className="space-y-4">
      <PhaseSummary label="Eliminatorias" value={value} />

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-[#f6eed9] px-3 py-1 text-[13px] font-medium text-gold">
          Triple o nada · {3 - triple}/3
        </span>
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
      </div>

      {view === 'lista' ? (
        <KoListView columns={columns} locked={locked} onPick={onPick} />
      ) : (
        <KoBracketView columns={columns} locked={locked} onPick={onPick} />
      )}

      <KoPredictionSheet match={selectedMatch} roundName={selectedRound} tripleRemaining={triple} onClose={() => setSelectedId(null)} />
    </div>
  )
}
