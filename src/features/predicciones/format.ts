export const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

// "lun 29 jun, 11:00 a. m." — fecha y hora (Colombia) de un partido. Forzamos America/Bogota para que
// todos vean la misma hora aunque el dispositivo esté en otra zona horaria.
export function formatKoKickoff(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}

// "29 jun, 11:00 a. m." — variante compacta sin día de semana (para el bracket, columnas estrechas).
export function formatKoKickoffShort(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}
