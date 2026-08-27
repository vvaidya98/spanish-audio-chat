// Explicitly picks a Spanish voice rather than relying on the browser's
// default TTS engine selection for utterance.lang — some browsers fall back
// to a non-Spanish (or lower-quality) voice even with lang set correctly.
// getVoices() can return an empty list on first call in some browsers
// (voices load asynchronously) — this degrades gracefully to "no voice
// override" rather than throwing, since utterance.lang alone still works.
export function applySpanishVoice(utterance) {
  utterance.lang = 'es-ES'
  try {
    const voices = window.speechSynthesis?.getVoices() || []
    const spanishVoice =
      voices.find((v) => v.lang === 'es-ES') || voices.find((v) => v.lang?.startsWith('es'))
    if (spanishVoice) utterance.voice = spanishVoice
  } catch (err) {
    console.error('Could not select a Spanish voice:', err)
  }
}

// Some Web Speech API engines clip the first syllable(s) of an utterance
// that starts immediately after cancel() — the previous utterance's audio
// pipeline hasn't fully torn down yet. A short pause between cancel() and
// speak() gives it time to finish, avoiding the clipped-start artifact.
// Raised 75ms -> 150ms in Phase 2.7 (Prompt #016), then 150ms -> 175ms
// (Prompt #017) after 150ms confirmed still-insufficient on a real
// listen-test.
export const SPEAK_START_DELAY_MS = 175
