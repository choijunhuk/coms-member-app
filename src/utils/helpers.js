import { apiUrl } from '../services/apiClient.js'
import { DEFAULT_APP_CONFIG } from '../services/mobileApi.js'
import { asArray } from './format.js'

export const categoryLabels = {
  GENERAL: '자유',
  QUESTION: '질문',
  INFO: '정보',
  ANONYMOUS: '익명',
}

export const fileCategoryLabels = {
  GENERAL: '일반',
  STUDY: '스터디',
  PROJECT: '프로젝트',
  NOTICE: '공지',
}

export function latest(items, field) {
  return [...asArray(items)].sort((a, b) => new Date(b?.[field] || 0) - new Date(a?.[field] || 0))
}

export function mediaSrc(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(String(value))) return value
  return apiUrl(value)
}

export function postImage(post) {
  if (post?.imageUrl) return mediaSrc(post.imageUrl)
  if (Array.isArray(post?.imageUrls) && post.imageUrls[0]) return mediaSrc(post.imageUrls[0])
  if (Array.isArray(post?.imageInfos) && post.imageInfos[0]?.url) return mediaSrc(post.imageInfos[0].url)
  return null
}

export function isAdminUser(user) {
  return user?.role === 'ADMIN'
}

export function normalizeHomeData(data) {
  return {
    notices: asArray(data?.latestNotices || data?.notices),
    posts: asArray(data?.recentPosts || data?.posts),
    files: asArray(data?.quickFiles || data?.files),
    notifications: asArray(data?.notifications),
    unreadCount: Number(data?.notificationSummary?.unreadCount ?? data?.unreadCount ?? 0),
  }
}

export function normalizeAppConfig(data) {
  return { ...DEFAULT_APP_CONFIG, ...(data || {}) }
}
