import { Crown } from '@phosphor-icons/react'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { displayName } from '../../lib/names'
import { formatCOP } from './format'
import { pointsFor, type PointsView } from './points'

const FIRST_BG = 'linear-gradient(180deg, #7d54e6, #5a28bf)'
const SIDE_BG = 'linear-gradient(180deg, #4b3a82, #2f2563)'
const PRIZE_BG = 'linear-gradient(135deg, #f3d27a, #d8af52)'

export function Podium({
  entries,
  meId,
  onPick,
  view,
}: {
  entries: ScoreboardEntry[]
  meId: string | null
  onPick: (e: ScoreboardEntry) => void
  view: PointsView
}) {
  const slots = [
    { e: entries[1], place: 2, h: 70 },
    { e: entries[0], place: 1, h: 96 },
    { e: entries[2], place: 3, h: 52 },
  ]
  return (
    <div className="flex items-end justify-center gap-2.5">
      {slots.map(({ e, place, h }) => {
        if (!e) return <div key={place} className="flex-1" />
        const isFirst = place === 1
        const isMe = e.participant.id === meId
        const ring = isFirst ? 'ring-2 ring-gold' : isMe ? 'ring-2 ring-violet-light' : ''
        return (
          <button
            key={place}
            onClick={() => onPick(e)}
            className="flex flex-1 flex-col items-center gap-1.5 active:scale-[0.98]"
          >
            {isFirst && <Crown size={20} weight="fill" className="text-gold" />}
            <span className={`inline-flex rounded-full ${ring}`}>
              <Avatar name={e.participant.name} size={isFirst ? 54 : 42} />
            </span>
            <span className="text-center font-display text-[13px] font-bold leading-tight text-white">
              {displayName(e.participant.name)}
            </span>
            <span className="font-mono text-xs font-bold text-violet-light">{pointsFor(e, view)} pts</span>
            {isMe && (
              <span className="rounded-full border border-violet-light px-2 py-0.5 font-display text-[10px] font-bold text-violet-light">
                TÚ
              </span>
            )}
            {e.prize != null && (
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold text-ink"
                style={{ background: PRIZE_BG }}
              >
                {formatCOP(e.prize)}
              </span>
            )}
            <span
              className="mt-1 grid w-full place-items-center rounded-t-[14px] pt-2 font-mono text-lg font-bold text-white"
              style={{ height: h, alignContent: 'start', background: isFirst ? FIRST_BG : SIDE_BG }}
            >
              {place}
            </span>
          </button>
        )
      })}
    </div>
  )
}
