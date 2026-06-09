import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ScoreboardEntry } from '../../../types/api'
import { Avatar } from '../../../ui/Avatar'
import { fadeUp, stagger } from '../../../ui/motion'
import { FunFactCard } from '../../home/components/FunFactCard'
import { NAVY_BG } from '../theme'

// Estado vacío de la Tabla: antes del primer partido nadie tiene puntos. En vez de una
// tarjeta plana, previsualizamos el roster "Todos en 0" para que se sienta vivo.
export function ScoreboardEmpty({ entries, meId }: { entries: ScoreboardEntry[]; meId: string | null }) {
  const players = useMemo(() => sortPlayers(entries, meId), [entries, meId])
  const n = players.length

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="-mx-5 -mt-3">
      <motion.div variants={fadeUp} className="px-5 pb-7 pt-5 text-white" style={{ background: NAVY_BG }}>
        <p className="font-mono text-[10.5px] font-bold tracking-wide text-violet-light">TABLA</p>
        {n === 0 ? (
          <h1 className="mt-1 font-display text-2xl font-black">Aún no hay jugadores</h1>
        ) : (
          <>
            <h1 className="mt-1 font-display text-2xl font-black">Todos en 0</h1>
            <p className="mt-1 text-sm text-white/80">
              {n} {n === 1 ? 'jugador listo' : 'jugadores listos'} · la tabla se mueve con el primer partido.
            </p>
          </>
        )}
      </motion.div>

      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        {n > 0 && (
          <>
            <p className="mb-2 font-mono text-[10.5px] font-bold tracking-wide text-muted">EN LA POLLA · {n}</p>
            <motion.ul variants={stagger} className="space-y-2">
              {players.map((e) => {
                const isMe = e.participant.id === meId
                return (
                  <motion.li
                    key={e.participant.id}
                    variants={fadeUp}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                      isMe ? 'border-violet bg-tint' : 'border-border bg-surface'
                    }`}
                  >
                    <Avatar name={e.participant.name} size={30} />
                    <span data-testid="player-name" className="flex-1 font-display font-bold text-ink">
                      {e.participant.name}
                    </span>
                    {isMe && (
                      <span className="rounded-full border border-violet bg-surface px-2 py-0.5 font-display text-[10px] font-bold text-violet">
                        TÚ
                      </span>
                    )}
                    <span className="font-mono text-sm font-bold text-muted">0 pts</span>
                  </motion.li>
                )
              })}
            </motion.ul>
          </>
        )}
        <motion.div variants={fadeUp} className="mt-5 pb-1">
          <FunFactCard />
        </motion.div>
      </div>
    </motion.div>
  )
}

// Yo de primero (anclado), el resto alfabético: el jugador se ve sin hacer scroll.
function sortPlayers(entries: ScoreboardEntry[], meId: string | null): ScoreboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.participant.id === meId) return -1
    if (b.participant.id === meId) return 1
    return a.participant.name.localeCompare(b.participant.name, 'es')
  })
}
