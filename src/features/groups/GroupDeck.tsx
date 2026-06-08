import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions, useFriendsGroups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Stamp } from '../../ui/Stamp'
import { Confetti } from '../../ui/Confetti'
import { useReduced } from '../../ui/motion'
import { GroupCard } from './GroupCard'

const SWIPE = 90

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

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const listoOpacity = useTransform(x, [40, 140], [0, 1])
  const volverOpacity = useTransform(x, [-140, -40], [1, 0])

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

  if (groups.isLoading || mine.isLoading) return <DeckSkeleton />
  if (groups.isError) return <DeckError onRetry={() => groups.refetch()} />
  if (!current) return null

  function setOrder(next: string[]) {
    setOrders((o) => ({ ...o, [current.id]: next }))
  }
  function goTo(i: number) {
    x.set(0)
    setIndex(Math.max(0, Math.min(list.length - 1, i)))
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
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-sm font-bold text-ink">{completed} de 12 listos</p>
        <DeckDots total={list.length} index={index} onPick={goTo} />
      </div>

      <div className="relative h-[460px]">
        {list[index + 1] && !reduced && (
          <div
            className="absolute inset-x-3 top-3 -z-10 h-full scale-[0.97] rounded-2xl border border-border bg-surface-2 opacity-70"
            aria-hidden
          />
        )}
        <AnimatePresence initial={false}>
          <motion.div
            key={current.id}
            style={reduced ? undefined : { x, rotate }}
            drag={locked || reduced ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE) confirm(1)
              else if (info.offset.x < -SWIPE) confirm(-1)
              else x.set(0)
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <GroupCard
              groupName={current.name}
              teams={current.teams}
              order={effectiveOrder}
              onReorder={setOrder}
              readOnly={locked}
            />
            {!reduced && (
              <>
                <motion.div style={{ opacity: listoOpacity }} className="absolute right-5 top-5">
                  <Stamp kind="listo" />
                </motion.div>
                <motion.div style={{ opacity: volverOpacity }} className="absolute left-5 top-5">
                  <Stamp kind="volver" />
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
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

function DeckDots({ total, index, onPick }: { total: number; index: number; onPick: (i: number) => void }) {
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
}

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
