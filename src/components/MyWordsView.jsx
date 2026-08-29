import { useState, useEffect, useMemo } from 'react'
import { getAllSavedWords, deleteWord } from '../db'
import WordFlashcards from './WordFlashcards'
import WordQuiz from './WordQuiz'

const SOURCE_LABELS = { manual: 'manual', tooltip: 'tooltip', translate: 'translate' }
const MIN_WORDS_FOR_REVIEW = 2

export default function MyWordsView({ onBack }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [screen, setScreen] = useState('list') // 'list' | 'setup' | 'flashcards' | 'quiz'
  const [format, setFormat] = useState('flashcards')
  const [direction, setDirection] = useState('es-en')
  // Bumped every time a fresh review session starts (including "Review
  // Again") and passed as WordQuiz/WordFlashcards' `key` — forces a real
  // remount so each session gets its own fresh shuffle/state rather than
  // reusing whatever the previous session left behind.
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => {
    let stale = false
    getAllSavedWords()
      .then((result) => {
        if (!stale) setWords(result)
      })
      .catch(console.error)
      .finally(() => {
        if (!stale) setLoading(false)
      })
    return () => {
      stale = true
    }
  }, [])

  const filteredWords = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return words
    return words.filter((w) => w.spanish.toLowerCase().includes(q) || w.english.toLowerCase().includes(q))
  }, [words, filter])

  const handleDelete = async (id) => {
    setWords((prev) => prev.filter((w) => w.id !== id))
    try {
      await deleteWord(id)
    } catch (err) {
      console.error('Could not delete word:', err)
    }
  }

  const startReview = () => {
    setSessionKey((k) => k + 1)
    setScreen(format)
  }

  const canReview = words.length >= MIN_WORDS_FOR_REVIEW

  if (screen === 'flashcards') {
    return <WordFlashcards key={sessionKey} words={words} direction={direction} onExit={() => setScreen('list')} />
  }

  if (screen === 'quiz') {
    return (
      <WordQuiz
        key={sessionKey}
        words={words}
        direction={direction}
        onExit={(action) => {
          if (action === 'again') {
            setSessionKey((k) => k + 1)
          } else {
            setScreen('list')
          }
        }}
      />
    )
  }

  if (screen === 'setup') {
    return (
      <div className="bg-surface rounded-card shadow-sm border border-border p-6">
        <button
          onClick={() => setScreen('list')}
          className="min-h-[44px] px-2 -ml-2 mb-3 text-small text-ink-muted hover:text-ink transition"
        >
          ← Back
        </button>
        <p className="text-heading-2 text-ink mb-4">Set up review</p>

        {/* SAC-093: plain native radio inputs, matching how this app's
            checkboxes are styled elsewhere (a bare <input>, no custom
            button-style treatment) — a visual simplification only, the
            underlying format/direction state is unchanged. */}
        <p className="text-small font-semibold text-ink mb-2">Format</p>
        <div className="flex flex-col gap-2 mb-4">
          <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
            <input type="radio" name="review-format" checked={format === 'flashcards'} onChange={() => setFormat('flashcards')} />
            Flashcards
          </label>
          <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
            <input type="radio" name="review-format" checked={format === 'quiz'} onChange={() => setFormat('quiz')} />
            Multiple Choice
          </label>
        </div>

        <p className="text-small font-semibold text-ink mb-2">Direction</p>
        <div className="flex flex-col gap-2 mb-6">
          <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
            <input type="radio" name="review-direction" checked={direction === 'es-en'} onChange={() => setDirection('es-en')} />
            Spanish → English
          </label>
          <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
            <input type="radio" name="review-direction" checked={direction === 'en-es'} onChange={() => setDirection('en-es')} />
            English → Spanish
          </label>
          <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
            <input type="radio" name="review-direction" checked={direction === 'mixed'} onChange={() => setDirection('mixed')} />
            Mixed
          </label>
        </div>

        <button
          onClick={startReview}
          className="w-full min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
        >
          Start
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="min-h-[44px] mb-4 px-3 -ml-1 rounded-control text-primary-text font-semibold hover:bg-primary-light transition flex items-center gap-1"
      >
        ← Back
      </button>

      <p className="text-heading-1 text-ink mb-4">🔖 My Words</p>

      <button
        onClick={() => setScreen('setup')}
        disabled={!canReview}
        className="w-full min-h-[44px] mb-2 rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Review
      </button>
      {!canReview && !loading && (
        <p className="text-small text-ink-muted text-center mb-4">Save at least 2 words to start a review session.</p>
      )}

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search your words..."
        className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 text-body text-ink mb-4 focus:outline-none focus:border-primary transition"
      />

      {loading ? (
        <p className="text-body text-ink-muted text-center">Loading...</p>
      ) : filteredWords.length === 0 ? (
        words.length === 0 ? (
          <div className="bg-surface border border-border rounded-card p-6 text-center text-ink-muted text-body">
            No saved words yet — tap the save icon on any word's tooltip, Quick Translate result, or the Translation page to add it here.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-card p-6 text-center text-ink-muted text-body">
            No words match "{filter}".
          </div>
        )
      ) : (
        <div className="space-y-2">
          {filteredWords.map((w) => (
            <div key={w.id} className="flex items-center gap-2 bg-surface border border-border rounded-control p-3">
              <div className="flex-1 min-w-0">
                <p className="text-body text-ink">
                  <span className="font-semibold">{w.spanish}</span> — {w.english}
                </p>
                <span className="inline-block text-xs px-2 py-0.5 rounded bg-primary-light text-primary-text mt-1">
                  {SOURCE_LABELS[w.source] || w.source}
                </span>
              </div>
              <button
                onClick={() => handleDelete(w.id)}
                title="Delete"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg text-ink-faint hover:text-danger transition"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
