import { request } from './apiClient'

// 동아리방 출입 비밀번호 (회원 이상 — 준회원은 403).
export function getClubRoom(): Promise<{ doorCode?: string }> {
  return request('/api/club-room')
}

export type SiteContactLink = { label: string; href: string }

export type SiteSettings = {
  semesterLabel: string
  recruitmentStatus: string
  contactLinks: SiteContactLink[]
}

// The values the app shipped with before /api/site-settings existed. They stay
// as the loading/offline fallback so a cold launch (or a failed fetch) still
// renders real copy instead of blanks — the server only ever overrides them.
export const DEFAULT_SITE_SETTINGS: SiteSettings = Object.freeze({
  semesterLabel: 'Today COMS',
  recruitmentStatus: '모집 안내',
  contactLinks: [{ label: '운영진 메일', href: 'mailto:kwcoms69@gmail.com' }],
}) as SiteSettings

export const SITE_SETTINGS_QUERY_KEY = ['member-app', 'site-settings']

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

// 문의 링크는 서버(운영진 관리 화면)가 채우는 값이지만 그대로 href에 꽂히므로,
// javascript:/data: 같은 스킴은 여기서 잘라냅니다. 실제로 쓰이는 건 메일과 웹뿐.
const ALLOWED_CONTACT_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

function isAllowedContactHref(href: string) {
  try {
    return ALLOWED_CONTACT_SCHEMES.has(new URL(href).protocol)
  } catch {
    return false
  }
}

function cleanLinks(value: unknown): SiteContactLink[] {
  if (!Array.isArray(value)) return DEFAULT_SITE_SETTINGS.contactLinks
  const links = value
    .map((link) => ({ label: clean(link?.label), href: clean(link?.href) }))
    .filter((link) => link.label && link.href && isAllowedContactHref(link.href))
  return links.length > 0 ? links : DEFAULT_SITE_SETTINGS.contactLinks
}

// Mirrors the web's normalizeSiteSettings: every field falls back individually,
// so a partially-filled server row cannot blank a single line of the UI.
export function normalizeSiteSettings(value): SiteSettings {
  return {
    semesterLabel: clean(value?.semesterLabel) || DEFAULT_SITE_SETTINGS.semesterLabel,
    recruitmentStatus: clean(value?.recruitmentStatus) || DEFAULT_SITE_SETTINGS.recruitmentStatus,
    contactLinks: cleanLinks(value?.contactLinks),
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return normalizeSiteSettings(await request('/api/site-settings'))
}
