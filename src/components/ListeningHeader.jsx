import NavButton from './NavButton'

export default function ListeningHeader({ onBack, onChangeMode, onRegenerate }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
      <NavButton icon="←" label="Back" onClick={onBack} title="Back to scenarios" />
      <NavButton icon="📋" label="Change Mode" onClick={onChangeMode} title="Change Mode" />
      <NavButton icon="🔄" label="Back to Stories" onClick={onBack} title="Choose a different story" />
      {onRegenerate && (
        <NavButton icon="🔄" label="Regenerate Story" onClick={onRegenerate} title="Regenerate this story" />
      )}
    </div>
  )
}
