import { downloadFile, jsonRequest, request } from './request'

const BASE_URL = '/api/test-cases'

function buildQuery(params) {
  return new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null)))
}

export function listTestCases(params) {
  return request(`${BASE_URL}?${buildQuery(params).toString()}`)
}

// Same filter shape as listTestCases, so the export always matches what's on screen. A plain URL, not a
// fetch() call - the browser handles the attachment download/filename itself (see Content-Disposition).
export function testCaseExportUrl(params) {
  return `${BASE_URL}/export?${buildQuery(params).toString()}`
}

export function exportTestCases(params) {
  return downloadFile(testCaseExportUrl(params))
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

export function previewTestCaseImport(content) {
  return request(`${BASE_URL}/import/preview`, jsonRequest('POST', { content }))
}

export function commitTestCaseImport(content) {
  return request(`${BASE_URL}/import`, jsonRequest('POST', { content }))
}
