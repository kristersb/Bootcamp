export function formatDate(value) {
  return new Date(value.replace(' ', 'T') + 'Z').toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
