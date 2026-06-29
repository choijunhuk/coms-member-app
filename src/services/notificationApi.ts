import { request } from './apiClient'
import { NotificationListSchema, NotificationSummarySchema, parseApiResponse } from './responseSchemas'

export async function getNotificationSummary() {
  const data = await request('/api/notifications/summary')
  return parseApiResponse(NotificationSummarySchema, data, '알림 요약')
}

export async function listNotifications() {
  const data = await request('/api/notifications')
  return parseApiResponse(NotificationListSchema, data, '알림 목록')
}

export function markNotificationRead(id) {
  return request(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return request('/api/notifications/read-all', { method: 'PATCH' })
}
