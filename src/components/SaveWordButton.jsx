import { useState, useRef } from 'react'
import { saveWord } from '../db'

const SAVE_CONFIRM_MS = 1500

// SAC-090/092: the save-button + checkmark-confirmation treatment shared by
// every "save this word to My Words" surface in the app — the sentence/
// Vocabulary Preview click-word tooltips (via WordSaveTooltip.jsx) and
// Vocabulary Matching's post-correct-match icon. One place owns the actual
// saveWord() call and the confirmation timing, so every surface looks and
// behaves identically rather than each reimplementing its own version of
// "swap to a checkmark for 1.5s."
export default function SaveWordButton({ spanish, english, source, className, title = 'Save word' }) {
  const [justSaved, setJustSaved] = useState(false)
  const timeoutRef = useRef(null)

  const handleSave = (e) => {
    e.stopPropagation()
    saveWord({ spanish, english, source }).catch(console.error)
    setJustSaved(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setJustSaved(false), SAVE_CONFIRM_MS)
  }

  return (
    <button onClick={handleSave} title={title} className={className}>
      {justSaved ? '✓' : '🔖'}
    </button>
  )
}
