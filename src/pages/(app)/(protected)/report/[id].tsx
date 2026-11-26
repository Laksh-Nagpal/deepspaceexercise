import { Link, useParams } from 'react-router-dom'
import { useQuery } from 'deepspace'
import { Button } from '@/components/ui'
import { MatchReport } from '@/features/matches/MatchReport'
import { parseSavedReport } from '@/features/matches/report'
import type { Match, Point } from '@/features/matches/model'
export default function ReportPage() {
  const { id } = useParams()
  const matches = useQuery<Match>('matches', {
    where: { recordId: id },
    limit: 1,
  })
  const points = useQuery<Point>('points', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'asc',
    limit: 500,
  })
  const analyses = useQuery<{ report: string; model: string }>('analyses', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 1,
  })
  const notes = useQuery<{ text: string; author: string }>('observations', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 10,
  })
  if ([matches, points, analyses, notes].some((q) => q.error))
    return (
      <p role="alert" className="report-page">
        Could not load the report. Check your connection and refresh.
      </p>
    )
  if ([matches, points, analyses, notes].some((q) => q.status === 'loading'))
    return (
      <p role="status" className="report-page">
        Loading match report…
      </p>
    )
  const match = matches.records[0],
    saved = analyses.records[0]
  if (!match)
    return (
      <section className="report-page">
        <h1>Report unavailable</h1>
        <p>This match does not exist or you do not have access.</p>
        <Link to="/home">Back to workspace</Link>
      </section>
    )
  return (
    <div className="report-page">
      <div className="report-toolbar no-print">
        <Link to={`/home?match=${encodeURIComponent(id!)}`}>
          ← Back to match
        </Link>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <p className="helper no-print">
        Preview of your current recorded data. In the print dialog, choose Save
        as PDF to keep a copy. Sharing the report URL still requires match
        access.
      </p>
      <MatchReport
        match={match.data}
        records={points.records}
        analysis={parseSavedReport(saved?.data.report)}
        model={saved?.data.model}
        observations={notes.records.map((n) => ({
          ...n.data,
          createdAt: n.createdAt,
        }))}
      />
    </div>
  )
}
