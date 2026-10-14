export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function request(url, options) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  let json
  try {
    json = await res.json()
  } catch {
    throw new ApiError('The server sent an unexpected response. Try again in a moment.', res.status)
  }

  if (!json.success) {
    throw new ApiError(json.error || 'Something went wrong. Try again.', res.status)
  }
  return json.data
}

export function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// For endpoints that respond with a raw file (CSV/HTML, via Content-Disposition) on success but the normal
// {success, data, error} JSON on failure - a plain `<a href=... download>` would otherwise hand the user's
// browser that error JSON as if it were the file, with no visible message.
export async function downloadFile(url) {
  let res
  try {
    res = await fetch(url)
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  if (!res.ok) {
    let message = 'Something went wrong. Try again.'
    try {
      const json = await res.json()
      if (json && json.error) message = json.error
    } catch {
      // Not a JSON error body - keep the generic message.
    }
    throw new ApiError(message, res.status)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="?([^";]+)"?/)
  const filename = match ? match[1] : 'download'

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
