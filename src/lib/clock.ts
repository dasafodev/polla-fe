let fixedEpochMs: number | null = null

/** Epoch ms actual (real o simulado). Comparaciones de candado SIEMPRE en epoch/UTC. */
export function now(): number {
  return fixedEpochMs ?? Date.now()
}

export function setNow(iso: string): void {
  const ms = Date.parse(iso)
  // Nunca guardar NaN: now() devuelve `fixedEpochMs ?? Date.now()` y `??` no atrapa NaN, así que un
  // ISO inválido dejaría now()=NaN y toda comparación de candado en false (candados desactivados).
  if (Number.isNaN(ms)) throw new Error(`setNow: ISO inválido "${iso}"`)
  fixedEpochMs = ms
}

export function resetClock(): void {
  fixedEpochMs = null
}

/** Solo display: formatea un ISO a hora Colombia. La lógica de candado NO usa esto. */
export function formatDateLocal(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}
