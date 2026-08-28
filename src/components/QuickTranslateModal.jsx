import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

const COPIED_MESSAGE_MS = 2000

// SAC-060: lightweight in-place translate overlay for Listening Mode — lets a
// user look up a word/phrase without leaving the story (unlike the full
// TranslationView page, this never unmounts the story underneath it, so
// playback position/state is untouched while it's open).
export default function QuickTranslateModal({ isOpen, onClose }) {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isSpanishToEnglish, setIsSpanishToEnglish] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const toggleDirection = () => {
    setIsSpanishToEnglish((prev) => !prev)
    setSourceText('')
    setTranslatedText('')
    setError('')
  }

  const handleTranslate = async () => {
    if (!sourceText.trim()) return
    setIsLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLanguage: isSpanishToEnglish ? 'Spanish' : 'English',
          targetLanguage: isSpanishToEnglish ? 'English' : 'Spanish',
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setTranslatedText(data.translated)
      } else {
        setError(data.error || 'Translation failed')
      }
    } catch (err) {
      setError('Error connecting to translation service')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!translatedText) return
    try {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MESSAGE_MS)
    } catch (err) {
      console.error('Could not copy to clipboard:', err)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[90%] max-w-sm bg-surface rounded-card shadow-lg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-heading-2 text-ink">Quick Translate</p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-ink-faint hover:text-ink text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <button
          onClick={toggleDirection}
          className="w-full min-h-[44px] mb-3 px-4 rounded-control bg-primary-light text-primary-text font-semibold hover:bg-primary-light/70 transition flex items-center justify-center gap-2"
        >
          {isSpanishToEnglish ? 'Spanish → English' : 'English → Spanish'}
          <span aria-hidden="true">⇄</span>
        </button>

        <input
          type="text"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Enter word or phrase..."
          className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 text-body text-ink mb-3 focus:outline-none focus:border-primary transition"
        />

        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="w-full min-h-[44px] mb-3 rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Translating...' : 'Translate'}
        </button>

        {error && (
          <div className="mb-3 p-3 bg-danger-light border-l-4 border-danger rounded-control">
            <p className="text-danger text-small">{error}</p>
          </div>
        )}

        <p className="text-small text-ink-muted mb-1">Translation:</p>
        <div className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[60px] mb-3">
          {translatedText ? (
            <p className="text-body text-ink whitespace-pre-wrap">{translatedText}</p>
          ) : (
            <p className="text-body text-ink-faint italic">—</p>
          )}
        </div>

        <button
          onClick={handleCopy}
          disabled={!translatedText}
          className="w-full min-h-[44px] rounded-control bg-primary-light text-primary-text font-semibold hover:bg-primary-light/70 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
