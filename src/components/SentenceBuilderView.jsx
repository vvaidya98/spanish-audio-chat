import { useState, useMemo, useRef, useEffect } from 'react'
import { applySpanishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'
import { shuffle, playCorrectBeep, playWrongBeep } from '../quizUtils'
import ClickableSpanishText from './ClickableSpanishText'
import { tokenize } from './HoverableText'
import { useClickOutside } from '../useClickOutside'
import { SENTENCE_BUILDER_CONTENT, SENTENCE_BUILDER_DIFFICULTIES } from '../data/sentenceBuilderContent'

// SAC-103 Part 3: no auto-dismiss timer for wrong-answer feedback — it was
// disappearing too fast for the hint to actually be read (SAC-097's
// original HINT_DISPLAY_MS). It now stays up until the user dismisses it
// explicitly (an X control) or taps another option to retry (selecting any
// option — right or wrong — replaces whatever feedback is currently
// showing, so a retry tap always clears a stale wrong-answer message on
// its own, no separate "clear on retry" code path needed).
const CORRECT_ADVANCE_MS = 900

export default function SentenceBuilderView({ onBack }) {
  const [difficulty, setDifficulty] = useState(null)
  const [sentenceIdx, setSentenceIdx] = useState(0)
  const [slotIdx, setSlotIdx] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct: boolean } | null
  const [locked, setLocked] = useState(false)
  const [activeToken, setActiveToken] = useState(null)

  const advanceTimeoutRef = useRef(null)
  const speakTokenRef = useRef(0)
  const assembledRef = useRef(null)

  useClickOutside(assembledRef, () => setActiveToken(null), activeToken !== null)

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    }
  }, [])

  const sentences = useMemo(
    () => (difficulty ? SENTENCE_BUILDER_CONTENT.filter((s) => s.difficulty === difficulty) : []),
    [difficulty]
  )
  const currentSentence = sentences[sentenceIdx] || null

  // SAC-103 Part 1: quizzing walks the slot-type parts in ARRAY ORDER,
  // which is now, by construction, the actual Spanish sentence order —
  // there's no separate category-priority sort anymore (SAC-097's own
  // sort could genuinely diverge from real word order, e.g. quizzing a
  // verb before a noun that actually appears earlier in the sentence).
  const slotParts = useMemo(() => (currentSentence ? currentSentence.parts.filter((p) => p.type === 'slot') : []), [currentSentence])
  const isSentenceComplete = currentSentence ? slotIdx >= slotParts.length : false
  const currentSlot = !isSentenceComplete ? slotParts[slotIdx] : null

  const options = useMemo(() => (currentSlot ? shuffle(currentSlot.options) : []), [currentSlot])

  // SAC-103 Part 1: assembly is now just joining every part's fixed text
  // or slot correctAnswer in array order — no separate sentencePosition
  // bookkeeping needed, since array order already IS Spanish order.
  const assembledSpanish = useMemo(() => {
    if (!currentSentence) return ''
    return currentSentence.parts.map((p) => (p.type === 'fixed' ? p.text : p.correctAnswer)).join(' ')
  }, [currentSentence])

  // SAC-104 Part 3: which raw tokenize() chunk indices (of assembledSpanish)
  // come from a `fixed` part — used to keep fixed words grey once the
  // build-up row becomes the completed-sentence display. Reconstructed by
  // walking parts in order and tokenizing each part's own text/
  // correctAnswer exactly the way tokenize(assembledSpanish) would see it:
  // since assembledSpanish is just parts joined by a single space and none
  // of our authored part texts have leading/trailing whitespace, the
  // per-part chunk sequences concatenated with one whitespace chunk between
  // each part line up exactly with tokenizing the whole string at once.
  const mutedChunkIndices = useMemo(() => {
    const indices = new Set()
    if (!currentSentence) return indices
    let chunkIdx = 0
    currentSentence.parts.forEach((part, i) => {
      const text = part.type === 'fixed' ? part.text : part.correctAnswer
      const partChunks = tokenize(text)
      partChunks.forEach((c) => {
        if (part.type === 'fixed' && /[a-zà-ÿ]/i.test(c)) indices.add(chunkIdx)
        chunkIdx++
      })
      if (i < currentSentence.parts.length - 1) chunkIdx++ // the joining space
    })
    return indices
  }, [currentSentence])

  const resetForNewSentence = () => {
    setSlotIdx(0)
    setFeedback(null)
    setLocked(false)
    setActiveToken(null)
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
      // Replaces any existing feedback outright — a retry tap (right or
      // wrong) always clears a stale wrong-answer message on its own.
      setFeedback({ correct: false })
    }
  }

  const handleDismissHint = () => setFeedback(null)

  // SAC-105 Part 3: clears the CURRENT sentence's progress (answered
  // slots, wrong-answer feedback) without touching sentenceIdx at all —
  // deliberately the same reset logic handleSelectDifficulty/
  // handlePreviousSentence/handleNextSentence already use when landing on
  // a sentence fresh, just without the sentence-index change that comes
  // with those.
  const handleRestart = () => resetForNewSentence()

  // SAC-105 Part 4: Previous/Next are now always active regardless of
  // completion state (previously "Next sentence" only existed once a
  // sentence was fully solved) — boundary-clamped the same way
  // WordFlashcards.jsx's goPrev/goNext already do in this app (Math.max/
  // Math.min plus a matching `disabled` check on the button), not a new
  // pattern invented for this feature. Both always call
  // resetForNewSentence() so a destination sentence never carries over
  // partial progress from an earlier visit.
  const handlePreviousSentence = () => {
    setSentenceIdx((i) => Math.max(0, i - 1))
    resetForNewSentence()
  }
  const handleNextSentence = () => {
    setSentenceIdx((i) => Math.min(sentences.length - 1, i + 1))
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
          Pick a word for each blank in Spanish sentence order, then watch the full sentence come together.
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

      {/* SAC-105 Parts 3-4: persistent controls, always active regardless
          of whether the current sentence has been completed — Previous/
          Next are boundary-clamped the same way WordFlashcards.jsx's own
          Prev/Next already are elsewhere in this app (Math.max/Math.min
          plus a matching `disabled` check), and Restart clears only the
          current sentence's progress without navigating anywhere. */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handlePreviousSentence}
          disabled={sentenceIdx === 0}
          className="flex-1 min-h-[40px] rounded-control bg-secondary-light text-secondary-text text-small font-semibold hover:bg-secondary-light/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        <button
          onClick={handleRestart}
          title="Restart this sentence"
          className="min-h-[40px] px-4 rounded-control bg-surface border border-border text-ink-muted text-small font-semibold hover:bg-primary-light hover:text-primary-text transition"
        >
          🔄 Restart
        </button>
        <button
          onClick={handleNextSentence}
          disabled={isLastSentence}
          className="flex-1 min-h-[40px] rounded-control bg-primary text-white text-small font-semibold hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      <div className="mb-5 bg-surface rounded-card shadow-sm border border-border p-6">
        {/* SAC-104 Part 1: the English sentence highlights whichever word/
            phrase corresponds to the slot currently being quizzed — driven
            entirely by each slot's authored englishSpan (a word-index range
            into englishTokens), never a runtime substring search. This
            highlight moves in SPANISH quiz order, which often jumps around
            relative to English reading order — deliberately, to train the
            brain toward real Spanish word order (e.g. noun-then-adjective
            instead of English's adjective-then-noun). No highlight once the
            sentence is complete (there's no "current" slot anymore). */}
        <p className="text-heading-2 text-ink leading-relaxed">
          {currentSentence.englishTokens.map((tok, i) => {
            const inActiveSpan =
              !isSentenceComplete && currentSlot && i >= currentSlot.englishSpan[0] && i <= currentSlot.englishSpan[1]
            return (
              <span key={i} className={inActiveSpan ? 'bg-primary-light text-primary-text px-0.5 rounded' : ''}>
                {tok}
                {i < currentSentence.englishTokens.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </p>

        {!isSentenceComplete && (
          <>
            {/* SAC-104 Part 1: shrunk to a bare position indicator — the
                highlighted English word above now carries what the old
                restated-word caption used to say, so repeating it here
                would be redundant. */}
            <p className="text-small text-ink-muted mt-2">
              Word {slotIdx + 1} of {slotParts.length}
            </p>

            {feedback?.correct && (
              <div className="mt-4 bg-success-light rounded-control px-4 py-3 text-body font-semibold text-success text-center">
                ✓ Correct!
              </div>
            )}
            {feedback && !feedback.correct && (
              <div className="mt-4 bg-danger-light rounded-control px-4 py-3 text-small text-danger flex items-start gap-2">
                <p className="flex-1">{currentSlot.hint}</p>
                <button
                  onClick={handleDismissHint}
                  aria-label="Dismiss"
                  className="shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center text-danger hover:text-danger/70 transition"
                >
                  ✕
                </button>
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
        )}

        {/* SAC-104 Part 2: a single row shows the Spanish sentence's shape
            from the very first slot — fixed words in place (grey, Part 3),
            unanswered slots as blanks, the currently-active slot's blank
            synced with Part 1's English highlight above. Once every slot is
            answered, this SAME row becomes the final assembled sentence
            (word-click/save + audio) rather than showing a second, separate
            "assembled sentence" block — SAC-103's old completed-state
            display is folded into this one to avoid duplicating it. */}
        <p className="text-small font-semibold text-ink-muted mt-4 mb-1">
          {isSentenceComplete ? 'Your sentence:' : 'Building your sentence:'}
        </p>
        <div ref={assembledRef} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {isSentenceComplete ? (
            <>
              <p className="text-body break-words flex-1">
                <ClickableSpanishText
                  text={assembledSpanish}
                  lineId="assembled"
                  activeToken={activeToken}
                  onActiveTokenChange={setActiveToken}
                  mutedChunkIndices={mutedChunkIndices}
                  className="text-ink"
                />
              </p>
              <button
                onClick={playAssembled}
                title="Play this sentence"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg text-ink-faint hover:text-primary hover:bg-primary-light transition shrink-0"
              >
                🔊
              </button>
            </>
          ) : (
            (() => {
              let seenSlots = -1
              return currentSentence.parts.map((part, i) => {
                if (part.type === 'fixed') {
                  return (
                    <span key={i} className="text-body text-ink-faint">
                      {part.text}
                    </span>
                  )
                }
                seenSlots += 1
                const isAnswered = seenSlots < slotIdx
                const isActive = seenSlots === slotIdx
                if (isAnswered) {
                  return (
                    <span key={i} className="text-body text-ink font-semibold">
                      {part.correctAnswer}
                    </span>
                  )
                }
                const blankLen = Math.max(3, Math.min(part.correctAnswer.replace(/\s/g, '').length, 8))
                return (
                  <span
                    key={i}
                    className={
                      isActive
                        ? 'inline-block text-body bg-primary-light text-primary-text px-1.5 rounded border-b-2 border-primary'
                        : 'text-body text-ink-faint'
                    }
                  >
                    {'_'.repeat(blankLen)}
                  </span>
                )
              })
            })()
          )}
        </div>

        {isSentenceComplete && (
          <>
            {/* SAC-103 Part 6: baked into the content, shown automatically
                the instant the sentence is complete — no checkbox, no
                tap-to-fetch. Free to always show since it costs nothing
                extra at runtime, unlike Translate/Listening's live-fetched
                Grammar features. SAC-105 Part 2: each entry renders as its
                own bold-Spanish-term line rather than one flowing inline
                paragraph — see sentenceBuilderContent.js's own header
                comment for why this keeps the rich per-word explanatory
                text (verb endings, agreement reasoning, etc.) instead of
                collapsing it to a bare "word (gloss)" gloss the way
                Translate/Listening's terser shared format now does. */}
            <div className="mt-3 bg-success-light border border-border rounded-control px-3 py-2 text-small text-ink">
              <p className="mb-1 font-semibold text-success">💡 Grammar</p>
              {currentSentence.grammarExplanation.map((entry, i) => (
                <p key={i} className="mb-1 last:mb-0">
                  <span className="font-bold">{entry.spanish}</span> {entry.note}
                </p>
              ))}
            </div>

            {isLastSentence && (
              <p className="text-center text-small font-semibold text-primary-text mt-4">
                🎉 You've finished this tier!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
