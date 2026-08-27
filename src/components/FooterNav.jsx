const ITEMS = [
  { key: 'home', icon: '🏠', label: 'Home' },
  { key: 'topics', icon: '🎯', label: 'Topics' },
  { key: 'back', icon: '←', label: 'Back' },
  { key: 'history', icon: '📊', label: 'History' },
]

export default function FooterNav({ onHome, onTopics, onBack, onHistory }) {
  const handlers = { home: onHome, topics: onTopics, back: onBack, history: onHistory }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={handlers[item.key]}
          className="flex-1 min-h-[60px] flex flex-col items-center justify-center gap-0.5 text-ink-muted hover:text-primary hover:bg-primary-light transition"
        >
          <span className="text-xl leading-none" aria-hidden="true">{item.icon}</span>
          <span className="text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
