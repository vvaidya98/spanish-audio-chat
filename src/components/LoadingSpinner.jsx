export default function LoadingSpinner({ label = 'Loading...', estimateText = 'This usually takes 10-15 seconds' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 min-h-[220px] gap-3">
      <div
        className="w-12 h-12 rounded-full border-4 border-primary-light border-t-primary animate-spin"
        role="status"
        aria-label="Loading"
      />
      <p className="text-body font-medium text-ink">{label}</p>
      <p className="text-small text-ink-muted text-center mt-1">{estimateText}</p>
    </div>
  )
}
