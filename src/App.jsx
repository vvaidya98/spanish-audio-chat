import { useState, useEffect, useRef } from 'react'
import ModeSelector from './components/ModeSelector'
import ScenarioSelector from './components/ScenarioSelector'
import ConversationView from './components/ConversationView'
import ListeningStoryView from './components/ListeningStoryView'
import HistoryDashboard from './components/HistoryDashboard'
import SessionReview from './components/SessionReview'
import FooterNav from './components/FooterNav'
import { logEvent } from './analytics'

function App() {
  const [mode, setMode] = useState('') // '', 'conversation', 'listening'
  const [scenario, setScenario] = useState('')
  const [apiError, setApiError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  // Points at whichever of ConversationView/ListeningStoryView is currently
  // mounted (only one ever is) — lets FooterNav trigger that view's own
  // save-then-navigate action even though its in-view Back button is gone.
  const activeViewRef = useRef(null)

  useEffect(() => {
    logEvent('page_view')
  }, [])

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode)
    setScenario('')
    setApiError('')
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

  const handleFooterBack = () => {
    if (showHistory) {
      if (selectedSession) { setSelectedSession(null); return }
      setShowHistory(false)
      return
    }
    if (activeViewRef.current?.back) { activeViewRef.current.back(); return }
    if (mode) { handleBackToModes(); return }
  }

  const handleFooterMode = () => {
    if (showHistory) { setShowHistory(false); setSelectedSession(null) }
    if (activeViewRef.current?.back) activeViewRef.current.back()
    handleBackToModes()
  }

  const handleFooterTopics = () => {
    if (showHistory) { setShowHistory(false); setSelectedSession(null) }
    if (activeViewRef.current?.back) { activeViewRef.current.back(); return }
    if (mode) handleReset()
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

    if (!scenario) {
      return (
        <ScenarioSelector
          onSelectScenario={handleSelectScenario}
          apiError={apiError}
          onRetry={() => setApiError('')}
          onBackToModes={handleBackToModes}
          startLabel={mode === 'listening' ? 'Begin Story' : 'Start Conversation'}
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
            <div className="flex items-center gap-3">
              {!showHistory && (
                <button
                  onClick={() => {
                    logEvent('history_dashboard_viewed')
                    setShowHistory(true)
                  }}
                  className="min-h-[44px] px-3 rounded-control text-small font-semibold text-primary hover:bg-primary-light transition"
                >
                  📊 History
                </button>
              )}
              <span className="bg-primary-light text-primary-text px-3 py-1 rounded-full text-small font-semibold">v1.0q</span>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>

      <FooterNav
        onBack={handleFooterBack}
        onMode={handleFooterMode}
        onTopics={handleFooterTopics}
        onHistory={handleFooterHistory}
      />
    </div>
  )
}

export default App
