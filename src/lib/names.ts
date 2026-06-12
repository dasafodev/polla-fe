// Los nombres llegan tal cual los tiene Google (unos "JUAN PEREZ", otros "maría lópez").
// Normaliza a Título solo para presentación; el dato crudo no se toca.
export function displayName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toLocaleUpperCase('es') + w.slice(1).toLocaleLowerCase('es') : w))
    .join(' ')
}
