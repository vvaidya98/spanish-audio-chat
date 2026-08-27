import { useState, useEffect } from 'react'

const FIRST_WORD_DELAY_MS = 500
const NEXT_WORD_INTERVAL_MS = 1000
const ANIMATION_STYLES = ['fadeScale', 'zoomBounce', 'slideUpFade', 'spinIn', 'pulseGlow']

export default function LoadingSpinner({ label = 'Loading...', estimateText = 'This usually takes 30 to 40 seconds', previewWords = [] }) {
  // Total words shown so far (unbounded) rather than an index into
  // previewWords — cycling both the word (tick % words.length) and the
  // animation style (tick % styles.length) off the same counter keeps them
  // looping indefinitely instead of stopping once the word list runs out.
  const [tick, setTick] = useState(0)

  // Resets and restarts the cycle whenever a fresh word list shows up (e.g.
  // once the story's vocabulary becomes available partway through loading).
  useEffect(() => {
    if (previewWords.length === 0) return
    setTick(0)
    // Browser setTimeout/setInterval return plain numeric IDs (unlike
    // Node's Timeout object), so they can't carry an attached property —
    // this closure variable is what lets the cleanup below reach the
    // interval created inside the timeout callback.
    let interval = null
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        setTick((t) => t + 1)
      }, NEXT_WORD_INTERVAL_MS)
      // Loops for as long as the component stays mounted — i.e. until the
      // parent stops showing LoadingSpinner once the story finishes loading,
      // at which point this effect's cleanup below clears the interval.
    }, FIRST_WORD_DELAY_MS)
    return () => {
      clearTimeout(startTimer)
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewWords.length])

  const currentWord = previewWords.length > 0 ? previewWords[tick % previewWords.length] : null
  const animationStyle = ANIMATION_STYLES[tick % ANIMATION_STYLES.length]

  return (
    <div className="flex flex-col items-center justify-center py-10 min-h-[220px] gap-3">
      <div
        className="w-12 h-12 rounded-full border-4 border-primary-light border-t-primary animate-spin"
        role="status"
        aria-label="Loading"
      />
      <p className="text-body font-medium text-ink">{label}</p>
      <p className="text-small text-ink-muted text-center mt-1">{estimateText}</p>
      {currentWord && (
        <p
          key={`${tick}-${currentWord}`}
          className={`loading-word-${animationStyle} text-[1.25rem] font-bold text-ink mt-2`}
        >
          {currentWord}
        </p>
      )}
    </div>
  )
}
