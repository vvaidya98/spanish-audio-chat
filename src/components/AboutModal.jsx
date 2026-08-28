import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { getAllSessions } from '../db'

const APP_VERSION = '1.0z'

// SAC-061/063/064: discreet Settings/Info surface, only reachable by clicking
// the version badge — deliberately not a footer/nav item, since this is dev
// cost-tracking info, not a user-facing feature.
export default function AboutModal({ isOpen, onClose }) {
  const [stats, setStats] = useState(null)
  const [sessionCount, setSessionCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
