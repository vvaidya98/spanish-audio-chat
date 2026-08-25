import { useState, useMemo, useRef, useEffect } from 'react'

const ADVANCE_DELAY_MS = 600
const RETRY_MESSAGE_MS = 1200
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 }

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

function playTone(frequency, type, durationSec, volume) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + durationSec)
    oscillator.onended = () => ctx.close()
  } catch (err) {
    console.error('Could not play feedback sound:', err)
  }
}

const playCorrectBeep = () => playTone(880, 'sine', 0.15, 0.08)
const playWrongBeep = () => playTone(220, 'square', 0.2, 0.08)

// Builds a stable (per-word) set of 1 correct + up to 4 distractor options,
// drawn from the other words' English translations in this same list.
function buildOptions(words, wordIdx) {
  const correct = words[wordIdx]
  const others = words.filter((_, i) => i !== wordIdx)
  const distractorCount = Math.min(4, others.length)
  const distractors = shuffle(others).slice(0, distractorCount)
  return shuffle([correct, ...distractors])
}

export default function VocabularyMatching({ words, onProgressChange }) {
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => (DIFFICULTY_RANK[a.difficulty] ?? 1) - (DIFFICULTY_RANK[b.difficulty] ?? 1)),
    [words]
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null
  const [showExample, setShowExample] = useState(false)
  const [locked, setLocked] = useState(false) // true while auto-advance/example is pending

  const options = useMemo(() => buildOptions(sortedWords, currentIdx), [sortedWords, currentIdx])
  const advanceTimeoutRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    onProgressChange?.(currentIdx, sortedWords.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  const isComplete = currentIdx >= sortedWords.length
  const currentWord = !isComplete ? sortedWords[currentIdx] : null
  const hasExample = currentWord && (currentWord.examplePhrase || currentWord.exampleSentence)

  const selectOption = (option) => {
    if (locked) return
    const isCorrect = option.english === currentWord.english

    if (isCorrect) {
      setLocked(true)
      playCorrectBeep()
      setFeedback({ correct: true })

      if (hasExample) {
        setShowExample(true)
      }

      advanceTimeoutRef.current = setTimeout(() => {
        setFeedback(null)
        setShowExample(false)
        setLocked(false)
        setCurrentIdx((i) => i + 1)
      }, ADVANCE_DELAY_MS + (hasExample ? ADVANCE_DELAY_MS : 0))
    } else {
      playWrongBeep()
      setFeedback({ correct: false })
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = setTimeout(() => setFeedback(null), RETRY_MESSAGE_MS)
    }
  }

  return (
    <div className="mb-8 bg-surface rounded-card shadow-sm border border-border p-6">
      <p className="text-heading-2 text-ink mb-1">Vocabulary Matching</p>
      <p className="text-small text-ink-muted mb-4">Match each Spanish word to its English meaning.</p>

      {isComplete ? (
        <div className="bg-success-light text-success rounded-control px-4 py-3 text-body font-semibold text-center">
          🎉 Great job! You matched all {sortedWords.length} words.
        </div>
      ) : (
        <>
          <div className="text-center mb-5">
            {currentWord.difficulty && (
              <span className={`inline-block text-xs px-2 py-0.5 rounded mb-2 ${DIFFICULTY_STYLES[currentWord.difficulty] || ''}`}>
                {currentWord.difficulty}
              </span>
            )}
            <p className="text-heading-1 text-ink font-bold">{currentWord.word}</p>
          </div>

          {feedback && !showExample && (
            <div
              className={`mb-4 rounded-control px-4 py-2 text-body font-semibold text-center transition ${
                feedback.correct ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
              }`}
            >
              {feedback.correct ? '✓ Correct!' : 'Try again!'}
            </div>
          )}

          {showExample && (
            <div className="mb-4 bg-primary-light rounded-control px-4 py-3 text-small space-y-2">
              {currentWord.examplePhrase && (
                <div>
                  <p className="text-primary-text font-semibold">Example: {currentWord.examplePhrase}</p>
                  <p className="text-ink-muted italic">{currentWord.examplePhraseEnglish}</p>
                </div>
              )}
              {currentWord.exampleSentence && (
                <div>
                  <p className="text-primary-text font-semibold">{currentWord.exampleSentence}</p>
                  <p className="text-ink-muted italic">{currentWord.exampleSentenceEnglish}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {options.map((opt, idx) => (
              <button
                key={`${currentIdx}-${idx}`}
                onClick={() => selectOption(opt)}
                disabled={locked}
                className="min-h-[48px] px-4 py-2 rounded-control border border-border bg-surface hover:border-primary text-ink text-body transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {opt.english}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mt-2">
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(Math.min(currentIdx, sortedWords.length) / sortedWords.length) * 100}%` }}
          />
        </div>
        <p className="text-small text-ink-muted text-center mt-1">
          {Math.min(currentIdx, sortedWords.length)} of {sortedWords.length} matched
        </p>
      </div>
    </div>
  )
}
