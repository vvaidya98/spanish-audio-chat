import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import HoverableText from './HoverableText'
import WordSaveTooltip from './WordSaveTooltip'
import VocabularyMatching from './VocabularyMatching'
import EmailCapture from './EmailCapture'
import LoadingSpinner from './LoadingSpinner'
import QuickTranslateModal from './QuickTranslateModal'
import RegenerateModal from './RegenerateModal'
import { ExplanationIcon, ExplanationPanel, ExplanationLoading } from './ExplanationIcon'
import { getScenarioEmoji } from './ScenarioSelector'
import { saveSession, generateSessionId } from '../db'
import { logEvent } from '../analytics'
import { apiFetch } from '../api'
import { applySpanishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'
import { useClickOutside } from '../useClickOutside'

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
    // Storage unavailable (private mode, etc.) — the pulse-eligibility check
    // still works via hasAlreadyPlayed's try/catch returning false, it just
    // won't survive a reload in that case.
  }
}

// SAC-084: also returns which connector word ended each segment (undefined
// for the final segment, which doesn't end in a pause) — needed so the
// caller can tell a "y" pause apart from any other connector's, since "y"
// gets its own always-red indicator regardless of the current Clarity level.
function splitByConnectors(text) {
  const words = text.split(' ')
  const segments = []
  const connectors = []
  let current = []
  words.forEach((word) => {
    current.push(word)
    const bare = word.toLowerCase().replace(/[^a-zà-ÿ]/g, '')
    if (CLARITY_CONNECTORS.includes(bare)) {
      segments.push(current.join(' '))
      connectors.push(bare)
      current = []
    }
  })
  if (current.length) segments.push(current.join(' '))
  return { segments, connectors }
}

// SAC-089 (Prompt #050): hard words first (up to 5), then moderate words
// filling any remaining slots — a frontend safety cap regardless of what
// the backend actually returned, since /api/generate-vocabulary-preview's
// prompt asks Claude for "0-5 words" but doesn't structurally guarantee it.
function selectVocabularyPreviewWords(words) {
  const hardWords = words.filter((w) => w.difficulty === 'hard').slice(0, 5)
  const moderateWords = words.filter((w) => w.difficulty === 'moderate').slice(0, 5 - hardWords.length)
  return [...hardWords, ...moderateWords]
}

