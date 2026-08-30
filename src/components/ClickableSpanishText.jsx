import { useState, useEffect } from 'react'
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
export default function ClickableSpanishText({ text, className = '' }) {
  const [clickedIdx, setClickedIdx] = useState(null)
  // Keyed by lowercased word — 'loading' while a fetch is in flight, a
  // definition string once it resolves, or 'failed' if it errored. Doubles
  // as a small session cache: re-clicking the same word (even a different
  // occurrence of it) never re-fetches.
  const [definitions, setDefinitions] = useState({})

  // Same reasoning as HoverableText.jsx's own SAC-092 fix: without this,
  // clickedIdx could point at a stale, now-irrelevant token position after
  // the underlying text changes (a re-translation, a direction switch, an
  // edit).
  useEffect(() => {
    setClickedIdx(null)
  }, [text])

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
    const willOpen = clickedIdx !== idx
    setClickedIdx(willOpen ? idx : null)
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
        const def = definitions[cleaned]
        return (
          <span
            key={idx}
            className="relative cursor-pointer border-b border-dotted border-secondary"
            onClick={(e) => handleWordClick(e, cleaned, idx)}
          >
            {chunk}
            {clickedIdx === idx && def === 'loading' && (
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20">
                Loading…
              </span>
            )}
            {clickedIdx === idx && def === 'failed' && (
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20">
                Unavailable
              </span>
            )}
            {clickedIdx === idx && def && def !== 'loading' && def !== 'failed' && (
              <WordSaveTooltip word={cleaned} english={def} source="translate-word" />
            )}
          </span>
        )
      })}
    </span>
  )
}
