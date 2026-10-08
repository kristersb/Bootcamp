import { jsonRequest, request } from './request'

const BASE_URL = '/api/reports'

export function listReports() {
  return request(BASE_URL)
}

export function getReport(id) {
  return request(`${BASE_URL}/${id}`)
}

export function createReport(runId) {
  return request(BASE_URL, jsonRequest('POST', { run_id: runId }))
}

export function reportExportUrl(id) {
  return `${BASE_URL}/${id}/export/html`
}
