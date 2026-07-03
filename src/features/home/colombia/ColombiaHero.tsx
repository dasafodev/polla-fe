import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Info, CaretRight } from '@phosphor-icons/react'
import { Flag } from '../../../ui/Flag'
import { Confetti } from '../../../ui/Confetti'
import { Sheet } from '../../../ui/Sheet'
import { spring, useReduced } from '../../../ui/motion'
import { useCountdown } from '../useCountdown'
import { formatKickoffBogota } from '../format'
import { useAllKoPredictions } from '../../predicciones/hooks'
import { tripleUsesRemaining } from '../../ko/koView'
import { KoPredictionSheet } from '../../ko/KoPredictionSheet'
import { MULT_COLOMBIA_KO, type ColombiaTakeover } from './colombiaTakeover'

// "Amarillo camiseta": fondo tricolor amarillo, "10" fantasma navy, tipografía navy, acentos rojos.
const YELLOW = '#FCD116'
const NAVY = '#00318A'
const RED = '#CE1126'
const CONFETTI_COLORS = ['#FCD116', '#00318A', '#CE1126', '#ffffff']

export function ColombiaHero({ takeover }: { takeover: ColombiaTakeover }) {
  // Tocar la card abre el mismo detalle de pronóstico del panel de Predicciones (marcador + ×5).
  const [open, setOpen] = useState(false)
  const ko = useAllKoPredictions()
  const tripleRemaining = tripleUsesRemaining(ko.rounds)
  const onOpen = () => setOpen(true)
  return (
    <>
      <HeroShell label={ariaLabel(takeover)}>
        {takeover.phase === 'countdown' && <CountdownContent t={takeover} onOpen={onOpen} />}
        {takeover.phase === 'live' && <LiveContent t={takeover} onOpen={onOpen} />}
        {takeover.phase === 'won' && <WonContent t={takeover} onOpen={onOpen} />}
      </HeroShell>
      <KoPredictionSheet
        match={open ? takeover.match : null}
        roundName={takeover.roundLong}
        tripleRemaining={tripleRemaining}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function HeroShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.section
      aria-label={label}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative -mx-5 overflow-hidden rounded-b-[28px] px-5 pb-6 pt-7 shadow-card"
      style={{ backgroundColor: YELLOW }}
    >
      <Ghost10 />
      <div className="relative">{children}</div>
    </motion.section>
  )
}

// El "10" fantasma. Memoizado y aislado: flota en loop sin re-renderizar el resto del héroe.
const Ghost10 = memo(function Ghost10() {
  const reduced = useReduced()
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute -right-3 top-8 font-display text-[190px] font-black leading-none"
      style={{ color: NAVY, opacity: 0.09 }}
      animate={reduced ? undefined : { y: [0, -10, 0] }}
      transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      10
    </motion.span>
  )
})

function CountdownContent({ t, onOpen }: { t: ColombiaTakeover; onOpen: () => void }) {
  const cd = useCountdown(t.kickoffAt)
  return (
    <>
      <TapArea onOpen={onOpen} label={`Pronosticar el marcador de Colombia contra ${t.opponent.name}`}>
        <Kicker>Vamos mi Colombia</Kicker>
        <Title>COLOMBIA</Title>
        <RoundLine t={t} />
        <Matchup t={t} />
        {cd.done ? (
          <p className="mt-4 font-mono text-sm font-bold uppercase tracking-wide" style={{ color: NAVY }}>
            Por comenzar
          </p>
        ) : (
          <div className="mt-4 flex gap-1.5">
            {cd.days > 0 && <CdBox n={cd.days} u="días" />}
            <CdBox n={cd.hours} u="hrs" />
            <CdBox n={cd.minutes} u="min" />
            <CdBox n={cd.seconds} u="seg" />
          </div>
        )}
        <OpenHint>Pronostica el marcador</OpenHint>
      </TapArea>
      <PointsChip />
    </>
  )
}

function LiveContent({ t, onOpen }: { t: ColombiaTakeover; onOpen: () => void }) {
  const s = t.score
  return (
    <>
      <TapArea onOpen={onOpen} label={`Ver el partido de Colombia contra ${t.opponent.name}, en vivo`}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: RED }}
        >
          <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" /> En vivo
        </span>
        {s ? (
          <div className="mt-3 flex items-center justify-center gap-3">
            <TeamCol code="COL" flag={t.colombia.flag} />
            <span className="font-display text-5xl font-black tabular-nums" style={{ color: NAVY }}>{s.col}</span>
            <span className="font-display text-3xl font-black" style={{ color: NAVY, opacity: 0.4 }}>–</span>
            <span className="font-display text-5xl font-black tabular-nums" style={{ color: NAVY }}>{s.opp}</span>
            <TeamCol code={t.opponent.code} flag={t.opponent.flag} />
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-center gap-4 text-lg font-extrabold text-ink">
            <TeamCol code="COL" flag={t.colombia.flag} />
            <span className="font-display text-2xl text-ink-soft">vs</span>
            <TeamCol code={t.opponent.code} flag={t.opponent.flag} />
          </div>
        )}
        <p className="mt-2 text-center text-xs font-bold text-ink/70">{leadText(s)}</p>
        <div className="mt-1 flex justify-center">
          <OpenHint>Ver el partido</OpenHint>
        </div>
      </TapArea>
      <PointsChip />
    </>
  )
}

