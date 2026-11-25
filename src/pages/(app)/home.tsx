import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthGate, AuthOverlay, useQuery } from 'deepspace'
import {
  ArrowUpRight,
  Plus,
  Activity,
  Target,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { Court } from '@/features/matches/Court'
import { type Match } from '@/features/matches/model'
import { MatchDetail } from '@/features/matches/MatchDetail'
import { matchAction } from '@/features/matches/api'
import { Invitations } from '@/features/matches/Collaboration'
import { CreateMatch } from '@/features/matches/CreateMatch'

export default function HomePage() {
  return (
    <AuthGate fallback={<Welcome />}>
      <Workspace />
    </AuthGate>
  )
}
function Welcome() {
  const [signIn, setSignIn] = useState(false)
  return (
    <section className="welcome">
      <span className="eyebrow">YOUR COURTSIDE COMPANION</span>
      <h1>
        Better decisions.
        <br />
        One point at a time.
      </h1>
      <p>
        Record the moments that matter. Turn your match into a clearer picture
        of your game.
      </p>
      <Button onClick={() => setSignIn(true)}>
        Sign in to your workspace <ArrowUpRight />
      </Button>
      <div className="welcome-court">
        <Court points={[]} />
      </div>
      {signIn && <AuthOverlay onClose={() => setSignIn(false)} />}
    </section>
  )
}
function Workspace() {
  // Native team permissions return only owned or explicitly shared matches.
  const matches = useQuery<Match>('matches', {
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('match')
  const [creating, setCreating] = useState(false)
  const [sampleBusy, setSampleBusy] = useState(false),
    [sampleError, setSampleError] = useState('')
  async function sample() {
    setSampleBusy(true)
    setSampleError('')
    try {
      setParams({ match: await matchAction('createSampleMatch', {}) })
    } catch (e) {
      setSampleError((e as Error).message)
    } finally {
      setSampleBusy(false)
    }
  }
  const active = matches.records.find((m) => m.recordId === selectedId)
  return (
    <div className="workspace">
      <aside className="match-sidebar">
        <div className="sidebar-heading">
          <span className="eyebrow">YOUR MATCHES</span>
          <span className="count">{matches.records.length}</span>
        </div>
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Plus /> New match
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          size="sm"
          disabled={sampleBusy}
          onClick={sample}
        >
          {sampleBusy ? 'Creating sample…' : 'Try a sample match'}
        </Button>
        {sampleError && (
          <p role="alert" className="form-error">
            {sampleError}
          </p>
        )}
        <p className="sidebar-caption">Private and shared match notebooks</p>
        {matches.status === 'loading' && (
          <p role="status">Loading your matches…</p>
        )}
        {matches.error && (
          <p role="alert">
            Could not load matches. Check your connection and refresh.
          </p>
        )}
        <div className="match-list">
          {matches.records.map((m) => (
            <button
              className={`match-item ${m.recordId === selectedId ? 'active' : ''}`}
              key={m.recordId}
              onClick={() => setParams({ match: m.recordId })}
            >
              <span className="match-item-icon">
                <Activity size={17} />
              </span>
              <span>
                <strong>
                  {m.data.player} <span>vs</span> {m.data.opponent}
                </strong>
                <small>
                  {new Date(m.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  · Match notebook
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
        </div>
        {matches.status === 'ready' && !matches.records.length && (
          <p className="sidebar-caption">
            Your first match starts here. Add the players to get going.
          </p>
        )}
        {matches.records.length === 100 && (
          <p>Showing your latest 100 matches.</p>
        )}
        <Invitations onAccept={(id) => setParams({ match: id })} />
        <div className="sidebar-footer">
          <span className="phase-tag">COURTSIDE LIVE</span>
          <p>
            Track first.
            <br />
            Find your edge.
          </p>
          <small>Private by default. Built for your game.</small>
        </div>
      </aside>
      <main className="match-main">
        {active ? (
          <MatchDetail
            key={active.recordId}
            id={active.recordId}
            match={active.data}
            ownerId={active.createdBy}
          />
        ) : (
          <div className="workspace-empty">
            <span className="eyebrow">THE MATCH WORKSPACE</span>
            <h1>
              Every point
              <br />
              tells a story.
            </h1>
            <p>
              Keep the score simple. Record rallies shot by shot, track outcomes,
              and see how each point unfolds.
            </p>
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus /> Create a match
            </Button>
            {selectedId && matches.status === 'ready' && (
              <p role="alert">
                That match is unavailable or not in your latest 100 matches.
              </p>
            )}
            <div className="empty-court">
              <Court points={[]} />
            </div>
            <div className="empty-details">
              <span>
                <Target size={18} /> Shot placement
              </span>
              <span>
                <Activity size={18} /> Live point totals
              </span>
              <span>
                <Check size={18} /> Saved as you go
              </span>
            </div>
          </div>
        )}
      </main>
      {creating && (
        <CreateMatch
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setParams({ match: id })
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}
