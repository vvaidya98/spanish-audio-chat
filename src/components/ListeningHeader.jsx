import NavButton from './NavButton'

// Navigation (Back / Change Mode / Topics) moved to the global sticky
// FooterNav in v1.0n — this header now only surfaces the one
// Listening-specific contextual action that doesn't fit a generic footer.
export default function ListeningHeader({ onRegenerate }) {
  if (!onRegenerate) return null
  return (
    <div className="flex justify-end mb-4">
      <NavButton icon="🔄" label="Regenerate Story" onClick={onRegenerate} title="Regenerate this story" />
    </div>
  )
}
