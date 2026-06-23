import { request, requestNoContent } from './apiClient'
import { CurrentUserSchema, parseApiResponse } from './responseSchemas'

export function loginUser(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getCurrentUser() {
  const data = await request('/api/auth/me')
  return parseApiResponse(CurrentUserSchema, data, '현재 사용자')
}

export function logoutUser() {
  return requestNoContent('/api/auth/logout', { method: 'POST' })
}

export function changePassword(currentPassword, newPassword) {
  return requestNoContent('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export function withdrawSelf() {
  return requestNoContent('/api/auth/me', { method: 'DELETE' })
}
