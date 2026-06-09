import { useOnboardingState } from '../onboarding/onboardingState'
import { DashboardHeader } from './components/DashboardHeader'
import { EmptyHome } from './states/EmptyHome'
import { InProgressHome } from './states/InProgressHome'
import { ReadyHome } from './states/ReadyHome'
import { LiveHome } from './states/LiveHome'
import { pickHomeView } from './homeView'
import { daysUntil } from './format'

export function Dashboard() {
  const state = useOnboardingState()
  const view = pickHomeView(state)
  const days = state.closesAt ? daysUntil(state.closesAt) : null

  const subtitle = state.locked
    ? 'El Mundial está en juego'
    : days != null
      ? `Faltan ${days} días para el cierre`
      : 'Antes de que arranque el Mundial'

  return (
    <div className="space-y-5">
      <DashboardHeader subtitle={subtitle} />
      {view === 'loading' && <HomeSkeleton />}
      {view === 'empty' && <EmptyHome />}
      {view === 'progress' && <InProgressHome state={state} />}
      {view === 'ready' && <ReadyHome state={state} />}
      {view === 'live' && <LiveHome />}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy />
      <div className="h-20 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
