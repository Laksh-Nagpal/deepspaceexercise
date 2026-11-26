import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { seo } from '@/seo'
import { Court } from '@/features/matches/Court'
import { demoMatch, demoPoints, demoReport } from '@/features/matches/demo'
import { playerSummary, rallyStats, shotsOf } from '@/features/matches/model'
import { Button } from '@/components/ui'
export default function DemoPage() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const [pointIndex, setPoint] = useState(0),
    [step, setStep] = useState(demoPoints[0].rally!.length - 1)
  const point = demoPoints[pointIndex],
    shots = shotsOf(point),
    stats = playerSummary(demoPoints),
    rallies = rallyStats(demoPoints)
  const name = (side: 'player' | 'opponent') =>
    side === 'player' ? demoMatch.player : demoMatch.opponent
  return (
    <>
      <Seo {...seo} title="RallyIQ - interactive public demo" path="/demo" />
      <div className="public-demo" data-testid="public-demo">
        <nav className="demo-nav">
          <Link to="/" className="brand">
            Rally<b>IQ</b>
          </Link>
          <div>
            <Link to="/demo-report">Print sample report</Link>
            <Link className="landing-cta" to="/home">
              Start your own match ↗
            </Link>
          </div>
        </nav>
        <header className="demo-intro">
          <span className="eyebrow">NO ACCOUNT REQUIRED · READ-ONLY DEMO</span>
          <h1>
            See the point.
            <br />
            Understand the buildup.
          </h1>
          <p>
            Explore a fictional match, replay each rally, and inspect a sample
            tactical review. Nothing here comes from a private match. No data is
            saved and no AI call is made.
          </p>
        </header>
        <div className="stats-row">
          <div className="stat">
            <span>COMPLETED POINTS</span>
            <strong>{stats.total}</strong>
            <small>One rally, one point</small>
          </div>
          <div className="stat">
            <span>POINTS WON BY ALEX</span>
            <strong>
              {stats.won} / {stats.total}
            </strong>
            <small>{stats.winRate}% of recorded points</small>
          </div>
          <div className="stat">
            <span>RECORDED SHOTS</span>
            <strong>{rallies.totalShots}</strong>
            <small>All shots from both players</small>
          </div>
          <div className="stat">
            <span>AVERAGE RALLY</span>
            <strong>{rallies.average}</strong>
            <small>Shots per recorded point</small>
          </div>
        </div>
        <div className="demo-grid">
          <section className="court-panel">
            <div className="section-heading">
              <div>
                <h2>Point {pointIndex + 1} replay</h2>
                <p>
                  {name(point.winner)} won · {point.outcome}
                </p>
              </div>
              <span className="phase-tag">SYNTHETIC SAMPLE</span>
            </div>
            <div className="replay-controls">
              <p>
                Shot {step + 1} of {shots.length} · {name(shots[step].shotBy)} ·{' '}
                {shots[step].shotType}
              </p>
              <div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ready || step === 0}
                  onClick={() => setStep((n) => n - 1)}
                >
                  Previous shot
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!ready || step === shots.length - 1}
                  onClick={() => setStep((n) => n + 1)}
                >
                  Next shot
                </Button>
              </div>
            </div>
            <div className="court-stage">
              <span className="court-end">OPPONENT’S END</span>
              <Court
                points={[]}
                shots={shots.slice(0, step + 1)}
                numbered
                activeIndex={step}
              />
              <span className="court-end">YOUR END</span>
            </div>
            <p className="helper">
              Green: Alex. Peach: Jordan. Connectors show recorded landing
              order, not measured ball trajectories.
            </p>
          </section>
          <aside className="demo-points">
            <h2>Explore the match</h2>
            <p className="helper">
              Choose a point, then step through its shots.
            </p>
            {demoPoints.map((p, i) => (
              <button
                key={i}
                disabled={!ready}
                aria-pressed={pointIndex === i}
                onClick={() => {
                  setPoint(i)
                  setStep(shotsOf(p).length - 1)
                }}
              >
                <span>
                  Point {i + 1}
                  <small>{name(p.winner)} won</small>
                </span>
                <span>{p.rally!.length} shots</span>
              </button>
            ))}
          </aside>
        </div>
        <section className="collaboration-section">
          <div className="section-heading">
            <h2>Example tactical review</h2>
            <span className="phase-tag">ILLUSTRATIVE ADVICE</span>
          </div>
          <p className="helper">
            Example coaching notes written for this synthetic dataset, not a
            live AI response. In your own matches, DeepSpace AI generates advice
            from calculated evidence.
          </p>
          <div className="recommendations">
            {demoReport.recommendations.map((r, i) => (
              <article key={i}>
                <h3>{r.title}</h3>
                <p>{r.action}</p>
                <small>
                  Evidence:{' '}
                  {r.evidenceIds
                    .map((id) => {
                      const e = demoReport.evidence.find((e) => e.id === id)!
                      return `${e.label}: ${e.value}`
                    })
                    .join(' · ')}
                </small>
              </article>
            ))}
          </div>
        </section>
        <footer className="demo-footer">
          <p>
            Your own workspace adds private matches, coach/viewer invitations,
            quick shot entry, saved observations, and real AI reports.
          </p>
          <Link className="landing-cta" to="/home">
            Create your match notebook ↗
          </Link>
        </footer>
      </div>
    </>
  )
}