// SAC-084: "y" always gets its own always-red dot regardless of the current
// Clarity level — it's a far more frequent, comma-like pause than the other
// connector words ("porque"/"mientras"/etc.), so calling it out distinctly
// helps explain why a sentence has so many marks. Everything else maps by
// level: grey dot (low) → yellow dot (medium) → orange dash (high) → red
// double-dash (ultra). `bg-ink-faint`/`bg-danger` reuse this project's real
// design tokens; yellow-500/orange-500 fall back to Tailwind's own built-in
// palette since this app's extended token set has no equivalent for either
// (extending Tailwind's theme doesn't remove its defaults, so these are
// still real, valid utility classes, not a hardcoded hex value).
// SAC-071: storyData/customDifficulty are only present for a custom topic
// (handed down from CustomTopicForm via App.jsx) — for a pre-built scenario
// both are undefined and every existing code path is untouched. `scenario`
// doubles as the custom topic's own text in that case (used for the header,
// sessionStorage keys, and the /api/story-questions cache key exactly the
// same way a real scenario name already was — no special-casing needed
// there), while isCustomRef/storyDataRef (below) capture just enough at
// mount to make loadStory()'s regenerate branch call the right endpoint.
// SAC-076: difficultyRef (below) starts from customDifficulty but, unlike
// isCustomRef/storyDataRef, is mutable for the life of the component —
// RegenerateModal's difficulty picker updates it for both pre-built and
// custom sessions alike.
function ListeningStoryView({ scenario, storyData, customDifficulty, onBack, onPreviousScenario, onNextScenario }, ref) {
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
  // SAC-081: persisted via localStorage (extends SAC-047's original
  // component-only state) so the three checkboxes below keep a consistent
  // "remembers your choice" behavior as a group rather than only the new
  // Grammar one persisting — the round's own truncated spec explicitly
  // called out "localStorage persistence" as part of this feature.
  // Spanish/English default to off (unchanged from SAC-047); Grammar
  // defaults to on, since before this round its ⓘ icon was always visible
  // whenever Spanish text was shown — defaulting it off would silently
  // regress that for everyone on their very next visit.
  const [showSpanish, setShowSpanish] = useState(() => {
    try {
      const saved = localStorage.getItem('showSpanishText')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })
  const [showEnglish, setShowEnglish] = useState(() => {
    try {
      const saved = localStorage.getItem('showEnglishTranslation')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })
  // SAC-084: defaults to off now, like Spanish/English — reverses SAC-081's
  // deliberate on-by-default choice (made to avoid silently hiding a ⓘ icon
  // that used to always show). That original concern doesn't apply the same
  // way anymore: SAC-085's loading placeholder means checking Grammar now
  // gives immediate visible feedback either way, and this round explicitly
  // asked for all three to start unchecked.
  const [showGrammar, setShowGrammar] = useState(() => {
    try {
      const saved = localStorage.getItem('showGrammarExplanations')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })
  // SAC-087: defaults off, same as the other three — persisted the same way.
  const [showVocabularyPreview, setShowVocabularyPreview] = useState(() => {
    try {
      const saved = localStorage.getItem('showVocabularyPreview')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })
  // SAC-048/078: pulses the Play button a fixed 3 times when a story becomes
  // ready, since removing "Tap to Begin" (v1.0t) means there's no longer an
  // unmissable prompt telling a first-time user where to start.
  // `pulseAnimationActive` is purely the visual on/off switch for the
  // `.play-button-pulse` CSS class (see index.css — the CSS animation's own
  // `3`-iteration count, not this timeout, is what actually stops it after
  // 3.6s; the timeout here is a redundant safety net + lets a real click
  // stop it early). Eligibility (should THIS particular story-load pulse at
  // all) is tracked separately via `shouldPulseRef`, computed fresh in
  // loadStory() each time: pulse on any first-ever load of a never-played
  // scenario (persisted via sessionStorage, see markAsPlayed/hasAlreadyPlayed
  // above, so a page reload doesn't bring it back), AND on every Regenerate
  // regardless of prior play history (SAC-078 — reverses the v1.0u decision
  // to suppress the pulse after Regenerate, since the prompt for this round
  // explicitly asked for a fresh 3x pulse on every new story, not just the
  // very first one).
  const [pulseAnimationActive, setPulseAnimationActive] = useState(false)
  const shouldPulseRef = useRef(false)
  const pulseTimeoutRef = useRef(null)
  // SAC-052/069: Clarity Mode level (off/low/medium/high/ultra). Default off,
  // mirrored into a ref so the async speak chain always reads the current
  // value (changing level mid-playback applies starting with the next
  // sentence, not the one already speaking).
  const [clarityLevel, setClarityLevel] = useState(DEFAULT_CLARITY_LEVEL)
  // Elapsed real-world ms for the current sentence's speech so far —
  // updated at each pause checkpoint and once more at the sentence's end,
  // not continuously (no setInterval), to avoid an unnecessary re-render
  // loop for a debug/verification display.
  const [sentenceElapsedMs, setSentenceElapsedMs] = useState(0)
  const sentenceSpeakStartRef = useRef(0)
  // SAC-059/060: Quick Translate modal, opened without pausing playback.
  const [showQuickTranslate, setShowQuickTranslate] = useState(false)
  // SAC-065: confirmation gate in front of Regenerate Story.
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  // SAC-079: keyed by 0-indexed sentence position (not a plain array) so a
  // response with gaps or out-of-order entries — Claude skipping a
  // "trivial" sentence despite being asked not to, or returning entries out
  // of sequence — still maps each explanation to the correct sentence
  // rather than silently shifting everything by however many are
  // missing/reordered. Reset to {} at the start of every new fetch (see the
  // effect below), so a slower Advanced story's explanations never show up
  // stale against a story that's since been regenerated.
  const [sentenceExplanations, setSentenceExplanations] = useState({})
  // SAC-084 fix: distinguishes "still waiting on the background fetch"
  // from "that fetch failed and isn't coming" — without this, a real
  // backend error (e.g. the Anthropic account hitting its own usage
  // quota) left the Grammar loading box saying "Loading…" forever.
  const [explanationsFailed, setExplanationsFailed] = useState(false)
  // SAC-087: same keyed-by-index/failed-flag shape as sentenceExplanations/
  // explanationsFailed just above, for the Vocabulary Preview checkbox.
  const [vocabularyPreview, setVocabularyPreview] = useState({})
  const [vocabularyPreviewFailed, setVocabularyPreviewFailed] = useState(false)
  // SAC-089 (Prompt #050): which single vocabulary word (if any) currently
  // has its English translation expanded — a single nullable value, not a
  // per-word map, so clicking a second word closes the first rather than
  // stacking translations (same "only one open at a time" pattern this
  // file already uses for openTranslationIdx/openExplanationIdx below).
  const [expandedVocabWord, setExpandedVocabWord] = useState(null)
  const vocabPreviewRef = useRef(null)
  // SAC-096 Part 1: same missing-dismiss gap as HoverableText/Translate —
  // expandedVocabWord only ever closed via re-clicking the same word or the
  // [currentIndex] reset below, never via a click elsewhere on the page.
  useClickOutside(vocabPreviewRef, () => setExpandedVocabWord(null), expandedVocabWord !== null)
  // Guards the hybrid loading strategy's second phase (see the effects
  // below) so the bulk sentences-1..N fetch fires exactly once per story,
  // the first time playback starts — not again on every subsequent
  // pause/resume cycle back into 'playing'.
  const bulkContentFetchedRef = useRef(false)
  // Bumped only when a new `story` lands (Phase 1 below) — Phase 2's
  // background fetch checks this, NOT a playStatus-effect-cleanup-driven
  // `stale` flag, when applying its result. Using the effect's own cleanup
  // for staleness would be wrong here: that effect's dependency array
  // includes `playStatus` (needed to detect when playback first starts),
  // so every subsequent playStatus change — pausing seconds after
  // pressing Play, for instance — would re-run the effect, fire its
  // cleanup, and silently mark the still-in-flight bulk fetch as stale,
  // discarding its result the moment it eventually resolved. A real bug
  // caught via a Puppeteer test that paused immediately after Play: the
  // bulk request fired correctly but its data never made it into state.
  const storyGenerationRef = useRef(0)
  // Transcript shows one sentence's explanation open at a time across the
  // whole list — same single-nullable-index pattern openTranslationIdx
  // already uses for the 🌐 toggle just below, where opening one implicitly
  // closes any other.
  const [openExplanationIdx, setOpenExplanationIdx] = useState(null)
  // SAC-080: keeps the screen from auto-locking mid-story on mobile.
  // Read once at mount (matches this round's own testing checklist, which
  // toggles the setting *between* plays, not mid-session) — AboutModal.jsx
  // owns the actual toggle UI and writes the same localStorage key, but the
  // two components are siblings with no direct prop link, so an
  // already-playing session only picks up a change on its next fresh mount
  // (new scenario, or Regenerate), not instantly. Defaults to on.
  const [keepScreenAwake] = useState(() => {
    try {
      const saved = localStorage.getItem('keepScreenAwakeOnPlayback')
      return saved !== null ? saved === 'true' : true
    } catch {
      return true
    }
  })
  const wakeLockRef = useRef(null)

  // SAC-071: captured once at mount (this component always remounts via a
  // fresh `key` for a new custom session — see App.jsx — so these never need
  // to change mid-lifetime).
  const isCustomRef = useRef(storyData != null)
  const storyDataRef = useRef(storyData)
  // SAC-076: unlike isCustomRef/storyDataRef above, this one DOES change over
  // this component's lifetime — RegenerateModal's difficulty picker updates
  // it (via handleConfirmRegenerate) right before a regenerate, for both
  // pre-built scenarios and custom topics alike. Starts at the custom story's
  // original difficulty when there is one, else 'Beginner' (pre-built stories
  // had no difficulty concept before this round).
  const difficultyRef = useRef(customDifficulty || 'Beginner')

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

  // SAC-089 (Prompt #050): closes any expanded vocabulary word's
  // translation the moment the current sentence changes — otherwise a
  // translation left open on one sentence would still show, now
  // mislabeled, on whatever sentence comes next.
  useEffect(() => {
    setExpandedVocabWord(null)
  }, [currentIndex])

  useEffect(() => {
    // SAC-089 (Prompt #050): scrolls to the top on every fresh mount of
    // this view — covers both a normal scenario pick from the grid and
    // Previous/Next Topic navigation (both go through App.jsx's
    // key={scenario} remount), so switching topics doesn't leave the
    // page scrolled to wherever the user was mid-story on the previous
    // one. Regenerate doesn't remount this component (see loadStory's
    // regenerate branch below), so it's correctly unaffected.
    window.scrollTo(0, 0)
    synthRef.current = window.speechSynthesis
    let stale = false
    loadStory(() => stale)

    return () => {
      stale = true
      // SAC-075: every speak() call site (speakSentenceAt,
      // resumeSentenceFromBoundary, speakClaritySegment,
      // playTranscriptSentence) schedules the actual .speak() via a
      // SPEAK_START_DELAY_MS setTimeout, guarded by "if (token !==
      // utteranceTokenRef.current) return". cancel() below only stops
      // audio that's already playing — it does nothing about a speak()
      // that's still scheduled but hasn't fired yet. Without invalidating
      // the token here too, navigating away within that ~175ms window
      // (e.g. clicking Play and immediately leaving) let the delayed
      // speak() fire anyway once the component was already unmounted,
      // starting audio nothing could stop. Bumping the token makes every
      // pending guard check fail, exactly like it already does for every
      // other "supersede the previous utterance" case in this file.
      utteranceTokenRef.current++
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
  // with the topic+difficultyRef.current instead (SAC-076: not necessarily
  // the *original* difficulty anymore — handleConfirmRegenerate updates
  // difficultyRef before calling this if the user picked a different level);
  // (3) everything else (a pre-built scenario's first load or regenerate) —
  // calls /api/generate-story, also passing difficultyRef.current (SAC-076).
  // All three converge on the same setStory/sentencesRef/background-
  // questions-fetch logic below.
  const loadStory = async (isStale, regenerate = false) => {
    setLoading(true)
    setError('')
    // SAC-078: computed once per call, independent of which of the three
    // fetch branches below actually runs — a regenerate always pulses; a
    // non-regenerate load only pulses if this exact scenario has never been
    // played in this tab session.
    shouldPulseRef.current = regenerate || !hasAlreadyPlayed(scenario)

    try {
      let storyResult
      if (storyDataRef.current && !regenerate) {
        storyResult = storyDataRef.current
      } else if (isCustomRef.current) {
        const response = await apiFetch('/api/generate-custom-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: scenario, difficulty: difficultyRef.current }),
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
          body: JSON.stringify({ scenario, regenerate, difficulty: difficultyRef.current }),
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
          body: JSON.stringify({ scenario, story_text: storyText, difficulty: difficultyRef.current }),
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

  // SAC-078: fires whenever `story` is set to a genuinely new object — every
  // successful loadStory() call (initial load and every Regenerate) produces
  // a fresh object, so this effect naturally re-runs each time, no separate
  // "story changed" counter needed. Skips entirely if shouldPulseRef (set
  // just above, at the top of loadStory) says this particular load isn't
  // pulse-eligible. Turns the class off then back on via requestAnimationFrame
  // (rather than straight to `true`) so a *second* pulse — e.g. a Regenerate
  // shortly after the first pulse already finished — actually restarts the
  // CSS animation: toggling a class off and back on within the same render
  // doesn't force the browser to notice and replay it, a real paint tick has
  // to land in between.
  useEffect(() => {
    if (!story || !shouldPulseRef.current) return
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    setPulseAnimationActive(false)
    const raf = requestAnimationFrame(() => {
      setPulseAnimationActive(true)
      // 3600ms = 1.2s per pulse x 3 (see index.css's playButtonPulse) — must
      // track the CSS animation's real total duration, or this redundant
      // safety-net fires early and desyncs from the animation still visibly
      // running.
      pulseTimeoutRef.current = setTimeout(() => setPulseAnimationActive(false), 3600)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [story])

  // SAC-087: fetches one sentence-slice worth of Grammar explanations,
  // returning a { [sentenceIndex]: explanation } map already shifted by
  // startIndex — throws on any failure so both call sites (Phase 1/Phase 2
  // below) can share one try/catch-driven failed-state handling.
  const fetchExplanationsSlice = async (spanishSentences, startIndex) => {
    const response = await apiFetch('/api/generate-sentence-explanations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences: spanishSentences, difficulty: difficultyRef.current, startIndex }),
    })
    if (!response.ok) throw new Error(`explanations request failed: ${response.status}`)
    const data = await response.json()
    const byIndex = {}
    ;(data.explanations || []).forEach((exp) => {
      if (typeof exp.sentenceIndex === 'number') byIndex[exp.sentenceIndex] = exp
    })
    return byIndex
  }

  // SAC-087: same shape as fetchExplanationsSlice, for Vocabulary Preview.
  const fetchVocabularyPreviewSlice = async (spanishSentences, startIndex) => {
    const response = await apiFetch('/api/generate-vocabulary-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentences: spanishSentences, difficulty: difficultyRef.current, startIndex }),
    })
    if (!response.ok) throw new Error(`vocabulary-preview request failed: ${response.status}`)
    const data = await response.json()
    const byIndex = {}
    ;(data.vocabularyPreview || []).forEach((entry) => {
      if (typeof entry.sentenceIndex === 'number') byIndex[entry.sentenceIndex] = entry
    })
    return byIndex
  }

  // SAC-087 Phase 1 (replaces the old SAC-079 single-batch fetch): fires on
  // the same trigger as the pulse effect above — every new `story` object,
  // initial load AND every regenerate. Fetches ONLY sentence 0's Grammar
  // explanation + Vocabulary Preview, not the whole story — a fast,
  // single-sentence call so both are genuinely ready before the user even
  // presses Play, which is the entire premise of "preview vocabulary before
  // listening." The old behavior (one batch call for all 7-10 sentences,
  // ~12-15s) left sentence 0 waiting behind sentences it didn't need yet.
  // `stale` guards the same regenerate-mid-flight race the old effect did.
  useEffect(() => {
    if (!story || !story.sentences || story.sentences.length === 0) return
    let stale = false
    setSentenceExplanations({})
    setExplanationsFailed(false)
    setVocabularyPreview({})
    setVocabularyPreviewFailed(false)
    bulkContentFetchedRef.current = false
    storyGenerationRef.current += 1

    const firstSentence = [story.sentences[0].spanish]
    // SAC-087/089 (Prompt #050): timing log to diagnose reported "S1 still
    // shows Loading" behavior — measures wall-clock time from story load to
    // Phase 1's fetch actually resolving. Investigation finding (Prompt
    // #050): confirmed via direct testing that the state IS applied
    // correctly the moment this resolves — the "Loading" a fast/impatient
    // navigator sees isn't a bug, it's this fetch genuinely still being
    // in-flight (~2.5-3s for one sentence) at the moment they looked, or —
    // for sentence 2 onward — Phase 2's real ~9-12s API latency for the
    // rest of the story, exactly the "S2-S10 ready OR LOADING when user
    // navigates" tradeoff the hybrid strategy's own spec (Prompt #048)
    // explicitly anticipated.
    const phase1Start = Date.now()

    ;(async () => {
      const [explResult, vocabResult] = await Promise.allSettled([
        fetchExplanationsSlice(firstSentence, 0),
        fetchVocabularyPreviewSlice(firstSentence, 0),
      ])
      console.log(`[Timing] Phase 1 (sentence 1) fetch completed after ${Date.now() - phase1Start}ms`)
      if (stale) return
      if (explResult.status === 'fulfilled') {
        setSentenceExplanations((prev) => ({ ...prev, ...explResult.value }))
      } else {
        // SAC-084 fix: distinguishes "still waiting" from "failed and isn't
        // coming" — without this, a real backend error (e.g. the Anthropic
        // account hitting its own usage quota) left the Grammar loading box
        // saying "Loading…" forever.
        console.error('[explanations] Sentence 0 request failed:', explResult.reason)
        setExplanationsFailed(true)
      }
      if (vocabResult.status === 'fulfilled') {
        setVocabularyPreview((prev) => ({ ...prev, ...vocabResult.value }))
      } else {
        console.error('[vocabulary-preview] Sentence 0 request failed:', vocabResult.reason)
        setVocabularyPreviewFailed(true)
      }
    })()

    return () => {
      stale = true
    }
  }, [story])

  // SAC-087 Phase 2: once the user actually presses Play (first transition
  // into 'playing' for this story), fetch the REMAINING sentences' Grammar
  // explanations + Vocabulary Preview in the background — deliberately not
  // bundled into Phase 1 above, so sentence 0's fast single-sentence calls
  // aren't sharing a request/response cycle with a much larger batch.
  // bulkContentFetchedRef (reset by Phase 1 on every new story) ensures
  // this fires exactly once per story, not again on a later pause/resume
  // cycle back into 'playing'. Deliberately does NOT use this effect's own
  // cleanup for staleness (`playStatus` is a dependency here, so pausing
  // even briefly would re-run the effect and fire that cleanup) — instead
  // captures storyGenerationRef's current value up front and compares
  // against it after the fetch resolves, so only a genuine new story
  // invalidates this result, not a mid-flight pause/resume. See that ref's
  // own comment for the real bug this fixes.
  useEffect(() => {
    if (playStatus !== 'playing') return
    if (bulkContentFetchedRef.current) return
    if (!story || !story.sentences || story.sentences.length <= 1) return
    bulkContentFetchedRef.current = true
    const myGeneration = storyGenerationRef.current

    const restSentences = story.sentences.slice(1).map((s) => s.spanish)
    const phase2Start = Date.now()
    console.log(`[Timing] Phase 2 (sentences 2-${story.sentences.length}) fetch started, playStatus just became 'playing'`)

    ;(async () => {
      const [explResult, vocabResult] = await Promise.allSettled([
        fetchExplanationsSlice(restSentences, 1),
        fetchVocabularyPreviewSlice(restSentences, 1),
      ])
      console.log(`[Timing] Phase 2 (sentences 2-${story.sentences.length}) fetch completed after ${Date.now() - phase2Start}ms`)
      if (storyGenerationRef.current !== myGeneration) return
      if (explResult.status === 'fulfilled') {
        setSentenceExplanations((prev) => ({ ...prev, ...explResult.value }))
      } else {
        console.error('[explanations] Bulk request failed:', explResult.reason)
        setExplanationsFailed(true)
      }
      if (vocabResult.status === 'fulfilled') {
        setVocabularyPreview((prev) => ({ ...prev, ...vocabResult.value }))
      } else {
        console.error('[vocabulary-preview] Bulk request failed:', vocabResult.reason)
        setVocabularyPreviewFailed(true)
      }
    })()
  }, [playStatus, story])

  // SAC-080: acquires a screen wake lock for as long as the story is
  // actively playing or in the inter-sentence gap (`isMainPlaying`, computed
  // below in the render body — duplicated here as an inline check rather
  // than reordered above it, since this effect belongs with this file's
  // other effects near the top, not interspersed with handler definitions),
  // releases it the instant that stops being true for any reason — user
  // pause, the story finishing, Regenerate resetting to 'idle', or
  // navigating away entirely (component unmount runs this same cleanup).
  // Deliberately reactive to `playStatus` rather than threaded through every
  // individual call site that can change it (handlePlayPause, manual nav,
  // handleRegenerateStory, speakSentenceAt's finished branch, etc.) — this
  // codebase's playback state machine already has many call sites that
  // touch `playStatus`, and hooking each one individually is exactly the
  // kind of thing that's easy to miss one of; deriving from the state
  // itself is correct by construction regardless of how many more call
  // sites exist or get added later.
  useEffect(() => {
    const isPlayingNow = playStatus === 'playing' || playStatus === 'gap'

    const acquireWakeLock = async () => {
      if (!navigator.wakeLock || !keepScreenAwake || wakeLockRef.current) return
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch (err) {
        console.error('[WakeLock] Error acquiring wake lock:', err)
      }
    }

    if (isPlayingNow) {
      acquireWakeLock()
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [playStatus, keepScreenAwake])

  // SAC-080: a wake lock is automatically released by the browser the
  // moment the tab/window is hidden (switching apps, the phone's screen
  // itself turning off via the power button, etc.) and does NOT
  // automatically re-acquire when it becomes visible again — a real,
  // documented characteristic of the WakeLock API, not a hypothetical edge
  // case, and the single most likely way a mobile user would actually
  // trigger this (briefly switching to check a notification mid-story).
  // Without this, the feature would silently stop working after the very
  // first backgrounding, with nothing in the UI indicating it had.
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isPlayingNow = playStatus === 'playing' || playStatus === 'gap'
      if (document.visibilityState === 'visible' && isPlayingNow && keepScreenAwake && navigator.wakeLock && !wakeLockRef.current) {
        navigator.wakeLock
          .request('screen')
          .then((sentinel) => {
            wakeLockRef.current = sentinel
            sentinel.addEventListener('release', () => {
              wakeLockRef.current = null
            })
          })
          .catch((err) => console.error('[WakeLock] Error re-acquiring after visibility change:', err))
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [playStatus, keepScreenAwake])

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
  // SAC-084: `connectors[segIdx]` is the word that ends the segment about to
  // finish — recorded as a real pause event (not SSML, this app doesn't use
  // it anywhere; this is the actual setTimeout(pauseMs) delay below) the
  // moment that pause is scheduled, for both the visible indicator row and
  // a console log verifying the real mechanism.
  const speakClaritySegment = (idx, segments, segIdx, pauseMs, connectors) => {
    if (segIdx >= segments.length) {
      setSentenceElapsedMs(Date.now() - sentenceSpeakStartRef.current)
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
      const connector = connectors[segIdx]
      if (connector) {
        const level = clarityLevelRef.current
        const elapsed = Date.now() - sentenceSpeakStartRef.current
        console.log(
          `[Clarity] pause after "${connector}" — level=${level}, delay=${pauseMs}ms (setTimeout, not SSML), elapsed=${elapsed}ms`
        )
        setSentenceElapsedMs(elapsed)
      }
      setTimeout(() => {
        if (token !== utteranceTokenRef.current) return
        speakClaritySegment(idx, segments, segIdx + 1, pauseMs, connectors)
      }, pauseMs)
    }
    utterance.onerror = () => {
      if (token !== utteranceTokenRef.current) return
      speakClaritySegment(idx, segments, segIdx + 1, pauseMs, connectors)
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
    // SAC-084-Simplify: elapsed-time reset only now — the dot/dash
    // indicator row (and its clarityIndicators state) was removed this
    // round; the timer alone still resets fresh at the start of every
    // sentence.
    setSentenceElapsedMs(0)
    sentenceSpeakStartRef.current = Date.now()

    if (clarityLevelRef.current !== 'off') {
      const { segments, connectors } = splitByConnectors(sentences[idx].spanish)
      if (segments.length > 1) {
        speakClaritySegment(idx, segments, 0, CLARITY_PAUSE_MS[clarityLevelRef.current], connectors)
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
      // SAC-084: this sentence had no connector words (the clarity-segment
      // branch above never ran), so there were no pauses to log — but the
      // elapsed-time checkpoint still needs a final value, since the
      // indicator row shows for every sentence when Clarity is on, not just
      // segmented ones.
      setSentenceElapsedMs(Date.now() - sentenceSpeakStartRef.current)
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
    markAsPlayed(scenario)

    loadStory(() => false, true)
  }

  const handleConfirmRegenerate = (selectedDifficulty) => {
    setShowRegenerateModal(false)
    difficultyRef.current = selectedDifficulty
    handleRegenerateStory()
  }

  const handlePlayPause = () => {
    if (playStatus === 'idle') {
      // SAC-078: stop the pulse immediately on a real click rather than
      // leaving it visibly finishing out its remaining ~3.6s on a button
      // the user has already found and pressed.
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
      setPulseAnimationActive(false)
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
          {/* SAC-083: getScenarioEmoji() falls back to ✨ for any title it
              doesn't recognize, which a custom topic's free-form text
              naturally always is — no separate custom-vs-pre-built branch
              needed here. */}
          <p className="font-bold text-ink text-heading-2 truncate mb-3">
            {getScenarioEmoji(scenario)} {scenario}
          </p>

          <div className="mb-4">
            {/* SAC-081: three independent checkboxes, one line where it fits
                (Quick Translate moved to its own line below to make room —
                four items no longer had to compete for the same row). */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
              {/* SAC-087: listed first — pedagogically meant to be seen
                  before the Spanish text itself ("preview vocabulary, build
                  confidence, THEN listen"), not just another equal item in
                  the Spanish/English/Grammar trio. */}
              <label className="flex items-center gap-1.5 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVocabularyPreview}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setShowVocabularyPreview(checked)
                    try {
                      localStorage.setItem('showVocabularyPreview', checked ? 'true' : 'false')
                    } catch {
                      // Storage unavailable — the checkbox still works for this session.
                    }
                  }}
                />
                📖 Vocabulary Preview
              </label>
              <label className="flex items-center gap-1.5 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSpanish}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setShowSpanish(checked)
                    try {
                      localStorage.setItem('showSpanishText', checked ? 'true' : 'false')
                    } catch {
                      // Storage unavailable — the checkbox still works for this session.
                    }
                  }}
                />
                🇪🇸 Spanish text
              </label>
              <label className="flex items-center gap-1.5 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEnglish}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setShowEnglish(checked)
                    try {
                      localStorage.setItem('showEnglishTranslation', checked ? 'true' : 'false')
                    } catch {
                      // Storage unavailable — the checkbox still works for this session.
                    }
                  }}
                />
                🇬🇧 English translation
              </label>
              <label className="flex items-center gap-1.5 text-small text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGrammar}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setShowGrammar(checked)
                    try {
                      localStorage.setItem('showGrammarExplanations', checked ? 'true' : 'false')
                    } catch {
                      // Storage unavailable — the checkbox still works for this session.
                    }
                  }}
                />
                💡 Grammar
              </label>
            </div>

            {/* SAC-081: three color-coded blocks, always in this order
                (Spanish → English → Grammar) regardless of which are
                checked — each is its own independently-toggled block, not
                sections of one shared box like the pre-SAC-081 layout.
                SAC-083 fix: Grammar's block now shows the instant the
                checkbox is checked (once its explanation has finished
                loading), matching how the Spanish/English checkboxes
                already behave directly — the earlier version required an
                extra click on a ⓘ icon after checking the box, which read
                as "the checkbox doesn't do anything." The icon (and the
                click-to-toggle state it needed) is gone from this block;
                the Transcript's own ⓘ icons are unaffected and still work
                the click-to-reveal way, since showing every sentence's
                explanation there at once would be a wall of green boxes. */}
            {/* SAC-087: own block, own color (bg-secondary-light — coral,
                distinct from Spanish/English/Grammar's blue/yellow/green),
                rendered before the Spanish block per this feature's own
                "preview before listening" premise. Loading/failed states
                mirror the Grammar block's ExplanationLoading pattern but
                inlined here rather than extracted into a shared component,
                since (unlike Grammar's panel) there's only this one call
                site so far — no Transcript equivalent was asked for.
                SAC-089 (Prompt #050) redesign: words now render horizontally
                in one dot-separated line (hard words bold, moderate normal
                weight) instead of a bulleted list with English shown for
                every word up front — a click reveals just that one word's
                translation beneath the line (closing any previously-open
                one, matching this file's existing single-nullable-index
                pattern), minimizing vertical space until a user actually
                wants a specific translation. */}
            {showVocabularyPreview && currentSentence && (
              <div ref={vocabPreviewRef} className="mt-2 bg-secondary-light border border-border rounded-control p-3">
                <p className="text-small font-semibold text-ink mb-1">📖 Vocabulary Preview</p>
                {vocabularyPreview[currentIndex] ? (
                  (() => {
                    const displayWords = selectVocabularyPreviewWords(vocabularyPreview[currentIndex].words)
                    if (displayWords.length === 0) {
                      return <p className="text-small text-ink-muted">No especially tricky words in this sentence.</p>
                    }
                    return (
                      <p className="text-small text-ink-muted">
                        {displayWords.map((w, i) => (
                          <span key={w.word}>
                            <span className="relative">
                              <button
                                onClick={() => setExpandedVocabWord((prev) => (prev === w.word ? null : w.word))}
                                className={`${w.difficulty === 'hard' ? 'font-bold' : 'font-normal'} text-ink hover:text-primary transition`}
                              >
                                {w.word}
                              </button>
                              {/* SAC-092: replaced the old inline "word →
                                  english" reveal line with the same
                                  click-word tooltip/save popup used
                                  elsewhere (WordSaveTooltip.jsx, shared with
                                  HoverableText.jsx) — one consistent popup
                                  treatment app-wide instead of two. */}
                              {expandedVocabWord === w.word && (
                                <WordSaveTooltip word={w.word} english={w.english} source="vocab-preview" />
                              )}
                            </span>
                            {i < displayWords.length - 1 && <span className="text-ink-faint"> • </span>}
                          </span>
                        ))}
                      </p>
                    )
                  })()
                ) : (
                  <p className="text-small text-ink-muted">
                    {vocabularyPreviewFailed ? 'Vocabulary preview unavailable right now.' : 'Loading vocabulary preview…'}
                  </p>
                )}
              </div>
            )}

            {showSpanish && currentSentence && (
              <div className="mt-2 bg-info-light border border-border rounded-control p-3">
                {/* SAC-089 (Prompt #050): 🔊/🇪🇸 stacked vertically in a left
                    margin column instead of sitting inline before the text —
                    the old "🇪🇸 1." prefix plus a same-row 🔊 button on the
                    right both ate into the line's usable width, forcing
                    earlier wraps at narrow (390px) widths. Moving both to
                    their own column gives the Spanish text the full
                    remaining width to wrap into. */}
                <div className="flex items-start gap-2">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      onClick={() => playTranscriptSentence(currentIndex)}
                      title="Replay this sentence"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg rounded-control text-ink-faint hover:text-primary hover:bg-primary-light transition"
                    >
                      🔊
                    </button>
                    <span className="text-lg leading-none" aria-hidden="true">🇪🇸</span>
                  </div>
                  <div className="flex items-start gap-1.5 flex-1 pt-2.5">
                    <span className="text-body font-bold text-ink shrink-0">{currentIndex + 1}.</span>
                    <HoverableText
                      text={currentSentence.spanish}
                      vocabulary={storyVocabMap}
                      className="text-body font-bold text-ink"
                      showHoverTranslation={false}
                    />
                  </div>
                </div>
                {/* SAC-084-Simplify: the dot/dash indicator row (and
                    clarityMarkStyle/clarityIndicators) was removed this
                    round — Clarity Mode's pause behavior (CLARITY_PAUSE_MS,
                    all 6 connector words, still adjustable via the Off/Low/
                    Medium/High/Ultra dropdown below) is unchanged, it's only
                    the visual proof-of-pause marks that are gone. The timer
                    alone remains, still showing regardless of Clarity level
                    since it's a real reading of sentence speech duration
                    either way. */}
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-ink-faint">⏱️ {sentenceElapsedMs}ms</span>
                </div>
              </div>
            )}

            {showEnglish && currentSentence && (
              <div className="mt-2 bg-warn-light border border-border rounded-control p-3">
                <p className="text-small text-ink-muted">
                  🇬🇧 {currentIndex + 1}. {currentSentence.english}
                </p>
              </div>
            )}

            {/* SAC-085: the box now appears the instant Grammar is checked
                (as a loading placeholder, same size/color/shape as the real
                panel) rather than staying absent until the background fetch
                resolves — a visible sign something is coming, not just
                silence. */}
            {showGrammar && (
              sentenceExplanations[currentIndex]
                ? <ExplanationPanel explanation={sentenceExplanations[currentIndex]} />
                : <ExplanationLoading failed={explanationsFailed} />
            )}
          </div>

          <div className="mb-2">
            <div className="h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-small text-ink-muted text-center mt-1">{sentenceLabel}</p>
          </div>

          {/* SAC-083: moved here from just below the checkboxes — sat
              awkwardly wedged between the checkbox row and the color blocks
              before. */}
          <div className="mb-6 text-center">
            <button
              onClick={() => setShowQuickTranslate(true)}
              className="min-h-[44px] px-2 text-small text-ink-muted hover:text-ink transition"
            >
              Quick Translate
            </button>
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
              <p className="text-ink-muted text-small font-semibold mb-3">SPANISH — click 🔊 to play a sentence, 🌐 for its translation, ⓘ for how it's constructed, or click a word for its definition</p>
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
                        <ExplanationIcon
                          explanation={sentenceExplanations[idx]}
                          isOpen={openExplanationIdx === idx}
                          onClick={() => setOpenExplanationIdx((prev) => (prev === idx ? null : idx))}
                          className="ml-1 text-lg align-middle"
                        />
                      </span>
                      {openTranslationIdx === idx && (
                        <div className="mt-1 inline-block bg-primary-light rounded-control px-3 py-1 text-small text-primary-text">
                          <span className="font-semibold">Sentence {idx + 1}:</span> {s.english}
                        </div>
                      )}
                      {openExplanationIdx === idx && (
                        <ExplanationPanel explanation={sentenceExplanations[idx]} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </>
      )}

      <RegenerateModal
        isOpen={showRegenerateModal}
        scenario={scenario}
        currentDifficulty={difficultyRef.current}
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
                    pulseAnimationActive ? 'play-button-pulse' : ''
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

            {/* SAC-057/077: thumb-friendly zone below the main controls —
                Speed, Clarity, and Regenerate all on one row, sized up from
                the original text-xs/text-ink-faint pairing (was hard to read)
                to text-sm/text-ink-muted. */}
            <div className="flex items-center flex-wrap justify-center gap-x-4 gap-y-1 mt-2 pt-2 border-t border-border">
              <label className="flex items-center gap-1.5 text-base text-ink-muted">
                Speed:
                <select
                  value={rate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="text-base text-ink-muted bg-transparent border border-border rounded-control px-1.5 py-0.5 focus:outline-none"
                >
                  {SPEED_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      x{r.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-base text-ink-muted">
                Clarity:
                <select
                  value={clarityLevel}
                  onChange={(e) => handleClarityLevelChange(e.target.value)}
                  className="text-base text-ink-muted bg-transparent border border-border rounded-control px-1.5 py-0.5 focus:outline-none"
                >
                  {CLARITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => setShowRegenerateModal(true)}
                title="Regenerate Story"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center text-base text-ink-muted hover:text-ink transition"
              >
                🔄
              </button>
            </div>

            {/* SAC-089 (Prompt #050): cycles between pre-built SCENARIOS
                (topics) — e.g. "Ordering at a Restaurant" → "Going
                Shopping" — not between regenerated stories within the same
                scenario, which Regenerate above already covers. App.jsx
                owns the index math (DEFAULT_SCENARIOS order) and only
                passes a callback down when that direction is valid, so
                disabled-at-boundary and "not applicable to a custom topic"
                (not part of DEFAULT_SCENARIOS at all) are both just
                "prop is undefined" from this component's point of view —
                no scenario-list knowledge needed here. Switching scenario
                reuses the same handleSelectScenario→setScenario flow as
                picking one from the picker grid, which (via App.jsx's
                existing key={scenario} on this component) forces a full
                remount — every checkbox, playback position, and piece of
                per-story state resets for free, the same way Regenerate's
                key change already does, rather than needing to manually
                reset each one here. */}
            <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
              <button
                onClick={onPreviousScenario}
                disabled={!onPreviousScenario}
                className="min-h-[44px] px-3 text-small text-ink-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition"
              >
                ← Previous Topic
              </button>
              <button
                onClick={onNextScenario}
                disabled={!onNextScenario}
                className="min-h-[44px] px-3 text-small text-ink-muted hover:text-ink disabled:opacity-30 disabled:pointer-events-none transition"
              >
                Next Topic →
              </button>
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
