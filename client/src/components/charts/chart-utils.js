// Rounds an axis max up to a clean step (1 / 2 / 5 x 10^n), so ticks land on 0 / 5 / 10, never 0 / 7 / 14.
export function niceMax(value) {
  if (value <= 0) return 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

// Stored dates are UTC "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"; both parse once 'T' and 'Z' are added.
export function formatShortDate(value) {
  const iso = value.length > 10 ? value.replace(' ', 'T') + 'Z' : value + 'T00:00:00Z'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// A week_start plus the 6 days after it, for a tooltip range like "Aug 13 - Aug 19".
export function formatWeekRangeLabel(weekStart) {
  const start = new Date(weekStart + 'T00:00:00Z')
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

// White or near-black text, picked by the fill's relative luminance, so an inline label always clears contrast
// against its own segment regardless of how light or dark that series color is.
export function readableTextOn(hex) {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16) / 255
  const g = parseInt(value.slice(2, 4), 16) / 255
  const b = parseInt(value.slice(4, 6), 16) / 255
  const linear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  return luminance > 0.55 ? '#1a1a1a' : '#ffffff'
}
