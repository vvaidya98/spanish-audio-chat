import { useState } from 'react'

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
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap bg-secondary-light border border-secondary text-secondary-text text-xs px-2 py-1 rounded-control shadow-lg z-20">
                {definition}
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
