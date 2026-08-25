import { useState } from 'react'

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function ConversationReview({ session }) {
  const [exchangeIdx, setExchangeIdx] = useState(0)
  const exchanges = session.exchanges || []
  const ex = exchanges[exchangeIdx]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExchangeIdx((i) => Math.max(0, i - 1))}
          disabled={exchangeIdx === 0}
          className="min-h-[44px] px-3 rounded-control text-small font-semibold bg-primary-light text-primary-text disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          ◀ Previous
        </button>
        <span className="text-small text-ink-muted">Exchange {exchangeIdx + 1} of {exchanges.length}</span>
        <button
          onClick={() => setExchangeIdx((i) => Math.min(exchanges.length - 1, i + 1))}
          disabled={exchangeIdx >= exchanges.length - 1}
          className="min-h-[44px] px-3 rounded-control text-small font-semibold bg-primary-light text-primary-text disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Next ▶
        </button>
      </div>

      {ex && (
        <div className="bg-surface rounded-card shadow-sm border border-border p-6">
          <p className="text-ink-faint text-xs font-semibold mb-2">Exchange {exchangeIdx + 1}</p>

          <p className="text-success font-semibold mb-1 text-small">Claude:</p>
          <p className="text-ink mb-4 text-body">{ex.claudeResponse}</p>

          <p className="text-primary-text font-semibold mb-1 text-small">You:</p>
          {ex.errors && ex.errors.length > 0 ? (
            <p className="text-warn-text bg-warn-light rounded-control px-2 py-1 inline-block mb-3">{ex.userInput}</p>
          ) : (
            <p className="text-ink mb-3 text-body">{ex.userInput}</p>
          )}

          {ex.errors && ex.errors.length > 0 && (
            <div className="space-y-2 mb-3">
              {ex.errors.map((err, errIdx) => (
                <div key={errIdx} className="border-l-4 border-secondary bg-warn-light rounded-control p-3 text-small">
                  <p className="text-warn-text"><span className="font-semibold">You said:</span> "{err.userSaid}"</p>
                  <p className="text-success mt-1"><span className="font-semibold">Corrected:</span> "{err.corrected}"</p>
                  <p className="text-ink-muted mt-1">{err.explanation}</p>
                </div>
              ))}
            </div>
          )}

          {ex.feedback && <p className="text-ink-faint text-xs italic">💡 {ex.feedback}</p>}
        </div>
      )}
    </div>
  )
}

function ListeningReview({ session }) {
  const sentences = session.story?.sentences || []
  const questions = session.questions || []
  const userAnswers = session.userAnswers || {}

  return (
    <div className="space-y-6">
      <div>
        <p className="text-heading-2 text-ink mb-3">Story Transcript</p>
        <div className="bg-surface rounded-card shadow-sm border border-border p-6 space-y-3">
          {sentences.map((s, idx) => (
            <div key={idx}>
              <p className="text-ink text-body"><span className="text-ink-faint mr-2">{idx + 1}.</span>{s.spanish}</p>
              <p className="text-ink-muted text-small ml-5">{s.english}</p>
            </div>
          ))}
        </div>
      </div>

      {questions.length > 0 && (
        <div>
          <p className="text-heading-2 text-ink mb-3">Comprehension Check Results</p>
          <div className="space-y-3">
            {questions.map((q, qIdx) => {
              const selected = userAnswers[qIdx]
              const answered = selected !== undefined
              const selectedOption = answered ? q.options[selected] : null
              return (
                <div key={qIdx} className="bg-surface rounded-card shadow-sm border border-border p-4">
                  <p className="text-ink font-semibold mb-2">{qIdx + 1}. {q.question_spanish}</p>
                  {answered ? (
                    <div className={`rounded-control px-3 py-2 text-small ${selectedOption.correct ? 'bg-success-light text-success' : 'bg-warn-light text-warn-text'}`}>
                      {selectedOption.correct ? '✓ Correct: ' : '✗ Answered: '}{selectedOption.text}
                      {!selectedOption.correct && (
                        <span className="block mt-1">Correct answer: {q.options.find((o) => o.correct)?.text}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-ink-faint text-small italic">Not answered</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(session.vocabTotal || 0) > 0 && (
        <div>
          <p className="text-heading-2 text-ink mb-3">Vocabulary Matching Results</p>
          <div className="bg-surface rounded-card shadow-sm border border-border p-4">
            <p className="text-body text-ink mb-3">
              Matched <span className="font-semibold text-success">{session.vocabMatchedCount || 0}</span> of {session.vocabTotal} words
            </p>
            <div className="flex flex-wrap gap-2">
              {(session.matchingWords || []).map((w, idx) => (
                <span key={idx} className="text-small px-2 py-1 rounded-control bg-primary-light text-primary-text">
                  {w.word} → {w.english}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionReview({ session, onBack }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-4 pb-3 border-b border-border">
        <button
          onClick={onBack}
          className="min-h-[44px] text-small text-ink-muted hover:text-ink font-semibold px-2 rounded-control hover:bg-primary-light transition"
        >
          ← Back to History
        </button>
      </div>

      <div className="mb-6 bg-primary-light rounded-card px-4 py-3">
        <p className="text-heading-2 text-primary-text">{session.scenario}</p>
        <p className="text-small text-primary-text mt-1">
          {session.mode === 'conversation' ? '🗣️ Conversation' : '🎧 Listening'} · {formatDate(session.timestamp)} · {formatDuration(session.duration)}
        </p>
      </div>

      {session.mode === 'conversation' ? <ConversationReview session={session} /> : <ListeningReview session={session} />}
    </div>
  )
}
