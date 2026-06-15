const THEME_KEY = 'coms.theme:v1'
const PUSH_KEY = 'coms.push.types:v1'
const ONBOARDING_KEY = 'coms.onboarded:v1'
const FONT_SCALE_KEY = 'coms.fontScale:v1'
const HAPTIC_KEY = 'coms.haptic:v1'
const IDLE_LOCK_KEY = 'coms.idleLock:v1'

function storage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export const THEME_VALUES = ['system', 'light', 'dark']

export function readTheme() {
  const s = storage()
  if (!s) return 'system'
  const value = s.getItem(THEME_KEY)
  return THEME_VALUES.includes(value) ? value : 'system'
}

export function writeTheme(value) {
  const s = storage()
  if (!s) return
  if (!THEME_VALUES.includes(value)) return
  s.setItem(THEME_KEY, value)
}

export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const PUSH_TYPES = [
  { id: 'NOTICE', label: '공지 알림' },
  { id: 'COMMENT', label: '내 글에 댓글' },
  { id: 'REPLY', label: '내 댓글에 답글' },
  { id: 'VOTE', label: '내 글 추천' },
  { id: 'SYSTEM', label: '운영진 안내' },
]

export function readPushPreferences() {
  const s = storage()
  const defaults = Object.fromEntries(PUSH_TYPES.map((type) => [type.id, true]))
  if (!s) return defaults
  try {
    const raw = s.getItem(PUSH_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

export function writePushPreferences(prefs) {
  const s = storage()
  if (!s) return
  s.setItem(PUSH_KEY, JSON.stringify(prefs))
}

export function readOnboarded() {
  const s = storage()
  if (!s) return false
  return s.getItem(ONBOARDING_KEY) === '1'
}

export function markOnboarded() {
  const s = storage()
  if (!s) return
  s.setItem(ONBOARDING_KEY, '1')
}

export const FONT_SCALE_VALUES = [
  { id: 'small', label: '작게', factor: 0.9 },
  { id: 'medium', label: '보통', factor: 1 },
  { id: 'large', label: '크게', factor: 1.1 },
  { id: 'xlarge', label: '아주 크게', factor: 1.25 },
]

export function readFontScale() {
  const s = storage()
  if (!s) return 'medium'
  const value = s.getItem(FONT_SCALE_KEY)
  return FONT_SCALE_VALUES.some((item) => item.id === value) ? value : 'medium'
}

export function writeFontScale(value) {
  const s = storage()
  if (!s) return
  if (!FONT_SCALE_VALUES.some((item) => item.id === value)) return
  s.setItem(FONT_SCALE_KEY, value)
}

export function resolveFontFactor(id) {
  return FONT_SCALE_VALUES.find((item) => item.id === id)?.factor ?? 1
}

export function readHapticEnabled() {
  const s = storage()
  if (!s) return true
  const raw = s.getItem(HAPTIC_KEY)
  return raw === null ? true : raw === '1'
}

export function writeHapticEnabled(value) {
  const s = storage()
  if (!s) return
  s.setItem(HAPTIC_KEY, value ? '1' : '0')
}

export const IDLE_LOCK_VALUES = [
  { id: 'off', label: '사용 안 함', minutes: null },
  { id: '3m', label: '3분', minutes: 3 },
  { id: '5m', label: '5분', minutes: 5 },
  { id: '10m', label: '10분', minutes: 10 },
  { id: '30m', label: '30분', minutes: 30 },
]

export function readIdleLock() {
  const s = storage()
  if (!s) return '5m'
  const value = s.getItem(IDLE_LOCK_KEY)
  return IDLE_LOCK_VALUES.some((item) => item.id === value) ? value : '5m'
}

export function writeIdleLock(value) {
  const s = storage()
  if (!s) return
  if (!IDLE_LOCK_VALUES.some((item) => item.id === value)) return
  s.setItem(IDLE_LOCK_KEY, value)
}

export function resolveIdleLockMs(id) {
  const minutes = IDLE_LOCK_VALUES.find((item) => item.id === id)?.minutes
  return typeof minutes === 'number' ? minutes * 60 * 1000 : null
}
