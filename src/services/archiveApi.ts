import { apiUrl, request } from './apiClient'

export function listFiles() {
  return request('/api/files')
}

export function downloadUrl(id) {
  return apiUrl(`/api/files/${id}/download`)
}

export function voteFile(id, value) {
  return request(`/api/files/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
}
