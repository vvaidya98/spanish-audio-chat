import { useEffect } from 'react'

// SAC-096 Part 1: none of HoverableText.jsx, ClickableSpanishText.jsx, or
// ListeningStoryView.jsx's Vocabulary Preview ever had a document-level
// dismiss listener — each only closed an open word-tooltip by re-clicking
// the exact same word, or (HoverableText only) an onMouseLeave, which
// never fires on touch and never fires at all for a tap elsewhere on the
// page. That's the actual root cause of the tooltip staying stuck open.
// One shared hook, applied at each surface's own open/close state, rather
// than patching Translate specifically. `active` skips attaching the
// listener while nothing is open, so this never adds overhead during
// normal use.
export function useClickOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return
    const handlePointerDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onOutside()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [ref, onOutside, active])
}
