import { useState, useEffect } from 'react'
import ModeSelector from './components/ModeSelector'
import ScenarioSelector, { DEFAULT_SCENARIOS } from './components/ScenarioSelector'
import ConversationView from './components/ConversationView'
import ListeningStoryView from './components/ListeningStoryView'
import HistoryDashboard from './components/HistoryDashboard'
import SessionReview from './components/SessionReview'
import { logEvent } from './analytics'

function App() {
  const [mode, setMode] = useState('') // '', 'conversation', 'listening'
  const [scenario, setScenario] = useState('')
  const [apiError, setApiError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)

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

  const handleDifferentScenario = () => {
    const others = DEFAULT_SCENARIOS.filter((s) => s.title !== scenario)
    if (others.length === 0) return
    const pick = others[Math.floor(Math.random() * others.length)]
    setScenario(pick.title)
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
          scenario={scenario}
          onBack={handleReset}
          onChangeMode={handleBackToModes}
          onDifferentScenario={handleDifferentScenario}
        />
      )
    }

    return (
      <ConversationView
        key={scenario}
        scenario={scenario}
        onReset={handleReset}
        onApiError={handleApiError}
        onChangeMode={handleBackToModes}
        onDifferentScenario={handleDifferentScenario}
      />
    )
  }

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(to bottom right, var(--color-bg-start), var(--color-bg-end))' }}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface rounded-card shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-heading-1 text-ink">Spanish Audio Chat</h1>
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
              <span className="bg-primary-light text-primary-text px-3 py-1 rounded-full text-small font-semibold">v1.0l</span>
            </div>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  )
}

export default App
