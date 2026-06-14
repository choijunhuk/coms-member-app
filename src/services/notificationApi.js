import { request } from './apiClient.js'

export function getNotificationSummary() {
  return request('/api/notifications/summary')
}
