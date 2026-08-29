import { useState, useMemo } from 'react'
import { shuffle } from '../quizUtils'

// direction: 'es-en' | 'en-es' | 'mixed'
export default function WordFlashcards({ words, direction, onExit }) {
  // Shuffled once at session start; for "mixed," each card's own front/back
  // direction is assigned here too — not on every flip — so flipping back
  // and forth on the same card never changes which side is which.
  const sessionWords = useMemo(() => {
    return shuffle(words).map((w) => ({
      ...w,
      cardDirection: direction === 'mixed' ? (Math.random() < 0.5 ? 'es-en' : 'en-es') : direction,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const currentWord = sessionWords[currentIdx]
  const frontText = currentWord.cardDirection === 'es-en' ? currentWord.spanish : currentWord.english
  const backText = currentWord.cardDirection === 'es-en' ? currentWord.english : currentWord.spanish

  const goPrev = () => {
    setFlipped(false)
    setCurrentIdx((i) => Math.max(0, i - 1))
  }
  const goNext = () => {
    setFlipped(false)
    setCurrentIdx((i) => Math.min(sessionWords.length - 1, i + 1))
  }

  return (
    <div className="bg-surface rounded-card shadow-sm border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onExit}
          className="min-h-[44px] px-2 -ml-2 text-small text-ink-muted hover:text-ink transition"
        >
          ← Back to My Words
        </button>
        <p className="text-small text-ink-muted">
          {currentIdx + 1} / {sessionWords.length}
        </p>
      </div>

      {/* Standard 3D flip-card pattern: a fixed-height perspective wrapper,
          an inner face that rotates, and two absolutely-positioned faces
          each hidden via backface-visibility once rotated away — plain CSS,
          no animation library needed. */}
      <div
        className="relative min-h-[180px] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-card border border-border p-6 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-heading-2 text-ink">{frontText}</span>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-card border border-border bg-primary-light p-6 text-center"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-heading-2 text-ink">{backText}</span>
          </div>
        </div>
      </div>
      <p className="text-small text-ink-faint text-center mt-2">Tap the card to flip</p>

      <div className="flex gap-2 mt-4">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0}
          className="flex-1 min-h-[44px] rounded-control bg-secondary-light text-secondary-text font-semibold hover:bg-secondary-light/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <button
          onClick={goNext}
          disabled={currentIdx === sessionWords.length - 1}
          className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
