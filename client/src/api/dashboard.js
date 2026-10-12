import { request } from './request'

export function getDashboardMetrics() {
  return request('/api/dashboard/metrics')
}

export function getDashboardTrends() {
  return request('/api/dashboard/trends')
}
