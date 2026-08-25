import { request } from './apiClient'
import { defaultNotificationPreferences } from '../utils/preferences'
import { NotificationListSchema, NotificationPreferencesSchema, NotificationSummarySchema, parseApiResponse } from './responseSchemas'

export async function getNotificationPreferences() {
  const data = await request('/api/notifications/preferences')
  const parsed = parseApiResponse(NotificationPreferencesSchema, data, '알림 설정')
  // Absent keys default to enabled — same as the backend for never-saved members.
  const defaults = defaultNotificationPreferences()
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, parsed[key] ?? defaults[key]]))
}

export function updateNotificationPreferences(preferences) {
  // The PUT contract requires all seven booleans — no partial updates.
  const defaults = defaultNotificationPreferences()
  const body = Object.fromEntries(Object.keys(defaults).map((key) => [key, Boolean(preferences?.[key] ?? defaults[key])]))
  return request('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

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
