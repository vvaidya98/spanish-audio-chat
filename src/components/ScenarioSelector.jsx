import { useState } from 'react'
import CustomTopicForm from './CustomTopicForm'

export const DEFAULT_SCENARIOS = [
  {
    title: 'Introducing Yourself',
    context: 'Greet someone and introduce yourself',
    emoji: '👋',
  },
  {
    title: 'Ordering at a Restaurant',
    context: 'You\'re hungry and want to order food',
    emoji: '🍽️',
  },
  {
    title: 'Asking for Directions',
    context: 'You\'re lost and need help finding your way',
    emoji: '🗺️',
  },
  {
    title: 'Making a New Friend',
    context: 'Chat and get to know someone new',
    emoji: '🤝',
  },
  {
    title: 'At the Airport/Hotel',
    context: 'Check in, ask about your flight or your room',
    emoji: '✈️',
  },
  {
    title: 'At a Pharmacy/Doctor',
    context: 'Describe how you feel and ask for help',
    emoji: '⚕️',
  },
  {
    title: 'Shopping in a Store',
    context: 'Ask about prices, sizes, and pay for items',
    emoji: '🛍️',
  },
  {
    title: 'Asking for Help/Emergency',
    context: 'Get help quickly when something goes wrong',
    emoji: '🆘',
  },
]

// SAC-083: shared lookup so ListeningStoryView's story header can show the
// same emoji as the picker card without duplicating this list — unlike the
// frontend/backend WARMUP_SCENARIOS duplication (no shared module possible
// there), both call sites here are already in the same frontend bundle.
// Falls back to ✨ for a custom topic (matching the "Create Custom Topic"
// card's own icon below) since free-form user text has no fixed mapping.
export function getScenarioEmoji(title) {
  return DEFAULT_SCENARIOS.find((s) => s.title === title)?.emoji || '✨'
}

// SAC-071: showCustomTopic/onCustomStorySelected gate the "Create Custom
// Topic" card behind an explicit prop rather than always rendering it — this
// component is shared with Conversation Mode (currently disabled app-wide,
// but the code path still exists), and a custom Listening topic doesn't
// belong there if that mode is ever re-enabled.
export default function ScenarioSelector({
  onSelectScenario,
  apiError,
  onRetry,
  startLabel = 'Start Conversation',
  skipConfirm = false,
  showCustomTopic = false,
  onCustomStorySelected,
}) {
  const [pendingScenario, setPendingScenario] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)

  const handleChooseForMe = () => {
    const pick = DEFAULT_SCENARIOS[Math.floor(Math.random() * DEFAULT_SCENARIOS.length)]
    onSelectScenario(pick.title)
  }

  if (pendingScenario) {
    return (
      <div>
        <div className="mb-6 p-6 bg-surface border-2 border-border rounded-card shadow-sm">
          <p className="font-bold text-ink text-heading-1 mb-2">{pendingScenario.emoji} {pendingScenario.title}</p>
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

      {/* SAC-077: the "← Change Mode" link that used to live here was removed
          — redundant with FooterNav's Home button, which already does the
          same thing from every screen. */}
      <p className="text-body text-ink-muted mb-6">Choose a conversation topic to get started:</p>

      <div className="grid gap-4 mb-6">
        {(() => {
          const cards = DEFAULT_SCENARIOS.map((s) => (
            <button
              key={s.title}
              onClick={() => (skipConfirm ? onSelectScenario(s.title) : setPendingScenario(s))}
              className="p-4 bg-surface border-2 border-border rounded-card shadow-sm hover:border-primary hover:shadow-md transition text-left"
            >
              <span className="text-xl mb-1 block">{s.emoji}</span>
              <p className="font-bold text-ink text-heading-2">{s.title}</p>
              <p className="text-ink-muted text-small mt-1">{s.context}</p>
            </button>
          ))
          if (showCustomTopic) {
            cards.splice(
              2,
              0,
              <button
                key="custom-topic"
                onClick={() => setShowCustomForm(true)}
                className="p-4 bg-primary-light border-2 border-primary rounded-card shadow-sm hover:shadow-md transition text-left"
              >
                <span className="text-xl mb-1 block">✨</span>
                <p className="font-bold text-ink text-heading-2">Create Custom Topic</p>
                <p className="text-ink-muted text-small mt-1">Build your own story on any topic</p>
              </button>
            )
          }
          return cards
        })()}
      </div>

      <button
        onClick={handleChooseForMe}
        className="w-full min-h-[44px] bg-secondary text-white py-2 rounded-control font-semibold hover:bg-secondary-hover transition"
      >
        🎲 Choose One for Me
      </button>

      {showCustomTopic && (
        <CustomTopicForm
          isOpen={showCustomForm}
          onClose={() => setShowCustomForm(false)}
          onStoryGenerated={(session) => {
            setShowCustomForm(false)
            onCustomStorySelected(session)
          }}
        />
      )}
    </div>
  )
}
