import { request } from './apiClient'

export function getNotificationSummary() {
  return request('/api/notifications/summary')
}

export function listNotifications() {
  return request('/api/notifications')
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'PATCH' })
}
