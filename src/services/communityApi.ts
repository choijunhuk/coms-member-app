import { request } from './apiClient'
import { CommunityPostListSchema, CommunityPostSchema, parseApiResponse } from './responseSchemas'

export async function listCommunityPosts() {
  // The backend list endpoint became DB-paginated (default 20, max 200 per page),
  // but the app filters/sorts/searches client-side over the full list — same as
  // the web board — so fetch every page. ponytail: fine at club scale; move
  // filter/sort/search server-side if the board outgrows a few thousand posts.
  const size = 200
  const all = []
  // Posts created while paging shift the offset-based pages, so the same post
  // can appear on two consecutive pages — dedupe by id or the list renders
  // duplicate rows (and duplicate React keys misroute taps).
  const seen = new Set()
  const collect = (batch) => {
    for (const post of batch) {
      const key = String(post.id)
      if (seen.has(key)) continue
      seen.add(key)
      all.push(post)
    }
  }
  const fetchPage = async (page) => {
    const data = await request(`/api/community/posts?page=${page}&size=${size}`)
    return parseApiResponse(CommunityPostListSchema, data, '커뮤니티 글 목록')
  }
  // The bare-array response carries no total, so pages load in concurrent
  // windows of 4: fetch a window, stop as soon as any page comes back short.
  const first = await fetchPage(0)
  collect(first)
  if (first.length < size) return all
  for (let start = 1; start < 50; start += 4) {
    const pages = [start, start + 1, start + 2, start + 3].filter((page) => page < 50)
    const batches = await Promise.all(pages.map(fetchPage))
    batches.forEach(collect)
    if (batches.some((batch) => batch.length < size)) break
  }
  return all
}

export async function getCommunityPost(id) {
  const data = await request(`/api/community/posts/${id}`)
  return parseApiResponse(CommunityPostSchema, data, '커뮤니티 글')
}

export function createCommunityPost(payload) {
  return request('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createCommunityPostWithImage(payload, image) {
  const form = new FormData()
  form.append('post', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  form.append('image', image)
  return request('/api/community/posts', {
    method: 'POST',
    body: form,
  })
}

export function appendCommunityPostImages(postId, images) {
  const form = new FormData()
  for (const file of images) form.append('images', file)
  return request(`/api/community/posts/${postId}/images`, {
    method: 'POST',
    body: form,
  })
}

export function uploadCommunityPostVideo(postId, file) {
  const form = new FormData()
  form.append('video', file)
  return request(`/api/community/posts/${postId}/videos`, {
    method: 'POST',
    body: form,
  })
}

export function uploadCommunityPostFile(postId, file) {
  const form = new FormData()
  form.append('file', file)
  return request(`/api/community/posts/${postId}/files`, {
    method: 'POST',
    body: form,
  })
}

export function updateCommunityPost(id, payload) {
  return request(`/api/community/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteCommunityPost(id) {
  return request(`/api/community/posts/${id}`, {
    method: 'DELETE',
  })
}

export function listMyDeletedCommunityPosts() {
  return request('/api/community/posts/deleted/me')
}

export function appealDeletedCommunityPost(id, message) {
  return request(`/api/community/posts/deleted/${id}/appeals`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })
}

export function voteCommunityPost(id, value) {
  return request(`/api/community/posts/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
}

export function toggleCommunityPostBookmark(id) {
  return request(`/api/community/posts/${id}/bookmark`, {
    method: 'POST',
  })
}

export async function listBookmarkedPosts() {
  const data = await request('/api/community/posts/bookmarked/me')
  return parseApiResponse(CommunityPostListSchema, data, '스크랩한 글 목록')
}

export function voteCommunityPoll(id, pollId, optionIndex) {
  return request(`/api/community/posts/${id}/poll-votes`, {
    method: 'POST',
    body: JSON.stringify({ pollId, optionIndex }),
  })
}

export function listComments(postId) {
  return request(`/api/community/posts/${postId}/comments`)
}

export function createComment(postId, content, parentCommentId = null, anonymousName = '') {
  return request(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentCommentId, anonymousName }),
  })
}

export function updateComment(postId, commentId, content) {
  return request(`/api/community/posts/${postId}/comments/${commentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function deleteComment(postId, commentId) {
  return request(`/api/community/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
  })
}

export function reportCommunityPost(postId, reason, detail) {
  return request(`/api/community/posts/${postId}/reports`, {
    method: 'POST',
    body: JSON.stringify({ reason, detail: detail || null }),
  })
}

export function getMemberReputation(studentId) {
  return request(`/api/community/members/${encodeURIComponent(studentId)}/reputation`)
}

export async function listPostsByAuthor(studentId, page = 0, size = 50) {
  const data = await request(`/api/community/posts/by-author/${encodeURIComponent(studentId)}?page=${page}&size=${size}`)
  return parseApiResponse(CommunityPostListSchema, Array.isArray(data) ? data : [], '작성한 글 목록')
}

export function closeCommunityPoll(postId, pollId) {
  return request(`/api/community/posts/${postId}/polls/${encodeURIComponent(pollId)}/close`, {
    method: 'POST',
  })
}

export function searchYoutubeVideos(query) {
  return request(`/api/community/posts/tools/youtube/search?q=${encodeURIComponent(query)}`)
}

export function fetchLinkPreview(url) {
  return request(`/api/community/posts/tools/link-preview?url=${encodeURIComponent(url)}`)
}

// Admin only — pins/unpins a post to the top of the community list.
export function pinCommunityPost(id, pinned) {
  return request(`/api/community/posts/${id}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  })
}
