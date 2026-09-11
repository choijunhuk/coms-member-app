import { apiUrl, request, requestNoContent } from './apiClient'
import { FileListSchema, FileSchema, parseApiResponse } from './responseSchemas'

export async function listFiles() {
  const data = await request('/api/files')
  return parseApiResponse(FileListSchema, data, '자료 목록')
}

export function downloadUrl(id, file = null) {
  return apiUrl(withContentVersion(`/api/files/${id}/download`, file))
}

export function inlineUrl(id, file) {
  return apiUrl(withContentVersion(`/api/files/${id}/inline`, file))
}

function withContentVersion(path, file) {
  const version = file?.contentVersion
  return version === undefined || version === null || version === '' ? path : `${path}?v=${encodeURIComponent(version)}`
}

export async function voteFile(id, value) {
  const data = await request(`/api/files/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
  return parseApiResponse(FileSchema, data, '자료 투표')
}

export function updateArchiveFile(id, { title, description, category, file }) {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description || '')
  form.append('category', category || 'GENERAL')
  if (file) form.append('file', file)
  return request(`/api/files/${id}`, {
    method: 'PUT',
    body: form,
  })
}

// 실제 업로더 재지정은 회장 전용; 표시 이름 변경은 기존 자료실 관리 권한 유지.
export function updateArchiveAuthor(id, payload) {
  const body = typeof payload === 'string' ? { uploaderName: payload } : payload
  return request(`/api/files/${id}/author`, {
    method: 'PATCH',
    body: JSON.stringify(body?.studentId ? { studentId: body.studentId } : { uploaderName: body?.uploaderName || '' }),
  })
}

// 부회장 이상. 빈 본문으로 응답하므로 JSON 파싱을 요구하지 않습니다.
export function deleteFile(id) {
  return requestNoContent(`/api/files/${id}`, {
    method: 'DELETE',
  })
}

export function createArchivePost({ title, description, category, file }) {
  const form = new FormData()
  form.append('title', title)
  if (description) form.append('description', description)
  form.append('category', category || 'GENERAL')
  form.append('file', file)
  return request('/api/files', {
    method: 'POST',
    body: form,
  })
}

// Batch-create one resource entry per selected file by looping the single-create
// endpoint (same approach as the web; no batch endpoint exists). When more than
// one file is selected the shared title gets a 1-based suffix to stay distinct.
// Returns per-file results so the caller can report partial success.
export async function createArchivePosts(files, meta) {
  const multiple = files.length > 1
  const results = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const title = multiple ? `${meta.title} (${index + 1})` : meta.title
    try {
      const saved = await createArchivePost({ ...meta, title, file })
      results.push({ ok: true, file, saved })
    } catch (err) {
      results.push({ ok: false, file, error: err })
    }
  }
  return results
}
