import { request } from './apiClient'

// 동아리방 출입 비밀번호 (회원 이상 — 준회원은 403).
export function getClubRoom(): Promise<{ doorCode?: string }> {
  return request('/api/club-room')
}
