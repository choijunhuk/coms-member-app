const THEME_KEY = 'coms.theme:v1'
const PUSH_KEY = 'coms.push.types:v1'
const ONBOARDING_KEY = 'coms.onboarded:v1'

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
