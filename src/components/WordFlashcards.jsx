import { useState, useMemo, useRef, useEffect } from 'react'
import { shuffle } from '../quizUtils'
import { updateWordExample } from '../db'
import { apiFetch } from '../api'

// SAC-093: minimum horizontal movement (px) before a touch is treated as a
// swipe rather than a tap — small enough to feel responsive, large enough
// to not misfire on a tap or minor scroll jitter.
const SWIPE_THRESHOLD_PX = 50

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
  // SAC-093: keyed by word id — 'loading' while a fetch is in flight, an
  // { exampleSentence, exampleSentenceEnglish } object once it resolves, or
  // 'failed' if it errored (shown as no example at all, never blocking the
  // card). Separate from each word's own possibly-already-cached fields on
  // the record itself, which are checked first before ever fetching.
  const [exampleCache, setExampleCache] = useState({})
  const touchStartRef = useRef(null)

  const currentWord = sessionWords[currentIdx]
  const frontIsSpanish = currentWord.cardDirection === 'es-en'
  const frontText = frontIsSpanish ? currentWord.spanish : currentWord.english
  const backText = frontIsSpanish ? currentWord.english : currentWord.spanish

  const goPrev = () => {
    setFlipped(false)
    setCurrentIdx((i) => Math.max(0, i - 1))
  }
  const goNext = () => {
    setFlipped(false)
    setCurrentIdx((i) => Math.min(sessionWords.length - 1, i + 1))
  }

  // SAC-093: English-to-Spanish only, per the round's explicit intent
  // (recalling Spanish from English is the harder direction worth the
  // extra context) — fetches once per word, the moment its card is
  // flipped, and persists the result back to IndexedDB so a later review
  // of the same word never re-fetches it.
  useEffect(() => {
    if (!flipped) return
    if (currentWord.cardDirection !== 'en-es') return
    if (currentWord.exampleSentence) return
    if (exampleCache[currentWord.id]) return

    let stale = false
    setExampleCache((prev) => ({ ...prev, [currentWord.id]: 'loading' }))

    ;(async () => {
      try {
        const response = await apiFetch('/api/generate-word-example', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spanish: currentWord.spanish, english: currentWord.english }),
        })
        if (!response.ok) throw new Error(`status ${response.status}`)
        const data = await response.json()
        if (stale) return
        setExampleCache((prev) => ({ ...prev, [currentWord.id]: data }))
        updateWordExample(currentWord.id, data).catch(console.error)
      } catch (err) {
        if (stale) return
        console.error('Could not generate word example:', err)
        setExampleCache((prev) => ({ ...prev, [currentWord.id]: 'failed' }))
      }
    })()

    return () => {
      stale = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, currentIdx])

  const cachedExample = exampleCache[currentWord.id]
  const example = currentWord.exampleSentence
    ? { exampleSentence: currentWord.exampleSentence, exampleSentenceEnglish: currentWord.exampleSentenceEnglish }
    : cachedExample && cachedExample !== 'loading' && cachedExample !== 'failed'
      ? cachedExample
      : null
  const exampleLoading = cachedExample === 'loading'
  const showExample = flipped && currentWord.cardDirection === 'en-es'

  // SAC-093: plain touch tracking, no gesture library — additive alongside
  // the existing tap-to-flip (onClick on the same element still fires
  // normally for a near-zero-movement touch, since touchend never calls
  // preventDefault here). At the first/last card, goPrev/goNext already
  // no-op past the boundary (Math.max/min), matching the disabled buttons'
  // own behavior — nothing extra needed here for that case.
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e) => {
    if (touchStartRef.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartRef.current
    touchStartRef.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    if (delta < 0) goNext()
    else goPrev()
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
          no animation library needed. Height raised from 180px to 240px to
          comfortably fit the larger word (SAC-093 Part 4) plus an optional
          example sentence without a layout jump when one loads in. */}
      <div
        className="relative min-h-[240px] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 transition-transform duration-300"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-card border border-border p-6 text-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-[2.25rem] font-bold text-ink break-words">
              {frontIsSpanish ? '🇪🇸' : '🇬🇧'} {frontText}
            </span>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-card border border-border bg-primary-light p-6 text-center overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-[2.25rem] font-bold text-ink break-words">
              {frontIsSpanish ? '🇬🇧' : '🇪🇸'} {backText}
            </span>
            {showExample && (
              <div className="text-small">
                {exampleLoading ? (
                  <p className="text-ink-faint italic">Loading example…</p>
                ) : example ? (
                  <>
                    <p className="text-ink italic">{example.exampleSentence}</p>
                    <p className="text-ink-faint italic">{example.exampleSentenceEnglish}</p>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-small text-ink-faint text-center mt-2">Tap or swipe the card</p>

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
