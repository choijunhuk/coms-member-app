import { request } from './apiClient.js'

export function listNotices() {
  return request('/api/notices')
}

export function getNotice(id) {
  return request(`/api/notices/${id}`)
}

export function createNotice(payload) {
  return request('/api/notices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateNotice(id, payload) {
  return request(`/api/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
