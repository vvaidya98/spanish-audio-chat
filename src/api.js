// In dev, VITE_API_URL is unset so requests stay relative and go through the
// Vite proxy to localhost:3000. In production (Netlify), VITE_API_URL points
// at the Railway backend since there's no dev-server proxy to rely on.
const API_BASE = import.meta.env.VITE_API_URL || ''

export function apiFetch(path, options) {
  return fetch(`${API_BASE}${path}`, options)
}
