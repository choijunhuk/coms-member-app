import { request } from './apiClient.js'

export function listNotices() {
  return request('/api/notices')
}

export function getNotice(id) {
  return request(`/api/notices/${id}`)
}
