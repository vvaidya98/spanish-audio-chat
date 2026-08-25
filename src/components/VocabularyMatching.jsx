import { useState, useRef, useEffect } from 'react'

const LETTERS = 'abcdefghij'.split('')
const WRONG_FLASH_MS = 1500

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

// Short buzz tone for a wrong match, synthesized via Web Audio API so no
// audio asset needs to ship with the app.
function playWrongBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = 800
    gain.gain.value = 0.08
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.2)
    oscillator.onended = () => ctx.close()
  } catch (err) {
    console.error('Could not play wrong-match sound:', err)
  }
}

export default function VocabularyMatching({ words, onProgressChange }) {
  const [englishOptions] = useState(() => shuffle(words.map((w, idx) => ({ ...w, wordIdx: idx }))))
  const [matched, setMatched] = useState(new Set())
  const [selectedWordIdx, setSelectedWordIdx] = useState(null)
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(null)
  const [wrongFlash, setWrongFlash] = useState(null) // { wordIdx, optionIdx } | null

  const wrongFlashTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
    }
  }, [])

  // Reporting progress from inside setMatched's updater (rather than here)
  // would call the parent's setState while this component is still
  // rendering/reconciling — React warns "Cannot update a component while
  // rendering a different component". An effect keyed on `matched` reports
  // after commit instead, which is the correct place for it.
  useEffect(() => {
    onProgressChange?.(matched.size, words.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched])

  const attemptMatch = (wordIdx, optionIdx) => {
    const isCorrect = englishOptions[optionIdx].wordIdx === wordIdx
    if (isCorrect) {
      setMatched((prev) => new Set(prev).add(wordIdx))
    } else {
      if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
      setWrongFlash({ wordIdx, optionIdx })
      playWrongBeep()
      wrongFlashTimeoutRef.current = setTimeout(() => setWrongFlash(null), WRONG_FLASH_MS)
    }
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
            const isWrong = wrongFlash?.wordIdx === idx
            return (
              <button
                key={idx}
                onClick={() => clickWord(idx)}
                disabled={isMatched}
                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-control border text-body transition-colors duration-200 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 ${
                  isMatched
                    ? 'bg-success-light border-success text-success cursor-default'
                    : isWrong
                      ? 'bg-danger-light border-danger text-danger'
                      : isSelected
                        ? 'bg-primary-light border-primary text-primary-text'
                        : 'bg-surface border-border hover:border-primary text-ink cursor-pointer'
                }`}
              >
                <span className="min-w-0 break-words">
                  <span className="text-ink-faint mr-2">{idx + 1}.</span>
                  {w.word}
                </span>
                {isMatched ? (
                  <span className="vocab-check shrink-0">✓</span>
                ) : isWrong ? (
                  <span className="vocab-x shrink-0">✗</span>
                ) : (
                  w.difficulty && (
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${DIFFICULTY_STYLES[w.difficulty] || ''}`}>
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
            const isWrong = wrongFlash?.optionIdx === idx
            return (
              <button
                key={idx}
                onClick={() => clickOption(idx)}
                disabled={isMatched}
                className={`w-full min-h-[44px] text-left px-3 py-2 rounded-control border text-body transition-colors duration-200 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                  isMatched
                    ? 'bg-success-light border-success text-success cursor-default'
                    : isWrong
                      ? 'bg-danger-light border-danger text-danger'
                      : isSelected
                        ? 'bg-primary-light border-primary text-primary-text'
                        : 'bg-surface border-border hover:border-primary text-ink cursor-pointer'
                }`}
              >
                <span className="text-ink-faint">{LETTERS[idx]}.</span>
                {opt.english}
                {isMatched && <span className="vocab-check ml-auto">✓</span>}
                {isWrong && <span className="vocab-x ml-auto">✗</span>}
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes vocabCheckIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes vocabXIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        .vocab-check { display: inline-block; animation: vocabCheckIn 0.3s ease; }
        .vocab-x { display: inline-block; animation: vocabXIn 0.2s ease; }
      `}</style>
    </div>
  )
}
