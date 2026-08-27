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
