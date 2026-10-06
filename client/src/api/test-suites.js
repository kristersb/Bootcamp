import { jsonRequest, request } from './request'

const BASE_URL = '/api/test-suites'

export function listTestSuites(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  return request(`${BASE_URL}?${query.toString()}`)
}

export function getTestSuite(id) {
  return request(`${BASE_URL}/${id}`)
}

export function createTestSuite(payload) {
  return request(BASE_URL, jsonRequest('POST', payload))
}

export function updateTestSuite(id, payload) {
  return request(`${BASE_URL}/${id}`, jsonRequest('PUT', payload))
}

export function deleteTestSuite(id) {
  return request(`${BASE_URL}/${id}`, { method: 'DELETE' })
}

export function addCaseToTestSuite(id, testCaseId) {
  return request(`${BASE_URL}/${id}/cases`, jsonRequest('POST', { testCaseId }))
}

export function removeCaseFromTestSuite(id, testCaseId) {
  return request(`${BASE_URL}/${id}/cases/${testCaseId}`, { method: 'DELETE' })
}

export function reorderTestSuiteCases(id, caseIds) {
  return request(`${BASE_URL}/${id}/cases/order`, jsonRequest('PUT', { caseIds }))
}
