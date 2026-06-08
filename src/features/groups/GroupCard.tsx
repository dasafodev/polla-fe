import { Reorder } from 'framer-motion'
import { ArrowUp, ArrowDown } from '@phosphor-icons/react'
import type { Team } from '../../types/api'

export function GroupCard({
  groupName,
  teams,
  order,
  onReorder,
  readOnly = false,
}: {
  groupName: string
  teams: Team[]
  order: string[]
  onReorder: (next: string[]) => void
  readOnly?: boolean
}) {
  const byId = (id: string) => teams.find((t) => t.id === id)

  function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    onReorder(next)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="font-display text-xl font-extrabold text-ink">{groupName}</h2>
      <p className="mt-1 text-sm text-ink-soft">Ordena del 1° al 4°. Los 2 primeros clasifican.</p>
      <Reorder.Group axis="y" values={order} onReorder={onReorder} className="mt-4 space-y-2.5">
        {order.map((id, idx) => {
          const t = byId(id)
          if (!t) return null
          const top = idx < 2
          return (
            <Reorder.Item
              key={id}
              value={id}
              dragListener={!readOnly}
              className="flex items-center gap-3 rounded-control border border-border bg-surface px-3 py-3"
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                  top ? 'bg-tint text-violet-strong' : 'bg-surface-2 text-ink-soft'
                }`}
              >
                {idx + 1}
              </span>
              <Flag code={t.code} />
              <span className="flex-1 font-medium text-ink">{t.name}</span>
              {!readOnly && (
                <span className="flex flex-col">
                  <button
                    aria-label={`Subir ${t.name}`}
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    className="p-1 text-muted active:scale-90 disabled:opacity-30"
                  >
                    <ArrowUp size={16} weight="bold" />
                  </button>
                  <button
                    aria-label={`Bajar ${t.name}`}
                    onClick={() => move(id, 1)}
                    disabled={idx === order.length - 1}
                    className="p-1 text-muted active:scale-90 disabled:opacity-30"
                  >
                    <ArrowDown size={16} weight="bold" />
                  </button>
                </span>
              )}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
    </div>
  )
}

function Flag({ code }: { code: string }) {
  const hueA = (code.charCodeAt(0) * 47) % 360
  const hueB = (code.charCodeAt(Math.min(1, code.length - 1)) * 83) % 360
  return (
    <span
      className="size-7 shrink-0 overflow-hidden rounded-md border border-border"
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 55%), hsl(${hueB} 60% 45%))` }}
    />
  )
}
