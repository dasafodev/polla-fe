export function daysUntil(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

// "sáb, 6:00 p. m." — hora de inicio de un partido.
export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

// "sáb 28 jun, 11:30 a. m." — cierre de pronósticos.
export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
