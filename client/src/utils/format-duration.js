// 96300 -> "1m 36s". Under a second shows "<1s"; null means nothing was recorded.
export function formatDuration(ms) {
  if (ms == null) return null
  const totalSeconds = Math.round(ms / 1000)
  if (totalSeconds < 1) return ms === 0 ? '0s' : '<1s'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`
  return `${seconds}s`
}
