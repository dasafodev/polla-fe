import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ListNumbers, Medal, Trophy, Lightning, Sparkle, Crown, Lock, TrendUp, TrendDown, Star,
} from '@phosphor-icons/react'
import { Sheet } from '../../ui/Sheet'
import { stagger, fadeUp } from '../../ui/motion'
import { MAX_TRIPLES } from '../../lib/constants'

type Tone = 'violet' | 'success' | 'gold' | 'danger' | 'neutral'

const toneClass: Record<Tone, string> = {
  violet: 'bg-tint text-violet-strong',
  success: 'bg-[#e6f4ee] text-success',
  gold: 'bg-[#f6eed9] text-gold',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
}

// Puntos base de eliminatorias y multiplicador por ronda (scale_* del backend).
// Espejo de polla-be/prisma/seed.ts: pts_ko_advances=2, pts_ko_exact_score=3,
// scale_r32=2, scale_r16=3, scale_qf=5, scale_sf=7, scale_final=10. El 3er puesto reusa la escala de semifinal.
const KO_ADVANCE = 2 // pts_ko_advances
const KO_EXACT = 3 // pts_ko_exact_score (adicional al marcador exacto)
const ROUND_SCALE: { label: string; mult: number }[] = [
  { label: 'Dieciseisavos', mult: 2 },
  { label: 'Octavos', mult: 3 },
  { label: 'Cuartos', mult: 5 },
  { label: 'Semifinal', mult: 7 },
  { label: 'Tercer puesto', mult: 7 },
  { label: 'Final', mult: 10 },
]
// mult_triple=3 (el triple multiplica ×3 TODO el partido, todo o nada) y mult_colombia_ko=5
// (los partidos de Colombia en KO valen ×5). Ambos multiplican el total ya escalado por ronda.
const TRIPLE_MULT = 3
const COLOMBIA_MULT = 5

function Pts({ tone = 'violet', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 font-mono text-[13px] font-bold ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <motion.section variants={fadeUp} className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-tint text-violet-strong">{icon}</span>
        <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      </div>
      <div className="space-y-2.5 rounded-card border border-border bg-surface-2 p-3.5">{children}</div>
    </motion.section>
  )
}

function Row({ label, tone, pts }: { label: ReactNode; tone?: Tone; pts?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm leading-snug text-ink-soft">{label}</span>
      {pts != null && <Pts tone={tone}>{pts}</Pts>}
    </div>
  )
}

