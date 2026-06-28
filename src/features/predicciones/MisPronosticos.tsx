import { useSearchParams } from 'react-router-dom'
import { useOnboardingState } from '../onboarding/onboardingState'
import { GruposPanel } from './GruposPanel'
import { TercerosPanel } from './TercerosPanel'
import { EliminatoriasPanel } from './EliminatoriasPanel'
import { PowerupsPanel } from './PowerupsPanel'

const TABS = [
  { key: 'grupos', label: 'Grupos' },
  { key: 'terceros', label: 'Terceros' },
  { key: 'eliminatorias', label: 'Eliminatorias' },
  { key: 'powerups', label: 'Pálpitos' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function MisPronosticos() {
  const state = useOnboardingState()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'eliminatorias') as TabKey

  if (state.loading) return <ScreenSkeleton />

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">Predicciones</h1>
        {!state.locked && <span className="font-mono text-sm font-bold text-violet">{state.percent}%</span>}
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold ${
              tab === t.key ? 'bg-violet text-white' : 'border border-border bg-surface text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grupos' && <GruposPanel locked={state.locked} />}
      {tab === 'terceros' && <TercerosPanel locked={state.locked} />}
      {tab === 'eliminatorias' && <EliminatoriasPanel locked={state.locked} />}
      {tab === 'powerups' && <PowerupsPanel locked={state.locked} />}
    </div>
  )
}

function ScreenSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-8 w-44 animate-pulse rounded bg-surface-2" aria-busy />
      <div className="h-9 animate-pulse rounded-full bg-surface-2" />
      <div className="h-64 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
