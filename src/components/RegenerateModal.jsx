import { useEffect } from 'react'

// SAC-065: confirmation gate in front of Regenerate Story, since regenerating
// discards the current story/progress with no undo — the old instant-regen
// button made that too easy to trigger by accident.
export default function RegenerateModal({ isOpen, scenario, onCancel, onConfirm }) {
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

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[44px] rounded-control bg-[#f3f4f6] text-ink-muted font-semibold hover:bg-border transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
