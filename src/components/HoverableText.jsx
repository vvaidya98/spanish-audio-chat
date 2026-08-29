import { useState, useRef, useEffect } from 'react'
import { saveWord } from '../db'

const SAVE_CONFIRM_MS = 1500

function tokenize(text) {
  return text.split(/([^A-Za-zÀ-ÿ]+)/).filter((chunk) => chunk !== '')
}

/**
 * Renders Spanish text where hovering anywhere shows its English translation
 * as a badge below (the Spanish text itself stays visually unchanged — no
 * highlight wash), while clicking a single word shows just that word's
 * definition (independent of hover state). Reused for MCQ question text and
 * MCQ answer options; also used for word-click-only in the transcript, where
 * translation is instead shown via an explicit per-sentence icon
 * (showHoverTranslation={false} disables the hover-triggered badge there).
 */
export default function HoverableText({ text, translation, vocabulary = {}, className = '', showHoverTranslation = true }) {
  const [hovered, setHovered] = useState(false)
  const [clickedIdx, setClickedIdx] = useState(null)
  // SAC-090: which word's tooltip just showed a save confirmation (a
  // checkmark swap, not an alert/toast, so it doesn't interrupt playback).
  const [justSavedIdx, setJustSavedIdx] = useState(null)
  const saveTimeoutRef = useRef(null)

  // A real pre-existing bug surfaced while testing SAC-090's save flow, not
  // caused by it: this component is reused (not remounted) across sentence
  // changes in ListeningStoryView.jsx, so clickedIdx — a plain token index
  // — persisted across a `text` change. If the new sentence happened to
  // have a defined word at that same index, its tooltip appeared already
  // "open" without ever being clicked, showing the wrong word's definition
  // (and, concretely, letting a tap on the save button save/misfire against
  // stale state). Resetting on every `text` change closes any tooltip the
  // instant the underlying sentence actually changes.
  useEffect(() => {
    setHovered(false)
    setClickedIdx(null)
  }, [text])

  const handleSaveWord = (e, word, definition, idx) => {
    e.stopPropagation()
    saveWord({ spanish: word, english: definition, source: 'tooltip' }).catch(console.error)
    setJustSavedIdx(idx)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => setJustSavedIdx(null), SAVE_CONFIRM_MS)
  }

  const tokens = tokenize(text)

  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setClickedIdx(null)
      }}
    >
      {tokens.map((chunk, idx) => {
        const cleaned = chunk.toLowerCase().trim()
        const definition = vocabulary[cleaned]
        if (!definition) {
          return <span key={idx}>{chunk}</span>
        }
        return (
          <span
            key={idx}
            className="relative cursor-pointer border-b border-dotted border-secondary"
            onClick={(e) => {
              e.stopPropagation()
              setClickedIdx((prev) => (prev === idx ? null : idx))
            }}
          >
            {chunk}
            {clickedIdx === idx && (
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20 flex items-center gap-1.5">
                {definition}
                {/* SAC-090: 24px tap target — smaller than this app's usual
                    44px minimum, a deliberate exception since a full 44px
                    button would dominate this small floating tooltip; still
                    larger than the round's own suggested 20px. */}
                <button
                  onClick={(e) => handleSaveWord(e, cleaned, definition, idx)}
                  title="Save word"
                  className="min-w-[24px] min-h-[24px] flex items-center justify-center text-sm leading-none shrink-0"
                >
                  {justSavedIdx === idx ? '✓' : '🔖'}
                </button>
              </span>
            )}
          </span>
        )
      })}
      {showHoverTranslation && hovered && translation && (
        <div className="mt-1">
          <span className="inline-block bg-primary-light border border-primary text-primary-text text-small font-medium px-3 py-1 rounded-full">
            {translation}
          </span>
        </div>
      )}
    </div>
  )
}
