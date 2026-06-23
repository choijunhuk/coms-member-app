import { request } from './apiClient'

export function listEligibleMembers() {
  return request('/api/admin/eligible-members')
}

export function listMembers() {
  return request('/api/admin/members')
}

export function listAuditLogs() {
  return request('/api/admin/audit-logs')
}
