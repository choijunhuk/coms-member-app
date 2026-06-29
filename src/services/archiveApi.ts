import { apiUrl, request } from './apiClient'
import { FileListSchema, FileSchema, parseApiResponse } from './responseSchemas'

export async function listFiles() {
  const data = await request('/api/files')
  return parseApiResponse(FileListSchema, data, '자료 목록')
}

export function downloadUrl(id) {
  return apiUrl(`/api/files/${id}/download`)
}

export async function voteFile(id, value) {
  const data = await request(`/api/files/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
  return parseApiResponse(FileSchema, data, '자료 투표')
}
