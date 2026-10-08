// "bug #42 marked resolved". The wording follows the action recorded in bug_activity.
export function describeActivity(item) {
  const bug = `bug #${item.bug_id}`
  if (item.action === 'created') return `${bug} created`
  if (item.action === 'comment') return `comment added to ${bug}`
  if (item.action === 'status_changed') return `${bug} marked ${String(item.new_value).replace(/-/g, ' ')}`
  return `${bug} updated`
}
