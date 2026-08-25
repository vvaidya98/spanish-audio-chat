import NavButton from './NavButton'

export default function ListeningHeader({ onBack, onChangeMode, onDifferentScenario, onRegenerate }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
      <NavButton icon="←" label="Back" onClick={onBack} title="Back to scenarios" />
      <NavButton icon="📋" label="Change Mode" onClick={onChangeMode} title="Change Mode" />
      <NavButton icon="🔄" label="Diff Scenario" onClick={onDifferentScenario} title="Different Scenario" />
      {onRegenerate && (
        <NavButton icon="🔄" label="Regenerate Story" onClick={onRegenerate} title="Regenerate this story" />
      )}
    </div>
  )
}
