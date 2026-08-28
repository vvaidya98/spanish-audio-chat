import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import HoverableText from './HoverableText'
import VocabularyMatching from './VocabularyMatching'
import EmailCapture from './EmailCapture'
import LoadingSpinner from './LoadingSpinner'
import QuickTranslateModal from './QuickTranslateModal'
import RegenerateModal from './RegenerateModal'
import { saveSession, generateSessionId } from '../db'
import { logEvent } from '../analytics'
import { apiFetch } from '../api'
import { applySpanishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'

const SENTENCE_GAP_MS = 1300
const SPEED_OPTIONS = [1.0, 0.8, 0.6, 0.4]
const DEFAULT_RATE = 0.6

// SAC-052/069 Clarity Mode: when set above "off", sentences are spoken as
// segments split right after each connector word, with a pause between
// segments (duration set by the selected level), instead of as one
// continuous utterance. Mid-sentence pause/resume and mid-sentence speed
// change fall back to restarting the current sentence in this mode (rather
// than resuming from the exact word) since the existing onboundary-based
// resume tracking only covers a single utterance — a disclosed, deliberate
// scope trim rather than an oversight.
const CLARITY_CONNECTORS = ['y', 'pero', 'porque', 'cuando', 'mientras', 'si']
const CLARITY_LEVELS = ['off', 'low', 'medium', 'high', 'ultra']
const CLARITY_PAUSE_MS = { off: 0, low: 80, medium: 130, high: 180, ultra: 250 }
const DEFAULT_CLARITY_LEVEL = 'off'

// SAC-048 hardening: sessionStorage key for "has this scenario's Play button
// already been used/dismissed in this tab" — survives a full page reload
// (dev-server restart, manual refresh) without surviving to a genuinely new
// tab/session, keeping "story loads -> pulses" honest for an actual fresh
// visit while not re-pulsing on a reload of the same in-progress story.
const playedStorageKey = (scenario) => `listening_played:${scenario}`

function hasAlreadyPlayed(scenario) {
  try {
    return sessionStorage.getItem(playedStorageKey(scenario)) === 'true'
  } catch {
    return false
  }
}

function markAsPlayed(scenario) {
  try {
    sessionStorage.setItem(playedStorageKey(scenario), 'true')
  } catch {
    // Storage unavailable (private mode, etc.) — isFirstLoad still works via
    // component state, it just won't survive a reload in that case.
  }
}

function splitByConnectors(text) {
  const words = text.split(' ')
  const segments = []
  let current = []
  words.forEach((word) => {
    current.push(word)
    const bare = word.toLowerCase().replace(/[^a-zà-ÿ]/g, '')
    if (CLARITY_CONNECTORS.includes(bare)) {
      segments.push(current.join(' '))
      current = []
    }
  })
  if (current.length) segments.push(current.join(' '))
  return segments
}

// SAC-071: storyData/customDifficulty are only present for a custom topic
// (handed down from CustomTopicForm via App.jsx) — for a pre-built scenario
// both are undefined and every existing code path is untouched. `scenario`
// doubles as the custom topic's own text in that case (used for the header,
// sessionStorage keys, and the /api/story-questions cache key exactly the
// same way a real scenario name already was — no special-casing needed
// there), while isCustomRef/storyDataRef/customDifficultyRef (below) capture
// just enough at mount to make loadStory()'s regenerate branch call the
// right endpoint.
function ListeningStoryView({ scenario, storyData, customDifficulty, onBack }, ref) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [story, setStory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionsVocab, setQuestionsVocab] = useState([])
  const [matchingWords, setMatchingWords] = useState([])
  const [playStatus, setPlayStatus] = useState('idle') // idle, playing, gap, paused, finished
  const [currentIndex, setCurrentIndex] = useState(0)
  const [rate, setRate] = useState(DEFAULT_RATE)
  const [userAnswers, setUserAnswers] = useState({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [showComprehension, setShowComprehension] = useState(false)
  const [transcriptPlayingIdx, setTranscriptPlayingIdx] = useState(null)
  const [openTranslationIdx, setOpenTranslationIdx] = useState(null)
  const [vocabMatchedCount, setVocabMatchedCount] = useState(0)
  // SAC-047: two independent "Display Spanish"/"Display English" checkboxes
  // showing just the current sentence (separate from the full-story
  // "Display Transcript" toggle further down, which shows every sentence at
  // once). These are persistent preferences, not per-sentence reveal state —
  // unlike v1.0t's single checkbox + 🌐 toggle, they don't reset as the
  // sentence changes, only the content inside the box updates.
  const [showSpanish, setShowSpanish] = useState(false)
  const [showEnglish, setShowEnglish] = useState(false)
  // SAC-048: pulses the Play button until the user's first real interaction
  // with it, since removing "Tap to Begin" (v1.0t) means there's no longer
  // an unmissable prompt telling a first-time user where to start. Lazily
  // initialized from sessionStorage (see markAsPlayed/hasAlreadyPlayed above)
  // so a page reload mid-story doesn't bring the pulse back for a story
  // whose Play button the user already found.
  const [isFirstLoad, setIsFirstLoad] = useState(() => !hasAlreadyPlayed(scenario))
  // SAC-052/069: Clarity Mode level (off/low/medium/high/ultra). Default off,
  // mirrored into a ref so the async speak chain always reads the current
  // value (changing level mid-playback applies starting with the next
  // sentence, not the one already speaking).
  const [clarityLevel, setClarityLevel] = useState(DEFAULT_CLARITY_LEVEL)
  // SAC-059/060: Quick Translate modal, opened without pausing playback.
  const [showQuickTranslate, setShowQuickTranslate] = useState(false)
  // SAC-065: confirmation gate in front of Regenerate Story.
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)

  // SAC-071: captured once at mount (this component always remounts via a
  // fresh `key` for a new custom session — see App.jsx — so these never need
  // to change mid-lifetime).
  const isCustomRef = useRef(storyData != null)
  const storyDataRef = useRef(storyData)
  const customDifficultyRef = useRef(customDifficulty)

  const synthRef = useRef(null)
  const indexRef = useRef(0)
  const rateRef = useRef(DEFAULT_RATE)
  const clarityLevelRef = useRef(DEFAULT_CLARITY_LEVEL)
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
  // Set by Replay/Prev/Next/End (single-sentence manual navigation): tells
  // handleSentenceUtteranceEnd to stop after this one sentence instead of
  // gap-then-auto-advancing. Cleared only when the global Play/Pause button
  // resumes playback from a stopped state, which is what re-enables normal
  // sequential auto-advance.
  const manualNavRef = useRef(false)

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
  //
  // SAC-074: the loading spinner used to stay up until BOTH /api/generate-story
  // AND /api/story-questions resolved, even though questions/vocab (the
  // Comprehension Check + Vocabulary Matching data) aren't needed until the
  // story finishes playing — minutes away for a 10-sentence story. That made
  // every first load wait on two sequential Claude calls (each 12-25s+
  // uncached) instead of one. Story loading now clears the spinner and enables
  // Play as soon as the story itself is back; questions/vocab fetch in the
  // background afterward and populate whenever they arrive.
  //
  // SAC-071: three ways to get the story itself, decided once per call: (1)
  // the very first load of a custom topic — storyDataRef already holds it
  // (CustomTopicForm generated it before this component even mounted), no
  // fetch needed; (2) a *regenerate* of a custom topic — storyDataRef is
  // stale/already-consumed by (1), so this calls /api/generate-custom-story
  // with the original topic+difficulty instead; (3) everything else (a
  // pre-built scenario's first load or regenerate) — unchanged, calls
  // /api/generate-story. All three converge on the same setStory/
  // sentencesRef/background-questions-fetch logic below.
  const loadStory = async (isStale, regenerate = false) => {
    setLoading(true)
    setError('')

    try {
      let storyResult
      if (storyDataRef.current && !regenerate) {
        storyResult = storyDataRef.current
      } else if (isCustomRef.current) {
        const response = await apiFetch('/api/generate-custom-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: scenario, difficulty: customDifficultyRef.current }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `API Error: ${response.status}`)
        }
        storyResult = await response.json()
      } else {
        const storyResponse = await apiFetch('/api/generate-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario, regenerate }),
        })
        if (!storyResponse.ok) {
          const errorData = await storyResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `API Error: ${storyResponse.status}`)
        }
        storyResult = await storyResponse.json()
      }
      if (isStale()) return
      setStory(storyResult)
      sentencesRef.current = storyResult.sentences || []
      setLoading(false)
      logEvent('session_started', { mode: 'listening', scenario, custom: isCustomRef.current })

      // Background fetch: a failure here shouldn't hide/error out the story
      // that's already playable — Comprehension Check just won't have data.
      try {
        const storyText = (storyResult.sentences || []).map((s) => s.spanish).join(' ')
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
      } catch (err) {
        if (isStale()) return
        console.error('Error loading comprehension questions:', err)
      }
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
    if (manualNavRef.current) {
      // Single-sentence manual navigation: stop here, no auto-advance gap.
      // If this genuinely was the last sentence, surface 'finished' anyway
      // (nothing left to play, and the comprehension check should still
      // become reachable) rather than leaving it stuck on 'idle' forever.
      setPlayStatus(idx >= sentencesRef.current.length - 1 ? 'finished' : 'idle')
      return
    }
    setPlayStatus('gap')
    gapTimeoutRef.current = setTimeout(() => {
      if (!pausedRef.current) speakSentenceAt(idx + 1)
    }, SENTENCE_GAP_MS)
  }

  // Clarity Mode's chained per-segment playback (SAC-052/069). Recurses
  // through `segments`, pausing `pauseMs` (set by the selected level) between
  // each, then hands off to the normal handleSentenceUtteranceEnd once the
  // last segment finishes — so auto-advance/gap timing downstream is
  // unaffected by how many segments a sentence was broken into.
  const speakClaritySegment = (idx, segments, segIdx, pauseMs) => {
    if (segIdx >= segments.length) {
      handleSentenceUtteranceEnd(idx)
      return
    }

    const token = ++utteranceTokenRef.current
    const utterance = new SpeechSynthesisUtterance(segments[segIdx])
    applySpanishVoice(utterance)
    utterance.rate = rateRef.current
    utterance.pitch = 1
    utterance.onend = () => {
      if (token !== utteranceTokenRef.current) return
      setTimeout(() => {
        if (token !== utteranceTokenRef.current) return
        speakClaritySegment(idx, segments, segIdx + 1, pauseMs)
      }, pauseMs)
    }
    utterance.onerror = () => {
      if (token !== utteranceTokenRef.current) return
      speakClaritySegment(idx, segments, segIdx + 1, pauseMs)
    }

    synthRef.current.cancel()
    setTimeout(() => {
      if (token !== utteranceTokenRef.current) return
      synthRef.current.speak(utterance)
    }, SPEAK_START_DELAY_MS)
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

    if (clarityLevelRef.current !== 'off') {
      const segments = splitByConnectors(sentences[idx].spanish)
      if (segments.length > 1) {
        speakClaritySegment(idx, segments, 0, CLARITY_PAUSE_MS[clarityLevelRef.current])
        return
      }
    }

    const token = ++utteranceTokenRef.current
    const utterance = new SpeechSynthesisUtterance(sentences[idx].spanish)
    applySpanishVoice(utterance)
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
    setTimeout(() => {
      if (token !== utteranceTokenRef.current) return
      synthRef.current.speak(utterance)
    }, SPEAK_START_DELAY_MS)
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
    applySpanishVoice(utterance)
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

    setTimeout(() => {
      if (token !== utteranceTokenRef.current) return
      synthRef.current.speak(utterance)
    }, SPEAK_START_DELAY_MS)
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
    setShowComprehension(false)
    setShowTranscript(false)
    setVocabMatchedCount(0)
    setShowSpanish(false)
    setShowEnglish(false)
    // No pulse after a regenerate — by this point the user has already
    // found and used the controls at least once (they clicked Regenerate).
    setIsFirstLoad(false)
    markAsPlayed(scenario)

    loadStory(() => false, true)
  }

  const handleConfirmRegenerate = () => {
    setShowRegenerateModal(false)
    handleRegenerateStory()
  }

  const handlePlayPause = () => {
    if (playStatus === 'idle') {
      setIsFirstLoad(false)
      markAsPlayed(scenario)
      manualNavRef.current = false
      speakSentenceAt(indexRef.current)
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

  // Shared setup for all single-sentence manual navigation actions
  // (First/Next/Last): stop whatever's playing, mark manual-nav mode so
  // handleSentenceUtteranceEnd won't auto-advance, then speak just the
  // target sentence.
  const manualNavigateTo = (idx) => {
    if (gapTimeoutRef.current) clearTimeout(gapTimeoutRef.current)
    pausedRef.current = false
    pauseContextRef.current = null
    utteranceTokenRef.current++
    synthRef.current.cancel()
    manualNavRef.current = true
    speakSentenceAt(idx)
  }

  // "First sentence" jumps straight to sentence 0, mirroring "Last sentence"
  // jumping straight to the end — both boundary jumps, not step-by-one moves
  // (Prompt #021 follow-up correction). "Previous sentence" is the
  // step-back-one counterpart to "Next sentence", restored alongside First
  // once it became clear First's jump-to-start didn't replace the need for
  // a plain one-at-a-time step back too.
  const handleJumpToStart = () => manualNavigateTo(0)
  const handlePreviousSentence = () => manualNavigateTo(Math.max(0, indexRef.current - 1))
  const handleNextSentence = () => manualNavigateTo(Math.min(sentencesRef.current.length - 1, indexRef.current + 1))
  const handleJumpToEnd = () => manualNavigateTo(sentencesRef.current.length - 1)

  const handleClarityLevelChange = (level) => {
    setClarityLevel(level)
    clarityLevelRef.current = level
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
    applySpanishVoice(utterance)
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
    setTimeout(() => {
      if (token !== utteranceTokenRef.current) return
      synthRef.current.speak(utterance)
    }, SPEAK_START_DELAY_MS)
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

  // Exposes the save-then-navigate action to the parent (App.jsx), which no
  // longer has a Back button inside this view to trigger it directly — the
  // global FooterNav's Back/Topics buttons call this via ref instead.
  useImperativeHandle(ref, () => ({ back: handleBackWithSave }))

  if (loading) {
    const previewWords = (story?.vocabulary || [])
      .map((v) => v.word)
      .filter((w) => w.length > 2)
      .slice(0, 12)
    return (
      <div>
        <LoadingSpinner
          label="Generating your story..."
          estimateText="This usually takes 10 to 20 seconds"
          previewWords={previewWords}
        />
      </div>
    )
  }

  const currentSentence = story?.sentences?.[currentIndex]

  return (
    <div className={story ? 'pb-52' : ''}>
      {error && (
        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger font-semibold mb-1">⚠️ Error</p>
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      {story && (
        <>
          <p className="text-small text-ink-muted mb-3">{scenario} — Listen carefully</p>

          <div className="mb-4">
            <div className="flex items-center flex-wrap gap-4">
              <label className="flex items-center gap-2 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSpanish}
                  onChange={(e) => setShowSpanish(e.target.checked)}
                />
                Display Spanish
              </label>
              <label className="flex items-center gap-2 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEnglish}
                  onChange={(e) => setShowEnglish(e.target.checked)}
                />
                Display English
              </label>
              <button
                onClick={() => setShowQuickTranslate(true)}
                className="min-h-[44px] px-3 rounded-control text-small font-semibold text-primary-text bg-primary-light hover:bg-primary-light/70 transition"
              >
                ⊕ Quick Translate
              </button>
            </div>
            {(showSpanish || showEnglish) && currentSentence && (
              <div className="mt-2 bg-[#f9f9f9] border border-border rounded-control p-3">
                {showSpanish && (
                  <div className="flex items-start gap-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      <span className="text-body font-bold text-ink shrink-0">{currentIndex + 1}.</span>
                      <HoverableText
                        text={currentSentence.spanish}
                        vocabulary={storyVocabMap}
                        className="text-body font-bold text-ink"
                        showHoverTranslation={false}
                      />
                    </div>
                    <button
                      onClick={() => playTranscriptSentence(currentIndex)}
                      title="Replay this sentence"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg shrink-0 rounded-control text-ink-faint hover:text-primary hover:bg-primary-light transition"
                    >
                      🔊
                    </button>
                  </div>
                )}
                {showSpanish && showEnglish && <hr className="my-2 border-border" />}
                {showEnglish && (
                  <p className="text-small text-ink-muted">
                    {currentIndex + 1}. {currentSentence.english}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-small text-ink-muted text-center mt-1">{sentenceLabel}</p>
          </div>

          {playStatus === 'finished' && (
            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              {(questions.length > 0 || matchingWords.length > 0) && (
                <button
                  onClick={() => setShowComprehension((prev) => !prev)}
                  className={`flex-1 min-h-[44px] px-4 rounded-control text-body font-semibold transition ${
                    showComprehension ? 'bg-primary text-white' : 'bg-primary-light text-primary-text hover:bg-primary-light/70'
                  }`}
                >
                  ✓ {showComprehension ? 'Hide Comprehension' : 'Check Comprehension'}
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

          {playStatus === 'finished' && showComprehension && matchingWords.length > 0 && (
            <VocabularyMatching words={matchingWords} onProgressChange={(count) => setVocabMatchedCount(count)} rate={rate} />
          )}

          {playStatus === 'finished' && showComprehension && questions.length > 0 && (
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

          <div className="flex justify-center mb-2">
            <button
              onClick={() => setShowRegenerateModal(true)}
              title="Regenerate Story"
              className="min-w-[32px] min-h-[32px] flex items-center justify-center text-sm text-ink-faint hover:text-ink-muted transition"
            >
              🔄
            </button>
          </div>
        </>
      )}

      <RegenerateModal
        isOpen={showRegenerateModal}
        scenario={scenario}
        onCancel={() => setShowRegenerateModal(false)}
        onConfirm={handleConfirmRegenerate}
      />

      {story && (
        <div
          className="fixed left-0 right-0 z-40 bg-surface border-t border-border shadow-lg"
          style={{ bottom: 'calc(60px + env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-2xl mx-auto px-4 py-2">
            <div className="flex items-center justify-around">
              <div className="flex flex-col items-center">
                <button
                  onClick={handleJumpToStart}
                  disabled={currentIndex === 0}
                  title="First"
                  className="w-12 h-12 flex items-center justify-center text-xl leading-none rounded-full border-2 border-primary bg-white text-primary hover:bg-primary-light transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⏮
                </button>
                <span className="text-[11px] text-ink-faint mt-0.5">First</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handlePreviousSentence}
                  disabled={currentIndex === 0}
                  title="Previous sentence"
                  className="w-12 h-12 flex items-center justify-center text-xl leading-none rounded-full border-2 border-primary bg-white text-primary hover:bg-primary-light transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ◀
                </button>
                <span className="text-[11px] text-ink-faint mt-0.5">Previous sentence</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handlePlayPause}
                  disabled={playStatus === 'finished'}
                  title={isMainPlaying ? 'Pause' : 'Play'}
                  className={`w-20 h-20 flex items-center justify-center text-4xl leading-none rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    isFirstLoad ? 'play-button-pulse' : ''
                  }`}
                >
                  {isMainPlaying ? '⏸' : '▶'}
                </button>
                <span className="text-[11px] text-ink-faint mt-0.5">{isMainPlaying ? 'Pause' : 'Play'}</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleNextSentence}
                  disabled={currentIndex >= totalSentences - 1}
                  title="Next sentence"
                  className="w-12 h-12 flex items-center justify-center text-xl leading-none rounded-full border-2 border-primary bg-white text-primary hover:bg-primary-light transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ▶
                </button>
                <span className="text-[11px] text-ink-faint mt-0.5">Next sentence</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={handleJumpToEnd}
                  title="Last"
                  className="w-12 h-12 flex items-center justify-center text-lg leading-none rounded-full border-2 border-primary bg-white text-primary hover:bg-primary-light transition"
                >
                  ⏩
                </button>
                <span className="text-[11px] text-ink-faint mt-0.5">Last</span>
              </div>
            </div>

            {/* SAC-057: subtle, thumb-friendly zone — compact, low-contrast,
                deliberately not competing visually with the controls above. */}
            <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-border">
              <label className="flex items-center gap-1.5 text-xs text-ink-faint">
                Speed:
                <select
                  value={rate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="text-xs text-ink-faint bg-transparent border border-border rounded-control px-1.5 py-0.5 focus:outline-none"
                >
                  {SPEED_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      x{r.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-faint">
                Clarity Mode:
                <select
                  value={clarityLevel}
                  onChange={(e) => handleClarityLevelChange(e.target.value)}
                  className="text-xs text-ink-faint bg-transparent border border-border rounded-control px-1.5 py-0.5 focus:outline-none"
                >
                  {CLARITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {story && (
        <QuickTranslateModal isOpen={showQuickTranslate} onClose={() => setShowQuickTranslate(false)} />
      )}
    </div>
  )
}

export default forwardRef(ListeningStoryView)
