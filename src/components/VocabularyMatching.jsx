import { useState, useRef, useEffect } from 'react'

const LETTERS = 'abcdefghij'.split('')

const DIFFICULTY_STYLES = {
  easy: 'bg-primary-light text-primary-text',
  medium: 'bg-warn-light text-warn-text',
  hard: 'bg-secondary-light text-secondary-text',
}

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function VocabularyMatching({ words, onProgressChange }) {
  const [englishOptions] = useState(() => shuffle(words.map((w, idx) => ({ ...w, wordIdx: idx }))))
  const [matched, setMatched] = useState(new Set())
  const [selectedWordIdx, setSelectedWordIdx] = useState(null)
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null

  const feedbackTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  const showFeedback = (correct) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    setFeedback({ correct })
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 1200)
  }

  const attemptMatch = (wordIdx, optionIdx) => {
    const isCorrect = englishOptions[optionIdx].wordIdx === wordIdx
    if (isCorrect) {
      setMatched((prev) => {
        const next = new Set(prev).add(wordIdx)
        onProgressChange?.(next.size, words.length)
        return next
      })
    }
    showFeedback(isCorrect)
    setSelectedWordIdx(null)
    setSelectedOptionIdx(null)
  }

  const clickWord = (idx) => {
    if (matched.has(idx)) return
    if (selectedWordIdx === idx) {
      setSelectedWordIdx(null)
      return
    }
    setSelectedWordIdx(idx)
    if (selectedOptionIdx !== null) attemptMatch(idx, selectedOptionIdx)
  }

  const clickOption = (idx) => {
    if (matched.has(englishOptions[idx].wordIdx)) return
    if (selectedOptionIdx === idx) {
      setSelectedOptionIdx(null)
      return
    }
    setSelectedOptionIdx(idx)
    if (selectedWordIdx !== null) attemptMatch(selectedWordIdx, idx)
  }

  const allMatched = matched.size === words.length

  return (
    <div className="mb-8 bg-surface rounded-card shadow-sm border border-border p-6">
      <p className="text-heading-2 text-ink mb-1">Vocabulary Matching</p>
      <p className="text-small text-ink-muted mb-4">Match each Spanish word to its English meaning.</p>

      {feedback && (
        <div
          className={`mb-4 rounded-control px-4 py-2 text-body font-semibold transition ${
            feedback.correct ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
          }`}
        >
          {feedback.correct ? '✓ Correct!' : '✗ Try again'}
        </div>
      )}

      {allMatched && (
        <div className="mb-4 bg-success-light text-success rounded-control px-4 py-3 text-body font-semibold text-center">
          🎉 Great job! You matched all {words.length} words.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {words.map((w, idx) => {
            const isMatched = matched.has(idx)
            const isSelected = selectedWordIdx === idx
            return (
              <button
                key={idx}
                onClick={() => clickWord(idx)}
                disabled={isMatched}
                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-control border text-body transition flex items-center justify-between gap-2 ${
                  isMatched
                    ? 'bg-success-light border-success text-success cursor-default'
                    : isSelected
                      ? 'bg-primary-light border-primary text-primary-text'
                      : 'bg-surface border-border hover:border-primary text-ink cursor-pointer'
                }`}
              >
                <span>
                  <span className="text-ink-faint mr-2">{idx + 1}.</span>
                  {w.word}
                </span>
                {isMatched ? (
                  <span>✓</span>
                ) : (
                  w.difficulty && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_STYLES[w.difficulty] || ''}`}>
                      {w.difficulty}
                    </span>
                  )
                )}
              </button>
            )
          })}
        </div>
        <div className="space-y-2">
          {englishOptions.map((opt, idx) => {
            const isMatched = matched.has(opt.wordIdx)
            const isSelected = selectedOptionIdx === idx
            return (
              <button
                key={idx}
                onClick={() => clickOption(idx)}
                disabled={isMatched}
                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-control border text-body transition flex items-center gap-2 ${
                  isMatched
                    ? 'bg-success-light border-success text-success cursor-default'
                    : isSelected
                      ? 'bg-primary-light border-primary text-primary-text'
                      : 'bg-surface border-border hover:border-primary text-ink cursor-pointer'
                }`}
              >
                <span className="text-ink-faint">{LETTERS[idx]}.</span>
                {opt.english}
                {isMatched && <span className="ml-auto">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
