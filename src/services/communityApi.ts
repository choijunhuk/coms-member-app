import { request } from './apiClient'
import { CommunityPostListSchema, CommunityPostSchema, parseApiResponse } from './responseSchemas'

export async function listCommunityPosts() {
  const data = await request('/api/community/posts')
  return parseApiResponse(CommunityPostListSchema, data, '커뮤니티 글 목록')
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

export function createComment(postId, content, parentCommentId = null) {
  return request(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentCommentId, anonymousName: '' }),
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
