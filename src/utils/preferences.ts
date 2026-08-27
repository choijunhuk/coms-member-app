import { readStoredValue, writeStoredValue } from './deviceStorage'

const THEME_KEY = 'coms.theme:v1'
const PUSH_KEY = 'coms.push.types:v1'
const ONBOARDING_KEY = 'coms.onboarded:v1'
const FONT_SCALE_KEY = 'coms.fontScale:v1'
const HAPTIC_KEY = 'coms.haptic:v1'
const IDLE_LOCK_KEY = 'coms.idleLock:v1'

export const PREFERENCE_STORAGE_KEYS = [THEME_KEY, PUSH_KEY, ONBOARDING_KEY, FONT_SCALE_KEY, HAPTIC_KEY, IDLE_LOCK_KEY]

export const THEME_VALUES = ['system', 'light', 'dark']

export function readTheme() {
  const value = readStoredValue(THEME_KEY)
  return THEME_VALUES.includes(value) ? value : 'system'
}

export function writeTheme(value) {
  if (!THEME_VALUES.includes(value)) return
  writeStoredValue(THEME_KEY, value)
}

export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Server-backed notification categories (GET/PUT /api/notifications/preferences).
// Keys, labels, and descriptions mirror the website's 알림 설정 card one-to-one —
// the backend filters at notification-creation time, so these are real opt-outs,
// not device-local mutes. (The old coms.push.types:v1 local blob they replace
// filtered nothing; PUSH_KEY stays in PREFERENCE_STORAGE_KEYS so wipes clear it.)
export const NOTIFICATION_CATEGORIES = [
  { id: 'commentOnPost', label: '내 글의 새 댓글', description: '내가 쓴 게시글에 댓글이 달리면 알려드립니다.' },
  { id: 'replyOnComment', label: '내 댓글의 답글', description: '내가 쓴 댓글에 답글이 달리면 알려드립니다.' },
  { id: 'noticeCreated', label: '새 공지사항', description: '새로운 공지가 등록되면 알려드립니다.' },
  { id: 'externalInvite', label: '초대 알림', description: '다른 회원이 보낸 초대를 알려드립니다.' },
  { id: 'communityPostRestored', label: '글 복원 안내', description: '내 글이 삭제 보관함에서 복원되면 알려드립니다.' },
  { id: 'communityPostDeleted', label: '글 삭제 안내', description: '내 글이 관리자에 의해 삭제되면 알려드립니다.' },
  { id: 'recruitApplication', label: '새 지원서 (관리자)', description: '새 지원서가 도착하면 알려드립니다.' },
]

export function defaultNotificationPreferences() {
  return Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [category.id, true]))
}

export function readOnboarded() {
  return readStoredValue(ONBOARDING_KEY) === '1'
}

export function markOnboarded() {
  writeStoredValue(ONBOARDING_KEY, '1')
}

export const FONT_SCALE_VALUES = [
  { id: 'small', label: '작게', factor: 0.9 },
  { id: 'medium', label: '보통', factor: 1 },
  { id: 'large', label: '크게', factor: 1.1 },
  { id: 'xlarge', label: '아주 크게', factor: 1.25 },
]

export function readFontScale() {
  const value = readStoredValue(FONT_SCALE_KEY)
  return FONT_SCALE_VALUES.some((item) => item.id === value) ? value : 'medium'
}

export function writeFontScale(value) {
  if (!FONT_SCALE_VALUES.some((item) => item.id === value)) return
  writeStoredValue(FONT_SCALE_KEY, value)
}

export function resolveFontFactor(id) {
  return FONT_SCALE_VALUES.find((item) => item.id === id)?.factor ?? 1
}

export function readHapticEnabled() {
  const raw = readStoredValue(HAPTIC_KEY)
  return raw === null ? true : raw === '1'
}

export function writeHapticEnabled(value) {
  writeStoredValue(HAPTIC_KEY, value ? '1' : '0')
}

// Kill switch for the whole idle-lock feature (자리비움 잠금). The lock/unlock
// code stays intact behind this flag — flip to true to bring it back. Disabled
// 2026-08-27 by user request: the re-auth prompt annoyed more than it protected.
export const IDLE_LOCK_FEATURE_ENABLED = false

export const IDLE_LOCK_VALUES = [
  { id: 'off', label: '사용 안 함', minutes: null },
  { id: '3m', label: '3분', minutes: 3 },
  { id: '5m', label: '5분', minutes: 5 },
  { id: '10m', label: '10분', minutes: 10 },
  { id: '30m', label: '30분', minutes: 30 },
]

export function readIdleLock() {
  const value = readStoredValue(IDLE_LOCK_KEY)
  return IDLE_LOCK_VALUES.some((item) => item.id === value) ? value : '5m'
}

export function writeIdleLock(value) {
  if (!IDLE_LOCK_VALUES.some((item) => item.id === value)) return
  writeStoredValue(IDLE_LOCK_KEY, value)
}

export function resolveIdleLockMs(id) {
  const minutes = IDLE_LOCK_VALUES.find((item) => item.id === id)?.minutes
  return typeof minutes === 'number' ? minutes * 60 * 1000 : null
}
