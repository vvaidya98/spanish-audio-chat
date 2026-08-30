import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api'
import { saveWord } from '../db'
import { applySpanishVoice, applyEnglishVoice, SPEAK_START_DELAY_MS } from '../speechUtils'
import ClickableSpanishText from './ClickableSpanishText'
import { ExplanationPanel, ExplanationLoading } from './ExplanationIcon'
import { useClickOutside } from '../useClickOutside'

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
  // SAC-096 Part 1: which word's tooltip is open, as a "<lineId>:<idx>"
  // key. Lifted up here (rather than left as each ClickableSpanishText
  // instance's own local state) specifically because Part 3 now renders
  // one instance PER LINE — with per-instance state, opening a word on one
  // line wouldn't close an already-open tooltip on a different line.
  const [activeToken, setActiveToken] = useState(null)
  // SAC-096 Part 2: index of the line the user last tapped a word on,
  // driving which line Grammar targets. Defaults to line 1 (index 0) per
  // spec until a real interaction updates it.
  const [activeLineIdx, setActiveLineIdx] = useState(0)
  const [variationsLoading, setVariationsLoading] = useState(false)

  const rootRef = useRef(null)
  const textareaRef = useRef(null)
  const gutterRef = useRef(null)

  // SAC-096 Part 1: closes an open word tooltip on a tap/click anywhere
  // outside this view — see useClickOutside.js for why nothing did this
  // before. A click on a word inside this view isn't "outside" (contains()
  // catches it), so the existing same-word/cross-word toggle logic in
  // ClickableSpanishText is unaffected.
  useClickOutside(rootRef, () => setActiveToken(null), activeToken !== null)

  const handleTextareaScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleDirectionChange = (mode) => {
    setDirectionMode(mode)
    setSourceText('')
    setTranslatedText('')
    setResultDirection(null)
    setError('')
    setWordSaved(false)
    setActiveToken(null)
    setActiveLineIdx(0)
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
    // SAC-096: an edit can shift every word's token index on this line, so
    // a tooltip left open against the old text would point at the wrong
    // word — close it, same reasoning HoverableText.jsx's own [text]-keyed
    // reset already uses.
    setActiveToken(null)
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
      // SAC-096 Part 2: a fresh result is effectively a new session for
      // grammar-binding purposes — default back to line 1 rather than
      // keeping a stale index from whatever was previously on screen.
      setActiveLineIdx(0)
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
    setActiveToken(null)
    setActiveLineIdx(0)
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

  // SAC-096 Part 3: split into lines for the gutter/per-line rendering.
  // Whichever side is Spanish drives Part 2's grammar-line binding.
  const sourceLines = sourceText.split('\n')
  const translatedLines = translatedText.split('\n')
  const spanishLines = isInputSpanish ? sourceLines : isOutputSpanish ? translatedLines : []
  const clampedLineIdx = spanishLines.length > 0 ? Math.min(activeLineIdx, spanishLines.length - 1) : 0
  const activeSpanishLine = spanishLines[clampedLineIdx] || ''

  // SAC-096 Part 4: variations only make sense for exactly one line of
  // input — zero is nothing to vary, multiple is ambiguous which line to
  // vary (per the round's own explicit rule).
  const nonEmptySourceLineCount = sourceLines.filter((l) => l.trim()).length
  const canGenerateVariations = nonEmptySourceLineCount === 1 && !isLoading && !variationsLoading

  // SAC-095/096: resets whenever the specific line Grammar targets
  // changes for any reason (edit to that line, a new translation result,
  // switching which line is active) — one effect covers every call site
  // rather than resetting grammarState manually everywhere.
  useEffect(() => {
    setGrammarState(null)
  }, [activeSpanishLine])

  const fetchGrammar = async () => {
    if (!activeSpanishLine.trim()) return
    setGrammarState('loading')
    try {
      const response = await apiFetch('/api/generate-sentence-explanations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: [activeSpanishLine], difficulty: 'Beginner' }),
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

  // SAC-096 Part 4: one combined call returns both the alternate phrasings
  // AND their translations — deliberately not two separate calls (generate
  // phrasings, then translate them), which would double this on-demand
  // action's own API cost for no benefit. The endpoint detects the input
  // line's language itself, so this works whether or not a translation has
  // already run (Auto mode with no result yet included).
  const handleGenerateVariations = async () => {
    if (!canGenerateVariations) return
    setVariationsLoading(true)
    setError('')
    try {
      const response = await apiFetch('/api/generate-variations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Could not generate variations')
        return
      }
      const variations = data.variations || []
      const phrasings = variations.map((v) => v.phrasing).filter(Boolean)
      const translations = variations.map((v) => v.translation).filter(Boolean)
      if (phrasings.length === 0) return

      setSourceText((prev) => [prev, ...phrasings].join('\n'))
      // The existing translatedText only actually corresponds to the
      // current single-line source when it's ALSO exactly one line — any
      // other shape (empty, because Translate was never pressed; or
      // multiple lines, because the source was edited/replaced after an
      // earlier multi-line translation, leaving stale unrelated content
      // behind) means it does not reliably line up with this one input
      // line. A live test caught the multi-line case specifically:
      // appending onto stale leftover output produced more output lines
      // than input lines, misaligned from the very first row. In both
      // non-corresponding cases, replace line 1 with this call's own
      // originalTranslation instead of trusting whatever was already
      // there; only in the one-line case is appending onto the existing
      // line 1 actually correct.
      setTranslatedText((prev) => {
        const prevLines = prev.split('\n')
        const prevIsSingleLine = prev.trim() && prevLines.length === 1
        return prevIsSingleLine ? [prev, ...translations].join('\n') : [data.originalTranslation, ...translations].join('\n')
      })
      // Lets word-click/grammar work immediately on the newly-appended
      // Spanish lines in Auto mode, rather than waiting on a real
      // Translate press to (re)discover a direction this call already
      // detected. Manual modes don't consult resultDirection for this, so
      // this is a no-op there.
      if (directionMode === 'auto' && data.detectedLanguage) {
        setResultDirection(data.detectedLanguage.toLowerCase().startsWith('sp') ? 'es-en' : 'en-es')
      }
    } catch (err) {
      console.error('Could not generate variations:', err)
      setError('Could not generate variations')
    } finally {
      setVariationsLoading(false)
    }
  }

  return (
    <div ref={rootRef}>
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
      {/* SAC-096 Part 3: a small numbered gutter to the left of the
          textarea, synced to it via scrollTop on scroll — a native
          <textarea> has no per-line markup to attach numbers to directly,
          so this is a separate column kept visually in lockstep instead
          (matching leading-6 line-height and top padding on both). */}
      <div className="flex border border-border rounded-control bg-[#f9f9f9] mb-2 focus-within:border-primary transition overflow-hidden">
        <div
          ref={gutterRef}
          className="w-7 shrink-0 pt-3 pb-3 text-right pr-1 text-xs text-ink-faint select-none overflow-hidden"
        >
          {sourceLines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={sourceText}
          onChange={handleSourceTextChange}
          onScroll={handleTextareaScroll}
          placeholder="Enter text to translate..."
          rows={5}
          className="flex-1 bg-transparent p-3 text-body text-ink leading-6 resize-none focus:outline-none transition"
        />
      </div>

      {/* SAC-095: the textarea above stays the live editable input — a
          native <textarea> can't host per-word clickable spans — so a
          separate read-only clickable rendering of the same text appears
          just below it when this is the Spanish side (manual 🇪🇸→🇬🇧, or
          Auto once resolved to es-en). SAC-096 Part 3: rendered per-line,
          numbered to match the gutter above. */}
      {isInputSpanish && sourceText.trim() && (
        <div className="mb-2">
          <p className="text-xs text-ink-faint mb-1">Tap a word for its meaning:</p>
          {sourceLines.map((line, i) =>
            line.trim() ? (
              <div key={i} className="flex gap-2 leading-6">
                <span className="w-5 shrink-0 text-right text-xs text-ink-faint select-none">{i + 1}</span>
                <p className="text-body text-ink break-words flex-1">
                  <ClickableSpanishText
                    text={line}
                    lineId={`input-${i}`}
                    activeToken={activeToken}
                    onActiveTokenChange={setActiveToken}
                    onWordInteract={() => setActiveLineIdx(i)}
                  />
                </p>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* SAC-096 Part 4: enabled only for exactly one non-empty input
          line — a title explains why when it's disabled for that reason,
          rather than a silently-grayed-out button. */}
      <div className="mb-2">
        <button
          onClick={handleGenerateVariations}
          disabled={!canGenerateVariations}
          title={nonEmptySourceLineCount !== 1 ? 'Enter exactly one line to generate variations' : undefined}
          className="text-small text-ink-muted hover:text-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {variationsLoading ? 'Generating...' : '✨ More ways to say this'}
        </button>
      </div>

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
      <div className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[120px] mb-2">
        {translatedText ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {/* SAC-096 Part 3: numbered per line, matching the input
                  gutter's numbering — Part 3's own line-correspondence
                  guarantee (server.js's multilineInstruction) is what
                  makes line N here reliably match line N of the input. */}
              {translatedLines.map((line, i) => (
                <div key={i} className="flex gap-2 leading-6">
                  <span className="w-5 shrink-0 text-right text-xs text-ink-faint select-none">{i + 1}</span>
                  <p className="text-body text-ink whitespace-pre-wrap break-words flex-1">
                    {isOutputSpanish ? (
                      <ClickableSpanishText
                        text={line}
                        lineId={`output-${i}`}
                        activeToken={activeToken}
                        onActiveTokenChange={setActiveToken}
                        onWordInteract={() => setActiveLineIdx(i)}
                      />
                    ) : (
                      line
                    )}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={handleReplay}
              title="Replay"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg text-ink-faint hover:text-primary hover:bg-primary-light transition shrink-0"
            >
              🔊
            </button>
          </div>
        ) : (
          <p className="text-body text-ink-faint italic">Translation will appear here</p>
        )}
      </div>

      {/* SAC-095: only shown once there's actual Spanish text on screen —
          fetches on tap only, never automatically alongside Translate/
          Speak's own call. Reuses ExplanationPanel/ExplanationLoading
          as-is (same generate-sentence-explanations endpoint SAC-081/085
          already use for the story screen), not a new explanation style.
          SAC-096 Part 2: now bound to whichever line was last interacted
          with (activeLineIdx, default line 1) instead of the whole block,
          and labeled with that line number so it's never ambiguous which
          sentence is being explained. */}
      {spanishLines.some((l) => l.trim()) && (
        <div className="mb-2">
          {grammarState === null && (
            <button onClick={fetchGrammar} className="text-small text-ink-muted hover:text-ink transition">
              💡 Grammar — line {clampedLineIdx + 1}
            </button>
          )}
          {grammarState !== null && (
            <p className="text-xs text-ink-faint mb-1">Grammar — line {clampedLineIdx + 1}</p>
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
