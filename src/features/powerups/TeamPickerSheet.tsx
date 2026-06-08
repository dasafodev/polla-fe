import { useState } from 'react'
import { Check, MagnifyingGlass } from '@phosphor-icons/react'
import type { Team } from '../../types/api'
import { Sheet } from '../../ui/Sheet'
import { Flag } from '../../ui/Flag'

export function TeamPickerSheet({
  open,
  onClose,
  title,
  subtitle,
  teams,
  groupOf,
  selectedId,
  onPick,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  teams: Team[]
  groupOf: Record<string, string>
  selectedId: string
  onPick: (teamId: string) => void
}) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const filtered = needle ? teams.filter((t) => t.name.toLowerCase().includes(needle)) : teams

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="px-2 pb-1 text-xs text-ink-soft">{subtitle}</p>
      <div className="sticky top-0 z-10 bg-surface px-2 py-2">
        <div className="flex h-11 items-center gap-2 rounded-control border border-border px-3 focus-within:ring-2 focus-within:ring-violet">
          <MagnifyingGlass size={18} className="text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar equipo…"
            aria-label="Buscar equipo"
            className="h-full w-full bg-transparent text-[16px] focus:outline-none"
          />
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
        {filtered.map((t) => {
          const sel = t.id === selectedId
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => onPick(t.id)}
                className={`flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                  sel ? 'border-violet bg-tint' : 'border-transparent hover:bg-surface-2'
                }`}
              >
                <Flag code={t.code} />
                <span className="flex-1">
                  <span className="block font-display text-sm font-bold text-ink">{t.name}</span>
                  <span className="block text-xs text-ink-soft">Grupo {groupOf[t.id]}</span>
                </span>
                <span
                  className={`grid size-5 place-items-center rounded-full border ${
                    sel ? 'border-violet bg-violet text-white' : 'border-border'
                  }`}
                  aria-hidden
                >
                  {sel && <Check size={13} weight="bold" />}
                </span>
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados</li>}
      </ul>
    </Sheet>
  )
}
