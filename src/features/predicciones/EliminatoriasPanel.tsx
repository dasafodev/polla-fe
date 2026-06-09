import { Link } from 'react-router-dom'
import { useAllKoPredictions, useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import type { KoMatch, KoMatchesResponse } from '../../types/api'

export function EliminatoriasPanel({ locked }: { locked: boolean }) {
  const { isLoading, rounds } = useAllKoPredictions()
  const totals = useMyTotals()
  if (isLoading) return <PanelSkeleton />
  const withMatches = rounds.filter((r) => r.matches.length > 0)
  const predictedCount = withMatches.reduce((n, r) => n + r.matches.filter((m) => m.myPrediction).length, 0)
  const value = locked && totals.data ? `${signed(totals.data.breakdown.ko)} pts` : `${predictedCount} pronósticos`

  return (
    <div className="space-y-4">
      <PhaseSummary label="Eliminatorias" value={value} />
      {withMatches.map((r) => (
        <RoundSection key={r.round.slug} r={r} locked={locked} />
      ))}
    </div>
  )
}

function RoundSection({ r, locked }: { r: KoMatchesResponse; locked: boolean }) {
  const roundPts = r.matches.reduce((n, m) => n + (m.myPrediction?.pointsEarned?.total ?? 0), 0)
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{r.round.name}</span>
        {locked && <span className="font-mono text-xs font-bold text-violet">{signed(roundPts)}</span>}
      </div>
      <div className="space-y-2">
        {r.matches.map((m) => (
          <MatchRow key={m.id} m={m} locked={locked} />
        ))}
      </div>
    </div>
  )
}

function teamName(m: KoMatch, side: 'home' | 'away'): string {
  if (side === 'home') return m.homeTeam?.name ?? m.homeTeamLabel ?? '—'
  return m.awayTeam?.name ?? m.awayTeamLabel ?? '—'
}

function advancesName(m: KoMatch): string {
  const id = m.myPrediction?.teamAdvancesId
  if (!id) return ''
  if (m.homeTeam?.id === id) return m.homeTeam.name
  if (m.awayTeam?.id === id) return m.awayTeam.name
  return ''
}

function MatchRow({ m, locked }: { m: KoMatch; locked: boolean }) {
  const home = teamName(m, 'home')
  const away = teamName(m, 'away')
  const pred = m.myPrediction
  const pe = pred?.pointsEarned
  const scored = locked && m.result != null && pe != null
  const advancesHit = scored && pe!.pts_ko_advances > 0
  const exactHit = scored && pe!.pts_ko_exact_score > 0
  return (
    <Link
      to={`/eliminatorias/partido/${m.id}`}
      aria-label={`${home} vs ${away}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-2.5 shadow-card active:scale-[0.99]"
    >
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">
          {home} {pred ? `${pred.scoreHome} – ${pred.scoreAway}` : ''} {away}
        </span>
        <span className="block text-xs text-ink-soft">
          {pred ? (
            <>
              Avanza {advancesName(m)}
              {advancesHit ? ' ✓' : ''}
              {scored && m.result ? ` · real ${m.result.scoreHome}–${m.result.scoreAway}${exactHit ? ' ✓' : ''}` : ''}
            </>
          ) : (
            'Sin pronóstico'
          )}
        </span>
      </span>
      {pred?.tripleActive && (
        <span className="rounded bg-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet">Triple</span>
      )}
      {scored && <span className={`font-mono text-sm font-bold ${pe!.total > 0 ? 'text-success' : 'text-muted'}`}>{signed(pe!.total)}</span>}
    </Link>
  )
}
