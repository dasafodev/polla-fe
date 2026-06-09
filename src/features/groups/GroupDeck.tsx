import { memo, useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions, useFriendsGroups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Confetti } from '../../ui/Confetti'
import { useReduced } from '../../ui/motion'
import { GroupCard } from './GroupCard'

export function GroupDeck({ onComplete }: { onComplete?: () => void }) {
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  const save = useSaveGroupPredictions()
  const friends = useFriendsGroups()
  const reduced = useReduced()
  const locked = friends.data?.available === true

  const [index, setIndex] = useState(0)
  const [orders, setOrders] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  const list = groups.data?.data ?? []
  const completed = mine.data?.completedGroups ?? 0
  const current = list[index]

  const effectiveOrder = useMemo(() => {
    if (!current) return []
    if (orders[current.id]) return orders[current.id]
    const existing = mine.data?.data.find((g) => g.groupId === current.id)
    return existing && existing.rankings.length === 4
      ? existing.rankings.map((r) => r.teamId)
      : current.teams.map((t) => t.id)
  }, [current, orders, mine.data])

  const goTo = useCallback((i: number) => setIndex(Math.max(0, Math.min(list.length - 1, i))), [list.length])

  if (groups.isLoading || mine.isLoading) return <DeckSkeleton />
  if (groups.isError) return <DeckError onRetry={() => groups.refetch()} />
  if (!current) return null

  function setOrder(next: string[]) {
    setOrders((o) => ({ ...o, [current.id]: next }))
  }
  function confirm(dir: 1 | -1) {
    setMessage('')
    if (dir === -1) {
      goTo(index - 1)
      return
    }
    save.mutate(
      {
        predictions: [
          { groupId: current.id, rankings: effectiveOrder.map((teamId, i) => ({ teamId, position: i + 1 })) },
        ],
      },
      {
        onSuccess: () => {
          if (index >= list.length - 1) {
            setDone(true)
            onComplete?.()
          } else {
            goTo(index + 1)
          }
        },
        onError: (e) => setMessage(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  if (done) {
    return (
      <div className="relative grid place-items-center py-16 text-center">
        <Confetti />
        <h2 className="font-display text-2xl font-black text-ink">¡12 grupos listos!</h2>
        <p className="mt-2 text-ink-soft">Ahora elige tus mejores terceros.</p>
        <Button className="mt-6" onClick={() => onComplete?.()}>
          Continuar a Terceros
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-sm font-bold text-ink">{completed} de 12 listos</p>
        <DeckDots total={list.length} index={index} onPick={goTo} />
      </div>

      <div className="relative">
        {list[index + 1] && (
          <div
            className="absolute inset-x-2 -bottom-2 top-2 -z-10 scale-[0.98] rounded-2xl border border-border bg-surface-2 opacity-60"
            aria-hidden
          />
        )}
        <motion.div
          key={current.id}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <GroupCard
            groupName={current.name}
            teams={current.teams}
            order={effectiveOrder}
            onReorder={setOrder}
            readOnly={locked}
          />
        </motion.div>
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}
      {message && (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {message}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button variant="ghost" onClick={() => confirm(-1)} disabled={index === 0}>
          Anterior
        </Button>
        <Button className="flex-1" loading={save.isPending} disabled={locked} onClick={() => confirm(1)}>
          {index >= list.length - 1 ? 'Guardar y terminar' : 'Listo, siguiente'}
        </Button>
      </div>
    </div>
  )
}

const DeckDots = memo(function DeckDots({
  total,
  index,
  onPick,
}: {
  total: number
  index: number
  onPick: (i: number) => void
}) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          aria-label={`Ir al grupo ${i + 1}`}
          onClick={() => onPick(i)}
          className={`size-2 rounded-full ${i === index ? 'bg-violet' : 'bg-border'}`}
        />
      ))}
    </div>
  )
})

function DeckSkeleton() {
  return <div className="h-[460px] animate-pulse rounded-2xl bg-surface-2" aria-busy />
}

function DeckError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar los grupos.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
