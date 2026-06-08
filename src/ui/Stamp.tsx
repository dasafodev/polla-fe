export function Stamp({ kind }: { kind: 'listo' | 'volver' }) {
  const isListo = kind === 'listo'
  return (
    <span
      className={`pointer-events-none select-none rounded-xl border-4 px-4 py-2 font-display text-2xl font-extrabold uppercase tracking-wide ${
        isListo ? 'rotate-[-12deg] border-success text-success' : 'rotate-[12deg] border-lock text-lock'
      }`}
    >
      {isListo ? 'Listo' : 'Volver'}
    </span>
  )
}
