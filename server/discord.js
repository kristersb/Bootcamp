const WEBHOOK_TIMEOUT_MS = 5000

function truncate(text, max) {
  const value = String(text ?? '').trim()
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function appBaseUrl() {
  return (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/+$/, '')
}

// Discord rejects messages over 2,000 characters, so each field is capped well below that.
function buildFailureAlert({ runId, suiteName, caseTitle, notes }) {
  const lines = [
    `:x: **Test failed:** ${truncate(caseTitle, 200)}`,
    `**Suite:** ${truncate(suiteName, 100)}`,
    `**Notes:** ${notes && notes.trim() ? truncate(notes, 1000) : '_No notes were added._'}`,
    `**Run:** ${appBaseUrl()}/test-runs/${runId}`,
  ]
  // allowed_mentions with an empty parse list stops text in the notes (for example "@everyone") from pinging anyone.
  return { content: lines.join('\n'), allowed_mentions: { parse: [] } }
}

// Never returns or logs the webhook URL: it is a secret, and error messages from fetch can contain it.
async function sendDiscordMessage(payload) {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return { sent: false, error: 'DISCORD_WEBHOOK_URL is not set in .env.' }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
    if (response.ok) return { sent: true }
    if (response.status === 429) return { sent: false, error: 'Discord is rate limiting this webhook (HTTP 429). Try again in a moment.' }
    return { sent: false, error: `Discord rejected the alert (HTTP ${response.status}).` }
  } catch (err) {
    if (err.name === 'TimeoutError') return { sent: false, error: 'Discord did not answer within 5 seconds.' }
    if (err.cause?.code === 'ERR_INVALID_URL') return { sent: false, error: 'DISCORD_WEBHOOK_URL in .env is not a valid URL.' }
    return { sent: false, error: 'Could not reach Discord.' }
  }
}

module.exports = { buildFailureAlert, sendDiscordMessage }
