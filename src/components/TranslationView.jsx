import { useState } from 'react'
import { apiFetch } from '../api'

const COPIED_MESSAGE_MS = 2000

export default function TranslationView() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isSpanishToEnglish, setIsSpanishToEnglish] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

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

  const handleClear = () => {
    setSourceText('')
    setTranslatedText('')
    setError('')
  }

  return (
    <div>
      <p className="text-heading-1 text-ink mb-4">🌐 Translation</p>

      <button
        onClick={toggleDirection}
        className="w-full min-h-[44px] mb-4 px-4 rounded-control bg-primary-light text-primary-text font-semibold hover:bg-primary-light/70 transition flex items-center justify-center gap-2"
      >
        {isSpanishToEnglish ? 'Spanish → English' : 'English → Spanish'}
        <span aria-hidden="true">⇄</span>
      </button>

      <textarea
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
        placeholder="Enter text to translate..."
        rows={5}
        className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 text-body text-ink mb-2 resize-none focus:outline-none focus:border-primary transition"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isLoading}
          className="flex-1 min-h-[44px] rounded-control bg-primary text-white font-semibold hover:bg-primary-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Translating...' : 'Translate'}
        </button>
        <button
          onClick={handleClear}
          className="min-h-[44px] px-4 rounded-control bg-secondary-light text-secondary-text font-semibold hover:bg-secondary-light/70 transition"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-light border-l-4 border-danger rounded-control">
          <p className="text-danger text-small">{error}</p>
        </div>
      )}

      <div className="w-full bg-[#f9f9f9] border border-border rounded-control p-3 min-h-[120px] mb-2">
        {translatedText ? (
          <p className="text-body text-ink whitespace-pre-wrap">{translatedText}</p>
        ) : (
          <p className="text-body text-ink-faint italic">Translation will appear here</p>
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
  )
}
