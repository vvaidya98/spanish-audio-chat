// SAC-070 voice preference order: Colombian Spanish first (explicit ask),
// then other Latin American variants (es-419 is the generic "Latin America"
// BCP-47 tag some engines use instead of a per-country one), then Spain
// Spanish, then any remaining es-* as a last resort. Which of these actually
// exist depends entirely on the user's OS/browser TTS voice pack — this list
// only controls preference order among whatever's actually installed, it
// can't make a Colombian voice exist if the platform never shipped one.
const VOICE_LANG_PREFERENCE = ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES']

let loggedVoiceOnce = false

// Explicitly picks a Spanish voice rather than relying on the browser's
// default TTS engine selection for utterance.lang — some browsers fall back
// to a non-Spanish (or lower-quality) voice even with lang set correctly.
// getVoices() can return an empty list on first call in some browsers
// (voices load asynchronously) — this degrades gracefully to "no voice
// override" rather than throwing, since utterance.lang alone still works.
//
// SAC-070 note on "clarity"/"articulation" settings: the Web Speech API
// (SpeechSynthesisUtterance) only exposes rate/pitch/volume — there is no
// clarity, quality, or articulation parameter in the spec to tune. Rate is
// already fully user-controlled via the Speed dropdown; pitch is left at its
// natural default (1) since there's no documented basis for a different
// pitch improving articulation, and changing it without evidence risks
// making the voice sound worse, not clearer. The actual clarity lever this
// round adds is SAC-069's adjustable inter-segment pause duration, not a
// voice-parameter change.
export function applySpanishVoice(utterance) {
  utterance.lang = 'es-ES'
  try {
    const voices = window.speechSynthesis?.getVoices() || []
    let spanishVoice = null
    for (const preferredLang of VOICE_LANG_PREFERENCE) {
      spanishVoice = voices.find((v) => v.lang === preferredLang)
      if (spanishVoice) break
    }
    if (!spanishVoice) spanishVoice = voices.find((v) => v.lang?.startsWith('es'))

    if (spanishVoice) {
      utterance.voice = spanishVoice
      utterance.lang = spanishVoice.lang
    }

    // One-time console log so SAC-070's "which voice is actually in use"
    // question is answerable by anyone testing locally, without needing to
    // dig through devtools — voice availability is entirely OS/browser
    // dependent and can't be determined from this codebase alone.
    if (!loggedVoiceOnce) {
      loggedVoiceOnce = true
      if (spanishVoice) {
        console.log(`[speechUtils] Using voice: "${spanishVoice.name}" (${spanishVoice.lang})`)
      } else {
        console.log('[speechUtils] No Spanish voice found via getVoices() — falling back to lang=es-ES only.')
      }
    }
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
