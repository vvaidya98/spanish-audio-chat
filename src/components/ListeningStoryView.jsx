import { useState, useRef, useEffect } from 'react'
import HoverableText from './HoverableText'
import ListeningHeader from './ListeningHeader'
import VocabularyMatching from './VocabularyMatching'
import EmailCapture from './EmailCapture'
import LoadingSpinner from './LoadingSpinner'
import { saveSession, generateSessionId } from '../db'
import { logEvent } from '../analytics'
import { apiFetch } from '../api'

const SENTENCE_GAP_MS = 1300

export default function ListeningStoryView({ scenario, onBack, onChangeMode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [story, setStory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionsVocab, setQuestionsVocab] = useState([])
  const [matchingWords, setMatchingWords] = useState([])
  const [playStatus, setPlayStatus] = useState('idle') // idle, playing, gap, paused, finished
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rate, setRate] = useState(0.5)
  const [userAnswers, setUserAnswers] = useState({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [showMCQ, setShowMCQ] = useState(false)
  const [transcriptPlayingIdx, setTranscriptPlayingIdx] = useState(null)
  const [openTranslationIdx, setOpenTranslationIdx] = useState(null)
  const [vocabMatchedCount, setVocabMatchedCount] = useState(0)
  const [autoplayFailed, setAutoplayFailed] = useState(false)

  const synthRef = useRef(null)
  const indexRef = useRef(0)
  const rateRef = useRef(0.5)
  const pausedRef = useRef(false)
  const pauseContextRef = useRef(null) // 'mid-sentence' | 'gap'
  const gapTimeoutRef = useRef(null)
  const sentencesRef = useRef([])
  const sessionStartRef = useRef(Date.now())
  // Track how far into the current sentence playback has progressed, so a
  // mid-sentence speed change or resume can continue from roughly that point
  // instead of restarting the whole sentence.
  const speakOffsetRef = useRef(0)
  const lastWordCharIndexRef = useRef(0)
  // Every utterance we speak is tagged with the current token. cancel()ing an
  // utterance doesn't reliably suppress its onend/onerror in every browser —
  // some fire onend anyway, which used to cause a stray extra "advance to
  // next sentence" timer alongside the real one (audible as skipped/repeated
  // sentences after rapid speed changes). Handlers check their captured token
  // against the ref before doing anything, so a stale utterance's late event
  // is a no-op once something newer has superseded it.
  const utteranceTokenRef = useRef(0)

  useEffect(() => {
    synthRef.current = window.speechSynthesis
    let stale = false
    loadStory(() => stale)

    return () => {
      stale = true
      if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
      if (synthRef.current) synthRef.current.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // isStale() guards against React StrictMode's dev-mode double-invoke of this
  // effect (mount -> cleanup -> mount): without it, two independent loadStory()
  // calls both eventually call speakSentenceAt(0), racing each other and
  // producing audible word repetition/stutter at story start.
  const loadStory = async (isStale, regenerate = false) => {
    setLoading(true)
    setError('')

    try {
      const storyResponse = await apiFetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, regenerate }),
      })
      if (!storyResponse.ok) {
        const errorData = await storyResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${storyResponse.status}`)
      }
      const storyData = await storyResponse.json()
      if (isStale()) return
      setStory(storyData)
      sentencesRef.current = storyData.sentences || []

      const storyText = (storyData.sentences || []).map((s) => s.spanish).join(' ')
      const questionsResponse = await apiFetch('/api/story-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, story_text: storyText }),
      })
      if (!questionsResponse.ok) {
        const errorData = await questionsResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${questionsResponse.status}`)
      }
      const questionsData = await questionsResponse.json()
      if (isStale()) return
      setQuestions(questionsData.questions || [])
      setQuestionsVocab(questionsData.vocabulary || [])
      setMatchingWords(questionsData.matchingWords || [])

      setLoading(false)
      logEvent('session_started', { mode: 'listening', scenario })
      setTimeout(() => {
        if (isStale()) return
        setAutoplayFailed(false)
        speakSentenceAt(0)
        // Autoplay policies (notably mobile Safari) can silently reject a
        // speak() call that isn't inside a direct user-gesture handler —
        // no error fires, speech just never starts. Detect that by checking
        // whether the engine actually reports itself speaking shortly after;
        // if not, surface a "Tap to Play" fallback the user can trigger
        // directly instead of leaving playback silently stuck.
        setTimeout(() => {
          if (isStale()) return
          // gapTimeoutRef being set means a real onend already fired and the
          // engine is legitimately resting between sentences — not a stall.
          // Only flag failure if speech never started at all.
          if (synthRef.current && !synthRef.current.speaking && !pausedRef.current && !gapTimeoutRef.current) {
            setAutoplayFailed(true)
            setPlayStatus('idle')
          }
        }, 900)
      }, 300)
    } catch (err) {
      if (isStale()) return
      console.error('Error loading story:', err)
      setError(`Error: ${err.message}. Please check your backend is running.`)
      setLoading(false)
    }
  }

  // Shared onend behavior for the main sequential playback: pause briefly,
  // then move on to the next sentence.
  const handleSentenceUtteranceEnd = (idx) => {
    if (pausedRef.current) return
    setPlayStatus('gap')
    gapTimeoutRef.current = setTimeout(() => {
      if (!pausedRef.current) speakSentenceAt(idx + 1)
    }, SENTENCE_GAP_MS)
  }

  const speakSentenceAt = (idx) => {
    const sentences = sentencesRef.current
    if (idx >= sentences.length) {
      setPlayStatus('finished')
      return
    }

    indexRef.current = idx
    setCurrentIndex(idx)
    setPlayStatus('playing')
    speakOffsetRef.current = 0
    lastWordCharIndexRef.current = 0

    const token = ++utteranceTokenRef.current
    const utterance = new SpeechSynthesisUtterance(sentences[idx].spanish)
    utterance.lang = 'es-ES'
    utterance.rate = rateRef.current
    utterance.pitch = 1
    utterance.onboundary = (e) => {
      if (token !== utteranceTokenRef.current) return
      if (e.name === 'word') lastWordCharIndexRef.current = e.charIndex
    }
    utterance.onend = () => {
      if (token !== utteranceTokenRef.current) return
      handleSentenceUtteranceEnd(idx)
    }
    utterance.onerror = () => {
      if (token !== utteranceTokenRef.current) return
      handleSentenceUtteranceEnd(idx)
    }

    synthRef.current.cancel()
    synthRef.current.speak(utterance)
  }

  // Shared by mid-play speed changes and resuming from a pause: speaks only
  // the not-yet-heard remainder of the current sentence (tracked via
  // onboundary word-position events), rather than restarting it.
  const resumeSentenceFromBoundary = (rateOverride) => {
    const fullText = sentencesRef.current[indexRef.current]?.spanish || ''
    const resumeFrom = speakOffsetRef.current + lastWordCharIndexRef.current
    const remainingText = fullText.slice(resumeFrom).trim()

    const token = ++utteranceTokenRef.current
    synthRef.current.cancel()

    if (!remainingText) {
      handleSentenceUtteranceEnd(indexRef.current)
      return
    }

    speakOffsetRef.current = resumeFrom
    lastWordCharIndexRef.current = 0

    const idx = indexRef.current
    const utterance = new SpeechSynthesisUtterance(remainingText)
    utterance.lang = 'es-ES'
    utterance.rate = rateOverride ?? rateRef.current
    utterance.pitch = 1
    utterance.onboundary = (e) => {
      if (token !== utteranceTokenRef.current) return
      if (e.name === 'word') lastWordCharIndexRef.current = e.charIndex
    }
    utterance.onend = () => {
      if (token !== utteranceTokenRef.current) return
      handleSentenceUtteranceEnd(idx)
    }
    utterance.onerror = () => {
      if (token !== utteranceTokenRef.current) return
      handleSentenceUtteranceEnd(idx)
    }

    synthRef.current.speak(utterance)
  }

  const handleRegenerateStory = () => {
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    pausedRef.current = false
    pauseContextRef.current = null
    utteranceTokenRef.current++
    if (synthRef.current) synthRef.current.cancel()

    setPlayStatus('idle')
    setCurrentIndex(0)
    setUserAnswers({})
    setShowMCQ(false)
    setShowTranscript(false)
    setVocabMatchedCount(0)
    setAutoplayFailed(false)

    loadStory(() => false, true)
  }

  const handleTapToPlay = () => {
    setAutoplayFailed(false)
    speakSentenceAt(0)
  }

  const handlePlayPause = () => {
    if (playStatus === 'idle') {
      setAutoplayFailed(false)
      speakSentenceAt(0)
    } else if (playStatus === 'playing') {
      // cancel() (not the native pause()) so playback stops immediately and
      // reliably — speechSynthesis.pause() is known to sometimes let the
      // current utterance finish before actually pausing in real browsers.
      pausedRef.current = true
      pauseContextRef.current = 'mid-sentence'
      utteranceTokenRef.current++
      synthRef.current.cancel()
      setPlayStatus('paused')
    } else if (playStatus === 'gap') {
      pausedRef.current = true
      pauseContextRef.current = 'gap'
      if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
      setPlayStatus('paused')
    } else if (playStatus === 'paused') {
      pausedRef.current = false
      if (pauseContextRef.current === 'gap') {
        speakSentenceAt(indexRef.current + 1)
      } else {
        setPlayStatus('playing')
        resumeSentenceFromBoundary()
      }
    }
  }

  const handleRestart = () => {
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    pausedRef.current = false
    pauseContextRef.current = null
    utteranceTokenRef.current++
    synthRef.current.cancel()
    speakSentenceAt(0)
  }

  const handleJumpToEnd = () => {
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    pausedRef.current = false
    pauseContextRef.current = null
    utteranceTokenRef.current++
    synthRef.current.cancel()
    speakSentenceAt(sentencesRef.current.length - 1)
  }

  const handleJumpToSentence = (idx) => {
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    pausedRef.current = false
    pauseContextRef.current = null
    utteranceTokenRef.current++
    synthRef.current.cancel()
    setAutoplayFailed(false)
    speakSentenceAt(idx)
  }

  const handleSpeedChange = (newRate) => {
    rateRef.current = newRate
    setRate(newRate)

    if (playStatus !== 'playing') return

    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    resumeSentenceFromBoundary(newRate)
  }

  // Independent, one-off playback of a single transcript sentence — separate
  // from the main sequential engine above. Clicking a new sentence's icon (or
  // the currently-playing one again) always stops whatever is playing first.
  const playTranscriptSentence = (idx) => {
    const wasPlayingThis = transcriptPlayingIdx === idx
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    const token = ++utteranceTokenRef.current
    synthRef.current.cancel()

    if (wasPlayingThis) {
      setTranscriptPlayingIdx(null)
      return
    }

    setTranscriptPlayingIdx(idx)
    const utterance = new SpeechSynthesisUtterance(sentencesRef.current[idx].spanish)
    utterance.lang = 'es-ES'
    utterance.rate = rateRef.current
    utterance.pitch = 1
    utterance.onend = () => {
      if (token !== utteranceTokenRef.current) return
      setTranscriptPlayingIdx((prev) => (prev === idx ? null : prev))
    }
    utterance.onerror = () => {
      if (token !== utteranceTokenRef.current) return
      setTranscriptPlayingIdx((prev) => (prev === idx ? null : prev))
    }
    synthRef.current.speak(utterance)
  }

  const toggleTranslation = (idx) => {
    setOpenTranslationIdx((prev) => (prev === idx ? null : idx))
  }

  const selectAnswer = (questionIdx, optionIdx) => {
    setUserAnswers((prev) => ({ ...prev, [questionIdx]: optionIdx }))
  }

  const storyVocabMap = story
    ? Object.fromEntries((story.vocabulary || []).map((v) => [v.word.toLowerCase(), v.english]))
    : {}
  const questionsVocabMap = Object.fromEntries((questionsVocab || []).map((v) => [v.word.toLowerCase(), v.english]))
  const combinedVocabMap = { ...storyVocabMap, ...questionsVocabMap }

  const totalSentences = sentencesRef.current.length
  const progressPercent = playStatus === 'finished'
    ? 100
    : totalSentences > 0
      ? (currentIndex / totalSentences) * 100
      : 0
  const isMainPlaying = playStatus === 'playing' || playStatus === 'gap'
  const sentenceLabel = playStatus === 'finished'
    ? `Sentence ${totalSentences} of ${totalSentences}`
    : `Sentence ${currentIndex + 1} of ${totalSentences}`

  // Saves whatever progress exists (story must have loaded) before leaving the view.
  const handleBackWithSave = () => {
    if (story) {
      const mcqCorrectCount = questions.reduce((sum, q, qIdx) => {
        const selected = userAnswers[qIdx]
        return sum + (selected !== undefined && q.options[selected]?.correct ? 1 : 0)
      }, 0)

      saveSession({
        id: generateSessionId(),
        mode: 'listening',
        scenario,
        timestamp: Date.now(),
        duration: Date.now() - sessionStartRef.current,
        story,
        questions,
        userAnswers,
        matchingWords,
        mcqCorrectCount,
        mcqTotal: questions.length,
        vocabMatchedCount,
        vocabTotal: matchingWords.length,
      }).catch((err) => console.error('Failed to save listening session:', err))
      logEvent('session_completed', { mode: 'listening', scenario, mcqCorrectCount, mcqTotal: questions.length, vocabMatchedCount, vocabTotal: matchingWords.length })
    }
    onBack()
  }

  if (loading) {
    return (
      <div>
        <ListeningHeader onBack={handleBackWithSave} onChangeMode={onChangeMode} />
        <LoadingSpinner label="Generating your story..." />
      </div>
    )
  }

  return (
    <div>
      <ListeningHeader
        onBack={handleBackWithSave}
        onChangeMode={onChangeMode}
        onRegenerate={story ? handleRegenerateStory : undefined}
      />

      <div className="mb-6 border-l-4 border-primary bg-primary-light rounded-r-card px-4 py-2.5">
        <p className="text-ink font-bold text-heading-2 leading-tight">{scenario}</p>
        <p className="text-primary-text text-small">Listen carefully</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger font-semibold mb-1">⚠️ Error</p>
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      {story && (
        <>
          {autoplayFailed && (
            <button
              onClick={handleTapToPlay}
              className="w-full min-h-[44px] mb-6 px-4 rounded-control text-body font-semibold bg-primary text-white hover:bg-primary-hover transition flex items-center justify-center gap-2"
            >
              🔊 Tap to Play
            </button>
          )}

          <div className="mb-6 bg-surface rounded-card shadow-sm border border-border p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center justify-center gap-2 sm:justify-start sm:gap-1">
                <button
                  onClick={handleRestart}
                  title="Restart"
                  className="min-w-[48px] min-h-[48px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-3xl sm:text-2xl leading-none rounded-control text-ink-muted hover:text-ink hover:bg-primary-light transition"
                >
                  ⏮
                </button>
                <button
                  onClick={handlePlayPause}
                  disabled={playStatus === 'finished'}
                  title={isMainPlaying ? 'Pause' : 'Play'}
                  className={`min-w-[48px] min-h-[48px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-3xl sm:text-2xl leading-none rounded-control transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    isMainPlaying ? 'text-primary bg-primary-light' : 'text-ink-muted hover:text-ink hover:bg-primary-light'
                  }`}
                >
                  {isMainPlaying ? '⏸' : '▶'}
                </button>
                <button
                  onClick={handleJumpToEnd}
                  title="Skip to end"
                  className="min-w-[48px] min-h-[48px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center text-3xl sm:text-2xl leading-none rounded-control text-ink-muted hover:text-ink hover:bg-primary-light transition"
                >
                  ⏭
                </button>
              </div>

              <div className="flex-1">
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <p className="text-small text-ink-muted text-center mt-1">{sentenceLabel}</p>
              </div>

              <div className="flex gap-2 justify-center sm:justify-start sm:gap-1">
                {[
                  { r: 0.6, label: 'Slow' },
                  { r: 0.5, label: 'Normal' },
                  { r: 0.4, label: 'Fast' },
                ].map(({ r, label }) => (
                  <button
                    key={r}
                    onClick={() => handleSpeedChange(r)}
                    title={`${label} (${r}x)`}
                    className={`min-w-[44px] min-h-[44px] px-3 sm:px-2 rounded-control text-small font-semibold transition ${
                      rate === r ? 'bg-primary text-white' : 'bg-primary-light text-primary-text hover:bg-primary/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center mt-4">
              {sentencesRef.current.map((_, idx) => {
                const isCurrent = idx === currentIndex
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToSentence(idx)}
                    title={`Jump to sentence ${idx + 1}`}
                    className={`w-8 h-8 rounded-control text-xs font-semibold transition flex items-center justify-center ${
                      isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-primary-light text-primary-text hover:bg-primary/20'
                    }`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>
          </div>

          {playStatus === 'finished' && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              {questions.length > 0 && (
                <button
                  onClick={() => setShowMCQ((prev) => !prev)}
                  className={`flex-1 min-h-[44px] px-4 rounded-control text-body font-semibold transition ${
                    showMCQ ? 'bg-primary text-white' : 'bg-primary-light text-primary-text hover:bg-primary-light/70'
                  }`}
                >
                  📋 {showMCQ ? 'Hide Comprehension' : 'Check Comprehension'}
                </button>
              )}
              <button
                onClick={() => setShowTranscript((prev) => !prev)}
                className={`flex-1 min-h-[44px] px-4 rounded-control text-body font-semibold transition ${
                  showTranscript ? 'bg-primary text-white' : 'bg-secondary-light text-secondary-text hover:bg-secondary-light/70'
                }`}
              >
                📖 {showTranscript ? 'Hide Transcript' : 'Display Transcript'}
              </button>
            </div>
          )}

          {playStatus === 'finished' && showMCQ && questions.length > 0 && (
            <div className="mb-6">
              <p className="text-heading-2 text-ink mb-3">Comprehension Check</p>
              <div className="space-y-4">
                {questions.map((q, qIdx) => {
                  const selected = userAnswers[qIdx]
                  const hasAnswered = selected !== undefined
                  const selectedOption = hasAnswered ? q.options[selected] : null
                  return (
                    <div key={qIdx} className="bg-surface rounded-card shadow-sm border border-border p-6">
                      <div className="text-body text-ink font-semibold mb-3">
                        {qIdx + 1}. <HoverableText text={q.question_spanish} translation={q.question_english} vocabulary={combinedVocabMap} className="inline" />
                      </div>
                      <div className="space-y-2">
                        {q.options.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            onClick={() => selectAnswer(qIdx, optIdx)}
                            className={`flex items-start gap-2 min-h-[44px] px-2 py-1.5 rounded-control cursor-pointer transition ${
                              selected === optIdx ? 'bg-primary-light' : 'hover:bg-primary-light/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${qIdx}`}
                              checked={selected === optIdx}
                              readOnly
                              className="mt-1"
                            />
                            <HoverableText text={opt.text} translation={opt.english} vocabulary={combinedVocabMap} className="flex-1 text-ink text-body" />
                          </div>
                        ))}
                      </div>
                      {hasAnswered && (
                        <div className={`mt-3 p-3 rounded-control ${selectedOption.correct ? 'bg-success-light border-l-4 border-success' : 'bg-warn-light border-l-4 border-secondary'}`}>
                          <p className={`font-semibold ${selectedOption.correct ? 'text-success' : 'text-warn-text'}`}>
                            {selectedOption.correct ? 'Correct! ✓' : `Not quite — the answer is "${q.options.find((o) => o.correct)?.text}"`}
                          </p>
                          <p className="text-ink-muted text-small mt-1">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {playStatus === 'finished' && matchingWords.length > 0 && (
            <VocabularyMatching words={matchingWords} onProgressChange={(count) => setVocabMatchedCount(count)} />
          )}

          {playStatus === 'finished' && <EmailCapture />}

          {showTranscript && (
            <div className="mb-6 bg-surface rounded-card shadow-sm border border-border p-6">
              <p className="text-ink-muted text-small font-semibold mb-3">SPANISH — click 🔊 to play a sentence, 🌐 for its translation, or click a word for its definition</p>
              {(story.sentences || []).map((s, idx) => (
                <div key={idx} className="mb-6 last:mb-0">
                  <div className="flex items-start gap-2">
                    <span className="text-ink-faint font-semibold text-small mt-0.5">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-ink text-body leading-relaxed">
                        <HoverableText text={s.spanish} vocabulary={storyVocabMap} className="inline" showHoverTranslation={false} />
                        <button
                          onClick={() => playTranscriptSentence(idx)}
                          title="Play this sentence"
                          className={`ml-2 text-lg align-middle transition ${
                            transcriptPlayingIdx === idx ? 'text-primary' : 'text-ink-faint hover:text-ink-muted'
                          }`}
                        >
                          🔊
                        </button>
                        <button
                          onClick={() => toggleTranslation(idx)}
                          title="Show English"
                          className={`ml-1 text-lg align-middle transition ${
                            openTranslationIdx === idx ? 'text-primary' : 'text-ink-faint hover:text-ink-muted'
                          }`}
                        >
                          🌐
                        </button>
                      </span>
                      {openTranslationIdx === idx && (
                        <div className="mt-1 inline-block bg-primary-light rounded-control px-3 py-1 text-small text-primary-text">
                          <span className="font-semibold">Sentence {idx + 1}:</span> {s.english}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
