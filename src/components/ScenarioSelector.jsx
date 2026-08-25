import { useState } from 'react'

export const DEFAULT_SCENARIOS = [
  {
    title: 'Introducing Yourself',
    context: 'Greet someone and introduce yourself'
  },
  {
    title: 'Ordering at a Restaurant',
    context: 'You\'re hungry and want to order food'
  },
  {
    title: 'Asking for Directions',
    context: 'You\'re lost and need help finding your way'
  },
  {
    title: 'Making a New Friend',
    context: 'Chat and get to know someone new'
  },
  {
    title: 'At the Airport/Hotel',
    context: 'Check in, ask about your flight or your room'
  },
  {
    title: 'At a Pharmacy/Doctor',
    context: 'Describe how you feel and ask for help'
  },
  {
    title: 'Shopping in a Store',
    context: 'Ask about prices, sizes, and pay for items'
  },
  {
    title: 'Asking for Help/Emergency',
    context: 'Get help quickly when something goes wrong'
  },
]

export default function ScenarioSelector({ onSelectScenario, apiError, onRetry, onBackToModes, startLabel = 'Start Conversation' }) {
  const [pendingScenario, setPendingScenario] = useState(null)

  const handleChooseForMe = () => {
    const pick = DEFAULT_SCENARIOS[Math.floor(Math.random() * DEFAULT_SCENARIOS.length)]
    onSelectScenario(pick.title)
  }

  if (pendingScenario) {
    return (
      <div>
        <div className="mb-6 p-6 bg-surface border-2 border-border rounded-card shadow-sm">
          <p className="font-bold text-ink text-heading-1 mb-2">{pendingScenario.title}</p>
          <p className="text-ink-muted text-body">{pendingScenario.context}</p>
        </div>

        <button
          onClick={() => onSelectScenario(pendingScenario.title)}
          className="w-full min-h-[44px] bg-primary text-white py-3 rounded-control font-semibold hover:bg-primary-hover transition mb-3"
        >
          {startLabel}
        </button>

        <button
          onClick={() => setPendingScenario(null)}
          className="w-full min-h-[44px] bg-primary-light text-primary-text py-2 rounded-control font-semibold hover:bg-primary-light/70 transition"
        >
          ← Choose a different topic
        </button>
      </div>
    )
  }

  return (
    <div>
      {apiError && (
        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger font-semibold mb-2">⚠️ Connection Error</p>
          <p className="text-danger text-small mb-3">{apiError}</p>
          <button
            onClick={onRetry}
            className="min-h-[44px] bg-danger text-white px-4 rounded-control font-semibold hover:opacity-90 transition"
          >
            ← Dismiss
          </button>
        </div>
      )}

      {onBackToModes && (
        <button
          onClick={onBackToModes}
          className="min-h-[44px] text-primary hover:text-primary-hover text-small font-semibold mb-3"
        >
          ← Change Mode
        </button>
      )}

      <p className="text-body text-ink-muted mb-6">Choose a conversation topic to get started:</p>

      <div className="grid gap-4 mb-6">
        {DEFAULT_SCENARIOS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setPendingScenario(s)}
            className="p-4 bg-surface border-2 border-border rounded-card shadow-sm hover:border-primary hover:shadow-md transition text-left"
          >
            <p className="font-bold text-ink text-heading-2">{s.title}</p>
            <p className="text-ink-muted text-small mt-1">{s.context}</p>
          </button>
        ))}
      </div>

      <button
        onClick={handleChooseForMe}
        className="w-full min-h-[44px] bg-secondary text-white py-2 rounded-control font-semibold hover:bg-secondary-hover transition"
      >
        🎲 Choose One for Me
      </button>
    </div>
  )
}
