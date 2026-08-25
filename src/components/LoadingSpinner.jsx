import { useState, useEffect, useMemo } from 'react'

const CIRCUMFERENCE = 2 * Math.PI * 45 // r=45
const WORD_INTERVAL_MS = 1700
const ANIMATIONS = ['spinner-word-fade', 'spinner-word-zoom', 'spinner-word-spin', 'spinner-word-scroll']

const FALLBACK_WORDS = ['hola', 'gracias', 'por favor', 'bueno', 'amigo', 'aprender']

export default function LoadingSpinner({ words, label = 'Loading...', estimatedMs = 12000 }) {
  const wordList = words && words.length > 0 ? words : FALLBACK_WORDS
  const [progress, setProgress] = useState(0)
  const [wordIdx, setWordIdx] = useState(0)

  const animationForWord = useMemo(
    () => wordList.map((_, i) => ANIMATIONS[i % ANIMATIONS.length]),
    [wordList]
  )

  useEffect(() => {
    const start = performance.now()
    let raf
    const tick = (now) => {
      const elapsed = now - start
      // Approaches 95% asymptotically so it never looks "done" before the
      // real network response arrives, but still visibly progresses.
      const pct = Math.min(95, (elapsed / estimatedMs) * 95)
      setProgress(pct)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [estimatedMs])

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIdx((i) => (i + 1) % wordList.length)
    }, WORD_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [wordList.length])

  const offset = CIRCUMFERENCE * (1 - progress / 100)

  return (
    <div className="flex flex-col items-center py-10">
      <div className="relative w-28 h-28 mb-5">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="var(--color-primary)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.2s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-heading-2 text-primary-text font-bold">{Math.round(progress)}%</span>
        </div>
      </div>

      <p className="text-ink-muted text-small mb-3">{label}</p>

      <div className="h-10 flex items-center justify-center overflow-hidden">
        <span key={wordIdx} className={`text-heading-2 font-bold text-primary-text ${animationForWord[wordIdx]}`}>
          {wordList[wordIdx]}
        </span>
      </div>

      <style>{`
        @keyframes spinnerWordFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spinnerWordZoom { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
        @keyframes spinnerWordSpin { from { opacity: 0; transform: rotate(-25deg) scale(0.7); } to { opacity: 1; transform: rotate(0deg) scale(1); } }
        @keyframes spinnerWordScroll { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        .spinner-word-fade { animation: spinnerWordFade 0.5s ease; }
        .spinner-word-zoom { animation: spinnerWordZoom 0.5s ease; }
        .spinner-word-spin { animation: spinnerWordSpin 0.5s ease; }
        .spinner-word-scroll { animation: spinnerWordScroll 0.5s ease; }
      `}</style>
    </div>
  )
}
