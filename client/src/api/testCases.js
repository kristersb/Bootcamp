import { jsonRequest, request } from './request'

const BASE_URL = '/api/test-cases'

export function listTestCases(params) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  return request(`${BASE_URL}?${query.toString()}`)
}

export function createTestCase(payload) {
  return request(BASE_URL, jsonRequest('POST', payload))
}

export function updateTestCase(id, payload) {
  return request(`${BASE_URL}/${id}`, jsonRequest('PUT', payload))
}

export function listTestCaseSuites(id) {
  return request(`${BASE_URL}/${id}/suites`).then((data) => data.items)
}

export function deleteTestCase(id) {
  return request(`${BASE_URL}/${id}`, { method: 'DELETE' })
}
