import { playerSummary, rallyStats, hitter, type Point } from './model'

export type Evidence = { id: string; label: string; value: string }
export function evidenceFor(points: Point[]): Evidence[] {
  const s = playerSummary(points)
  const rallies = rallyStats(points)
  return [
    {
      id: 'points',
      label: 'Points won',
      value: `${s.won} of ${s.total} (${s.winRate}%)`,
    },
    {
      id: 'winners',
      label: 'Your finishing-shot winners',
      value: String(s.playerWinners),
    },
    {
      id: 'errors',
      label: 'Your unforced errors',
      value: String(s.playerErrors),
    },
    ...s.playerShots.map((p) => ({
      id: p.type,
      label: `Your recorded ${p.type} shots`,
      value: String(p.count),
    })),
    {
      id: 'rally-coverage',
      label: 'Points with an explicitly recorded rally',
      value: `${rallies.recorded} of ${points.length}`,
    },
    {
      id: 'rally-length',
      label: 'Average shots per recorded rally (excludes legacy points)',
      value:
        rallies.average === null ? 'Not recorded' : String(rallies.average),
    },
    {
      id: 'long-rallies',
      label: 'Points won in recorded rallies of at least five shots',
      value: `${rallies.longWon} of ${rallies.longTotal}`,
    },
    {
      id: 'setup-left',
      label:
        'Your prior shot landed left before your winner (recorded rallies)',
      value: String(rallies.setupLeft),
    },
    {
      id: 'setup-right',
      label:
        'Your prior shot landed right before your winner (recorded rallies)',
      value: String(rallies.setupRight),
    },
    {
      id: 'backhand-errors',
      label: 'Your backhand unforced errors',
      value: String(
        points.filter(
          (p) =>
            hitter(p) === 'player' &&
            p.shotType === 'backhand' &&
            p.outcome === 'unforced error',
        ).length,
      ),
    },
    {
      id: 'forehand-errors',
      label: 'Your forehand unforced errors',
      value: String(
        points.filter(
          (p) =>
            hitter(p) === 'player' &&
            p.shotType === 'forehand' &&
            p.outcome === 'unforced error',
        ).length,
      ),
    },
  ]
}
