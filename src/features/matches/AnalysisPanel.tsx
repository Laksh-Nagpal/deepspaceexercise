import { useState } from 'react'
import { useQuery } from 'deepspace'
import { z } from 'zod'
import { Button } from '@/components/ui'
import { matchAction } from './api'
const reportSchema = z.object({
  sourceVersion: z.string(),
  pointCount: z.number(),
  evidence: z.array(
    z.object({ id: z.string(), label: z.string(), value: z.string() }),
  ),
  recommendations: z.array(
    z.object({
      title: z.string(),
      action: z.string(),
      evidenceIds: z.array(z.string()),
    }),
  ),
})
export function AnalysisPanel({
  id,
  completed,
  canWrite,
  pointCount,
  sourceVersion,
}: {
  id: string
  completed: boolean
  canWrite: boolean
  pointCount: number
  sourceVersion: string
}) {
  const query = useQuery<{ report: string; model: string }>('analyses', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 1,
  })
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const record = query.records[0]
  let parsed: ReturnType<typeof reportSchema.safeParse> | null = null
  try {
    parsed = record
      ? reportSchema.safeParse(JSON.parse(record.data.report))
      : null
  } catch {
    /* Ignore malformed historical reports; a new report can be generated. */
  }
  const report = parsed?.success ? parsed.data : null
  const stale = report && report.sourceVersion !== sourceVersion
  return (
    <section className="collaboration-section analysis-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EVIDENCE BEFORE ADVICE</span>
          <h2>Your tactical review</h2>
        </div>
        <span className="phase-tag">DEEPSPACE AI</span>
      </div>
      <p className="helper">
        Finish the match with at least 10 points. AI suggests tactical
        experiments; statistics below are calculated from recorded points. This
        sample captures finishing shots, not full rallies.
      </p>
      {canWrite && (
        <Button
          disabled={busy || !completed || pointCount < 10}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await matchAction('analyzeMatch', { matchId: id })
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy
            ? 'Analyzing recorded evidence…'
            : report
              ? 'Refresh analysis'
              : 'Generate analysis'}
        </Button>
      )}
      <p className="helper">
        {!completed
          ? 'The owner must finish the match first.'
          : pointCount < 10
            ? `${10 - pointCount} more points needed.`
            : 'Owner-funded · no API key needed · one new report per match per minute · 20 new reports per day for the app. Identical data reuses its report.'}
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {stale && (
        <p className="form-error">
          Match data changed. This saved review is historical; generate a fresh
          report.
        </p>
      )}
      {report && (
        <>
          <div className="evidence-grid">
            {report.evidence.map((e) => (
              <div key={e.id}>
                <small>{e.label}</small>
                <strong>{e.value}</strong>
              </div>
            ))}
          </div>
          <div className="recommendations">
            {report.recommendations.map((r, i) => (
              <article key={i}>
                <h3>{r.title}</h3>
                <p>{r.action}</p>
                <small>
                  Evidence:{' '}
                  {r.evidenceIds
                    .map((id) => {
                      const e = report.evidence.find((f) => f.id === id)
                      return e ? `${e.label}: ${e.value}` : ''
                    })
                    .join(' · ')}
                </small>
              </article>
            ))}
          </div>
          <p className="helper">
            {report.pointCount} recorded points · {record.data.model} ·{' '}
            {new Date(record.createdAt).toLocaleString()} · Observational
            guidance, not a prediction.
          </p>
        </>
      )}
      {query.status === 'loading' && <p role="status">Loading saved review…</p>}
      {query.error && (
        <p role="alert">Could not load saved analysis. Refresh to retry.</p>
      )}
    </section>
  )
}
