export function daysUntil(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export interface Duration {
  days: number
  hours: number
  minutes: number
  seconds: number
}

// Descompone milisegundos restantes en días/horas/minutos/segundos. Negativo → todo en cero.
export function splitDuration(ms: number): Duration {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

// "sáb, 6:00 p. m." — hora de inicio de un partido.
export function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}

// "4:00 p. m." — hora Colombia de un partido de hoy (sin día: la franja ya es "hoy").
export function formatHour(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })
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
