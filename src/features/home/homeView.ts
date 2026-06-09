// Decisión pura de qué vista del Inicio mostrar, a partir de los flags de onboarding.
// Aislada para poder testearla sin renderizar.

export type HomeView = 'loading' | 'empty' | 'progress' | 'ready' | 'live'

interface HomeViewInput {
  loading: boolean
  locked: boolean
  isComplete: boolean
  isFirstTime: boolean
}

export function pickHomeView(s: HomeViewInput): HomeView {
  if (s.loading) return 'loading'
  if (s.locked) return 'live'
  if (s.isComplete) return 'ready'
  if (s.isFirstTime) return 'empty'
  return 'progress'
}
