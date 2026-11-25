import { useState, useEffect } from 'react'
import { useQuery, useAuth } from 'deepspace'
import { Button } from '@/components/ui'
import {
  playerSummary,
  hitter,
  rallyStats,
  pointVersion,
  type Match,
  type Point,
} from './model'
import { PointRecorder } from './PointRecorder'
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
  const canWrite = role === 'owner' || role === 'coach',
    completed = match.status === 'completed'
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
  const points = query.records.map((r) => r.data),
    stats = playerSummary(points),
    rallies = rallyStats(points)
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [replayId, setReplayId] = useState<string | null>(null)
  const replayIndex = query.records.findIndex((r) => r.recordId === replayId),
    replay = query.records[replayIndex]
  const ownShotCount = stats.playerShots.reduce((n, s) => n + s.count, 0)
  async function remove(pointId: string) {
    if (
      !window.confirm(
        'Remove this whole point and all its shots? Totals and future analysis will update.',
      )
    )
      return
    setSaving(true)
    setError('')
    try {
      await matchAction('removePoint', { matchId: id, pointId })
      if (replayId === pointId) setReplayId(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
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
          <p>{match.details || 'Record the buildup. Understand the point.'}</p>
        </div>
        <span className="private-badge">
          <span />
          {role} · {completed ? 'Completed' : 'Tracking'}
        </span>
      </header>
      {!online && (
        <p role="alert" className="form-error">
          You’re offline. Previously loaded data may be out of date. Reconnect
          before saving. Draft shots are local; retry the same draft if a save
          was interrupted.
        </p>
      )}
      {role === 'owner' && (
        <div className="match-controls">
          <Button
            variant="outline"
            disabled={saving || !online}
            onClick={async () => {
              setSaving(true)
              setError('')
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
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
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
              visible points; statistics cover these points only.
            </p>
          )}
          <div className="stats-row">
            <Stat
              label="POINTS PLAYED"
              value={stats.total}
              sub="Completed points, not shots"
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
          <div className="stats-row rally-stats">
            <Stat
              label="RECORDED SHOTS"
              value={rallies.totalShots}
              sub="Both players · all known shots"
            />
            <Stat
              label="AVG. RECORDED RALLY"
              value={rallies.average ?? '—'}
              sub={`${rallies.recorded} points with explicit sequences`}
            />
            <Stat
              label="5+ SHOT RALLIES WON"
              value={`${rallies.longWon} / ${rallies.longTotal}`}
              sub="Explicitly recorded sequences only"
            />
            <Stat
              label="YOUR SHOT MIX"
              value={ownShotCount}
              sub="Includes buildup and final shots"
            />
          </div>
          {rallies.legacy > 0 && (
            <p className="coverage-note">
              {rallies.legacy} older{' '}
              {rallies.legacy === 1 ? 'point has' : 'points have'}{' '}
              finishing-shot-only coverage. Missing earlier shots are excluded
              from rally-length and buildup statistics.
            </p>
          )}
          <PointRecorder
            id={id}
            match={match}
            points={points}
            replay={
              replay
                ? {
                    recordId: replay.recordId,
                    number: replayIndex + 1,
                    point: replay.data,
                  }
                : undefined
            }
            clearReplay={() => setReplayId(null)}
            onSaved={setReplayId}
            canWrite={canWrite}
            completed={completed}
            online={online}
            disabled={saving}
          />
          <section className="point-history">
            <div className="section-heading">
              <div>
                <h2>Point history</h2>
                <p>One rally, one result. Replay the shots that built it.</p>
              </div>
              <span className="count">{stats.total} points</span>
            </div>
            {!points.length ? (
              <div className="history-empty">
                No points yet. Add shots to a rally, then save the completed
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
                      <span className="outcome-chip">{r.data.outcome}</span>
                      <small>
                        {r.data.rally?.length
                          ? `${r.data.rally.length}-shot rally`
                          : 'Finishing shot only'}{' '}
                        ·{' '}
                        {hitter(r.data) === 'player'
                          ? match.player
                          : match.opponent}{' '}
                        finished
                      </small>
                      <button
                        className="text-link"
                        aria-label={`Replay point ${points.length - index}`}
                        onClick={() => setReplayId(r.recordId)}
                      >
                        Replay
                      </button>
                      {canWrite && (
                        <button
                          className="text-link"
                          disabled={saving || !online}
                          aria-label={`Remove point ${points.length - index}`}
                          onClick={() => remove(r.recordId)}
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </section>
          <section className="collaboration-section distribution match-distribution">
            <h2>Your recorded shot mix</h2>
            <p className="helper">
              Every recorded shot by {match.player}, including the buildup.
            </p>
            {stats.playerShots.map((s) => (
              <div key={s.type}>
                <div>
                  <span>{s.type}</span>
                  <strong>{s.count}</strong>
                </div>
                <div className="bar-track">
                  <div
                    style={{
                      width: `${ownShotCount ? (s.count / ownShotCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
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
