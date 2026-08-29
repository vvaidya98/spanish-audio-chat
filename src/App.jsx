import { useState, useEffect, useRef } from 'react'
import ModeSelector from './components/ModeSelector'
import ScenarioSelector from './components/ScenarioSelector'
import ConversationView from './components/ConversationView'
import ListeningStoryView from './components/ListeningStoryView'
import TranslationView from './components/TranslationView'
import HistoryDashboard from './components/HistoryDashboard'
import SessionReview from './components/SessionReview'
import FooterNav from './components/FooterNav'
import AboutModal from './components/AboutModal'
import { logEvent } from './analytics'

function App() {
  const [mode, setMode] = useState('') // '', 'conversation', 'listening', 'translation'
  const [scenario, setScenario] = useState('')
  const [apiError, setApiError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [showAboutModal, setShowAboutModal] = useState(false)
  // SAC-058: lets Translation's "← Back" button return to wherever the user
  // was before entering Translation, rather than always landing on the Mode
  // Selector. Captured in handleSelectMode right before switching to
  // 'translation'. Known limitation: if Translation was reached via a
  // FooterNav shortcut mid-story, that shortcut already saves+ends the
  // session before switching modes (existing, unchanged behavior) — Back
  // reopens the same scenario (fresh load, cache-assisted) but not the exact
  // sentence position, since there's no longer an in-progress session to
  // resume. Exact same-spot resume without leaving the view at all is what
  // the in-story Quick Translate modal (SAC-059/060) is for instead.
  const [previousMode, setPreviousMode] = useState('')
  const [previousScenario, setPreviousScenario] = useState('')
  // SAC-071: holds a custom topic's pre-generated story (and the topic/
  // difficulty it came from, for Regenerate) between CustomTopicForm handing
  // it off and ListeningStoryView mounting to play it. `nonce` makes the key
  // below unique even if a user types the exact same topic text twice in a
  // row via the form — `scenario` alone wouldn't force a remount in that case.
  const [customSession, setCustomSession] = useState(null)
  // Points at whichever of ConversationView/ListeningStoryView is currently
  // mounted (only one ever is) — lets FooterNav trigger that view's own
  // save-then-navigate action even though its in-view Back button is gone.
  const activeViewRef = useRef(null)

  useEffect(() => {
    logEvent('page_view')
  }, [])

  const handleSelectMode = (selectedMode) => {
    if (selectedMode === 'translation') {
      setPreviousMode(mode)
      setPreviousScenario(scenario)
    }
    setMode(selectedMode)
    setScenario('')
    setCustomSession(null)
    setApiError('')
  }

  const handleTranslationBack = () => {
    setMode(previousMode)
    setScenario(previousScenario)
  }

  const handleBackToModes = () => {
    setMode('')
    setScenario('')
    setCustomSession(null)
    setApiError('')
  }

  const handleSelectScenario = (selectedScenario) => {
    setScenario(selectedScenario)
    setCustomSession(null)
    setApiError('')
  }

  // SAC-071: CustomTopicForm already generated the story before this fires —
  // this just hands it off to ListeningStoryView the same way picking a
  // pre-built scenario hands off a scenario name.
  const handleCustomStorySelected = ({ storyData, topic, difficulty }) => {
    setCustomSession({ storyData, topic, difficulty, nonce: Date.now() })
    setScenario(topic)
    setApiError('')
  }

  const handleReset = () => {
    setScenario('')
    setCustomSession(null)
    setApiError('')
  }

  const handleApiError = (error) => {
    setApiError(error)
    setScenario('')
    setCustomSession(null)
  }

  // "Home" always goes all the way back to the Mode Selector, regardless of
  // how deep the user is (active story, scenario picker, or history). No
  // early return after activeViewRef.current.back(): that call's job is
  // just to save the in-progress session before leaving, not to decide
  // where Home lands — handleBackToModes() below always still runs.
  const handleFooterHome = () => {
    if (showHistory) { setShowHistory(false); setSelectedSession(null) }
    if (activeViewRef.current?.back) activeViewRef.current.back()
    handleBackToModes()
  }

  // Shortcuts (SAC-050): jump straight into a mode from anywhere, skipping
  // the Mode Selector, same no-early-return shape as Home above so any
  // in-progress session still gets saved on the way out regardless of
  // where the user currently is.
  const handleFooterListening = () => {
    if (showHistory) { setShowHistory(false); setSelectedSession(null) }
    if (activeViewRef.current?.back) activeViewRef.current.back()
    handleSelectMode('listening')
  }

  const handleFooterTranslation = () => {
    if (showHistory) { setShowHistory(false); setSelectedSession(null) }
    if (activeViewRef.current?.back) activeViewRef.current.back()
    handleSelectMode('translation')
  }

  const handleFooterHistory = () => {
    if (activeViewRef.current?.back) activeViewRef.current.back()
    logEvent('history_dashboard_viewed')
    setShowHistory(true)
  }

  const renderContent = () => {
    if (showHistory) {
      if (selectedSession) {
        return <SessionReview session={selectedSession} onBack={() => setSelectedSession(null)} />
      }
      return (
        <HistoryDashboard
          onSelectSession={setSelectedSession}
          onExit={() => {
            setShowHistory(false)
            setSelectedSession(null)
          }}
        />
      )
    }

    if (!mode) {
      return <ModeSelector onSelectMode={handleSelectMode} />
    }

    if (mode === 'translation') {
      return <TranslationView onBack={handleTranslationBack} />
    }

    if (!scenario) {
      return (
        <ScenarioSelector
          onSelectScenario={handleSelectScenario}
          apiError={apiError}
          onRetry={() => setApiError('')}
          startLabel={mode === 'listening' ? 'Begin Story' : 'Start Conversation'}
          skipConfirm={mode === 'listening'}
          showCustomTopic={mode === 'listening'}
          onCustomStorySelected={handleCustomStorySelected}
        />
      )
    }

    if (mode === 'listening') {
      return (
        <ListeningStoryView
          key={customSession ? `custom-${customSession.nonce}` : scenario}
          ref={activeViewRef}
          scenario={scenario}
          storyData={customSession?.storyData}
          customDifficulty={customSession?.difficulty}
          onBack={handleReset}
        />
      )
    }

    return (
      <ConversationView
        key={scenario}
        ref={activeViewRef}
        scenario={scenario}
        onReset={handleReset}
        onApiError={handleApiError}
      />
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-start), var(--color-bg-end))' }}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface rounded-card shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-heading-1 text-ink">Conversation Amigo</h1>
            <button
              onClick={() => setShowAboutModal(true)}
              className="text-xs text-ink-faint hover:text-ink-muted transition"
            >
              v1.2b
            </button>
          </div>

          {renderContent()}
        </div>
      </div>

      <FooterNav
        onHome={handleFooterHome}
        onListening={handleFooterListening}
        onTranslation={handleFooterTranslation}
        onHistory={handleFooterHistory}
      />

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  )
}

export default App
