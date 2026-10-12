import { request } from './request'

const BASE_URL = '/api/flaky-tests'

export function getFlakyLeaderboard(limit) {
  return request(`${BASE_URL}/leaderboard${limit ? `?limit=${limit}` : ''}`)
}
