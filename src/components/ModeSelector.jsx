export default function ModeSelector({ onSelectMode }) {
  return (
    <div>
      <p className="text-body text-ink-muted mb-6">How would you like to practice?</p>

      <div className="grid gap-4">
        <button
          onClick={() => onSelectMode('listening')}
          className="p-6 bg-surface border-2 border-border rounded-card shadow-sm hover:border-secondary hover:shadow-md transition text-left"
        >
          <p className="font-bold text-ink text-heading-2 mb-1">🎧 Listening Mode</p>
          <p className="text-ink-muted text-small">Improve comprehension</p>
        </button>

        {/* SAC-091: targets the new combined 'vocab' mode (VocabHubView,
            defaulting to its Translate tab) — 'translation' no longer has
            its own render branch. Label/description kept as Translation-
            specific, matching this card's own actual framing ("how would
            you like to practice" -> an activity, not a review feature) —
            My Words has never had its own card here, only in FooterNav, so
            nothing needed adding for it specifically. */}
        <button
          onClick={() => onSelectMode('vocab')}
          className="p-6 bg-surface border-2 border-border rounded-card shadow-sm hover:border-primary hover:shadow-md transition text-left"
        >
          <p className="font-bold text-ink text-heading-2 mb-1">🌐 Translation</p>
          <p className="text-ink-muted text-small">Translate between Spanish and English</p>
        </button>

        {/* SAC-097: placed after Translation, before the disabled
            Conversation card, matching the confirmed real current order. */}
        <button
          onClick={() => onSelectMode('sentence-builder')}
          className="p-6 bg-surface border-2 border-border rounded-card shadow-sm hover:border-secondary hover:shadow-md transition text-left"
        >
          <p className="font-bold text-ink text-heading-2 mb-1">🧩 Build a Sentence</p>
          <p className="text-ink-muted text-small">Learn Spanish sentence construction step by step</p>
        </button>

        <button
          disabled
          className="p-6 bg-surface border-2 border-border rounded-card text-left opacity-50 cursor-not-allowed"
        >
          <p className="font-bold text-ink-muted text-heading-2 mb-1">🗣️ Conversation mode coming soon</p>
          <p className="text-ink-faint text-small">Practice speaking and listening</p>
        </button>
      </div>
    </div>
  )
}
