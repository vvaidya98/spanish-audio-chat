import { useEffect, useState } from 'react'

// SAC-076: difficulty choices shown here mirror DIFFICULTY_LEVELS/DIFFICULTY_GUIDE
// in server.js — kept as short user-facing blurbs rather than the backend's
// full prompt-instruction wording.
const DIFFICULTY_OPTIONS = [
  { value: 'Beginner', description: 'Simple present tense, everyday vocabulary' },
  { value: 'Intermediate', description: 'Present and past tenses, richer vocabulary' },
  { value: 'Advanced', description: 'Complex sentences, subjunctive, idiomatic expressions' },
]

// SAC-065: confirmation gate in front of Regenerate Story, since regenerating
// discards the current story/progress with no undo — the old instant-regen
// button made that too easy to trigger by accident.
// SAC-076: also lets the user pick a difficulty for the regenerated story
// (defaulting to whatever the current story's difficulty is), for both
// pre-built scenarios and custom topics — a single combined confirm step
// rather than a separate modal chained after this one.
export default function RegenerateModal({ isOpen, scenario, currentDifficulty, onCancel, onConfirm }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentDifficulty || 'Beginner')

  // Re-sync to the story's actual current difficulty every time the modal is
  // (re)opened, so a cancel-then-reopen doesn't leave a stale prior selection.
  useEffect(() => {
    if (isOpen) setSelectedDifficulty(currentDifficulty || 'Beginner')
  }, [isOpen, currentDifficulty])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full sm:w-[90%] max-w-sm bg-surface rounded-card shadow-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-heading-2 text-ink">Generate New Story?</p>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-ink-faint hover:text-ink text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <p className="text-small text-ink-muted mb-2">This will generate a new story for:</p>
        <p className="text-body font-semibold text-ink mb-5">📍 {scenario}</p>

        <p className="text-small text-ink-muted mb-2">Difficulty level:</p>
        <div className="space-y-2 mb-5">
          {DIFFICULTY_OPTIONS.map(({ value, description }) => (
            <label
              key={value}
              className={`flex items-start gap-2 p-2.5 rounded-control border cursor-pointer transition ${
                selectedDifficulty === value ? 'border-primary bg-primary-light' : 'border-border hover:bg-[#f9f9f9]'
              }`}
            >
              <input
                type="radio"
                name="regenerate-difficulty"
                checked={selectedDifficulty === value}
                onChange={() => setSelectedDifficulty(value)}
                className="mt-1"
              />
              <span>
                <span className="block text-body font-semibold text-ink">{value}</span>
                <span className="block text-small text-ink-muted">{description}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-control bg-[#f3f4f6] text-ink-muted font-semibold hover:bg-border transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedDifficulty)}
            className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
