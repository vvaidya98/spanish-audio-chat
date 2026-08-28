import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { apiFetch } from '../api'
import { logEvent } from '../analytics'

const STATIC_TOPICS = [
  'School picnic',
  'A day at the swimming pool',
  'Birthday party',
  "Let's go hiking",
  'Beach vacation',
  'Wine tasting',
  'Visiting a museum',
  'Cooking a traditional meal',
  'Learning to dance',
  'Road trip adventure',
  'Camping in the mountains',
  'Shopping at a market',
  'Taking a cooking class',
  'Attending a concert',
  'Planning a wedding',
]

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced']

const DIFFICULTY_DESCRIPTIONS = {
  Beginner: 'Simple vocabulary, present tense, clear articulation',
  Intermediate: 'Mix of tenses, varied vocabulary, natural pacing',
  Advanced: 'Complex sentences, subjunctive mood, idiomatic expressions',
}

function shuffleTopics(list, count) {
  const shuffled = [...list].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// SAC-071: modal for building a custom listening topic — same isOpen/onClose
// shell pattern as RegenerateModal.jsx/QuickTranslateModal.jsx (backdrop
// click, ESC, X button all dismiss) rather than unmounting on close, so a
// topic typed and then accidentally dismissed isn't lost. Deliberately
// stays mounted between opens (form state persists) but resets itself after
// a *successful* generation, since a completed action is a natural reset
// point in a way a manual dismiss isn't.
export default function CustomTopicForm({ isOpen, onClose, onStoryGenerated }) {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('Beginner')
  const [suggestedTopics, setSuggestedTopics] = useState(() => shuffleTopics(STATIC_TOPICS, 6))
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !generating) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, generating, onClose])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (!generating) onClose()
  }

  const handlePillClick = (selectedTopic) => {
    setTopic(selectedTopic)
    setError('')
  }

  const handleRegenerateSuggestions = async () => {
    setLoadingTopics(true)
    try {
      const response = await apiFetch('/api/generate-suggested-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error(`API Error: ${response.status}`)
      const data = await response.json()
      setSuggestedTopics(Array.isArray(data.topics) && data.topics.length ? data.topics : shuffleTopics(STATIC_TOPICS, 6))
    } catch (err) {
      console.error('Error generating suggested topics:', err)
      setSuggestedTopics(shuffleTopics(STATIC_TOPICS, 6))
    } finally {
      setLoadingTopics(false)
    }
  }

  const handleGenerateStory = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const response = await apiFetch('/api/generate-custom-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), difficulty }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const storyData = await response.json()
      logEvent('custom_story_generated', { topic: topic.trim(), difficulty })
      const submittedTopic = topic.trim()
      setTopic('')
      setError('')
      setGenerating(false)
      onStoryGenerated({ storyData, topic: submittedTopic, difficulty })
    } catch (err) {
      console.error('Error generating custom story:', err)
      setError(`Error: ${err.message}`)
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={handleBackdropClick}>
      <div
        className="w-full sm:w-[90%] max-w-lg max-h-[90vh] overflow-y-auto bg-surface rounded-card shadow-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {generating ? (
          <LoadingSpinner label="Generating your story..." estimateText="This usually takes about 20 seconds" />
        ) : (
          <>
            <div className="flex justify-between items-center mb-1">
              <p className="text-heading-1 text-ink">Create Custom Topic</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center text-ink-faint hover:text-ink text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-small text-ink-muted mb-5">Pick any topic that interests you</p>

            {error && (
              <div className="mb-4 p-3 bg-danger-light border-l-4 border-danger rounded-control">
                <p className="text-danger text-small">{error}</p>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-small font-semibold text-ink mb-2">Your topic</label>
              <input
                type="text"
                maxLength={100}
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value)
                  setError('')
                }}
                placeholder="E.g., ordering coffee at a café, learning to cook, visiting a museum"
                className="w-full min-h-[44px] px-3 py-2 border border-border rounded-control text-body text-ink focus:outline-none focus:border-primary"
              />
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-small font-semibold text-ink-muted">Suggested topics</label>
                <button
                  onClick={handleRegenerateSuggestions}
                  disabled={loadingTopics}
                  title="Generate new topic suggestions"
                  className={`text-lg leading-none transition ${loadingTopics ? 'opacity-50 cursor-not-allowed' : 'hover:text-primary'}`}
                >
                  🔄
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePillClick(t)}
                    className="px-3 py-2 rounded-full border border-border text-small text-ink whitespace-nowrap hover:border-primary hover:bg-primary-light hover:text-primary-text transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 mb-5">
              <div className="flex-1">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full min-h-[44px] px-3 border border-border rounded-control text-small text-ink bg-surface focus:outline-none focus:border-primary"
                >
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-faint mt-1">{DIFFICULTY_DESCRIPTIONS[difficulty]}</p>
              </div>
              <button
                onClick={handleGenerateStory}
                disabled={!topic.trim()}
                className={`min-h-[44px] px-4 rounded-control text-small font-semibold whitespace-nowrap transition ${
                  topic.trim()
                    ? 'bg-primary text-white hover:bg-primary-hover'
                    : 'bg-border text-ink-faint cursor-not-allowed'
                }`}
              >
                Generate Story
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full min-h-[44px] bg-primary-light text-primary-text py-2 rounded-control font-semibold hover:bg-primary-light/70 transition"
            >
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}
