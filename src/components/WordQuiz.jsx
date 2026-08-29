import { useState, useMemo, useRef, useEffect } from 'react'
import { shuffle, playCorrectBeep, playWrongBeep } from '../quizUtils'
import { updateWordReviewStats } from '../db'

const RETRY_MESSAGE_MS = 1200

// SAC-090: 1 correct + up to 3 distractors (4 options total) — explicitly a
// smaller total than VocabularyMatching's own up-to-5, per this feature's
// own spec. Same "exclude the correct word's own index from the distractor
// pool" structure as VocabularyMatching's buildOptions, so a distractor can
// never coincide with the correct answer.
function buildQuizOptions(words, wordIdx) {
  const correct = words[wordIdx]
  const others = words.filter((_, i) => i !== wordIdx)
  const distractorCount = Math.min(3, others.length)
  const distractors = shuffle(others).slice(0, distractorCount)
  return shuffle([correct, ...distractors])
}

// direction: 'es-en' | 'en-es' | 'mixed'
export default function WordQuiz({ words, direction, onExit }) {
  // Shuffled once at session start; for "mixed," each word's own quiz
  // direction is also assigned here — not per-render — so it can't change
  // mid-session.
  const sessionWords = useMemo(() => {
    return shuffle(words).map((w) => ({
      ...w,
      cardDirection: direction === 'mixed' ? (Math.random() < 0.5 ? 'es-en' : 'en-es') : direction,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null
  const [locked, setLocked] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const retryTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  const isComplete = currentIdx >= sessionWords.length
  const currentWord = !isComplete ? sessionWords[currentIdx] : null

  const options = useMemo(() => {
    if (isComplete) return []
    return buildQuizOptions(sessionWords, currentIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, isComplete])

  const frontText = currentWord ? (currentWord.cardDirection === 'es-en' ? currentWord.spanish : currentWord.english) : null
  const optionText = (w) => (currentWord?.cardDirection === 'es-en' ? w.english : w.spanish)

  const selectOption = (option) => {
    if (locked) return
    const isCorrect = option.id === currentWord.id

    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    updateWordReviewStats(currentWord.id, isCorrect).catch(console.error)

    if (isCorrect) {
      setLocked(true)
      playCorrectBeep()
      setFeedback({ correct: true })
      setCorrectCount((c) => c + 1)
    } else {
      playWrongBeep()
      setFeedback({ correct: false })
      retryTimeoutRef.current = setTimeout(() => setFeedback(null), RETRY_MESSAGE_MS)
    }
  }

  const handleNext = () => {
    setFeedback(null)
    setLocked(false)
    setCurrentIdx((i) => i + 1)
  }

  if (isComplete) {
    return (
      <div className="bg-surface rounded-card shadow-sm border border-border p-6 text-center">
        <p className="text-heading-2 text-ink mb-2">Session complete</p>
        <p className="text-body text-ink-muted mb-5">
          You got {correctCount} of {sessionWords.length} correct.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onExit('again')}
            className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Review Again
          </button>
          <button
            onClick={() => onExit('list')}
            className="flex-1 min-h-[44px] rounded-control bg-secondary-light text-secondary-text font-semibold hover:bg-secondary-light/70 transition"
          >
            Back to My Words
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-card shadow-sm border border-border p-6">
      <p className="text-small text-ink-muted text-center mb-3">
        {currentIdx + 1} of {sessionWords.length}
      </p>
      <p className="text-[1.25rem] leading-tight text-ink font-bold text-center mb-1">{frontText}</p>
      <p className="text-small text-ink-muted text-center mb-4">{correctCount} correct so far</p>

      {feedback?.correct && (
        <div className="mb-4 bg-success-light rounded-control px-4 py-3 text-center">
          <p className="text-success font-semibold text-body mb-2">✓ Correct!</p>
          <button
            onClick={handleNext}
            className="w-full min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Next →
          </button>
        </div>
      )}
      {feedback && !feedback.correct && (
        <div className="mb-4 rounded-control px-4 py-2 text-body font-semibold text-center bg-danger-light text-danger transition">
          Try again!
        </div>
      )}

      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => selectOption(opt)}
            disabled={locked}
            className="min-h-[44px] px-4 rounded-control border border-border bg-surface text-ink text-left hover:bg-primary-light transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {optionText(opt)}
          </button>
        ))}
      </div>
    </div>
  )
}
