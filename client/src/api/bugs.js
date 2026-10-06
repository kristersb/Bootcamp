import { jsonRequest, request } from './request'

const BASE_URL = '/api/bugs'

export function listBugs(params) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  )
  return request(`${BASE_URL}?${query.toString()}`)
}

export function getBug(id) {
  return request(`${BASE_URL}/${id}`)
}

export function createBug(payload) {
  return request(BASE_URL, jsonRequest('POST', payload))
}

export function updateBug(id, payload) {
  return request(`${BASE_URL}/${id}`, jsonRequest('PUT', payload))
}

export function deleteBug(id) {
  return request(`${BASE_URL}/${id}`, { method: 'DELETE' })
}

// "from" is the status the person was looking at; the server refuses the move if the bug has changed since.
export function changeBugStatus(id, status, message, from) {
  return request(`${BASE_URL}/${id}/status`, jsonRequest('PATCH', { status, message, from }))
}

export function addBugComment(id, message) {
  return request(`${BASE_URL}/${id}/comments`, jsonRequest('POST', { message }))
}
