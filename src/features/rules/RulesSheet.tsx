import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  ListNumbers, Medal, Trophy, Lightning, Sparkle, Crown, Lock, TrendUp, TrendDown,
} from '@phosphor-icons/react'
import { Sheet } from '../../ui/Sheet'
import { stagger, fadeUp } from '../../ui/motion'

type Tone = 'violet' | 'success' | 'gold' | 'danger' | 'neutral'

const toneClass: Record<Tone, string> = {
  violet: 'bg-tint text-violet-strong',
  success: 'bg-[#e6f4ee] text-success',
  gold: 'bg-[#f6eed9] text-gold',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-2 text-ink-soft',
}

// Multiplicador de puntos por ronda KO (scale_*). El 3er puesto reusa la escala de semifinal.
const ROUND_SCALE: { label: string; mult: number }[] = [
  { label: 'Dieciseisavos', mult: 1 },
  { label: 'Octavos', mult: 2 },
  { label: 'Cuartos', mult: 5 },
  { label: 'Semifinal', mult: 7 },
  { label: 'Tercer puesto', mult: 7 },
  { label: 'Final', mult: 10 },
]

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
          <Row label="Acertar quién avanza" pts="+2" />
          <Row label="Marcador exacto (adicional)" pts="+3" />
          <p className="pt-1 text-xs font-medium text-ink-soft">Los puntos se multiplican según la ronda:</p>
          <div className="flex flex-wrap gap-1.5">
            {ROUND_SCALE.map((r) => (
              <span key={r.label} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12px] text-ink-soft">
                {r.label} <span className="font-mono font-bold text-violet-strong">×{r.mult}</span>
              </span>
            ))}
          </div>
          <p className="text-xs leading-snug text-muted">Ejemplo: acertar quién avanza en la Final = 2 × 10 = 20 pts.</p>
        </Section>

        <Section icon={<Lightning size={18} weight="bold" />} title="Triple o nada">
          <Row label="Actívalo en hasta 3 partidos de eliminatorias" tone="neutral" pts="3 usos" />
          <Row label="Solo suma si aciertas el marcador exacto; si no, ese partido queda en 0" tone="danger" />
          <Row label="Bono extra al clavar el marcador exacto" tone="success" pts="+3" />
          <p className="text-xs leading-snug text-muted">El bono es fijo: no se multiplica por la ronda.</p>
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
          <Row label="🥇 Primer lugar" tone="gold" pts="$700.000" />
          <Row label="🥈 Segundo lugar" tone="gold" pts="$250.000" />
          <Row label="🥉 Tercer lugar" tone="gold" pts="$50.000" />
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
