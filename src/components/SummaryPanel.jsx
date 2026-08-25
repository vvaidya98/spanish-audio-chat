import EmailCapture from './EmailCapture'

export default function SummaryPanel({ exchanges, onReset }) {
  const totalErrors = exchanges.reduce((sum, ex) => sum + (ex.errors?.length || 0), 0)

  return (
    <div>
      <div className="mb-6 bg-primary-light rounded-card px-4 py-3">
        <p className="text-ink font-bold text-heading-2 mb-1">Conversation Summary</p>
        <p className="text-primary-text text-small">
          {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''} completed
          {totalErrors > 0
            ? ` — ${totalErrors} correction${totalErrors !== 1 ? 's' : ''} to review`
            : ' — no corrections needed, great job!'}
        </p>
      </div>

      <div className="space-y-4 mb-6 max-h-[28rem] overflow-y-auto">
        {exchanges.map((ex, idx) => (
          <div key={idx} className="p-4 bg-surface rounded-card shadow-sm border border-border">
            <p className="text-ink-faint text-xs font-semibold mb-2">Exchange {idx + 1}</p>

            <p className="text-success font-semibold mb-1 text-small">Claude:</p>
            <p className="text-ink mb-3 text-body">{ex.claudeResponse}</p>

            <p className="text-primary-text font-semibold mb-1 text-small">You:</p>
            {ex.errors && ex.errors.length > 0 ? (
              <p className="text-warn-text bg-warn-light rounded-control px-2 py-1 inline-block mb-2">{ex.userInput}</p>
            ) : (
              <p className="text-ink mb-2 text-body">{ex.userInput}</p>
            )}

            {ex.errors && ex.errors.length > 0 && (
              <div className="mt-2 space-y-2">
                {ex.errors.map((err, errIdx) => (
                  <div key={errIdx} className="border-l-4 border-secondary bg-warn-light rounded-control p-3 text-small">
                    <p className="text-warn-text">
                      <span className="font-semibold">You said:</span> "{err.userSaid}"
                    </p>
                    <p className="text-success mt-1">
                      <span className="font-semibold">Corrected:</span> "{err.corrected}"
                    </p>
                    <p className="text-ink-muted mt-1">{err.explanation}</p>
                  </div>
                ))}
              </div>
            )}

            {ex.feedback && (
              <p className="text-ink-faint text-xs mt-3 italic">💡 {ex.feedback}</p>
            )}
          </div>
        ))}
      </div>

      <EmailCapture />

      <button
        onClick={onReset}
        className="w-full min-h-[44px] bg-primary text-white py-3 rounded-control font-semibold hover:bg-primary-hover transition"
      >
        ← Back to Scenarios
      </button>
    </div>
  )
}
