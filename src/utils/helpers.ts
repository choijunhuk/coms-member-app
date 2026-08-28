import { apiUrl } from '../services/apiClient'
import { DEFAULT_APP_CONFIG } from '../services/mobileApi'
import { normalizeAppLinks, normalizeExternalUrl } from '../config/appLinks'
import { asArray } from './format'
import { ArchiveCategory, CommunityCategory, NoticeCategory } from '../contract/enums'
import { enumLabels } from '../contract/labels'

// Keys bound to the canonical CommunityPost.Category enum (drift-guarded).
export const categoryLabels = enumLabels(CommunityCategory, {
  [CommunityCategory.GENERAL]: '일반',
  [CommunityCategory.QUESTION]: '질문',
  [CommunityCategory.INFO]: '정보',
  [CommunityCategory.ANONYMOUS]: '익명',
})

// Keys bound to the canonical Notice.Category enum (drift-guarded).
export const noticeCategoryLabels = enumLabels(NoticeCategory, {
  [NoticeCategory.GENERAL]: '공지',
  [NoticeCategory.PROMOTION]: '홍보',
  [NoticeCategory.SMALL_GROUP]: '소모임',
  [NoticeCategory.JOB]: '취업공고',
})

export function isGraduateStudentId(studentId) {
  if (!/^\d{10}$/.test(String(studentId || ''))) return true
  const admissionYear = Number(String(studentId).slice(0, 4))
  return admissionYear <= new Date().getFullYear() - 7
}

export function canAccessAnonymousBoard(user) {
  // 부회장 이상 = community moderator (backend CommunityAccess.isModerator 동일).
  return canModerateCommunity(user) || !isGraduateStudentId(user?.studentId)
}

export function categoryOptionsForUser(user) {
  const all = Object.entries(categoryLabels)
  return canAccessAnonymousBoard(user) ? all : all.filter(([key]) => key !== 'ANONYMOUS')
}

// Keys bound to the canonical ArchiveFile.Category enum (drift-guarded). The
// trailing entries are legacy fallback labels for category strings the backend
// no longer emits; they are kept defensively but are not part of the contract.
export const fileCategoryLabels = enumLabels(ArchiveCategory, {
  [ArchiveCategory.GENERAL]: '일반',
  [ArchiveCategory.ACADEMIC_JOURNAL]: '학술지',
  // legacy fallbacks (not in ArchiveCategory):
  STUDY: '스터디',
  PROJECT: '프로젝트',
  NOTICE: '공지',
})

export function latest(items, field) {
  return [...asArray(items)].sort((a, b) => Number(new Date(b?.[field] || 0)) - Number(new Date(a?.[field] || 0)))
}

// Community list sort modes, mirroring the web: latest | comments | score | views.
// Pinned posts always surface first regardless of the chosen mode.
export const communitySortOptions = [
  ['latest', '최신순'],
  ['comments', '댓글순'],
  ['score', '추천순'],
  ['views', '조회순'],
]

export function sortCommunityPosts(items, sort = 'latest') {
  const score = (post) => Number(post?.upvotes || 0) - Number(post?.downvotes || 0)
  const time = (post) => {
    const value = Number(new Date(post?.createdAt || 0))
    return Number.isFinite(value) ? value : 0
  }
  return [...asArray(items)].sort((a, b) => {
    const pinDelta = Number(Boolean(b?.pinned)) - Number(Boolean(a?.pinned))
    if (pinDelta !== 0) return pinDelta
    if (sort === 'comments') return Number(b?.commentCount || 0) - Number(a?.commentCount || 0) || time(b) - time(a)
    if (sort === 'score') return score(b) - score(a) || time(b) - time(a)
    if (sort === 'views') return Number(b?.viewCount || 0) - Number(a?.viewCount || 0) || time(b) - time(a)
    return time(b) - time(a)
  })
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

// Mirrors the website's role ladder: ASSOCIATE < USER < OFFICER < VICE_PRESIDENT < ADMIN.
const ROLE_RANK = { ASSOCIATE: 0, USER: 1, OFFICER: 2, VICE_PRESIDENT: 3, ADMIN: 4 }

function roleAtLeast(user, tier) {
  return (ROLE_RANK[user?.role] ?? -1) >= ROLE_RANK[tier]
}

// 회장 전용 (앱 카탈로그 관리, 명부/운영 기록 — backend /api/admin/** gates).
export function isAdminUser(user) {
  return user?.role === 'ADMIN'
}

// 임원 이상: 공지/활동/일정 작성 (backend hasAnyRole ADMIN,OFFICER routes).
export function canManageContent(user) {
  return roleAtLeast(user, 'OFFICER')
}

// 부회장 이상: 커뮤니티 중재 — 글 고정/삭제 (backend VICE_PRESIDENT gates).
export function canModerateCommunity(user) {
  return roleAtLeast(user, 'VICE_PRESIDENT')
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
  const merged = { ...DEFAULT_APP_CONFIG, ...(data || {}) }
  const links = normalizeAppLinks(merged)
  return {
    ...merged,
    links,
    updateUrl: normalizeExternalUrl(merged.updateUrl, links.update),
  }
}
