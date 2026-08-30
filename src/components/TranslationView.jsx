import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api'
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
// not the source. SAC-098: now also used for the Replay icon's single-LINE
// playback (Part 2), not just a whole-block replay — same helper either
// way, just given a shorter string.
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
  // SAC-100: persistent checkbox replacing SAC-095/098's on-demand tap-to-
  // fetch button — same localStorage-lazy-init pattern as the Listening
  // screen's Display checkboxes (SAC-081), confirmed by reading that real
  // code first: `saved !== null ? saved === 'true' : false`, default off.
  const [showGrammarCheckbox, setShowGrammarCheckbox] = useState(() => {
    try {
      const saved = localStorage.getItem('translateShowGrammar')
      return saved !== null ? saved === 'true' : false
    } catch {
      return false
    }
  })
  // SAC-100 Part 3: cache keyed by the line's own exact (trimmed) text,
  // not its index — an index can end up pointing at different text after
  // an edit, a fresh Translate, or a variations append, but the same text
  // should never be re-fetched. 'loading' while in flight, 'failed' on
  // error, the {phrase, literalTranslation, englishSyntax, pattern}
  // explanation object on success — same shape ExplanationPanel/
  // ExplanationLoading already render elsewhere. Keying by text also means
  // this cache self-invalidates correctly without any manual clearing on
  // a new Translate/variations action: genuinely new text simply isn't in
  // the cache yet (a real miss, fetched fresh), while a line whose text
  // didn't change (e.g. an unaffected line after a variations append)
  // keeps its existing entry and correctly avoids a duplicate fetch.
  const [grammarCache, setGrammarCache] = useState({})
  // Tracks which line-texts already have a fetch dispatched (in flight or
  // done) — checked instead of grammarCache itself so this effect's own
  // dependency array doesn't need to include the cache object (which
  // would otherwise re-run the effect on every fetch completion).
  const grammarFetchedKeysRef = useRef(new Set())
  // SAC-096 Part 1: which word's tooltip is open, as a "<lineId>:<idx>"
  // key. Lifted up here (rather than left as each ClickableSpanishText
  // instance's own local state) specifically because Part 3 now renders
  // one instance PER LINE — with per-instance state, opening a word on one
  // line wouldn't close an already-open tooltip on a different line.
  const [activeToken, setActiveToken] = useState(null)
  // SAC-098 Part 2: index of the line the shared selector currently points
  // to — governs BOTH which line Grammar explains and which line Replay
  // plays. Replaces SAC-096 Part 2's "grammar binds to whichever line was
  // last word-clicked" — that overloaded word-click with a side effect on
  // grammar targeting; this is a single, deliberately-moved control
  // instead. Defaults to line 1 (index 0) on a new result.
  const [selectedLineIdx, setSelectedLineIdx] = useState(0)
  // SAC-098 Part 3: which OUTPUT line is currently being spoken during a
  // full sequential (all-lines) playback — null when nothing is playing.
  // Deliberately separate from selectedLineIdx: triggering Speak must
  // never move the persistent selector, per the round's explicit
  // constraint, and the two need visually distinct treatment so they're
  // never confused for the same thing.
  const [speakingLineIdx, setSpeakingLineIdx] = useState(null)
  const [variationsLoading, setVariationsLoading] = useState(false)
  // SAC-101 Fix 1: whether the input textarea currently has focus — drives
  // which of the two input views is shown. SAC-099 rendered its mirrored-
  // highlight block ALONGSIDE the always-visible textarea (confirmed by
  // reading the real code before this round), so English input showed two
  // visibly-stacked copies of the same text. Only one is ever shown now:
  // the editable textarea while focused, the read-only line-numbered
  // (highlight-capable, and for Spanish input, word-clickable) view
  // otherwise — but only once a result exists to justify showing it at all.
  const [isInputFocused, setIsInputFocused] = useState(false)

  const textareaRef = useRef(null)
  const gutterRef = useRef(null)
  // SAC-101 Fix 2: two narrow boundaries (one per box) replace SAC-096's
  // single view-wide rootRef — confirmed by reading the real code that the
  // old boundary wrapped the ENTIRE TranslationView, so a click ANYWHERE
  // else within Translate (the line selector, the Grammar checkbox, blank
  // space in the other box, etc. — all real, common taps SAC-098/099 added
  // a lot more of) still counted as "inside" and never dismissed an open
  // tooltip; only a click truly outside the whole component ever did.
  // Scoping each ref to just its own box's per-line content — the same
  // per-container granularity HoverableText.jsx and Vocabulary Preview
  // already use — means a click on the selector, the checkbox, or the
  // other box now correctly counts as "outside" and dismisses, while a
  // click on a different word within the SAME box still switches normally
  // (that word's own onClick already handles it, unaffected by this).
  const inputWordsRef = useRef(null)
  const outputWordsRef = useRef(null)
  // SAC-098 Part 3: guards the chained per-line utterances the same way
  // this codebase's other speech engines guard theirs (e.g.
  // ListeningStoryView.jsx's utteranceTokenRef) — bumping it invalidates
  // any utterance still scheduled/chaining from a superseded sequence
  // (a new Speak press, Clear, a direction change, or unmount).
  const speakTokenRef = useRef(0)

  // SAC-101 Fix 2: each box only listens while ITS OWN tooltip is open
  // (checked via the "input-"/"output-" prefix baked into every lineId),
  // and only treats a click inside ITS OWN box as "not outside" — a click
  // on a word within the same box still switches normally via that word's
  // own onClick, unaffected by this.
  useClickOutside(inputWordsRef, () => setActiveToken(null), activeToken != null && activeToken.startsWith('input-'))
  useClickOutside(outputWordsRef, () => setActiveToken(null), activeToken != null && activeToken.startsWith('output-'))

  // SAC-098: a scheduled-but-not-yet-fired chained utterance surviving
  // unmount would be the same class of bug SAC-075 fixed for
  // ListeningStoryView.jsx — bumping the token on unmount invalidates
  // anything still pending.
  useEffect(() => {
    return () => {
      speakTokenRef.current++
    }
  }, [])

  const handleTextareaScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // SAC-101 Fix 1: the textarea stays mounted at all times (CSS-hidden via
  // `hidden` while the read-only view is showing, not conditionally
  // unmounted) so it can be focused without waiting on a remount — but a
  // real bug was caught via live testing: calling .focus() synchronously
  // in THIS handler, in the same tick as setIsInputFocused(true), fired
  // before React had actually re-rendered and removed the `hidden` class,
  // so .focus() silently no-op'd against an element that was still
  // display:none at that exact instant. Fixed by deferring the actual
  // .focus()/cursor-placement into a useEffect keyed on isInputFocused,
  // which only runs after the DOM commit — by then the textarea is
  // genuinely visible and focusable. pendingCursorToEndRef distinguishes
  // this tap-to-edit transition (cursor should jump to the end) from the
  // user directly clicking inside the textarea themselves (onFocus below
  // also sets isInputFocused(true), but the browser's own natural click-
  // to-position-cursor behavior should be left alone in that case).
  const pendingCursorToEndRef = useRef(false)
  const handleTapToEditInput = () => {
    pendingCursorToEndRef.current = true
    setIsInputFocused(true)
    setActiveToken(null)
  }
  useEffect(() => {
    if (!isInputFocused) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    if (pendingCursorToEndRef.current) {
      const len = el.value.length
      el.setSelectionRange(len, len)
      pendingCursorToEndRef.current = false
    }
  }, [isInputFocused])

  const handleDirectionChange = (mode) => {
    setDirectionMode(mode)
    setSourceText('')
    setTranslatedText('')
    setResultDirection(null)
    setError('')
    setActiveToken(null)
    setSelectedLineIdx(0)
    setSpeakingLineIdx(null)
    setIsInputFocused(false)
    speakTokenRef.current++
    // SAC-100: not strictly required for correctness (the cache is keyed
    // by text, so stale entries for now-gone lines are simply never
    // looked up again) but tidy, and consistent with resetting every
    // other per-session piece of state here.
    setGrammarCache({})
    grammarFetchedKeysRef.current.clear()
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

  // SAC-098: the selector reset moved here from inside runTranslate() —
  // Speak also calls runTranslate() internally (SAC-094's established
  // "Speak reuses the exact same translate call, then plays it" design),
  // and resetting the selector on every runTranslate() success meant every
  // Speak press was silently resetting it too, directly violating this
  // round's explicit "sequential playback must not move the persistent
  // selector" constraint — caught via a live test that moved the selector
  // to line 3 and watched it snap back to line 1 the instant Speak was
  // pressed. A genuinely fresh Translate press still resets to line 1;
  // Speak's own internal re-translate no longer touches it at all.
  const handleTranslate = async () => {
    const result = await runTranslate()
    if (result) {
      setSelectedLineIdx(0)
      // SAC-101 Fix 1: a real click on the Translate/Speak buttons already
      // blurs the textarea naturally (focus moves to whichever element was
      // clicked), but this makes "completing a Translate/Speak action
      // switches back to the read-only view" a guarantee rather than an
      // incidental side effect of how the button happened to be triggered.
      setIsInputFocused(false)
    }
  }

  // SAC-098 Part 3: speaks every non-empty line in `lines` one at a time,
  // chained via onend (not one combined multi-line utterance — the
  // previous playTranslatedText(wholeBlock) approach had no per-line
  // start/end boundary to hang a highlight off of, confirmed by reading
  // the real code before building this). Highlights `speakingLineIdx` as
  // each line starts, clears it once the sequence ends — deliberately
  // never touches selectedLineIdx, so a persistent selector position
  // survives a full Speak untouched, per the round's explicit constraint.
  const speakLinesSequentially = (lines, direction) => {
    window.speechSynthesis.cancel()
    const token = ++speakTokenRef.current
    const applyVoice = direction === 'es-en' ? applyEnglishVoice : applySpanishVoice

    const speakLineAt = (idx) => {
      if (token !== speakTokenRef.current) return
      if (idx >= lines.length) {
        setSpeakingLineIdx(null)
        return
      }
      const line = lines[idx]
      if (!line.trim()) {
        speakLineAt(idx + 1)
        return
      }
      setSpeakingLineIdx(idx)
      const utterance = new SpeechSynthesisUtterance(line)
      applyVoice(utterance)
      utterance.onend = () => {
        if (token !== speakTokenRef.current) return
        speakLineAt(idx + 1)
      }
      utterance.onerror = () => {
        if (token !== speakTokenRef.current) return
        speakLineAt(idx + 1)
      }
      setTimeout(() => {
        if (token !== speakTokenRef.current) return
        window.speechSynthesis.speak(utterance)
      }, SPEAK_START_DELAY_MS)
    }

    speakLineAt(0)
  }

  const handleSpeak = async () => {
    const result = await runTranslate()
    if (result) {
      speakLinesSequentially(result.translated.split('\n'), result.direction)
      setIsInputFocused(false)
    }
  }

  // SAC-098 Part 2: replays only the shared selector's current line (in
  // its correct target-language voice), not the whole translated block —
  // replaces SAC-094's original "replay everything" behavior. Reuses the
  // same single-utterance playTranslatedText helper Speak used to use for
  // the whole block, just given one line's text instead.
  const handleReplay = () => {
    playTranslatedText(translatedLines[clampedSelectedLineIdx] || '', resultDirection)
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
    setActiveToken(null)
    setSelectedLineIdx(0)
    setSpeakingLineIdx(null)
    setIsInputFocused(false)
    speakTokenRef.current++
    setGrammarCache({})
    grammarFetchedKeysRef.current.clear()
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
  // Whichever side is Spanish drives Grammar's targeting.
  const sourceLines = sourceText.split('\n')
  const translatedLines = translatedText.split('\n')
  const spanishLines = isInputSpanish ? sourceLines : isOutputSpanish ? translatedLines : []
  // SAC-098/099: independently-clamped indices derived from the same
  // selectedLineIdx, one per array it might index into — the selector's
  // own UI (Prev/Next boundaries) and Replay are clamped against the
  // OUTPUT line count (what the selector's "Line N of M" actually
  // counts); Grammar's target and the INPUT box's mirrored highlight are
  // clamped against their own respective arrays, since an edit to one
  // side after translating could leave it with a different line count
  // than the other.
  const clampedSelectedLineIdx = translatedLines.length > 0 ? Math.min(selectedLineIdx, translatedLines.length - 1) : 0
  const clampedGrammarLineIdx = spanishLines.length > 0 ? Math.min(selectedLineIdx, spanishLines.length - 1) : 0
  const clampedInputLineIdx = sourceLines.length > 0 ? Math.min(selectedLineIdx, sourceLines.length - 1) : 0
  const activeSpanishLine = spanishLines[clampedGrammarLineIdx] || ''
  // SAC-098 Part 3: the sequential-playback highlight only needs to
  // visibly matter once there's more than one line to distinguish —
  // per the round's own explicit "unnecessary" call for a single line.
  const hasMultipleTranslatedLines = translatedLines.filter((l) => l.trim()).length >= 2
  // SAC-101 Fix 1: the read-only, highlight-capable (and for Spanish
  // input, word-clickable) view only takes over once there's an actual
  // result to show a selection against AND the textarea isn't the one
  // currently being edited — otherwise the plain editable textarea stays
  // visible (including pre-translation, where there's nothing yet for the
  // read-only view to usefully show).
  const showReadOnlyInputView = !isInputFocused && Boolean(translatedText) && sourceText.trim()

  const handlePrevLine = () => setSelectedLineIdx((i) => Math.max(0, i - 1))
  const handleNextLine = () => setSelectedLineIdx((i) => Math.min(translatedLines.length - 1, i + 1))

  // SAC-096 Part 4: variations only make sense for exactly one line of
  // input — zero is nothing to vary, multiple is ambiguous which line to
  // vary (per the round's own explicit rule). SAC-098 Part 1: the button
  // itself is now hidden (not just disabled) outside that one case —
  // showVariationsButton drives rendering, canGenerateVariations still
  // guards the click/loading state.
  const nonEmptySourceLineCount = sourceLines.filter((l) => l.trim()).length
  const showVariationsButton = nonEmptySourceLineCount === 1
  const canGenerateVariations = showVariationsButton && !isLoading && !variationsLoading

  // SAC-100 Part 2: replaces SAC-098's "moving the selector clears any
  // shown grammar" rule for the checked case — while showGrammarCheckbox
  // is on, moving Prev/Next (or any other change to which line is active)
  // now automatically fetches (or reuses the cached result for) the new
  // line's grammar instead of clearing it. While the checkbox is off,
  // this effect is a no-op — nothing is shown or fetched regardless of
  // selector position, per the round's explicit rule.
  useEffect(() => {
    if (!showGrammarCheckbox) return
    const line = activeSpanishLine.trim()
    if (!line) return
    if (grammarFetchedKeysRef.current.has(line)) return
    grammarFetchedKeysRef.current.add(line)
    setGrammarCache((prev) => ({ ...prev, [line]: 'loading' }))
    ;(async () => {
      try {
        const response = await apiFetch('/api/generate-sentence-explanations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sentences: [line], difficulty: 'Beginner' }),
        })
        if (!response.ok) throw new Error(`status ${response.status}`)
        const data = await response.json()
        const explanation = (data.explanations || []).find((exp) => exp.sentenceIndex === 0)
        setGrammarCache((prev) => ({ ...prev, [line]: explanation || 'failed' }))
      } catch (err) {
        console.error('Could not generate grammar explanation:', err)
        setGrammarCache((prev) => ({ ...prev, [line]: 'failed' }))
      }
    })()
  }, [showGrammarCheckbox, activeSpanishLine])

  const handleToggleGrammarCheckbox = (e) => {
    const checked = e.target.checked
    setShowGrammarCheckbox(checked)
    try {
      localStorage.setItem('translateShowGrammar', checked ? 'true' : 'false')
    } catch {
      // Storage unavailable — the checkbox still works for this session.
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

  // SAC-099 Part 1: the shared selected-line highlight (mirrored across
  // both boxes) — confirmed SAC-098's existing "currently playing during
  // sequential Speak" highlight already used bg-warn-light (yellow)
  // before picking a color for this new persistent one, per the round's
  // own explicit ask. Since this round wants the PERSISTENT selection to
  // be light-yellow specifically, that meant re-homing the transient
  // playing highlight to a different color instead (bg-secondary-light,
  // coral) rather than the other way around — the two must stay visually
  // distinct even when they land on the same line at once. Background
  // color is resolved via explicit if/else priority (never two competing
  // bg-* utility classes on one element, which would leave the outcome to
  // CSS rule order rather than a deliberate choice): playing (transient)
  // takes visual priority over selected (persistent) when both apply,
  // while the border-l-2 accent — a separate, non-conflicting CSS
  // property — still marks the line as selected either way.
  const selectedLineClasses = (isSelected, isPlaying) => {
    const bg = isPlaying ? 'bg-secondary-light' : isSelected ? 'bg-warn-light' : ''
    const border = isSelected ? 'border-primary' : 'border-transparent'
    return `border-l-2 ${border} ${bg}`
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
      {/* SAC-096 Part 3: a small numbered gutter to the left of the
          textarea, synced to it via scrollTop on scroll — a native
          <textarea> has no per-line markup to attach numbers to directly,
          so this is a separate column kept visually in lockstep instead
          (matching leading-6 line-height and top padding on both). */}
      {/* SAC-101 Fix 1: stays mounted at all times (CSS-hidden via the
          `hidden` class, not conditionally unmounted) so a tap on the
          read-only view below can call textareaRef.current.focus()
          synchronously without waiting on a remount. */}
      <div
        className={`flex border border-border rounded-control bg-[#f9f9f9] mb-2 focus-within:border-primary transition overflow-hidden ${
          showReadOnlyInputView ? 'hidden' : ''
        }`}
      >
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
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          placeholder="Enter text to translate..."
          rows={5}
          className="flex-1 bg-transparent p-3 text-body text-ink leading-6 resize-none focus:outline-none transition"
        />
      </div>

      {/* SAC-098 Part 1: moved here, directly beneath the input box (line 1
          of a single-line input), and now fully hidden — not just
          disabled — outside the one case it's meaningful for. */}
      {showVariationsButton && (
        <div className="mb-2">
          <button
            onClick={handleGenerateVariations}
            disabled={!canGenerateVariations}
            className="text-small text-ink-muted hover:text-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {variationsLoading ? 'Generating...' : '✨ More ways to say this'}
          </button>
        </div>
      )}

      {/* SAC-101 Fix 1: a native <textarea> can't host per-word clickable
          spans or a per-line background highlight, so this read-only view
          is what makes both possible — but it's now shown INSTEAD OF the
          textarea (via showReadOnlyInputView), never alongside it. SAC-099
          originally rendered this unconditionally alongside the always-
          visible textarea, which is confirmed to be exactly why English
          input showed two stacked copies of the same text — collapsed into
          a single tap-to-edit/tap-away-to-view toggle instead. Tapping
          anywhere on this view that ISN'T an actual word (which stops its
          own click from bubbling here) switches back to the editable
          textarea via handleTapToEditInput. */}
      {showReadOnlyInputView && (
        <div ref={inputWordsRef} className="mb-2" onClick={handleTapToEditInput}>
          {isInputSpanish && <p className="text-xs text-ink-faint mb-1">Tap a word for its meaning:</p>}
          {sourceLines.map((line, i) => {
            if (!line.trim()) return null
            const isSelected = i === clampedInputLineIdx
            return (
              <div key={i} className={`flex gap-2 leading-6 -mx-1 px-1 rounded-control transition ${selectedLineClasses(isSelected, false)}`}>
                <span className="w-5 shrink-0 text-right text-xs text-ink-faint select-none">{i + 1}</span>
                <p className="text-body text-ink break-words flex-1">
                  {isInputSpanish ? (
                    <ClickableSpanishText
                      text={line}
                      lineId={`input-${i}`}
                      activeToken={activeToken}
                      onActiveTokenChange={setActiveToken}
                    />
                  ) : (
                    line
                  )}
                </p>
              </div>
            )
          })}
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

      {/* SAC-098 Part 2: a single small shared header — governs both which
          line Grammar explains and which line Replay plays. Deliberately
          compact (a 24px-tall row), matching this tab's existing emphasis
          on minimizing vertical space. Shown whenever there's a result,
          even a single-line one (Prev/Next are simply both boundary-
          disabled in that case, same convention as flashcard navigation
          elsewhere in this app). */}
      {translatedText && (
        <div className="flex items-center justify-center gap-2 mb-1 text-xs text-ink-muted">
          <button
            onClick={handlePrevLine}
            disabled={clampedSelectedLineIdx === 0}
            aria-label="Previous line"
            className="min-w-[24px] min-h-[24px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink transition"
          >
            ◀
          </button>
          <span>
            Line {clampedSelectedLineIdx + 1} of {translatedLines.length}
          </span>
          <button
            onClick={handleNextLine}
            disabled={clampedSelectedLineIdx === translatedLines.length - 1}
            aria-label="Next line"
            className="min-w-[24px] min-h-[24px] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink transition"
          >
            ▶
          </button>
        </div>
      )}

      <div ref={outputWordsRef} className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[120px] mb-2">
        {translatedText ? (
          /* SAC-099 Part 2: the DOM here is already one flex row per line
             (number + text), so appending a small icon as one more flex
             child of ONLY the selected line's row was genuinely
             straightforward — no brittle gutter/positioning math needed.
             Replaces the old fixed-position replay button that always
             sat outside the line list; there is no longer a
             visually-separate "always there" replay control at all, it
             now travels with the selection. Sized 24px (this file's own
             existing convention for the selector's Prev/Next buttons, SAC-
             098), not the app's usual 44px, since a full-size button would
             dominate a single 24px-tall line row. */
          translatedLines.map((line, i) => {
            const isSelected = i === clampedSelectedLineIdx
            const isPlaying = hasMultipleTranslatedLines && i === speakingLineIdx
            return (
              <div key={i} className={`flex items-start gap-2 leading-6 -mx-1 px-1 rounded-control transition ${selectedLineClasses(isSelected, isPlaying)}`}>
                <span className="w-5 shrink-0 text-right text-xs text-ink-faint select-none pt-0.5">{i + 1}</span>
                <p className="text-body text-ink whitespace-pre-wrap break-words flex-1">
                  {isOutputSpanish ? (
                    <ClickableSpanishText
                      text={line}
                      lineId={`output-${i}`}
                      activeToken={activeToken}
                      onActiveTokenChange={setActiveToken}
                    />
                  ) : (
                    line
                  )}
                </p>
                {isSelected && (
                  <button
                    onClick={handleReplay}
                    title="Replay this line"
                    className="shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center text-sm text-ink-faint hover:text-primary transition"
                  >
                    🔊
                  </button>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-body text-ink-faint italic">Translation will appear here</p>
        )}
      </div>

      {/* SAC-100: a persistent checkbox (matching the Listening screen's
          SAC-081 Display checkboxes exactly — same classes, same
          localStorage-lazy-init pattern) replaces SAC-095/098's tap-to-
          fetch button. While checked, Grammar automatically shows
          (fetching first if not yet cached) whichever line the selector
          currently points to, updating live as Prev/Next moves — no extra
          tap needed on navigation, per this round's explicit rule. Still
          only rendered once there's actual Spanish text on screen. */}
      {spanishLines.some((l) => l.trim()) && (
        <div className="mb-2">
          <label className="flex items-center gap-1.5 text-small text-ink-muted cursor-pointer mb-1">
            <input type="checkbox" checked={showGrammarCheckbox} onChange={handleToggleGrammarCheckbox} />
            💡 Grammar
          </label>
          {showGrammarCheckbox &&
            (() => {
              const cached = grammarCache[activeSpanishLine.trim()]
              return (
                <>
                  <p className="text-xs text-ink-faint mb-1">Grammar — line {clampedGrammarLineIdx + 1}</p>
                  {(cached === undefined || cached === 'loading') && <ExplanationLoading />}
                  {cached === 'failed' && <ExplanationLoading failed />}
                  {cached && cached !== 'loading' && cached !== 'failed' && <ExplanationPanel explanation={cached} />}
                </>
              )
            })()}
        </div>
      )}

      <button
        onClick={handleCopy}
        disabled={!translatedText}
        className="w-full min-h-[44px] mb-2 rounded-control bg-primary-light text-primary-text font-semibold hover:bg-primary-light/70 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  )
}
