import { useState } from 'react'
import { apiFetch } from '../api'
import { tokenize } from './HoverableText'
import WordSaveTooltip from './WordSaveTooltip'

// SAC-095: HoverableText.jsx's word-click is entirely driven by a
// precomputed `vocabulary` map (word -> definition) that only exists for
// story text — Translate's Spanish text is arbitrary and only known at
// click time, so this fetches each clicked word's definition on demand
// instead, reusing the existing /api/translate endpoint for a single word
// rather than building a new lookup endpoint. Renders the exact same
// WordSaveTooltip popup every other click-word surface uses, so the result
// looks and behaves identically once a definition is available.
//
// SAC-096: only ever used by TranslationView.jsx, which now renders one
// instance per line (for the line-number gutter). Which word is open is
// lifted to the parent (`activeToken`/`onActiveTokenChange`) rather than
// kept as this component's own local state, so only one tooltip can ever
// be open across every line at once — with per-instance local state,
// opening a word on line 3 would leave an already-open tooltip on line 1
// visibly stuck open too, undermining the Part 1 dismiss fix at the
// multi-line level. `lineId` (the line's own index) is folded into the
// token key so keys stay unique across every line's instance, and is
// reported back via `onWordInteract` so the parent can track which line
// the user last interacted with for Part 2's grammar binding.
//
// SAC-104: optional `mutedChunkIndices` (a Set of raw tokenize() chunk
// indices) lets a caller flag specific words as visually muted/grey —
// Sentence Builder's completed-sentence view uses this to keep its
// fixed-word grey treatment consistent even once the build-up row
// becomes the final assembled-sentence display, without touching click/
// save behavior at all. Purely additive and opt-in — TranslationView.jsx
// never passes it, so its own rendering is completely unaffected.
export default function ClickableSpanishText({
  text,
  className = '',
  lineId,
  activeToken,
  onActiveTokenChange,
  onWordInteract,
  mutedChunkIndices,
}) {
  // Keyed by lowercased word — 'loading' while a fetch is in flight, a
  // definition string once it resolves, or 'failed' if it errored. Doubles
  // as a small session cache: re-clicking the same word (even a different
  // occurrence of it) never re-fetches.
  const [definitions, setDefinitions] = useState({})

  const fetchDefinition = async (cleaned) => {
    setDefinitions((prev) => ({ ...prev, [cleaned]: 'loading' }))
    try {
      const response = await apiFetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleaned, sourceLanguage: 'Spanish', targetLanguage: 'English' }),
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      const data = await response.json()
      setDefinitions((prev) => ({ ...prev, [cleaned]: data.translated || '' }))
    } catch (err) {
      console.error('Could not look up word:', err)
      setDefinitions((prev) => ({ ...prev, [cleaned]: 'failed' }))
    }
  }

  const handleWordClick = (e, cleaned, idx) => {
    e.stopPropagation()
    const key = `${lineId}:${idx}`
    const willOpen = activeToken !== key
    onActiveTokenChange(willOpen ? key : null)
    if (onWordInteract) onWordInteract(lineId)
    if (!willOpen) return
    if (!definitions[cleaned]) fetchDefinition(cleaned)
  }

  const tokens = tokenize(text)

  return (
    <span className={className}>
      {tokens.map((chunk, idx) => {
        const cleaned = chunk.toLowerCase().trim()
        if (!/[a-zà-ÿ]/i.test(cleaned)) {
          return <span key={idx}>{chunk}</span>
        }
        const key = `${lineId}:${idx}`
        const isOpen = activeToken === key
        const def = definitions[cleaned]
        const isMuted = mutedChunkIndices?.has(idx)
        return (
          <span
            key={idx}
            className={
              isMuted
                ? 'relative cursor-pointer border-b border-dotted border-secondary text-ink-faint'
                : 'relative cursor-pointer border-b border-dotted border-secondary'
            }
            onClick={(e) => handleWordClick(e, cleaned, idx)}
          >
            {chunk}
            {isOpen && def === 'loading' && (
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20">
                Loading…
              </span>
            )}
            {isOpen && def === 'failed' && (
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20">
                Unavailable
              </span>
            )}
            {isOpen && def && def !== 'loading' && def !== 'failed' && (
              <WordSaveTooltip word={cleaned} english={def} source="translate-word" />
            )}
          </span>
        )
      })}
    </span>
  )
}
