import { useState, useEffect, useMemo } from 'react'
import { getAllSessions } from '../db'
import NavButton from './NavButton'

const PAGE_SIZE = 10

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function HistoryDashboard({ onSelectSession, onExit }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modeFilter, setModeFilter] = useState('all')
  const [scenarioFilter, setScenarioFilter] = useState('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    getAllSessions()
      .then((all) => {
        all.sort((a, b) => b.timestamp - a.timestamp)
        setSessions(all)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load session history:', err)
        setError('Could not load session history. IndexedDB may be unavailable in this browser.')
        setLoading(false)
      })
  }, [])

  const scenarioOptions = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.scenario))).sort(),
    [sessions]
  )

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false
      if (scenarioFilter !== 'all' && s.scenario !== scenarioFilter) return false
      return true
    })
  }, [sessions, modeFilter, scenarioFilter])

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE))
  const pageSessions = filteredSessions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const updateModeFilter = (value) => {
    setModeFilter(value)
    setPage(0)
  }
  const updateScenarioFilter = (value) => {
    setScenarioFilter(value)
    setPage(0)
  }

  const conversationCount = sessions.filter((s) => s.mode === 'conversation').length
  const listeningCount = sessions.filter((s) => s.mode === 'listening').length

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <NavButton icon="←" label="Back" onClick={onExit} title="Back" />
        <h2 className="text-heading-1 text-ink ml-2">📊 History</h2>
      </div>

      {loading && <p className="text-ink-muted text-body">Loading session history...</p>}

      {error && (
        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-primary-light rounded-card px-4 py-3 text-center">
              <p className="text-heading-1 text-primary-text">{sessions.length}</p>
              <p className="text-small text-primary-text">Total Sessions</p>
            </div>
            <div className="bg-surface border border-border rounded-card px-4 py-3 text-center">
              <p className="text-heading-1 text-ink">{conversationCount}</p>
              <p className="text-small text-ink-muted">Conversations</p>
            </div>
            <div className="bg-surface border border-border rounded-card px-4 py-3 text-center">
              <p className="text-heading-1 text-ink">{listeningCount}</p>
              <p className="text-small text-ink-muted">Listening</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'conversation', 'listening'].map((m) => (
              <button
                key={m}
                onClick={() => updateModeFilter(m)}
                className={`min-h-[44px] px-3 rounded-control text-small font-semibold transition ${
                  modeFilter === m ? 'bg-primary text-white' : 'bg-primary-light text-primary-text hover:bg-primary-light/70'
                }`}
              >
                {m === 'all' ? 'All Modes' : m === 'conversation' ? 'Conversation' : 'Listening'}
              </button>
            ))}
            {scenarioOptions.length > 0 && (
              <select
                value={scenarioFilter}
                onChange={(e) => updateScenarioFilter(e.target.value)}
                className="min-h-[44px] px-3 rounded-control text-small font-semibold bg-surface border border-border text-ink"
              >
                <option value="all">All Scenarios</option>
                {scenarioOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div className="bg-surface border border-border rounded-card p-6 text-center text-ink-muted text-body">
              No sessions yet — complete a Conversation or Listening session to see it here.
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pageSessions.map((s) => (
                <div key={s.id} className="bg-surface rounded-card shadow-sm border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-bold text-ink text-heading-2">{s.scenario}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                      s.mode === 'conversation' ? 'bg-primary-light text-primary-text' : 'bg-secondary-light text-secondary-text'
                    }`}>
                      {s.mode === 'conversation' ? '🗣️ Conversation' : '🎧 Listening'}
                    </span>
                  </div>
                  <p className="text-small text-ink-muted mb-2">
                    {formatDate(s.timestamp)} · {formatDuration(s.duration)}
                  </p>
                  <p className="text-small text-ink mb-3">
                    {s.mode === 'conversation'
                      ? `${s.exchanges?.length || 0} exchanges · ${s.errorCount || 0} corrections`
                      : `${s.mcqCorrectCount || 0}/${s.mcqTotal || 0} correct · ${s.vocabMatchedCount || 0}/${s.vocabTotal || 0} vocab matched`}
                  </p>
                  <button
                    onClick={() => onSelectSession(s)}
                    className="min-h-[44px] px-4 rounded-control text-small font-semibold bg-primary text-white hover:bg-primary-hover transition"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="min-h-[44px] px-3 rounded-control text-small font-semibold bg-primary-light text-primary-text disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="text-small text-ink-muted">Page {page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="min-h-[44px] px-3 rounded-control text-small font-semibold bg-primary-light text-primary-text disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
