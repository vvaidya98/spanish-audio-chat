import { useState } from 'react'
import { logEvent } from '../analytics'

const FORMSPREE_URL = import.meta.env.VITE_FORMSPREE_URL

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle, submitting, done, error
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || status === 'done' || !FORMSPREE_URL) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error')
      return
    }
    setStatus('submitting')
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error(`Formspree error: ${res.status}`)
      logEvent('email_signup', { email })
      setStatus('done')
    } catch (err) {
      console.error('Email signup failed:', err)
      setStatus('error')
    }
  }

  return (
    <div className="mb-6 bg-primary-light rounded-card px-4 py-4">
      <p className="text-ink font-semibold mb-1 text-small">📬 Want updates as new features ship?</p>
      <p className="text-primary-text text-small mb-3">Leave your email — no spam, just occasional progress notes.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 min-h-[44px] px-3 rounded-control border border-border text-body"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="min-h-[44px] px-4 rounded-control font-semibold bg-primary text-white hover:bg-primary-hover transition disabled:opacity-50"
        >
          {status === 'submitting' ? '...' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] px-3 rounded-control text-ink-muted hover:bg-primary/10 transition"
        >
          Skip
        </button>
      </form>
      {status === 'error' && <p className="text-danger text-small mt-2">Please enter a valid email, or check your connection.</p>}
    </div>
  )
}
