import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import { saveWord } from '../db'
import { applySpanishVoice, applyEnglishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'
import ClickableSpanishText from './ClickableSpanishText'
import { ExplanationPanel, ExplanationLoading } from './ExplanationIcon'

const COPIED_MESSAGE_MS = 2000

// SAC-094: plays a short one-off utterance (Quick Speak / replay), not a
// long-form story — deliberately not hooked into ListeningStoryView.jsx's
// 4-state playback machine or wake-lock logic, which exist for exactly that
// longer-form case and would be pure overhead here. `direction` is the
// resolved es-en/en-es for the CURRENT text on screen (see resultDirection
// below), not necessarily the live radio selection — it picks the voice
// for the language actually being spoken (the target/translated language),
// not the source.
function playTranslatedText(text, direction) {
  if (!text) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    if (direction === 'es-en') {
      applyEnglishVoice(utterance)
    } else {
      applySpanishVoice(utterance)
    }
    setTimeout(() => window.speechSynthesis.speak(utterance), SPEAK_START_DELAY_MS)
  } catch (err) {
    console.error('Could not play translation audio:', err)
  }
}

export default function TranslationView({ onBack }) {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  // SAC-094: the radio selection — 'auto' | 'es-en' | 'en-es'.
  const [directionMode, setDirectionMode] = useState('auto')
  // The direction actually used for whatever is currently displayed —
  // decoupled from directionMode so switching the radio after a completed
  // translation doesn't retroactively relabel/reflag a result that hasn't
  // been re-translated yet. null until a translation completes (or, in
  // Auto mode, is invalidated by editing the input — see the textarea's
  // onChange below).
  const [resultDirection, setResultDirection] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [wordSaved, setWordSaved] = useState(false)
  // SAC-095: null (not yet requested) | 'loading' | 'failed' | the
  // {phrase, literalTranslation, englishSyntax, pattern} explanation object
  // — same shape ExplanationPanel/ExplanationLoading already render
  // elsewhere, reused here as-is.
  const [grammarState, setGrammarState] = useState(null)

  const handleDirectionChange = (mode) => {
    setDirectionMode(mode)
    setSourceText('')
    setTranslatedText('')
    setResultDirection(null)
    setError('')
    setWordSaved(false)
  }

  const handleSourceTextChange = (e) => {
    setSourceText(e.target.value)
    // SAC-094: only Auto mode's flags depend on a completed result —
    // manual-mode flags reflect the radio selection itself and don't need
    // resetting here. Editing after a completed Auto result means the
    // previously detected language may no longer apply to the new text.
    if (directionMode === 'auto' && resultDirection) {
      setResultDirection(null)
    }
  }

  // SAC-094: single shared translate action for both Translate and Speak
  // (no second code path) — returns the result so Speak can chain an
  // auto-play onto it, or null on failure/empty input.
  const runTranslate = async () => {
    if (!sourceText.trim()) return null

    setIsLoading(true)
    setError('')
    setWordSaved(false)

    const isAuto = directionMode === 'auto'
    const body = isAuto
      ? { text: sourceText }
      : {
          text: sourceText,
          sourceLanguage: directionMode === 'es-en' ? 'Spanish' : 'English',
          targetLanguage: directionMode === 'es-en' ? 'English' : 'Spanish',
        }

    try {
      const response = await apiFetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Translation failed')
        return null
      }

      const resolved = isAuto
        ? data.detectedSourceLanguage?.toLowerCase().startsWith('sp')
          ? 'es-en'
          : 'en-es'
        : directionMode
      setTranslatedText(data.translated)
      setResultDirection(resolved)
      return { translated: data.translated, direction: resolved }
    } catch (err) {
      setError('Error connecting to translation service')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranslate = () => {
    runTranslate()
  }

  const handleSpeak = async () => {
    const result = await runTranslate()
    if (result) playTranslatedText(result.translated, result.direction)
  }

  const handleReplay = () => {
    playTranslatedText(translatedText, resultDirection)
  }

  // SAC-094: same direction-aware field mapping as before, now driven by
  // resultDirection (the resolved direction for the current result)
  // instead of the old isSpanishToEnglish boolean.
  const handleSaveToWords = async () => {
    if (!translatedText) return
    const spanish = resultDirection === 'es-en' ? sourceText : translatedText
    const english = resultDirection === 'es-en' ? translatedText : sourceText
    try {
      await saveWord({ spanish, english, source: 'translate' })
      setWordSaved(true)
      setTimeout(() => setWordSaved(false), COPIED_MESSAGE_MS)
    } catch (err) {
      console.error('Could not save word:', err)
    }
  }

  const handleCopy = async () => {
    if (!translatedText) return
    try {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MESSAGE_MS)
    } catch (err) {
      console.error('Could not copy to clipboard:', err)
    }
  }

  // SAC-095: the spec describes Clear as resetting "direction-related
  // state... back to the tab's initial state" — read literally, that means
  // directionMode itself goes back to 'auto' too, not just the text/result
  // fields. A live test caught this: with directionMode left alone,
  // Clear correctly kept a manually-selected direction's flags showing
  // (matching "flags reflect the selection, no placeholder delay" from
  // SAC-094) — technically consistent, but not what "back to the tab's
  // initial state" actually asks for.
  const handleClear = () => {
    setSourceText('')
    setTranslatedText('')
    setDirectionMode('auto')
    setResultDirection(null)
    setError('')
    setWordSaved(false)
  }

  // SAC-094: manual modes know their flags immediately (the direction is
  // already selected, no API call needed to know it); Auto mode only knows
  // once resultDirection is set by a completed translation — until then
  // both boxes show a neutral 🌐 placeholder instead of a flag.
  const inputFlag =
    directionMode === 'es-en' ? '🇪🇸' : directionMode === 'en-es' ? '🇬🇧' : resultDirection === 'es-en' ? '🇪🇸' : resultDirection === 'en-es' ? '🇬🇧' : null
  const outputFlag =
    directionMode === 'es-en' ? '🇬🇧' : directionMode === 'en-es' ? '🇪🇸' : resultDirection === 'es-en' ? '🇬🇧' : resultDirection === 'en-es' ? '🇪🇸' : null

  // SAC-095: which box (if either) currently shows Spanish text — manual
  // modes know immediately, Auto mode only once resultDirection resolves
  // (before that, per spec, neither box is clickable yet).
  const isInputSpanish = directionMode === 'es-en' || (directionMode === 'auto' && resultDirection === 'es-en')
  const isOutputSpanish = directionMode === 'en-es' || (directionMode === 'auto' && resultDirection === 'en-es')
  const spanishText = isInputSpanish ? sourceText : isOutputSpanish ? translatedText : ''

  // SAC-095: resets whenever the actual Spanish text changes for any
  // reason (edit, direction switch, a new translation result, Clear) —
  // one effect covers every call site rather than resetting grammarState
  // manually in each handler.
  useEffect(() => {
    setGrammarState(null)
  }, [spanishText])

  const fetchGrammar = async () => {
    if (!spanishText.trim()) return
    setGrammarState('loading')
    try {
      const response = await apiFetch('/api/generate-sentence-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: [spanishText], difficulty: 'Beginner' }),
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

  return (
    <div>
      <button
        onClick={onBack}
        className="min-h-[44px] mb-4 px-3 -ml-1 rounded-control text-primary-text font-semibold hover:bg-primary-light transition flex items-center gap-1"
      >
        ← Back
      </button>

      <p className="text-heading-1 text-ink mb-4">🌐 Translation</p>

      {/* SAC-095: compact single-line chip row — same real radio inputs as
          SAC-094, just restyled. Selected chip gets a darker (bg-ink,
          neutral not colorful per spec) border/background rather than a
          brand color, so it reads as "chosen" without competing visually
          with the Translate/Speak/Clear row below it. */}
      <div className="flex gap-1.5 mb-3">
        {[
          { mode: 'auto', label: 'Auto' },
          { mode: 'es-en', label: '🇪🇸→🇬🇧' },
          { mode: 'en-es', label: '🇬🇧→🇪🇸' },
        ].map(({ mode, label }) => (
          <label
            key={mode}
            className={`flex-1 flex items-center justify-center gap-1 min-h-[36px] px-1 rounded-control border text-[0.75rem] cursor-pointer transition ${
              directionMode === mode ? 'border-ink bg-ink/5 font-semibold text-ink' : 'border-border text-ink-muted'
            }`}
          >
            <input
              type="radio"
              name="translate-direction"
              checked={directionMode === mode}
              onChange={() => handleDirectionChange(mode)}
              className="w-3 h-3"
            />
            {label}
          </label>
        ))}
      </div>

      <p className="text-small text-ink-muted mb-1">{inputFlag || '🌐'}</p>
      <textarea
        value={sourceText}
        onChange={handleSourceTextChange}
        placeholder="Enter text to translate..."
        rows={5}
        className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 text-body text-ink mb-2 resize-none focus:outline-none focus:border-primary transition"
      />

      {/* SAC-095: the textarea above stays the live editable input — a
          native <textarea> can't host per-word clickable spans — so a
          separate read-only clickable rendering of the same text appears
          just below it when this is the Spanish side (manual 🇪🇸→🇬🇧, or
          Auto once resolved to es-en). */}
      {isInputSpanish && sourceText.trim() && (
        <div className="mb-2">
          <p className="text-xs text-ink-faint mb-1">Tap a word for its meaning:</p>
          <p className="text-body text-ink break-words">
            <ClickableSpanishText text={sourceText} />
          </p>
        </div>
      )}

      {/* SAC-095: compact bordered/plain buttons on one line, replacing the
          old filled bg-primary Translate/Speak row plus a separate Clear
          row — same handlers, same disabled logic, purely a visual
          simplification. */}
      <div className="flex gap-1.5 mb-4">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="flex-1 min-h-[40px] px-1 rounded-control border border-border text-ink text-small font-medium hover:bg-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          <span aria-hidden="true">🌐</span> {isLoading ? '...' : 'Translate'}
        </button>
        <button
          onClick={handleSpeak}
          disabled={!sourceText.trim() || isLoading}
          className="flex-1 min-h-[40px] px-1 rounded-control border border-border text-ink text-small font-medium hover:bg-primary-light transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          🔊 Speak
        </button>
        <button
          onClick={handleClear}
          className="flex-1 min-h-[40px] px-1 rounded-control border border-border text-ink text-small font-medium hover:bg-danger-light transition flex items-center justify-center gap-1"
        >
          <span aria-hidden="true" className="text-danger">✕</span> Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      <p className="text-small text-ink-muted mb-1">{outputFlag || '🌐'}</p>
      <div className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[120px] mb-2 flex items-start gap-2">
        {translatedText ? (
          <>
            <p className="text-body text-ink whitespace-pre-wrap flex-1 break-words">
              {isOutputSpanish ? <ClickableSpanishText text={translatedText} /> : translatedText}
            </p>
            <button
              onClick={handleReplay}
              title="Replay"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg text-ink-faint hover:text-primary hover:bg-primary-light transition shrink-0"
            >
              🔊
            </button>
          </>
        ) : (
          <p className="text-body text-ink-faint italic">Translation will appear here</p>
        )}
      </div>

      {/* SAC-095: only shown once there's actual Spanish text on screen —
          fetches on tap only, never automatically alongside Translate/
          Speak's own call. Reuses ExplanationPanel/ExplanationLoading
          as-is (same generate-sentence-explanations endpoint SAC-081/085
          already use for the story screen), not a new explanation style. */}
      {spanishText.trim() && (
        <div className="mb-2">
          {grammarState === null && (
            <button onClick={fetchGrammar} className="text-small text-ink-muted hover:text-ink transition">
              💡 Grammar
            </button>
          )}
          {grammarState === 'loading' && <ExplanationLoading />}
          {grammarState === 'failed' && <ExplanationLoading failed />}
          {grammarState && grammarState !== 'loading' && grammarState !== 'failed' && <ExplanationPanel explanation={grammarState} />}
        </div>
      )}

      <button
        onClick={handleCopy}
        disabled={!translatedText}
        className="w-full min-h-[44px] mb-2 rounded-control bg-primary-light text-primary-text font-semibold hover:bg-primary-light/70 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>

      <button
        onClick={handleSaveToWords}
        disabled={!translatedText}
        className="w-full min-h-[44px] rounded-control bg-secondary-light text-secondary-text font-semibold hover:bg-secondary-light/70 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {wordSaved ? '✓ Saved!' : '🔖 Save to My Words'}
      </button>
    </div>
  )
}
