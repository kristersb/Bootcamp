import { request } from './request'

export function getDashboardMetrics() {
  return request('/api/dashboard/metrics')
}
