import { useEffect, useState } from 'react'
import { useQuery } from 'deepspace'
import { Button, Input } from '@/components/ui'
import { rallyAction, matchAction } from './api'

type Invite = {
  recordId: string
  data: { matchLabel: string; role: string; email: string; status: string }
}
export type Member = {
  TeamId: string
  UserId: string
  Status: string
  role: 'coach' | 'viewer'
  email: string
}
export function Invitations({ onAccept }: { onAccept: (id: string) => void }) {
  const [items, setItems] = useState<Invite[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function refresh() {
    try {
      setItems(
        (await rallyAction<{ records: Invite[] }>('pendingInvitations'))
          .records,
      )
      setError('')
    } catch {
      setError('Could not check invitations. Refresh to retry.')
    }
  }
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 15000)
    return () => clearInterval(timer)
  }, [])
  async function accept(id: string) {
    setBusy(true)
    try {
      const matchId = await matchAction('acceptInvitation', {
        invitationId: id,
      })
      await refresh()
      onAccept(matchId)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="invite-inbox" aria-label="Match invitations">
      <div className="section-heading">
        <span className="eyebrow">INVITATIONS</span>
        <button onClick={refresh} className="text-link">
          Refresh
        </button>
      </div>
      {items.map((i) => (
        <div className="inbox-item" key={i.recordId}>
          <strong>{i.data.matchLabel}</strong>
          <small>Invited as {i.data.role}</small>
          <Button size="sm" disabled={busy} onClick={() => accept(i.recordId)}>
            Accept invitation
          </Button>
        </div>
      ))}
      {!items.length && <small>No pending invitations</small>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
export function Sharing({
  id,
  members,
}: {
  id: string
  members: { recordId: string; data: Member }[]
}) {
  const invitations = useQuery<Invite['data']>('invitations', {
    where: { matchId: id, status: 'pending' },
    limit: 100,
  })
  const [email, setEmail] = useState(''),
    [role, setRole] = useState('coach'),
    [message, setMessage] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  async function run(action: string, params: object, success: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await rallyAction(action, params)
      setMessage(success)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="collaboration-section">
      <div className="section-heading">
        <div>
          <h2>Share your courtside view</h2>
          <p>Coaches can record points and observations. Viewers can follow.</p>
        </div>
      </div>
      <form
        className="share-form"
        onSubmit={(e) => {
          e.preventDefault()
          void run(
            'inviteParticipant',
            { matchId: id, email, role },
            'Invitation ready. Ask them to sign in and accept it in their workspace.',
          )
        }}
      >
        <label>
          Email address
          <Input
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@example.com"
          />
        </label>
        <label>
          Match role
          <select
            aria-label="Match role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="coach">Coach</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <Button type="submit" disabled={busy}>
          Create invitation
        </Button>
      </form>
      <p className="helper">
        No email is sent. Share this match’s URL with your invitee; they must
        sign in using this email and accept the invitation. Revocation stops
        future access; it cannot erase information already seen.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href)
            setMessage('Match link copied.')
          } catch {
            setError('Copy the match URL from your address bar.')
          }
        }}
      >
        Copy match link
      </Button>
      <div className="participant-list">
        {members
          .filter((m) => m.data.Status === 'active')
          .map((m) => (
            <div key={m.recordId}>
              <span>
                {m.data.email} <small>{m.data.role}</small>
              </span>
              <button
                disabled={busy}
                className="text-link"
                onClick={() =>
                  run(
                    'revokeParticipant',
                    { matchId: id, memberId: m.recordId },
                    'Access revoked.',
                  )
                }
              >
                Revoke access
              </button>
            </div>
          ))}
        {invitations.records.map((i) => (
          <div key={i.recordId}>
            <span>
              {i.data.email} <small>{i.data.role} · pending</small>
            </span>
            <button
              disabled={busy}
              className="text-link"
              onClick={() =>
                run(
                  'cancelInvitation',
                  { invitationId: i.recordId },
                  'Invitation cancelled.',
                )
              }
            >
              Cancel invitation
            </button>
          </div>
        ))}
      </div>
      {message && (
        <p role="status" className="save-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </section>
  )
}
export function Observations({
  id,
  canWrite,
}: {
  id: string
  canWrite: boolean
}) {
  const query = useQuery<{ text: string; author: string }>('observations', {
    where: { matchId: id },
    orderBy: 'createdAt',
    orderDir: 'desc',
    limit: 100,
  })
  const [text, setText] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <section className="collaboration-section">
      <h2>Courtside observations</h2>
      <p className="helper">
        Specific moments, shared with everyone authorized for this match.
      </p>
      {canWrite && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            try {
              await matchAction('addObservation', { matchId: id, text })
              setText('')
            } catch (e) {
              setError((e as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <label>
            New observation
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              required
              rows={2}
              placeholder="e.g. Backhand errors when stretched wide"
            />
          </label>
          <Button type="submit" disabled={busy || !text.trim()} size="sm">
            {busy ? 'Saving observation…' : 'Add observation'}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {query.error && (
        <p role="alert">Could not load observations. Refresh to retry.</p>
      )}
      {query.status === 'loading' && <p role="status">Loading observations…</p>}
      {query.status === 'ready' && !query.records.length && (
        <p className="helper">No observations yet.</p>
      )}
      {query.records.map((r) => (
        <article className="observation" key={r.recordId}>
          <p>{r.data.text}</p>
          <small>
            {r.data.author} · {new Date(r.createdAt).toLocaleString()}
          </small>
        </article>
      ))}
      {query.records.length >= 100 && (
        <p className="helper">Showing the latest 100 observations.</p>
      )}
    </section>
  )
}
