export const env = {
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  // Cierre de pronósticos = arranque del Mundial. El backend aún no expone la bandera de forma
  // fiable (devuelve available:false / availableAt:null sin partidos cargados), así que el front
  // fija el cierre por fecha. Ajustable por env sin tocar lógica.
  predictionsLockAt: (import.meta.env.VITE_PREDICTIONS_LOCK_AT as string | undefined) ?? '2026-06-11T19:00:00.000Z',
  isDev: import.meta.env.DEV,
}