export function RulesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se juega">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 px-2 pb-2">
        <motion.p variants={fadeUp} className="text-sm leading-relaxed text-ink-soft">
          Predices todo el Mundial antes de que arranque: el orden de cada grupo, los mejores terceros
          y las eliminatorias. Ganas puntos por cada acierto y gana quien más sume.
        </motion.p>

        <Section icon={<ListNumbers size={18} weight="bold" />} title="Fase de grupos">
          <Row label="Cada equipo en su posición exacta" pts="+5" />
          <Row label="Bonus si aciertas el grupo completo (4 de 4)" tone="success" pts="+20" />
          <p className="text-xs leading-snug text-muted">Solo suma la posición exacta: un equipo en otra posición no da puntos.</p>
        </Section>

        <Section icon={<Medal size={18} weight="bold" />} title="Mejores terceros">
          <Row label="Por cada tercero que termine clasificando" pts="+10" />
        </Section>

        <Section icon={<Trophy size={18} weight="bold" />} title="Eliminatorias">
          <p className="text-sm leading-snug text-ink-soft">
            Ganas <span className="font-bold text-ink">+{KO_ADVANCE}</span> por acertar quién avanza y{' '}
            <span className="font-bold text-ink">+{KO_EXACT}</span> más por el marcador exacto. Cada ronda
            multiplica esos puntos:
          </p>
          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
              <span>Ronda</span>
              <span className="text-right">Avanza</span>
              <span className="text-right">Exacto</span>
              <span className="text-right">Total</span>
            </div>
            {ROUND_SCALE.map((r, i) => (
              <div
                key={r.label}
                className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 px-3 py-2 ${i % 2 === 1 ? 'bg-surface-2' : ''}`}
              >
                <span className="flex items-baseline gap-1.5 text-sm text-ink">
                  {r.label}
                  <span className="font-mono text-[11px] font-bold text-violet-strong">×{r.mult}</span>
                </span>
                <span className="text-right font-mono text-[13px] text-ink-soft">+{KO_ADVANCE * r.mult}</span>
                <span className="text-right font-mono text-[13px] text-ink-soft">+{KO_EXACT * r.mult}</span>
                <span className="text-right font-mono text-[13px] font-bold text-ink">{(KO_ADVANCE + KO_EXACT) * r.mult}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-snug text-muted">
            El marcador exacto ya incluye acertar quién avanza: clavarlo suma Avanza + Exacto = Total.
          </p>
        </Section>

        <Section icon={<Star size={18} weight="fill" />} title="Cuando juega Colombia">
          <Row
            label={<>Los partidos de Colombia en eliminatorias valen <span className="font-bold text-ink">×{COLOMBIA_MULT}</span></>}
            tone="success"
            pts={`×${COLOMBIA_MULT}`}
          />
          <p className="text-xs leading-snug text-muted">
            Cada punto que ganes en un partido de Colombia se multiplica por {COLOMBIA_MULT}, en cualquier ronda.
          </p>
          <p className="text-xs leading-snug text-muted">
            Con Triple o nada encima, un partido de Colombia clavado vale ×{COLOMBIA_MULT * TRIPLE_MULT}. Pero el triple es
            todo o nada: si no aciertas el marcador exacto, ese partido queda en 0.
          </p>
        </Section>

        <Section icon={<Lightning size={18} weight="bold" />} title="Triple o nada">
          <Row
            label={<>Multiplica <span className="font-bold text-ink">×{TRIPLE_MULT}</span> todos los puntos de ese partido</>}
            tone="success"
            pts={`×${TRIPLE_MULT}`}
          />
          <Row label="Solo si clavas el marcador exacto; si no, ese partido queda en 0 (aunque aciertes quién avanza)" tone="danger" />
          <Row label={`Actívalo en hasta ${MAX_TRIPLES} partidos de eliminatorias`} tone="neutral" pts={`${MAX_TRIPLES} usos`} />
        </Section>

        <Section icon={<Sparkle size={18} weight="bold" />} title="Pálpitos">
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
              <TrendUp size={18} weight="bold" className="mt-0.5 shrink-0 text-success" />
              <span>
                <span className="font-bold text-ink">La revelación</span>: por cada ronda que avance tu equipo sorpresa.
              </span>
            </span>
            <Pts tone="success">+5 ×ronda</Pts>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
              <TrendDown size={18} weight="bold" className="mt-0.5 shrink-0 text-danger" />
              <span>
                <span className="font-bold text-ink">La decepción</span>: por cada ronda que avance el equipo que apostaste a que iba a fracasar.
              </span>
            </span>
            <Pts tone="danger">−5 ×ronda</Pts>
          </div>
          <p className="text-xs leading-snug text-muted">Cada ronda multiplica los puntos por su escala, igual que en eliminatorias.</p>
        </Section>

        <Section icon={<Crown size={18} weight="bold" />} title="Premios">
          <Row label="🥇 Primer lugar" tone="gold" pts="$800.000" />
          <Row label="🥈 Segundo lugar" tone="gold" pts="$300.000" />
          <Row label="🥉 Tercer lugar" tone="gold" pts="$100.000" />
          <p className="text-xs leading-snug text-muted">
            En caso de empate de puntos, gana quien tenga más marcadores exactos en eliminatorias.
          </p>
        </Section>

        <Section icon={<Lock size={18} weight="bold" />} title="Candados">
          <Row label="Grupos, terceros y pálpitos se cierran al iniciar el Mundial." />
          <Row label="Cada partido de eliminatorias se cierra cuando empieza." />
        </Section>
      </motion.div>
    </Sheet>
  )
}
