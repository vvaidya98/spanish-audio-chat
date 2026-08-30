import { useState } from 'react'
import { apiFetch } from '../api'
import { saveWord } from '../db'
import { applySpanishVoice, applyEnglishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'

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
  // SAC-094: the radio selection — 'auto' | 'es-en' | 'en-es'. Replaces the
  // old single isSpanishToEnglish boolean + toggle button.
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

  const handleClear = () => {
    setSourceText('')
    setTranslatedText('')
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

  return (
    <div>
      <button
        onClick={onBack}
        className="min-h-[44px] mb-4 px-3 -ml-1 rounded-control text-primary-text font-semibold hover:bg-primary-light transition flex items-center gap-1"
      >
        ← Back
      </button>

      <p className="text-heading-1 text-ink mb-4">🌐 Translation</p>

      {/* SAC-094: plain radio buttons, matching MyWordsView.jsx's SAC-093
          review-setup styling (bare native <input>, no button-style
          treatment) rather than a new radio visual pattern. */}
      <div className="flex flex-col gap-2 mb-4">
        <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
          <input type="radio" name="translate-direction" checked={directionMode === 'auto'} onChange={() => handleDirectionChange('auto')} />
          Auto detect
        </label>
        <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
          <input type="radio" name="translate-direction" checked={directionMode === 'es-en'} onChange={() => handleDirectionChange('es-en')} />
          Spanish to English
        </label>
        <label className="flex items-center gap-2 text-body text-ink cursor-pointer">
          <input type="radio" name="translate-direction" checked={directionMode === 'en-es'} onChange={() => handleDirectionChange('en-es')} />
          English to Spanish
        </label>
      </div>

      <p className="text-small text-ink-muted mb-1">{inputFlag || '🌐'}</p>
      <textarea
        value={sourceText}
        onChange={handleSourceTextChange}
        placeholder="Enter text to translate..."
        rows={5}
        className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 text-body text-ink mb-2 resize-none focus:outline-none focus:border-primary transition"
      />

      <div className="flex gap-2 mb-2">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Translating...' : 'Translate'}
        </button>
        <button
          onClick={handleSpeak}
          disabled={!sourceText.trim() || isLoading}
          className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔊 Speak
        </button>
      </div>
      <button
        onClick={handleClear}
        className="w-full min-h-[44px] mb-4 rounded-control bg-secondary-light text-secondary-text font-semibold hover:bg-secondary-light/70 transition"
      >
        Clear
      </button>

      {error && (
        <div className="mb-4 p-3 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      <p className="text-small text-ink-muted mb-1">{outputFlag || '🌐'}</p>
      <div className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[120px] mb-2 flex items-start gap-2">
        {translatedText ? (
          <>
            <p className="text-body text-ink whitespace-pre-wrap flex-1">{translatedText}</p>
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
