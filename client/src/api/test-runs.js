import { jsonRequest, request } from './request'

const BASE_URL = '/api/test-runs'

export function listTestRuns(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  return request(`${BASE_URL}?${query.toString()}`)
}

export function getTestRun(id) {
  return request(`${BASE_URL}/${id}`)
}

export function createTestRun(payload) {
  return request(BASE_URL, jsonRequest('POST', payload))
}

// Locks the run for good. `expected` is the counts the user saw; the server refuses if they have changed since.
export function completeTestRun(runId, expected) {
  return request(`${BASE_URL}/${runId}/complete`, jsonRequest('POST', { expected }))
}

// The reply is the whole run plus an `alert` field saying what happened with the Discord alert.
export function updateTestRunResult(runId, resultId, payload) {
  return request(`${BASE_URL}/${runId}/results/${resultId}`, jsonRequest('PATCH', payload))
}
