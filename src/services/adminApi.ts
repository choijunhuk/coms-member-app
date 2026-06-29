import { request } from './apiClient'
import { AuditLogListSchema, EligibleMemberListSchema, MemberListSchema, parseApiResponse } from './responseSchemas'

export async function listEligibleMembers() {
  const data = await request('/api/admin/eligible-members')
  return parseApiResponse(EligibleMemberListSchema, data, '가입 자격 회원 목록')
}

export async function listMembers() {
  const data = await request('/api/admin/members')
  return parseApiResponse(MemberListSchema, data, '회원 목록')
}

export async function listAuditLogs() {
  const data = await request('/api/admin/audit-logs')
  return parseApiResponse(AuditLogListSchema, data, '운영 기록 목록')
}
