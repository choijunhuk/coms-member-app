import { request } from './apiClient'
import { NoticeListSchema, NoticeSchema, parseApiResponse } from './responseSchemas'

export async function listNotices() {
  const data = await request('/api/notices')
  return parseApiResponse(NoticeListSchema, data, '공지 목록')
}

export async function getNotice(id) {
  const data = await request(`/api/notices/${id}`)
  return parseApiResponse(NoticeSchema, data, '공지')
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
