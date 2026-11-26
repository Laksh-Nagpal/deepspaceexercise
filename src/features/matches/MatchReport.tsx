import { Court } from './Court'
import {
  playerSummary,
  rallyStats,
  pointVersion,
  type Match,
  type Point,
} from './model'
import type { SavedReport } from './report'
export type ReportPoint = { recordId: string; data: Point; updatedAt: string }
export function MatchReport({
  match,
  records,
  analysis,
  model,
  observations = [],
  synthetic = false,
}: {
  match: Match
  records: ReportPoint[]
  analysis: SavedReport | null
  model?: string
  observations?: { text: string; author: string; createdAt: string }[]
  synthetic?: boolean
}) {
  const points = records.map((r) => r.data),
    stats = playerSummary(points),
    rallies = rallyStats(points)
  const stale = !!analysis && analysis.sourceVersion !== pointVersion(records)
  return (
    <article className="match-report" data-testid="match-report">
      <header className="report-header">
        <span className="brand">
          Rally<b>IQ</b>
        </span>
        <p className="eyebrow">MATCH SUMMARY</p>
        <h1>
          {match.player} vs {match.opponent}
        </h1>
        <p>{match.details}</p>
        <small>
          {synthetic
            ? 'PUBLIC SYNTHETIC DEMO - fictional data and illustrative advice'
            : 'Private match - exported by an authorized participant'}{' '}
          · {match.status === 'completed' ? 'Completed' : 'In progress'}
        </small>
      </header>
      <section className="report-summary">
        <h2>Recorded match statistics</h2>
        <div className="report-metrics">
          <div>
            <small>Points played</small>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <small>Points won</small>
            <strong>
              {stats.won} / {stats.total} ({stats.winRate}%)
            </strong>
          </div>
          <div>
            <small>Points lost</small>
            <strong>{stats.lost}</strong>
          </div>
          <div>
            <small>Recorded shots</small>
            <strong>{rallies.totalShots}</strong>
          </div>
          <div>
            <small>Average recorded rally</small>
            <strong>{rallies.average ?? 'Not recorded'}</strong>
          </div>
          <div>
            <small>Your winners / unforced errors</small>
            <strong>
              {stats.playerWinners} / {stats.playerErrors}
            </strong>
          </div>
        </div>
        <p className="report-caption">
          {rallies.recorded} points have explicit shot sequences;{' '}
          {rallies.legacy} have finishing-shot-only coverage. Missing buildup is
          excluded from rally-length statistics. This summary covers up to 500
          recorded points.
        </p>
      </section>
      <section className="report-court-grid">
        <div>
          <h2>Recorded shot placement</h2>
          <div className="report-court">
            <Court points={points} />
          </div>
          <p className="report-caption">
            Green: {match.player}. Peach: {match.opponent}. Fixed overhead view;
            top is the opponent’s end. Landing locations only.
          </p>
        </div>
        <div>
          <h2>Your shot mix</h2>
          <table>
            <thead>
              <tr>
                <th>Shot type</th>
                <th>Recorded shots</th>
              </tr>
            </thead>
            <tbody>
              {stats.playerShots.map((s) => (
                <tr key={s.type}>
                  <td>{s.type}</td>
                  <td>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-caption">
            Includes buildup and finishing shots by {match.player}.
          </p>
          <h2>Longer rallies</h2>
          <p>
            {rallies.longWon} of {rallies.longTotal} recorded rallies of at
            least five shots were won by {match.player}.
          </p>
        </div>
      </section>
      <section className={`report-review${analysis ? ' has-analysis' : ''}`}>
        <h2>
          {synthetic
            ? 'Illustrative tactical review'
            : 'Saved AI tactical review'}
        </h2>
        {synthetic && (
          <p className="report-caption">
            This example advice is written for the fictional dataset. Viewing or
            printing the demo makes no live AI request.
          </p>
        )}
        {!analysis ? (
          <p>
            No saved AI analysis yet. Finish the match with at least 10 points
            and generate a review in the workspace.
          </p>
        ) : (
          <>
            {stale && (
              <p className="report-warning">
                Historical review: the match data or analysis method has
                changed. Statistics above describe the current records; evidence
                below belongs to the saved review.
              </p>
            )}
            <p className="report-caption">
              Based on {analysis.pointCount} recorded points ·{' '}
              {model ?? 'Saved report'} · Observational guidance, not a
              prediction.
            </p>
            {analysis.recommendations.map((r, i) => (
              <section className="report-recommendation" key={i}>
                <h3>{r.title}</h3>
                <p>{r.action}</p>
                <small>
                  Evidence:{' '}
                  {r.evidenceIds
                    .map((id) => {
                      const e = analysis.evidence.find((e) => e.id === id)
                      return e
                        ? `${e.label}: ${e.value}`
                        : 'Unavailable reference'
                    })
                    .join('; ')}
                </small>
              </section>
            ))}
            <section className="report-evidence">
              <h3>Supporting recorded facts</h3>
              <dl>
                {analysis.evidence.map((e) => (
                  <div key={e.id}>
                    <dt>{e.label}</dt>
                    <dd>{e.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}
      </section>
      {observations.length > 0 && (
        <section className="report-observations">
          <h2>Latest courtside observations</h2>
          {observations.slice(0, 10).map((o, i) => (
            <blockquote key={i}>
              <p>{o.text}</p>
              <small>
                {o.author} · {o.createdAt.replace('T', ' ').slice(0, 16)} UTC
              </small>
            </blockquote>
          ))}
          <p className="report-caption">
            Includes up to the latest 10 observations. Open the match for the
            full available notebook.
          </p>
        </section>
      )}
      <footer className="report-footer">
        RallyIQ match summary · One completed rally counts as one point. Manual
        observations and small samples have limitations. No game/set scoring or
        player tracking is inferred.
      </footer>
    </article>
  )
}
