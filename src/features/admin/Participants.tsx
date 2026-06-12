import { motion } from 'framer-motion'
import { Avatar } from '../../ui/Avatar'
import { displayName } from '../../lib/names'
import { Button } from '../../ui/Button'
import { Chip } from '../../ui/Chip'
import { fadeUp, stagger, useReduced } from '../../ui/motion'
import type { AdminParticipant } from '../../types/api'
import { useAdminParticipants } from './hooks'

export function Participants() {
  const q = useAdminParticipants()
  const reduced = useReduced()

  if (q.isLoading) return <ParticipantsSkeleton />
  if (q.error) return <ParticipantsError onRetry={() => q.refetch()} />

  const participants = q.data?.data ?? []

  return (
    <div className="space-y-4">
      <Header count={participants.length} />
      {participants.length === 0 ? (
        <Panel>Aún no hay participantes inscritos.</Panel>
      ) : (
        <motion.ul
          className="space-y-2"
          variants={stagger}
          initial={reduced ? false : 'hidden'}
          animate="show"
        >
          {participants.map((p) => (
            <motion.li key={p.id} variants={fadeUp}>
              <ParticipantRow p={p} />
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  )
}

function Header({ count }: { count?: number }) {
  return (
    <header className="pt-2">
      <h1 className="font-display text-2xl font-extrabold text-ink">Participantes</h1>
      {count !== undefined && (
        <p className="mt-0.5 font-mono text-[10.5px] font-bold tracking-wide text-muted">
          INSCRITOS · {count}
        </p>
      )}
    </header>
  )
}

function ParticipantRow({ p }: { p: AdminParticipant }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5">
      <Avatar name={p.name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display font-bold text-ink">{displayName(p.name)}</p>
        <p className="truncate text-xs text-ink-soft">
          {p.email}
          {p.phone && <span className="text-muted"> · {p.phone}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {p.role === 'admin' && <Chip tone="violet">Admin</Chip>}
        <span className={`font-mono text-sm font-bold ${p.total > 0 ? 'text-ink' : 'text-muted'}`}>
          {p.total} pts
        </span>
      </div>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">{children}</p>
    </div>
  )
}

function ParticipantsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="pt-2">
        <div className="h-8 w-44 animate-pulse rounded bg-surface-2" aria-busy />
        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  )
}

function ParticipantsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="space-y-4">
      <Header />
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-ink-soft">No pudimos cargar los participantes.</p>
        <Button className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
