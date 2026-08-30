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
// SAC-085: 💡 prefix added directly here (not at each call site) so both
// this and ExplanationLoading below carry the same marker consistently.
// SAC-101: the phrase + separate trailing literal-gloss sentence (e.g.
// "'le trae el menú' — to-her brings the menu") was replaced with one line
// that weaves the literal meaning inline as parentheticals directly after
// each Spanish word/word-group (e.g. "Me (myself) muero (I die)..."),
// matching server.js's `generateSentenceExplanations` prompt, which now
// asks Claude to produce this format directly rather than post-processing
// its output here. This component is shared with ListeningStoryView.jsx's
// own Grammar block/Transcript ⓘ icons (same endpoint, same shape), so the
// format change applies there identically too.
export function ExplanationPanel({ explanation }) {
  if (!explanation) return null

  return (
    <div className="mt-1 bg-success-light border border-border rounded-control px-3 py-2 text-small text-ink">
      <p className="mb-1.5">
        <span className="mr-1">💡</span>
        <span className="font-semibold text-success">{explanation.inlinePhrase}</span>
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

// SAC-085: shown in place of ExplanationPanel the instant the Grammar
// checkbox is checked, before its sentence's explanation has actually
// finished generating in the background — same size/color/shape as the
// real panel so there's no layout jump when the content swaps in, rather
// than the box simply not existing yet (SAC-083's behavior, which gave no
// indication anything was coming). Only used at the Display Spanish call
// site — the Transcript's ⓘ icon stays disabled-until-ready instead of
// ever showing this, since a whole list of "Loading…" boxes for sentences
// nobody has asked about yet would be far noisier than one small disabled
// icon per row.
// SAC-084 fix: `failed` distinguishes "still waiting" from "that request
// failed and isn't coming" — without this, a genuine backend error (a real
// 500, or the Anthropic account hitting its own usage quota) left this box
// saying "Loading…" forever with no way to tell the two apart.
export function ExplanationLoading({ failed = false }) {
  return (
    <div className="mt-1 bg-success-light border border-border rounded-control px-3 py-2 text-small text-ink-muted">
      <span className="mr-1">💡</span>
      {failed ? 'Explanation unavailable right now.' : 'Loading explanation…'}
    </div>
  )
}
