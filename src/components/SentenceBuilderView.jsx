import { useState, useMemo, useRef, useEffect } from 'react'
import { apiFetch } from '../api'
import { applySpanishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'
import { shuffle, playCorrectBeep, playWrongBeep } from '../quizUtils'
import ClickableSpanishText from './ClickableSpanishText'
import { ExplanationPanel, ExplanationLoading } from './ExplanationIcon'
import { useClickOutside } from '../useClickOutside'
import { SENTENCE_BUILDER_CONTENT, SENTENCE_BUILDER_DIFFICULTIES, CATEGORY_ORDER } from '../data/sentenceBuilderContent'

// SAC-097 Part 3.4: brief confirmation before auto-advancing to the next
// slot — deliberately NOT VocabularyMatching's own persistent "✓ Correct!
// + Save + Next" pattern, since the round's own spec explicitly asks for
// "briefly confirm, then advance" (an auto-timed transition), not a
// manual per-slot Next button. The tap/option/audio-feedback mechanism
// itself (shuffle, tones, disabled-while-locked) is still reused exactly
// from VocabularyMatching.jsx/quizUtils.js — only the post-correct-answer
// flow differs, because this round's spec explicitly asks for that
// difference.
const CORRECT_ADVANCE_MS = 900
// Longer than VocabularyMatching's 1200ms "Try again!" — a real per-slot
// grammar hint needs more reading time than a generic retry prompt.
const HINT_DISPLAY_MS = 2200

function sortSlots(slots) {
  return [...slots].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
}

// Word-boundary-aware highlight — NOT a raw substring search. A live check
// while authoring this round's content caught a real bug a substring
// approach would have shipped silently: "to" (a preposition slot's
// englishWord) matched inside "tonight" in one sentence, and matched TWO
// separate real words ("want to go to the beach") in another. Tokenizing
// both sides and matching whole word(s) avoids both failure modes.
function renderHighlightedEnglish(english, englishWord) {
  const stripPunct = (w) => w.replace(/[.,!?]+$/, '')
  const tokens = english.split(' ')
  const wordTokens = englishWord.split(' ')
  let matchStart = -1
  for (let i = 0; i <= tokens.length - wordTokens.length; i++) {
    let ok = true
    for (let j = 0; j < wordTokens.length; j++) {
      if (stripPunct(tokens[i + j]) !== wordTokens[j]) {
        ok = false
        break
      }
    }
    if (ok) {
      matchStart = i
      break
    }
  }
  if (matchStart === -1) return english

  const before = tokens.slice(0, matchStart).join(' ')
  const matched = tokens.slice(matchStart, matchStart + wordTokens.length).join(' ')
  const after = tokens.slice(matchStart + wordTokens.length).join(' ')
  return (
    <>
      {before ? before + ' ' : ''}
      <span className="font-bold text-primary-text bg-primary-light px-1 rounded-control">{matched}</span>
      {after ? ' ' + after : ''}
    </>
  )
}

export default function SentenceBuilderView({ onBack }) {
  const [difficulty, setDifficulty] = useState(null)
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [slotIdx, setSlotIdx] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null
  const [locked, setLocked] = useState(false)
  const [activeToken, setActiveToken] = useState(null)
  // null (not requested) | 'loading' | 'failed' | the explanation object —
  // same shape ExplanationPanel/ExplanationLoading already render
  // elsewhere, same on-demand tap-to-fetch pattern TranslationView used
  // before SAC-100 (a persistent checkbox doesn't fit here — there's only
  // ever one assembled sentence to explain at a time, not a multi-line
  // selector needing navigation-synced fetching).
  const [grammarState, setGrammarState] = useState(null)

  const retryTimeoutRef = useRef(null)
  const advanceTimeoutRef = useRef(null)
  const speakTokenRef = useRef(0)
  const assembledRef = useRef(null)

  useClickOutside(assembledRef, () => setActiveToken(null), activeToken !== null)

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  const sentences = useMemo(
    () => (difficulty ? SENTENCE_BUILDER_CONTENT.filter((s) => s.difficulty === difficulty) : []),
    [difficulty]
  )
  const currentSentence = sentences[sentenceIdx] || null
  const sortedSlots = useMemo(() => (currentSentence ? sortSlots(currentSentence.slots) : []), [currentSentence])
  const isSentenceComplete = currentSentence ? slotIdx >= sortedSlots.length : false
  const currentSlot = !isSentenceComplete ? sortedSlots[slotIdx] : null

  const options = useMemo(() => (currentSlot ? shuffle(currentSlot.options) : []), [currentSlot])

  // SAC-097 Part 1: constructed from each slot's sentencePosition plus the
  // sentence's own fixed/unslotted words, per the round's explicit spec —
  // not just displaying `spanish` directly, even though the two are
  // guaranteed identical for this Phase 1 content (verified word-by-word
  // while authoring it). The dev-only warning below is a real safety net,
  // not decoration: it would have caught the comma-attached-to-a-slotted-
  // word authoring bug found and fixed while building this round's content
  // (a slot's correctAnswer needs to exactly equal the tokenized word at
  // its position, or assembly silently produces the wrong sentence).
  const assembledSpanish = useMemo(() => {
    if (!currentSentence) return ''
    const spanishWords = currentSentence.spanish.split(' ')
    const bySlotPosition = {}
    currentSentence.slots.forEach((slot) => {
      bySlotPosition[slot.sentencePosition] = slot.correctAnswer
    })
    const assembled = spanishWords.map((w, i) => bySlotPosition[i] ?? w).join(' ')
    if (assembled !== currentSentence.spanish) {
      console.warn(`[SentenceBuilder] Assembly mismatch for "${currentSentence.id}": "${assembled}" vs "${currentSentence.spanish}"`)
    }
    return assembled
  }, [currentSentence])

  const resetForNewSentence = () => {
    setSlotIdx(0)
    setFeedback(null)
    setLocked(false)
    setGrammarState(null)
    setActiveToken(null)
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
  }

  const handleSelectDifficulty = (level) => {
    setDifficulty(level)
    setSentenceIdx(0)
    resetForNewSentence()
  }

  const handleChangeDifficulty = () => {
    setDifficulty(null)
    setSentenceIdx(0)
    resetForNewSentence()
  }

  const selectOption = (opt) => {
    if (locked) return
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)

    const isCorrect = opt === currentSlot.correctAnswer
    if (isCorrect) {
      setLocked(true)
      playCorrectBeep()
      setFeedback({ correct: true })
      advanceTimeoutRef.current = setTimeout(() => {
        setFeedback(null)
        setLocked(false)
        setSlotIdx((i) => i + 1)
      }, CORRECT_ADVANCE_MS)
    } else {
      playWrongBeep()
      setFeedback({ correct: false })
      retryTimeoutRef.current = setTimeout(() => setFeedback(null), HINT_DISPLAY_MS)
    }
  }

  const handleNextSentence = () => {
    setSentenceIdx((i) => i + 1)
    resetForNewSentence()
  }

  const playAssembled = () => {
    try {
      window.speechSynthesis.cancel()
      const token = ++speakTokenRef.current
      const utterance = new SpeechSynthesisUtterance(assembledSpanish)
      applySpanishVoice(utterance)
      setTimeout(() => {
        if (token !== speakTokenRef.current) return
        window.speechSynthesis.speak(utterance)
      }, SPEAK_START_DELAY_MS)
    } catch (err) {
      console.error('Could not play sentence audio:', err)
    }
  }

  const fetchGrammar = async () => {
    if (!assembledSpanish.trim()) return
    setGrammarState('loading')
    try {
      const response = await apiFetch('/api/generate-sentence-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: [assembledSpanish], difficulty: currentSentence.difficulty }),
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const data = await response.json()
      const explanation = (data.explanations || []).find((exp) => exp.sentenceIndex === 0)
      setGrammarState(explanation || 'failed')
    } catch (err) {
      console.error('Could not generate grammar explanation:', err)
      setGrammarState('failed')
    }
  }

  // ---- Difficulty selection screen ----
  if (!difficulty) {
    return (
      <div>
        <button
          onClick={onBack}
          className="min-h-[44px] mb-4 px-3 -ml-1 rounded-control text-primary-text font-semibold hover:bg-primary-light transition flex items-center gap-1"
        >
          ← Back
        </button>
        <p className="text-heading-1 text-ink mb-1">🧩 Build a Sentence</p>
        <p className="text-small text-ink-muted mb-5">
          Pick a word for each highlighted slot, then watch the full Spanish sentence come together.
        </p>
        <div className="grid gap-3">
          {SENTENCE_BUILDER_DIFFICULTIES.map((level) => (
            <button
              key={level}
              onClick={() => handleSelectDifficulty(level)}
              className="p-4 bg-surface border-2 border-border rounded-card shadow-sm hover:border-primary hover:shadow-md transition text-left"
            >
              <p className="font-bold text-ink text-heading-2">{level}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- No sentences for this tier (shouldn't happen with real content,
  // but a real, reachable state if content is ever trimmed) ----
  if (sentences.length === 0) {
    return (
      <div>
        <button onClick={handleChangeDifficulty} className="text-primary-text font-semibold mb-4">
          ← Choose a different difficulty
        </button>
        <p className="text-body text-ink-muted">No sentences available for this difficulty yet.</p>
      </div>
    )
  }

  const isLastSentence = sentenceIdx >= sentences.length - 1

  return (
    <div>
      <button
        onClick={onBack}
        className="min-h-[44px] mb-2 px-3 -ml-1 rounded-control text-primary-text font-semibold hover:bg-primary-light transition flex items-center gap-1"
      >
        ← Back
      </button>
      <button onClick={handleChangeDifficulty} className="block text-small text-ink-muted hover:text-ink transition mb-4">
        ← Change difficulty ({difficulty})
      </button>

      <p className="text-small text-ink-muted mb-1">
        Sentence {sentenceIdx + 1} of {sentences.length}
      </p>

      {/* SAC-097 Part 3.2: the English sentence stays visible throughout —
          only the highlighted word/phrase changes as slotIdx advances,
          via renderHighlightedEnglish. */}
      <div className="mb-5 bg-surface rounded-card shadow-sm border border-border p-6">
        <p className="text-heading-2 text-ink leading-relaxed">
          {currentSentence && renderHighlightedEnglish(currentSentence.english, currentSlot ? currentSlot.englishWord : '')}
        </p>

        {!isSentenceComplete ? (
          <>
            {feedback?.correct && (
              <div className="mt-4 bg-success-light rounded-control px-4 py-3 text-body font-semibold text-success text-center">
                ✓ Correct!
              </div>
            )}
            {feedback && !feedback.correct && (
              <div className="mt-4 bg-danger-light rounded-control px-4 py-3 text-small text-danger">
                {currentSlot.hint}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {options.map((opt, idx) => (
                <button
                  key={`${sentenceIdx}-${slotIdx}-${idx}`}
                  onClick={() => selectOption(opt)}
                  disabled={locked}
                  className="px-3 py-1 rounded-full border border-[#81c784] bg-[#e8f5e9] text-[#2e7d32] text-xs hover:bg-[#c8e6c9] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-small font-semibold text-ink-muted mb-1">Your sentence:</p>
            <div ref={assembledRef} className="flex items-start gap-2">
              <p className="text-body text-ink break-words flex-1">
                <ClickableSpanishText
                  text={assembledSpanish}
                  lineId="assembled"
                  activeToken={activeToken}
                  onActiveTokenChange={setActiveToken}
                />
              </p>
              <button
                onClick={playAssembled}
                title="Play this sentence"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg text-ink-faint hover:text-primary hover:bg-primary-light transition shrink-0"
              >
                🔊
              </button>
            </div>

            <div className="mt-3">
              {grammarState === null && (
                <button onClick={fetchGrammar} className="text-small text-ink-muted hover:text-ink transition">
                  💡 Grammar
                </button>
              )}
              {grammarState === 'loading' && <ExplanationLoading />}
              {grammarState === 'failed' && <ExplanationLoading failed />}
              {grammarState && grammarState !== 'loading' && grammarState !== 'failed' && (
                <ExplanationPanel explanation={grammarState} />
              )}
            </div>

            <button
              onClick={handleNextSentence}
              disabled={isLastSentence}
              className="w-full min-h-[44px] mt-4 rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLastSentence ? "🎉 You've finished this tier!" : 'Next sentence →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
