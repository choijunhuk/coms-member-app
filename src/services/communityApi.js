import { request } from './apiClient.js'

export function listCommunityPosts() {
  return request('/api/community/posts')
}

export function getCommunityPost(id) {
  return request(`/api/community/posts/${id}`)
}

export function createCommunityPost(payload) {
  return request('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function voteCommunityPost(id, value) {
  return request(`/api/community/posts/${id}/vote`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  })
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

export function createComment(postId, content) {
  return request(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content, parentCommentId: null, anonymousName: '' }),
  })
}
