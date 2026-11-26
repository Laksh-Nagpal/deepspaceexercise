import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Seo } from '@/components/Seo'
import { seo } from '@/seo'
import { demoMatch, demoRows, demoReport } from '@/features/matches/demo'
import { MatchReport } from '@/features/matches/MatchReport'
export default function DemoReport() {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return (
    <>
      <Seo {...seo} title="RallyIQ - sample match report" path="/demo-report" />
      <div className="report-page">
        <div className="report-toolbar no-print">
          <Link to="/demo">← Back to public demo</Link>
          <Button disabled={!ready} onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
        </div>
        <MatchReport
          match={demoMatch}
          records={demoRows}
          analysis={demoReport}
          model="Illustrative example, not live AI"
          synthetic
        />
      </div>
    </>
  )
}
