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
    setApiError('')
  }

  const handleTranslationBack = () => {
    setMode(previousMode)
    setScenario(previousScenario)
  }

  const handleBackToModes = () => {
    setMode('')
    setScenario('')
    setApiError('')
  }

  const handleSelectScenario = (selectedScenario) => {
    setScenario(selectedScenario)
    setApiError('')
  }

  const handleReset = () => {
    setScenario('')
    setApiError('')
  }

  const handleApiError = (error) => {
    setApiError(error)
    setScenario('')
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
          onBackToModes={handleBackToModes}
          startLabel={mode === 'listening' ? 'Begin Story' : 'Start Conversation'}
          skipConfirm={mode === 'listening'}
        />
      )
    }

    if (mode === 'listening') {
      return (
        <ListeningStoryView
          key={scenario}
          ref={activeViewRef}
          scenario={scenario}
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-heading-1 text-ink">Conversation Amigo</h1>
            <button
              onClick={() => setShowAboutModal(true)}
              className="bg-primary-light text-primary-text px-3 py-1 rounded-full text-small font-semibold cursor-pointer hover:bg-primary-light/70 transition"
            >
              v1.0x
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
