import { useState } from 'react'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions } from '../groups/hooks'
import { GroupCard } from '../groups/GroupCard'
import { isApiError } from '../../lib/errors'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'
import { signed } from './format'
import { RankingRow } from './parts'
import type { Group, GroupPrediction } from '../../types/api'

export function GroupEditSheet({
  groupId,
  locked,
  onClose,
}: {
  groupId: string | null
  locked: boolean
  onClose: () => void
}) {
  const groups = useGroups()
  const mine = useMyGroupPredictions()

  const group = groups.data?.data.find((g) => g.id === groupId)
  const prediction = mine.data?.data.find((p) => p.groupId === groupId)
  const name = group?.name ?? prediction?.name

  return (
    <Sheet open={!!groupId} onClose={onClose} ariaLabel={name}>
      {!groupId ? null : locked ? (
        <ReadOnlyGroup prediction={prediction} name={name} />
      ) : group ? (
        <GroupEditor key={group.id} group={group} prediction={prediction} onSaved={onClose} />
      ) : (
        <SheetLoading />
      )}
    </Sheet>
  )
}

function GroupEditor({
  group,
  prediction,
  onSaved,
}: {
  group: Group
  prediction: GroupPrediction | undefined
  onSaved: () => void
}) {
  const save = useSaveGroupPredictions()
  const [order, setOrder] = useState<string[]>(() =>
    prediction && prediction.rankings.length === 4
      ? prediction.rankings.map((r) => r.teamId)
      : group.teams.map((t) => t.id),
  )
  const [message, setMessage] = useState('')

  function onSave() {
    setMessage('')
    save.mutate(
      { predictions: [{ groupId: group.id, rankings: order.map((teamId, i) => ({ teamId, position: i + 1 })) }] },
      {
        onSuccess: () => onSaved(),
        onError: (e) => setMessage(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  return (
    <div className="px-2 pb-2">
      <GroupCard groupName={group.name} teams={group.teams} order={order} onReorder={setOrder} />
      {message && (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {message}
        </p>
      )}
      <Button className="mt-4" fullWidth loading={save.isPending} onClick={onSave}>
        Guardar grupo
      </Button>
    </div>
  )
}

function ReadOnlyGroup({ prediction, name }: { prediction: GroupPrediction | undefined; name: string | undefined }) {
  if (!prediction) return <SheetLoading />
  return (
    <div className="px-2 pb-2">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="font-display text-xl font-extrabold text-ink">{name ?? prediction.name}</h2>
        {prediction.pointsEarned && (
          <span className="rounded-full bg-tint px-2 py-0.5 font-mono text-xs font-bold text-violet-strong">
            {signed(prediction.pointsEarned.total)}
          </span>
        )}
      </div>
      {prediction.rankings.map((r, i) => (
        <RankingRow key={r.teamId} r={r} index={i} showResult />
      ))}
      <p className="mt-3 text-center text-sm font-medium text-lock">
        Las predicciones están cerradas. Solo lectura.
      </p>
    </div>
  )
}

function SheetLoading() {
  return <div className="m-2 h-72 animate-pulse rounded-2xl bg-surface-2" aria-busy />
}
