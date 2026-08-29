import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { getAllSessions } from '../db'

const APP_VERSION = '1.2b'

// SAC-061/063/064: discreet Settings/Info surface, only reachable by clicking
// the version badge — deliberately not a footer/nav item, since this is dev
// cost-tracking info, not a user-facing feature.
export default function AboutModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null)
  const [sessionCount, setSessionCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // SAC-080: this app's only user-facing preference so far, so it lives in
  // this app's only settings-like surface even though its actual effect is
  // scoped to Listening Mode. Reads/writes the same localStorage key
  // ListeningStoryView.jsx reads once at mount — the two are siblings with
  // no direct prop link, so toggling here takes effect on that view's next
  // fresh mount (a new story or Regenerate), not instantly mid-session.
  const [keepScreenAwake, setKeepScreenAwake] = useState(() => {
    try {
      const saved = localStorage.getItem('keepScreenAwakeOnPlayback')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })

  const handleToggleKeepScreenAwake = (checked) => {
    setKeepScreenAwake(checked)
    try {
      localStorage.setItem('keepScreenAwakeOnPlayback', checked ? 'true' : 'false')
    } catch {
      // Storage unavailable (private mode, etc.) — the toggle still updates
      // for this modal session, it just won't persist.
    }
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    let stale = false
    setLoading(true)
    setError('')

    apiFetch('/api/usage-stats')
      .then((res) => res.json())
      .then((data) => {
        if (stale) return
        setStats(data)
      })
      .catch((err) => {
        if (stale) return
        console.error('Failed to load usage stats:', err)
        setError('Usage stats unavailable right now.')
      })
      .finally(() => {
        if (!stale) setLoading(false)
      })

    getAllSessions()
      .then((sessions) => {
        if (!stale) setSessionCount(sessions.length)
      })
      .catch((err) => console.error('Failed to load session count:', err))

    return () => {
      stale = true
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const trend = stats?.last7Days?.trendPercent
  const trendLabel =
    trend === null || trend === undefined
      ? null
      : `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}% from last week`

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[90%] max-w-sm bg-surface rounded-card shadow-lg p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-heading-2 text-ink">About Conversation Amigo</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-ink-faint hover:text-ink text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="bg-primary-light text-primary-text px-3 py-1 rounded-full text-small font-semibold">
            v{APP_VERSION}
          </span>
          <span className="text-small text-ink-muted">Status: Live</span>
        </div>

        <div className="mb-4 pb-4 border-b border-border">
          <label className="flex items-center gap-2 text-small text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={keepScreenAwake}
              onChange={(e) => handleToggleKeepScreenAwake(e.target.checked)}
            />
            Keep screen on during story playback
          </label>
          <p className="text-xs text-ink-faint mt-1">
            Prevents your screen from locking mid-story in Listening Mode. Not supported on all devices; applies the next time you start a story.
          </p>
        </div>

        {loading && <p className="text-small text-ink-muted">Loading usage stats...</p>}
        {error && <p className="text-small text-danger">{error}</p>}

        {!loading && !error && stats && (
          <>
            <div className="mb-4">
              <p className="text-small font-semibold text-ink mb-1">API Usage (Today)</p>
              <ul className="text-small text-ink-muted space-y-0.5">
                <li>
                  Calls: <span className="text-primary-text font-semibold">{stats.today.calls}</span>
                </li>
                <li>
                  Tokens: <span className="text-primary-text font-semibold">{stats.today.tokens.toLocaleString()}</span>
                </li>
                <li>
                  Cost: <span className="text-primary-text font-semibold">~${stats.today.cost.toFixed(4)}</span>
                </li>
              </ul>
            </div>

            <div className="mb-4">
              <p className="text-small font-semibold text-ink mb-1">Weekly Average</p>
              <ul className="text-small text-ink-muted space-y-0.5">
                <li>
                  ~$<span className="text-primary-text font-semibold">{stats.last7Days.avgPerDay.toFixed(4)}</span>/day
                </li>
                {trendLabel && <li>Trend: {trendLabel}</li>}
              </ul>
            </div>

            <div className="mb-4">
              <p className="text-small text-ink-muted">
                Total Sessions: <span className="text-primary-text font-semibold">{sessionCount ?? '—'}</span>
              </p>
            </div>

            {stats.breakdown.length > 0 && (
              <div>
                <p className="text-small font-semibold text-ink mb-1">Breakdown by Feature</p>
                <ul className="text-small text-ink-muted space-y-0.5">
                  {stats.breakdown.map((b) => (
                    <li key={b.feature}>
                      {b.feature}: <span className="text-primary-text font-semibold">${b.cost.toFixed(4)}</span> ({b.percent}%)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
