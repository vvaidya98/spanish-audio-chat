// Shared by VocabularyMatching.jsx and WordQuiz.jsx (SAC-090) — one
// definition of the shuffle algorithm and the correct/wrong feedback tones,
// so a future change to either only has to happen in one place, and the two
// quiz-style features audibly/behaviorally match rather than coincidentally
// resembling each other.
export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function playTone(frequency, type, durationSec, volume) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + durationSec)
    oscillator.onended = () => ctx.close()
  } catch (err) {
    console.error('Could not play feedback sound:', err)
  }
}

export const playCorrectBeep = () => playTone(880, 'sine', 0.15, 0.08)
export const playWrongBeep = () => playTone(220, 'square', 0.2, 0.08)
