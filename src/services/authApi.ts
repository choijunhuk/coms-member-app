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

// 비밀번호 찾기, two steps: request mails a 6-digit code, confirm consumes it.
// The request response is deliberately the same whether or not the address has
// an account, so this must never branch on it to reveal membership.
export function requestPasswordReset(payload) {
  return request('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function confirmPasswordReset(payload) {
  return request('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
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

export function requestEmailVerification() {
  return request('/api/auth/email-verification/request', { method: 'POST' })
}

export function confirmEmailVerification(code) {
  return request('/api/auth/email-verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export function updateProfile(payload) {
  return request('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
