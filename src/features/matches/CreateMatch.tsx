import { useState, useRef, useEffect, type FormEvent } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { matchInput } from './model'
import { matchAction } from './api'

export function CreateMatch({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const lock = useRef(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (lock.current) return
    const data = Object.fromEntries(new FormData(e.currentTarget))
    const input = matchInput.safeParse(data)
    if (!input.success) {
      setError(input.error.issues[0].message)
      return
    }
    lock.current = true
    setSaving(true)
    setError('')
    try {
      onCreated(await matchAction('createMatch', input.data))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create match.')
    } finally {
      lock.current = false
      setSaving(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="modal-shade"
      aria-labelledby="create-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!saving) onClose()
      }}
    >
      <section className="create-modal">
        <div className="section-heading">
          <span className="eyebrow">A FRESH START</span>
          <button
            aria-label="Close new match"
            className="icon-button"
            disabled={saving}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <h2 id="create-title">Step onto the court.</h2>
        <p>Set up your match. You can pick up where you left off, anytime.</p>
        <form onSubmit={submit}>
          <label>
            Your player
            <Input
              name="player"
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. Alex Morgan"
            />
          </label>
          <label>
            Opponent
            <Input
              name="opponent"
              required
              maxLength={80}
              placeholder="e.g. Jordan Lee"
            />
          </label>
          <label>
            Opponent / match notes <span>(optional)</span>
            <textarea
              name="details"
              maxLength={500}
              placeholder="Left-handed, strong serve · club practice"
              rows={3}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Creating match…' : 'Create match'} <ArrowUpRight />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </form>
      </section>
    </dialog>
  )
}
