import { useState, useEffect } from 'react'
import WordSaveTooltip from './WordSaveTooltip'

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
            {clickedIdx === idx && <WordSaveTooltip word={cleaned} english={definition} source="tooltip" />}
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
