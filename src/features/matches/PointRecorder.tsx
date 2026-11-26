import { useEffect, useRef, useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui'
import { Court } from './Court'
import { matchAction } from './api'
import {
  outcomes,
  shotTypes,
  shotsOf,
  type Match,
  type Point,
  type Shot,
} from './model'
export type Replay = { recordId: string; number: number; point: Point }
export function PointRecorder({
  id,
  match,
  points,
  replay,
  clearReplay,
  onSaved,
  canWrite,
  completed,
  online,
  disabled,
}: {
  id: string
  match: Match
  points: Point[]
  replay?: Replay
  clearReplay: () => void
  onSaved: (id: string) => void
  canWrite: boolean
  completed: boolean
  online: boolean
  disabled: boolean
}) {
  const [draft, setDraft] = useState<Shot[]>([])
  const [quick, setQuick] = useState(true)
  const [finishOpen, setFinishOpen] = useState(false)
  const finishDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (finishOpen) finishDialog.current?.showModal()
    else finishDialog.current?.close()
  }, [finishOpen])
  const [location, setLocation] = useState<{ x: number; y: number }>()
  const [shotType, setType] = useState<Shot['shotType']>('serve')
  const [shotBy, setHitter] = useState<Shot['shotBy']>('player')
  const [outcome, setOutcome] = useState<Point['outcome']>('winner')
  const [editing, setEditing] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('')
  const requestId = useRef(crypto.randomUUID()),
    lock = useRef(false)
  const writable = canWrite && !completed && online && !disabled && !busy
  const replayShots = replay ? shotsOf(replay.point) : []
  useEffect(() => {
    setStep(replay ? shotsOf(replay.point).length - 1 : 0)
  }, [replay?.recordId])
  const last = draft.at(-1)
  const winner = last
    ? outcome === 'winner'
      ? last.shotBy
      : last.shotBy === 'player'
        ? 'opponent'
        : 'player'
    : null
  const name = (side: Shot['shotBy']) =>
    side === 'player' ? match.player : match.opponent
  function changed() {
    requestId.current = crypto.randomUUID()
    setError('')
    setMessage('')
  }
  function place(p: { x: number; y: number }) {
    clearReplay()
    if (quick && editing === null) addShot(p)
    else setLocation(p)
    setMessage('')
  }
  function addShot(at = location) {
    if (!at || !writable || (draft.length >= 100 && editing === null)) return
    clearReplay()
    const shot: Shot = { ...at, shotType, shotBy }
    if (editing === null && last?.shotBy === shotBy) {
      setError('The next shot must be hit by the other player.')
      return
    }
    if (editing === null && draft.length && shotType === 'serve') {
      setError('A serve can only start the point.')
      return
    }
    if (editing !== null && editing > 0 && shotType === 'serve') {
      setError('A serve can only start the point.')
      return
    }
    setDraft(
      editing === null
        ? [...draft, shot]
        : draft.map((s, i) => (i === editing ? shot : s)),
    )
    if (editing === null) setHitter(shotBy === 'player' ? 'opponent' : 'player')
    else setHitter(last!.shotBy === 'player' ? 'opponent' : 'player')
    if (!quick || shotType === 'serve' || editing !== null) setType('forehand')
    setLocation(undefined)
    setEditing(null)
    changed()
  }
  function undo() {
    if (!writable || !last) return
    setDraft(draft.slice(0, -1))
    setLocation(quick ? undefined : { x: last.x, y: last.y })
    setType(last.shotType)
    setHitter(last.shotBy)
    setEditing(null)
    changed()
  }
  async function save() {
    if (!writable || !last || !winner || location || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const saved = await matchAction('logPoint', {
        matchId: id,
        ...last,
        winner,
        outcome,
        rally: draft,
        requestId: requestId.current,
      })
      setFinishOpen(false)
      setDraft([])
      setLocation(undefined)
      setType('serve')
      setHitter('player')
      setOutcome('winner')
      requestId.current = crypto.randomUUID()
      setMessage(
        `Point saved with ${draft.length} ${draft.length === 1 ? 'shot' : 'shots'}.`,
      )
      onSaved(saved)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  const shownShots = replay
    ? replayShots.slice(0, step + 1)
    : draft.length
      ? draft
      : undefined
  const finishControls = (
    <div className="finish-point">
      <h3>Finish the point</h3>
      <label className="outcome-label">
        How did the point end?
        <select
          value={outcome}
          disabled={!writable || !draft.length}
          onChange={(e) => {
            setOutcome(e.target.value as Point['outcome'])
            changed()
          }}
        >
          {outcomes.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <p className="point-winner">
        Point winner:{' '}
        <strong>{winner ? name(winner) : 'Add a shot first'}</strong>
      </p>
      <p className="helper">
        The outcome applies only to the last added shot. An error awards the
        point to the other player.
      </p>
      <Button
        className="w-full"
        onClick={save}
        disabled={
          !writable || !draft.length || !!location || points.length >= 500
        }
      >
        {busy ? 'Saving rally…' : 'Save point'}
      </Button>
      {location && draft.length > 0 && (
        <p className="helper">Add or cancel the selected shot before saving.</p>
      )}
      <p className="helper">
        One completed rally = one point. Up to 100 shots per point. Unsaved
        drafts are lost on refresh.
      </p>
    </div>
  )
  return (
    <div className="tracking-grid">
      <section className="court-panel">
        <div className="section-heading">
          <div>
            <h2>
              {replay
                ? `Point ${replay.number} replay`
                : draft.length
                  ? 'Current rally'
                  : 'The court'}
            </h2>
            <p>
              {replay
                ? 'Step through the recorded landing sequence.'
                : 'Choose a landing location for each shot.'}
            </p>
          </div>
          <span className="phase-tag">
            {replay || draft.length ? 'RALLY SEQUENCE' : 'ALL RECORDED SHOTS'}
          </span>
        </div>
        {replay && (
          <div className="replay-controls">
            <p>
              {replay.point.rally?.length
                ? `Shot ${step + 1} of ${replayShots.length}`
                : 'Finishing shot only · earlier shots were not recorded'}{' '}
              · {name(replayShots[step]?.shotBy ?? 'player')} ·{' '}
              {replayShots[step]?.shotType}
            </p>
            <div>
              <Button
                size="sm"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
              >
                Previous shot
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={step >= replayShots.length - 1}
                onClick={() => setStep((s) => s + 1)}
              >
                Next shot
              </Button>
              <button className="text-link" onClick={clearReplay}>
                Show match map
              </button>
            </div>
          </div>
        )}
        <div className="court-capture">
          <label className="quick-toggle">
            <input
              type="checkbox"
              role="switch"
              aria-label="Quick entry"
              checked={quick}
              disabled={!writable || editing !== null}
              onChange={(e) => {
                setQuick(e.target.checked)
                setLocation(undefined)
              }}
            />
            Quick entry{' '}
            <small>
              {quick
                ? 'Each court tap adds a shot'
                : 'Select a location, then Add shot'}
            </small>
          </label>
          <fieldset disabled={!writable}>
            <legend>Shot type</legend>
            <div className="choice-grid">
              {shotTypes.map((t) => (
                <button
                  key={t}
                  disabled={
                    t === 'serve' &&
                    (editing === null ? draft.length > 0 : editing > 0)
                  }
                  aria-pressed={shotType === t}
                  className={shotType === t ? 'choice active' : 'choice'}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="outcome-label">
            Who hits this shot?
            <select
              aria-label="Who hits this shot?"
              disabled={!writable || draft.length > 0}
              value={shotBy}
              onChange={(e) => setHitter(e.target.value as Shot['shotBy'])}
            >
              <option value="player">{match.player}</option>
              <option value="opponent">{match.opponent}</option>
            </select>
          </label>
          <p className="helper">
            Hitters alternate automatically after each added shot.
          </p>
          <div className="courtside-actions">
            <Button
              size="sm"
              variant="outline"
              disabled={!writable || !draft.length || editing !== null}
              onClick={undo}
            >
              Undo last shot
            </Button>
            <Button
              size="sm"
              disabled={
                !writable || !draft.length || !!location || points.length >= 500
              }
              onClick={() => setFinishOpen(true)}
            >
              Finish point
            </Button>
            <span aria-live="polite">{draft.length} / 100 shots</span>
          </div>
        </div>
        <div className="court-stage">
          <span className="court-end">OPPONENT’S END</span>
          <Court
            points={points}
            shots={shownShots}
            numbered={!!replay || draft.length > 0}
            activeIndex={replay ? step : draft.length - 1}
            selected={replay ? undefined : location}
            onSelect={writable ? place : undefined}
          />
          <span className="court-end">YOUR END</span>
        </div>
        <div className="court-legend">
          <span>
            <i className="dot won" /> {match.player} shots
          </span>
          <span>
            <i className="dot lost" /> {match.opponent} shots
          </span>
        </div>
        <p className="helper">
          Numbered connectors show landing order, not measured ball
          trajectories. Hitter positions are not tracked.
        </p>
        {replay && (
          <div className="replay-shot-list" aria-label="Recorded rally shots">
            {replayShots.map((s, i) => (
              <button
                key={i}
                aria-pressed={step === i}
                onClick={() => setStep(i)}
              >
                <b>{i + 1}</b> {name(s.shotBy)} · {s.shotType}
              </button>
            ))}
          </div>
        )}
      </section>
      <dialog
        ref={finishDialog}
        className="finish-dialog"
        aria-label="Finish point"
        onCancel={() => setFinishOpen(false)}
      >
        {finishOpen && finishControls}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => setFinishOpen(false)}
        >
          Back to rally
        </Button>
      </dialog>
      <aside className="logging-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SHOT BY SHOT · ONE POINT</span>
            <h2>Build a rally</h2>
          </div>
          <span className="count">{draft.length} shots</span>
        </div>
        {!canWrite || completed ? (
          <p className="helper">
            {completed
              ? 'This match is complete. The owner can reopen it to record rallies.'
              : 'Viewer access: watch saved rallies and observations. Only owners and coaches can record.'}
          </p>
        ) : (
          <p className="helper">
            Record the serve that starts play, then each return. Draft shots
            stay in this browser until you save the point.
          </p>
        )}
        <div className={`location-status ${location ? 'selected' : ''}`}>
          <Target size={18} />
          {location
            ? 'Shot location selected'
            : 'Select the next shot’s landing on the court'}
        </div>
        {(!quick || editing !== null) && (
          <Button
            className="w-full"
            disabled={
              !writable ||
              !location ||
              (draft.length >= 100 && editing === null)
            }
            onClick={() => addShot()}
          >
            {editing === null ? 'Add shot' : 'Update shot'}
            <Plus />
          </Button>
        )}
        {location && (
          <button
            className="text-link draft-cancel"
            disabled={!writable}
            onClick={() => {
              setLocation(undefined)
              setEditing(null)
              if (last)
                setHitter(last.shotBy === 'player' ? 'opponent' : 'player')
            }}
          >
            Cancel selected location
          </button>
        )}
        {draft.length > 0 && (
          <>
            <div className="draft-shot-list" aria-label="Draft rally shots">
              {draft.map((s, i) => (
                <div key={i}>
                  <b>{i + 1}</b>
                  <span>
                    {name(s.shotBy)}
                    <small>{s.shotType}</small>
                  </span>
                  <button
                    className="text-link"
                    disabled={!writable}
                    onClick={() => {
                      clearReplay()
                      setEditing(i)
                      setLocation({ x: s.x, y: s.y })
                      setType(s.shotType)
                      setHitter(s.shotBy)
                    }}
                  >
                    Edit shot {i + 1}
                  </button>
                </div>
              ))}
            </div>
            <div className="draft-actions">
              <button
                className="text-link"
                disabled={!writable}
                onClick={() => {
                  if (!window.confirm('Discard this unsaved rally?')) return
                  setDraft([])
                  setLocation(undefined)
                  setEditing(null)
                  setType('serve')
                  setHitter('player')
                  changed()
                }}
              >
                Discard rally
              </button>
            </div>
          </>
        )}
        {!finishOpen && finishControls}
        {!finishOpen && error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <p role="status" className="save-message">
          {message}
        </p>
      </aside>
    </div>
  )
}
