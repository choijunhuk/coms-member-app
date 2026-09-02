import { request, requestNoContent } from './apiClient'
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

// 임원 이상 — 공지를 목록 상단에 고정하거나 해제합니다 (web noticeApi.pinNotice).
export function pinNotice(id, pinned) {
  return request(`/api/notices/${id}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  })
}

// 회장 전용 — 공지에 표시할 작성자 이름만 바꿉니다 (계정 재지정 아님).
export function updateNoticeAuthor(id, name) {
  return request(`/api/notices/${id}/author`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

// 임원 이상. 204/빈 본문으로 응답하므로 JSON 파싱을 요구하지 않습니다.
export function deleteNotice(id) {
  return requestNoContent(`/api/notices/${id}`, {
    method: 'DELETE',
  })
}

export function voteNotice(id, value) {
  return request(`/api/notices/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
}
