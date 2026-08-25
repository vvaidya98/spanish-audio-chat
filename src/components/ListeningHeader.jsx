export default function ListeningHeader({ onBack, onChangeMode, onDifferentScenario }) {
  return (
    <div className="flex items-center gap-1 mb-4 pb-3 border-b border-border">
      <button
        onClick={onBack}
        title="Back to scenarios"
        className="min-h-[44px] text-small text-ink-muted hover:text-ink font-semibold px-2 rounded-control hover:bg-primary-light transition"
      >
        ← Back
      </button>
      <button
        onClick={onChangeMode}
        title="Change Mode"
        className="min-h-[44px] text-small text-ink-muted hover:text-ink font-semibold px-2 rounded-control hover:bg-primary-light transition"
      >
        📋 Change Mode
      </button>
      <button
        onClick={onDifferentScenario}
        title="Different Scenario"
        className="min-h-[44px] text-small text-ink-muted hover:text-ink font-semibold px-2 rounded-control hover:bg-primary-light transition"
      >
        🔄 Diff Scenario
      </button>
    </div>
  )
}
