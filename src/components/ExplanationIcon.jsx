// SAC-079: ⓘ icon + its expanding explanation panel, split into two
// presentational components (not one self-contained button+panel unit)
// deliberately — the panel needs to render as a block-level sibling BELOW
// the icon row it's triggered from (matching the exact placement pattern
// this file's own `openTranslationIdx`/🌐 toggle already uses in
// ListeningStoryView.jsx's transcript), not squeezed inside it. That means
// open/closed state has to live in the parent, not here — ExplanationIcon
// is a controlled button (isOpen/onClick passed in), and ExplanationPanel
// is a pure render of whatever explanation it's given.
export function ExplanationIcon({ explanation, isOpen, onClick, className = '' }) {
  const isReady = !!explanation

  return (
    <button
      onClick={() => isReady && onClick()}
      disabled={!isReady}
      title={isReady ? 'Show sentence construction' : 'Loading explanation…'}
      className={`${className} transition ${
        isReady
          ? isOpen
            ? 'text-primary'
            : 'text-ink-faint hover:text-ink-muted'
          : 'text-ink-faint/40 cursor-not-allowed'
      }`}
    >
      ⓘ
    </button>
  )
}

// SAC-081: light green, matching this round's "Grammar = green" color
// coding for the Display Spanish block — applied here rather than only at
// that one call site, so the same content reads consistently (green =
// grammar) everywhere it appears, including the Transcript's own ⓘ icons.
export function ExplanationPanel({ explanation }) {
  if (!explanation) return null

  return (
    <div className="mt-1 bg-success-light border border-border rounded-control px-3 py-2 text-small text-ink">
      <p className="mb-1.5">
        <span className="font-semibold text-success">&ldquo;{explanation.phrase}&rdquo;</span>
        {' — '}
        <span className="text-ink-muted">{explanation.literalTranslation}</span>
      </p>
      <p className="mb-1.5">
        <span className="font-semibold">In English: </span>
        {explanation.englishSyntax}
      </p>
      <p className="text-ink-muted">
        <span className="font-semibold text-ink">Pattern: </span>
        {explanation.pattern}
      </p>
    </div>
  )
}
