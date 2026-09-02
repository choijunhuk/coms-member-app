import { apiUrl, request, requestNoContent } from './apiClient'
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

// 부회장 이상 (web roleAccess.canManageArchive) — 자료에 표시할 업로더 이름만 바꿉니다.
export function updateArchiveAuthor(id, uploaderName) {
  return request(`/api/files/${id}/author`, {
    method: 'PATCH',
    body: JSON.stringify({ uploaderName }),
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
