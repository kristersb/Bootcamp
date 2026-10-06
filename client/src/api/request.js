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
