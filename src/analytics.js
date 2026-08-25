// Minimal, dependency-free event logging. No external analytics account yet —
// logs to console so events are visible during early-launch manual review.
// Swap the console.log body for a real provider (Plausible, etc.) later
// without touching call sites.
export function logEvent(name, data = {}) {
  console.log(`[analytics] ${name}`, { ...data, timestamp: new Date().toISOString() })
}
