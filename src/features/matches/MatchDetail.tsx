import { useState, useRef, useEffect } from 'react'
import { useQuery, useAuth } from 'deepspace'
import { Plus, Target, CircleDot } from 'lucide-react'
import { Button } from '@/components/ui'
import { Court } from './Court'
import {
  outcomes,
  shotTypes,
  playerSummary,
  hitter,
  pointVersion,
  type Match,
  type Point,
} from './model'
import { Observations, Sharing, type Member } from './Collaboration'
import { AnalysisPanel } from './AnalysisPanel'
import { rallyAction, matchAction } from './api'

export function MatchDetail({
  id,
  match,
  ownerId,
}: {
  id: string
  match: Match
  ownerId: string
}) {
  const { userId } = useAuth()
  const members = useQuery<Member>('team_members', {
    where: { TeamId: id },
    limit: 100,
  })
  const role =
    ownerId === userId
      ? 'owner'
      : (members.records.find(
          (m) => m.data.UserId === userId && m.data.Status === 'active',
        )?.data.role ?? 'viewer')
  const canWrite = role === 'owner' || role === 'coach'
  const completed = match.status === 'completed'
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  useEffect(() => {
    void rallyAction('prepareMatch', { matchId: id }).catch(() => {})
  }, [id])

  const query = useQuery<Point>('points', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'asc',
    limit: 500,
  })
  const points = query.records.map((r) => r.data)
  const stats = playerSummary(points)
  const [shotBy, setShotBy] = useState<Point['winner']>('player')
  const draftId = useRef(crypto.randomUUID())
  const [location, setLocation] = useState<{ x: number; y: number }>()
  const [shotType, setShot] = useState<Point['shotType']>('forehand')
  const [winner, setWinner] = useState<Point['winner']>('player')
  const [outcome, setOutcome] = useState<Point['outcome']>('winner')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function save() {
    if (!location || lock.current || !canWrite || completed || !online) return
    lock.current = true
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await matchAction('logPoint', {
        matchId: id,
        ...location,
        shotType,
        winner,
        outcome,
        shotBy,
        requestId: draftId.current,
      })
      draftId.current = crypto.randomUUID()
      setLocation(undefined)
      setMessage('Point saved to your match.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save point.')
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  return (
    <>
      <header className="match-heading">
        <div>
          <span className="eyebrow">MATCH NOTEBOOK</span>
          <h1>
            {match.player} <span>vs</span> {match.opponent}
          </h1>
          <p>{match.details || 'Focus on the point. We’ll keep the record.'}</p>
        </div>
        <span className="private-badge">
          <span /> {role} · {completed ? 'Completed' : 'Tracking'}
        </span>
      </header>
      {!online && (
        <p role="alert" className="form-error">
          You’re offline. Previously loaded data may be out of date. Reconnect
          before saving; if a save was interrupted, retry the same draft to
          avoid duplicate points.
        </p>
      )}
      {role === 'owner' && (
        <div className="match-controls">
          <Button
            variant="outline"
            disabled={saving || !online}
            onClick={async () => {
              setSaving(true)
              try {
                await matchAction('setMatchStatus', {
                  matchId: id,
                  status: completed ? 'tracking' : 'completed',
                })
              } catch (e) {
                setError((e as Error).message)
              } finally {
                setSaving(false)
              }
            }}
          >
            {completed ? 'Reopen match' : 'Finish match'}
          </Button>
        </div>
      )}
      {query.status === 'loading' ? (
        <p role="status">Connecting to your match…</p>
      ) : query.error ? (
        <p role="alert">
          Could not load points. Check your connection and refresh.
        </p>
      ) : (
        <>
          {points.length >= 500 && (
            <p role="alert">
              Showing the first 500 points. Match notebooks support up to 500
              visible points; statistics below cover these points only.
            </p>
          )}
          <div className="stats-row">
            <Stat
              label="POINTS PLAYED"
              value={stats.total}
              sub="Every recorded point"
            />
            <Stat
              label="POINTS WON"
              value={`${stats.won} / ${stats.total}`}
              sub={`${stats.winRate}% of recorded points`}
            />
            <Stat
              label="POINTS LOST"
              value={stats.lost}
              sub={`Against ${match.opponent}`}
            />
            <Stat
              label="WINNERS / U. ERRORS"
              value={`${stats.playerWinners} / ${stats.playerErrors}`}
              sub="Your finishing-shot outcomes"
            />
          </div>
          <div className="tracking-grid">
            <section className="court-panel">
              <div className="section-heading">
                <div>
                  <h2>The court</h2>
                  <p>Tap where the finishing shot landed.</p>
                </div>
                <span className="phase-tag">SHOT MAP</span>
              </div>
              <div className="court-stage">
                <span className="court-end">OPPONENT’S END</span>
                <Court
                  points={points}
                  selected={location}
                  onSelect={
                    saving || !canWrite || completed || !online
                      ? undefined
                      : (p) => {
                          setLocation(p)
                          draftId.current = crypto.randomUUID()
                          setMessage('')
                        }
                  }
                />
                <span className="court-end">YOUR END</span>
              </div>
              <div className="court-legend">
                <span>
                  <i className="dot won" /> Point won
                </span>
                <span>
                  <i className="dot lost" /> Point lost
                </span>
                <span>Markers show finishing shots</span>
              </div>
            </section>
            <aside className="logging-panel">
              {(!canWrite || completed) && (
                <p className="helper">
                  {completed
                    ? 'This match is complete. The owner can reopen it to record more points.'
                    : 'Viewer access: follow the match and read observations. Only owners and coaches can record points.'}
                </p>
              )}
              <div className="section-heading">
                <div>
                  <span className="eyebrow">POINT BY POINT</span>
                  <h2>Log a point</h2>
                </div>
                <CircleDot size={23} />
              </div>
              <div className={`location-status ${location ? 'selected' : ''}`}>
                <Target size={18} />
                {location
                  ? 'Shot location selected'
                  : 'Start by selecting a spot on the court'}
              </div>
              <fieldset disabled={saving || !canWrite || completed || !online}>
                <legend>Finishing shot</legend>
                <div className="choice-grid">
                  {shotTypes.map((t) => (
                    <button
                      key={t}
                      aria-pressed={shotType === t}
                      className={shotType === t ? 'choice active' : 'choice'}
                      onClick={() => {
                        setShot(t)
                        draftId.current = crypto.randomUUID()
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="outcome-label">
                Who hit the finishing shot?
                <select
                  aria-label="Who hit the finishing shot?"
                  disabled={saving || !canWrite || completed || !online}
                  value={shotBy}
                  onChange={(e) => {
                    const next = e.target.value as Point['winner']
                    setShotBy(next)
                    setWinner(
                      outcome === 'winner'
                        ? next
                        : next === 'player'
                          ? 'opponent'
                          : 'player',
                    )
                    draftId.current = crypto.randomUUID()
                  }}
                >
                  <option value="player">{match.player}</option>
                  <option value="opponent">{match.opponent}</option>
                </select>
              </label>
              <fieldset disabled={saving || !canWrite || completed || !online}>
                <legend>Who won the point?</legend>
                <div className="choice-grid">
                  {(['player', 'opponent'] as const).map((w) => (
                    <button
                      key={w}
                      aria-pressed={winner === w}
                      className={winner === w ? 'choice active' : 'choice'}
                      onClick={() => {
                        setWinner(w)
                        setShotBy(
                          outcome === 'winner'
                            ? w
                            : w === 'player'
                              ? 'opponent'
                              : 'player',
                        )
                        draftId.current = crypto.randomUUID()
                      }}
                    >
                      {w === 'player' ? match.player : match.opponent}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="outcome-label">
                How did the point end?
                <select
                  value={outcome}
                  disabled={saving || !canWrite || completed || !online}
                  onChange={(e) => {
                    const next = e.target.value as Point['outcome']
                    setOutcome(next)
                    setShotBy(
                      next === 'winner'
                        ? winner
                        : winner === 'player'
                          ? 'opponent'
                          : 'player',
                    )
                    draftId.current = crypto.randomUUID()
                  }}
                >
                  {outcomes.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <p className="helper">
                Record the final shot of the rally, whether it was yours or your
                opponent’s. Errors can be marked outside the lines.
              </p>
              <Button
                className="w-full"
                onClick={save}
                disabled={
                  !location ||
                  saving ||
                  points.length >= 500 ||
                  !canWrite ||
                  completed ||
                  !online
                }
              >
                {saving ? 'Saving point…' : 'Save point'}
                <Plus />
              </Button>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <p role="status" className="save-message">
                {message}
              </p>
              <div className="distribution">
                <h3>Finishing shot mix</h3>
                {stats.playerShots.map((s) => (
                  <div key={s.type}>
                    <div>
                      <span>{s.type}</span>
                      <strong>{s.count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${stats.total ? (s.count / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p>
                  Your finishing shots · {stats.total} total recorded points
                </p>
              </div>
            </aside>
          </div>
          <section className="point-history">
            <div className="section-heading">
              <div>
                <h2>Point history</h2>
                <p>Your match, one moment at a time.</p>
              </div>
              <span className="count">{stats.total} points</span>
            </div>
            {!points.length ? (
              <div className="history-empty">
                No points yet. Select a court location and save your first
                point.
              </div>
            ) : (
              <ol>
                {query.records
                  .slice()
                  .reverse()
                  .map((r, index) => (
                    <li key={r.recordId}>
                      <span className="point-number">
                        {points.length - index}
                      </span>
                      <i
                        className={`dot ${r.data.winner === 'player' ? 'won' : 'lost'}`}
                      />
                      <strong>
                        {r.data.winner === 'player'
                          ? match.player
                          : match.opponent}{' '}
                        won
                      </strong>
                      <span className="capitalize">{r.data.shotType}</span>
                      <span className="outcome-chip">{r.data.outcome}</span>
                      <small>
                        {hitter(r.data) === 'player'
                          ? match.player
                          : match.opponent}{' '}
                        hit
                      </small>
                      {canWrite && (
                        <button
                          className="text-link"
                          disabled={saving || !online}
                          aria-label={`Remove point ${points.length - index}`}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                'Remove this point? Totals and future analysis will update.',
                              )
                            )
                              return
                            setSaving(true)
                            try {
                              await matchAction('removePoint', {
                                matchId: id,
                                pointId: r.recordId,
                              })
                            } catch (e) {
                              setError((e as Error).message)
                            } finally {
                              setSaving(false)
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </section>
          <Observations id={id} canWrite={canWrite} />
          <AnalysisPanel
            id={id}
            completed={completed}
            canWrite={canWrite}
            pointCount={stats.total}
            sourceVersion={pointVersion(query.records)}
          />
          {role === 'owner' && <Sharing id={id} members={members.records} />}
        </>
      )}
    </>
  )
}
function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub: string
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  )
}
