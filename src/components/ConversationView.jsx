import { useState, useRef, useEffect } from 'react'
import SummaryPanel from './SummaryPanel'
import { saveSession, generateSessionId } from '../db'
import { logEvent } from '../analytics'
import { apiFetch } from '../api'

const MIN_EXCHANGES_BEFORE_END = 5
const MAX_EXCHANGES = 8

export default function ConversationView({ scenario, onReset, onApiError }) {
  const [exchanges, setExchanges] = useState([])
  const [currentState, setCurrentState] = useState('starting') // starting, idle, listening, processing, speaking
  const [transcript, setTranscript] = useState('')
  const [claudeMessage, setClaudeMessage] = useState('')
  const [showText, setShowText] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const synthRef = useRef(null)
  const transcriptRef = useRef('')
  const sessionStartRef = useRef(Date.now())

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'es-ES'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true

      recognitionRef.current.onstart = () => {
        setCurrentState('listening')
        setTranscript('')
        transcriptRef.current = ''
        setError('')
      }

      recognitionRef.current.onresult = (event) => {
        const speechResult = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('')
        transcriptRef.current = speechResult
        setTranscript(speechResult)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setError(`Microphone error: ${event.error}`)
        setCurrentState('idle')
      }

      recognitionRef.current.onend = () => {
        setCurrentState((prev) => (prev === 'listening' ? 'idle' : prev))
      }
    }

    synthRef.current = window.speechSynthesis

    startConversation()

    return () => {
      if (synthRef.current) synthRef.current.cancel()
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [])

  const startConversation = async () => {
    setCurrentState('processing')
    setError('')

    try {
      const response = await apiFetch('/api/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const data = await response.json()
      const claudeSpanish = data.spanish || ''
      setClaudeMessage(claudeSpanish)
      setShowText(false)
      logEvent('session_started', { mode: 'conversation', scenario })

      playSpanishAudio(claudeSpanish, 0.8)
    } catch (error) {
      console.error('Error starting conversation:', error)
      setError(`Error: ${error.message}. Please check your backend is running.`)
      onApiError(error.message)
      setCurrentState('idle')
    }
  }

  const playSpanishAudio = (text, rate = 0.8) => {
    if (!synthRef.current || !text) return

    synthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = rate
    utterance.pitch = 1

    utterance.onstart = () => {
      setCurrentState('speaking')
    }

    utterance.onend = () => {
      setCurrentState('idle')
    }

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event)
      setCurrentState('idle')
    }

    synthRef.current.speak(utterance)
  }

  const startListening = () => {
    if (recognitionRef.current && currentState === 'idle') {
      recognitionRef.current.start()
    }
  }

  const sendTranscript = () => {
    const finalTranscript = transcriptRef.current.trim()
    if (!finalTranscript || currentState !== 'idle') return
    handleUserResponse(finalTranscript)
  }

  const handleUserResponse = async (userInput) => {
    setCurrentState('processing')
    setTranscript('')
    transcriptRef.current = ''

    try {
      const response = await apiFetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, scenario })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const data = await response.json()
      const spanish = data.spanish || ''
      const feedback = data.feedback || 'Well done!'
      const errors = Array.isArray(data.errors) ? data.errors : []

      setExchanges((prev) => [...prev, { userInput, claudeResponse: spanish, feedback, errors }])
      setClaudeMessage(spanish)
      setShowText(false)
      setError('')

      setTimeout(() => {
        playSpanishAudio(spanish, 0.8)
      }, 300)
    } catch (error) {
      console.error('Error processing response:', error)
      setError(`Error: ${error.message}`)
      setCurrentState('idle')
    }
  }

  const handleRepeat = (rate) => {
    if (currentState !== 'idle' || !claudeMessage) return
    playSpanishAudio(claudeMessage, rate)
  }

  const handleEndConversation = () => {
    if (synthRef.current) synthRef.current.cancel()
    if (recognitionRef.current) recognitionRef.current.abort()

    const errorCount = exchanges.reduce((sum, ex) => sum + (ex.errors?.length || 0), 0)
    saveSession({
      id: generateSessionId(),
      mode: 'conversation',
      scenario,
      timestamp: Date.now(),
      duration: Date.now() - sessionStartRef.current,
      exchanges,
      errorCount,
    }).catch((err) => console.error('Failed to save conversation session:', err))
    logEvent('session_completed', { mode: 'conversation', scenario, exchangeCount: exchanges.length, errorCount })

    setShowSummary(true)
  }

  if (showSummary) {
    return <SummaryPanel exchanges={exchanges} onReset={onReset} />
  }

  const exchangeCount = exchanges.length
  const displayExchangeNumber = Math.min(Math.max(exchangeCount, 1), MAX_EXCHANGES)
  const canEnd = exchangeCount >= MIN_EXCHANGES_BEFORE_END
  const mustEnd = exchangeCount >= MAX_EXCHANGES
  const isIdle = currentState === 'idle'
  const isBusy = currentState === 'processing' || currentState === 'speaking'

  return (
    <div>
      <div className="mb-6 bg-primary-light rounded-card px-4 py-3">
        <p className="text-body text-primary-text"><strong>Topic:</strong> {scenario}</p>
        <p className="text-small text-primary-text mt-1">Exchange {displayExchangeNumber} of {MAX_EXCHANGES}</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger font-semibold mb-1">⚠️ Error</p>
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      <div className="mb-6 bg-surface rounded-card shadow-sm border border-border p-4 min-h-[4.5rem] flex items-center">
        {showText && claudeMessage ? (
          <p className="text-ink text-body italic">"{claudeMessage}"</p>
        ) : (
          <p className="text-ink-muted italic">🎧 Listening mode — text hidden. Tap "Display text" to reveal.</p>
        )}
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="text-4xl mb-3">
          {currentState === 'starting' && '⏳'}
          {currentState === 'idle' && '💬'}
          {currentState === 'listening' && '🎧'}
          {currentState === 'processing' && '⏳'}
          {currentState === 'speaking' && '🔊'}
        </div>
        <p className="text-ink-muted text-center text-small">
          {currentState === 'starting' && 'Starting conversation...'}
          {currentState === 'idle' && 'Ready'}
          {currentState === 'listening' && 'Listening...'}
          {currentState === 'processing' && 'Processing...'}
          {currentState === 'speaking' && 'Playing...'}
        </p>
      </div>

      {transcript && (
        <div className="mb-6 p-4 bg-surface border border-border rounded-card">
          <p className="text-ink-muted font-semibold mb-2 text-small">You said:</p>
          <p className="text-ink text-body">{transcript}</p>
        </div>
      )}

      {currentState !== 'starting' && !mustEnd && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={startListening}
            disabled={!isIdle}
            className={`min-h-[44px] py-3 rounded-control font-semibold transition ${
              isIdle ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer' : 'bg-border text-ink-faint cursor-not-allowed'
            }`}
          >
            🎤 Tap to Speak
          </button>
          <button
            onClick={sendTranscript}
            disabled={!isIdle || !transcript.trim()}
            className={`min-h-[44px] py-3 rounded-control font-semibold transition ${
              isIdle && transcript.trim() ? 'bg-secondary hover:bg-secondary-hover text-white cursor-pointer' : 'bg-border text-ink-faint cursor-not-allowed'
            }`}
          >
            📤 Tap to Send
          </button>
        </div>
      )}

      {claudeMessage && currentState !== 'starting' && (
        <div className="mb-4">
          <p className="text-ink-muted text-small font-semibold mb-2 text-center">Replay Claude's last message</p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => handleRepeat(1.0)}
              disabled={isBusy}
              className="min-h-[44px] rounded-control text-small font-semibold bg-primary-light text-primary-text hover:bg-primary-light/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Repeat 1x
            </button>
            <button
              onClick={() => handleRepeat(0.8)}
              disabled={isBusy}
              className="min-h-[44px] rounded-control text-small font-semibold bg-primary-light text-primary-text hover:bg-primary-light/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Repeat 0.8x
            </button>
            <button
              onClick={() => handleRepeat(0.6)}
              disabled={isBusy}
              className="min-h-[44px] rounded-control text-small font-semibold bg-primary-light text-primary-text hover:bg-primary-light/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Repeat 0.6x
            </button>
          </div>
          <button
            onClick={() => setShowText(true)}
            disabled={showText}
            className="w-full min-h-[44px] rounded-control text-small font-semibold bg-secondary-light text-secondary-text hover:bg-secondary-light/70 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            👁️ Display text
          </button>
        </div>
      )}

      {canEnd && (
        <button
          onClick={handleEndConversation}
          disabled={isBusy}
          className="w-full min-h-[44px] bg-success text-white py-3 rounded-control font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition mb-3"
        >
          ✅ End Conversation{mustEnd ? ' (max reached)' : ''}
        </button>
      )}

      <button
        onClick={() => {
          if (synthRef.current) synthRef.current.cancel()
          if (recognitionRef.current) recognitionRef.current.abort()
          onReset()
        }}
        className="w-full min-h-[44px] bg-ink-muted text-white py-3 rounded-control font-semibold hover:bg-ink transition"
      >
        New Topic
      </button>
    </div>
  )
}