function WonContent({ t, onOpen }: { t: ColombiaTakeover; onOpen: () => void }) {
  const burst = useConfettiOnce(t.match.id)
  return (
    <>
      {burst && <Confetti count={90} colors={CONFETTI_COLORS} />}
      <TapArea onOpen={onOpen} label={`Ver el detalle de Colombia contra ${t.opponent.name}`}>
        <div className="text-center">
          <h2 className="font-display text-2xl font-black leading-none" style={{ color: RED }}>¡GANÓ</h2>
          <h2 className="font-display text-3xl font-black leading-none" style={{ color: NAVY }}>COLOMBIA!</h2>
          {t.score && (
            <p className="mt-3 font-display text-xl font-black text-ink">
              COL {t.score.col} – {t.score.opp} {t.opponent.code}
            </p>
          )}
          <OpenHint>Ver el detalle</OpenHint>
        </div>
      </TapArea>
    </>
  )
}

// ── piezas ────────────────────────────────────────────────────────────────────

// Informativo: los partidos de Colombia en KO pagan ×5 (mult_colombia_ko del backend). Tap → explica.
function PointsChip() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Con la tricolor, cada punto cuenta por ${MULT_COLOMBIA_KO}. Más información`}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left active:scale-[0.99]"
        style={{ backgroundColor: NAVY }}
      >
        <span
          className="grid shrink-0 place-items-center rounded-lg px-2 py-1 font-display text-base font-black leading-none"
          style={{ backgroundColor: YELLOW, color: NAVY }}
        >
          ×{MULT_COLOMBIA_KO}
        </span>
        <span className="flex-1 text-[12.5px] font-bold leading-tight text-white">
          Con la tricolor, cada punto cuenta por {MULT_COLOMBIA_KO}
        </span>
        <Info size={18} weight="bold" className="shrink-0 text-white/70" aria-hidden />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Puntos ×${MULT_COLOMBIA_KO} por Colombia`}>
        <div className="space-y-3 px-2 pb-3 pt-1">
          <p className="text-sm leading-relaxed text-ink-soft">
            Los partidos de Colombia en eliminatorias valen <b className="text-ink">5 veces más</b>. Cada punto que ganes en
            este partido —por acertar quién avanza o el marcador exacto— se multiplica por {MULT_COLOMBIA_KO}.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            Es la forma de la polla de premiar que le pongas a la Selección: un acierto con Colombia rinde como cinco.
          </p>
          <p className="text-xs leading-snug text-muted">
            Aplica a todos los partidos de Colombia en eliminatorias, en cualquier ronda.
          </p>
        </div>
      </Sheet>
    </>
  )
}

// El área de info del héroe es tocable: abre el detalle de pronóstico del partido de Colombia.
// El PointsChip (×5) queda como botón hermano fuera de esta zona (sin botones anidados).
function TapArea({ onOpen, label, children }: { onOpen: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onOpen} aria-label={label} className="block w-full text-left active:scale-[0.99]">
      {children}
    </button>
  )
}

// Pista de que la card abre el detalle. inline-flex: se alinea o centra según el contenedor de la fase.
function OpenHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: NAVY }}>
      {children}
      <CaretRight size={13} weight="bold" aria-hidden />
    </span>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: RED }}>
      {children}
    </p>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-1 font-display text-4xl font-black leading-none tracking-tight" style={{ color: NAVY }}>
      {children}
    </h2>
  )
}

function RoundLine({ t }: { t: ColombiaTakeover }) {
  return (
    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-ink/70">
      {t.roundLong} · {formatKickoffBogota(t.kickoffAt)}
    </p>
  )
}

function Matchup({ t }: { t: ColombiaTakeover }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-[15px] font-extrabold text-ink">
      <Flag code="COL" flag={t.colombia.flag} className="size-6" />
      <span>COL</span>
      <span className="font-display" style={{ color: RED }}>vs</span>
      <span>{t.opponent.code}</span>
      <Flag code={t.opponent.code} flag={t.opponent.flag} className="size-6" />
    </div>
  )
}

function CdBox({ n, u }: { n: number; u: string }) {
  return (
    <div className="min-w-[48px] rounded-xl px-2 py-1.5 text-center" style={{ backgroundColor: NAVY }}>
      <span className="block font-mono text-lg font-bold tabular-nums text-white">{String(n).padStart(2, '0')}</span>
      <span className="block font-mono text-[8px] font-bold uppercase tracking-wide text-white/70">{u}</span>
    </div>
  )
}

function TeamCol({ code, flag }: { code: string; flag: string | null }) {
  return (
    <div className="flex w-14 flex-col items-center gap-1">
      <Flag code={code} flag={flag} className="size-7" />
      <span className="text-xs font-bold text-ink">{code}</span>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

function leadText(s: { col: number; opp: number } | null): string {
  if (!s) return 'El partido está en juego'
  if (s.col > s.opp) return 'Colombia va ganando'
  if (s.col < s.opp) return 'Colombia va abajo'
  return 'Todo empatado'
}

function ariaLabel(t: ColombiaTakeover): string {
  if (t.phase === 'won') return `Colombia ganó contra ${t.opponent.name}`
  if (t.phase === 'live') {
    return t.score
      ? `Colombia ${t.score.col}, ${t.opponent.name} ${t.score.opp}, en vivo`
      : `Colombia contra ${t.opponent.name}, en vivo`
  }
  return `Hoy juega Colombia contra ${t.opponent.name}, ${t.roundLong}`
}

// Confeti una sola vez por victoria (guardado por match.id) para no re-estallar en cada visita esa noche.
function useConfettiOnce(id: string): boolean {
  const [burst, setBurst] = useState(false)
  useEffect(() => {
    const key = `col-confetti-${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // sessionStorage no disponible: caemos a disparar igual.
    }
    setBurst(true)
    const to = setTimeout(() => setBurst(false), 2600)
    return () => clearTimeout(to)
  }, [id])
  return burst
}
