import { request, requestNoContent } from './apiClient.js'

export function loginUser(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser() {
  return request('/api/auth/me')
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
