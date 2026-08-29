// Conversation Mode is disabled app-wide (SAC-038, ModeSelector.jsx) — this
// footer shortcut mirrors that same disabled state rather than linking
// somewhere dead. Re-enable both together once Conversation Mode ships.
const ITEMS = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'listening', icon: '🎧', label: 'Listening' },
  { key: 'conversation', icon: '💬', label: 'Conversation', disabled: true },
  // SAC-091: Translate and My Words consolidated into one entry (a
  // segmented control inside VocabHubView.jsx picks between them) — reuses
  // Translate's 🌐 icon (the default when picking one of the two), labeled
  // "My Words" per an explicit follow-up correction to keep the label
  // itself concise rather than something like "Translate & My Words."
  { key: 'vocab', icon: '🌐', label: 'My Words' },
  { key: 'history', icon: '📊', label: 'History' },
]

export default function FooterNav({ onHome, onListening, onVocab, onHistory }) {
  const handlers = { home: onHome, listening: onListening, vocab: onVocab, history: onHistory }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={handlers[item.key]}
          disabled={item.disabled}
          className="flex-1 min-h-[60px] flex flex-col items-center justify-center gap-0.5 text-ink-muted hover:text-primary hover:bg-primary-light transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-muted"
        >
          <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
          <span className="text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
