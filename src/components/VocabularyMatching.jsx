import { useState, useMemo, useRef, useEffect } from 'react'
import { applySpanishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'

const RETRY_MESSAGE_MS = 1200
// Small delay after a new word appears before its audio auto-plays, so the
// DOM has settled first.
const WORD_AUTOPLAY_DELAY_MS = 200
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

export default function VocabularyMatching({ words, onProgressChange, rate = 0.8 }) {
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => (DIFFICULTY_RANK[a.difficulty] ?? 1) - (DIFFICULTY_RANK[b.difficulty] ?? 1)),
    [words]
  )

  const [currentIdx, setCurrentIdx] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null
  const [locked, setLocked] = useState(false) // true once correct, until "Next" is clicked

  const options = useMemo(() => buildOptions(sortedWords, currentIdx), [sortedWords, currentIdx])
  const retryTimeoutRef = useRef(null)
  const speakTokenRef = useRef(0)

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    onProgressChange?.(currentIdx, sortedWords.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  const isComplete = currentIdx >= sortedWords.length
  const currentWord = !isComplete ? sortedWords[currentIdx] : null

  const playWord = (text) => {
    try {
      window.speechSynthesis.cancel()
      const token = ++speakTokenRef.current
      const utterance = new SpeechSynthesisUtterance(text)
      applySpanishVoice(utterance)
      utterance.rate = rate
      setTimeout(() => {
        if (token !== speakTokenRef.current) return
        window.speechSynthesis.speak(utterance)
      }, SPEAK_START_DELAY_MS)
    } catch (err) {
      console.error('Could not play word audio:', err)
    }
  }

  // Auto-play the word's audio as soon as it appears (not after the user
  // gets it right) — the user should hear it before they have to match it,
  // not as a reward afterward. Keyed on currentIdx only (not on feedback
  // state), so a wrong guess doesn't re-trigger a replay. The very first
  // word is the exception: it lands right as this section's UI first
  // appears, before the user has had a moment to read it — suppress that
  // one auto-play so it isn't racing the user's own attention. The 🔊 icon
  // still plays it on demand.
  useEffect(() => {
    if (isComplete || !currentWord) return
    if (currentIdx === 0) {
      console.log('[vocab] First word — audio suppressed')
      return
    }
    const timer = setTimeout(() => playWord(currentWord.word), WORD_AUTOPLAY_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  const selectOption = (option) => {
    if (locked) return
    const isCorrect = option.english === currentWord.english

    // A prior wrong guess may have scheduled a delayed setFeedback(null) to
    // auto-clear its "Try again!" message. If this new attempt is correct,
    // that stale timer must not be left pending — otherwise it fires later
    // and wipes out the persistent "✓ Correct!" state (and the Next button
    // with it), well after the user already succeeded.
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)

    if (isCorrect) {
      setLocked(true)
      playCorrectBeep()
      setFeedback({ correct: true })
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
            <div className="flex items-center justify-center gap-2">
              <p className="text-[1.25rem] leading-tight text-ink font-bold">{currentWord.word}</p>
              {currentWord.difficulty && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded ${DIFFICULTY_STYLES[currentWord.difficulty] || ''}`}>
                  {currentWord.difficulty}
                </span>
              )}
              <button
                onClick={() => playWord(currentWord.word)}
                title="Play this word"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-xl rounded-control text-primary hover:bg-primary-light transition"
              >
                🔊
              </button>
            </div>
          </div>

          {feedback?.correct && (
            <div className="mb-4 bg-success-light rounded-control px-4 py-3 text-small space-y-2">
              <p className="text-success font-semibold text-body">✓ Correct!</p>
              {currentWord.examplePhrase && (
                <div>
                  <p className="text-ink font-semibold">Example: {currentWord.examplePhrase}</p>
                  <p className="text-ink-muted italic">{currentWord.examplePhraseEnglish}</p>
                </div>
              )}
              {currentWord.exampleSentence && (
                <div>
                  <p className="text-ink font-semibold">{currentWord.exampleSentence}</p>
                  <p className="text-ink-muted italic">{currentWord.exampleSentenceEnglish}</p>
                </div>
              )}
              <button
                onClick={handleNext}
                className="w-full min-h-[44px] mt-2 rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
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

          <div className="flex flex-wrap gap-2 mb-5">
            {options.map((opt, idx) => (
              <button
                key={`${currentIdx}-${idx}`}
                onClick={() => selectOption(opt)}
                disabled={locked}
                className="px-3 py-1 rounded-full border border-[#81c784] bg-[#e8f5e9] text-[#2e7d32] text-xs hover:bg-[#c8e6c9] transition disabled:opacity-60 disabled:cursor-not-allowed"
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
