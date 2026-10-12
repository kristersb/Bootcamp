import { jsonRequest, request } from './request'

const BASE_URL = '/api/settings'

export function getSettings() {
  return request(BASE_URL)
}

export function updateSettings(payload) {
  return request(BASE_URL, jsonRequest('PUT', payload))
}
