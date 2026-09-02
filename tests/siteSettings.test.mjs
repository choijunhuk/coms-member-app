import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DEFAULT_SITE_SETTINGS, getSiteSettings, normalizeSiteSettings } from '../src/services/siteApi.ts'

// Every field falls back on its own, so a half-filled server row cannot blank a
// line of the UI — that is the whole point of keeping the hardcoded values.
assert.deepEqual(normalizeSiteSettings(null), DEFAULT_SITE_SETTINGS)
assert.deepEqual(normalizeSiteSettings({}), DEFAULT_SITE_SETTINGS)
assert.equal(normalizeSiteSettings({ semesterLabel: '   ' }).semesterLabel, DEFAULT_SITE_SETTINGS.semesterLabel)
assert.equal(normalizeSiteSettings({ semesterLabel: ' 2026 2학기 ' }).semesterLabel, '2026 2학기')
assert.equal(normalizeSiteSettings({ recruitmentStatus: '모집 중' }).recruitmentStatus, '모집 중')
// A server value for one field must not drag the others off their fallback.
assert.equal(normalizeSiteSettings({ recruitmentStatus: '모집 중' }).semesterLabel, DEFAULT_SITE_SETTINGS.semesterLabel)

// contactLinks 는 그대로 href 로 들어가므로 스킴을 제한합니다.
assert.deepEqual(
  normalizeSiteSettings({ contactLinks: [{ label: '인스타', href: 'https://instagram.com/kwcoms' }] }).contactLinks,
  [{ label: '인스타', href: 'https://instagram.com/kwcoms' }],
)
assert.deepEqual(
  normalizeSiteSettings({ contactLinks: [{ label: 'XSS', href: 'javascript:alert(1)' }] }).contactLinks,
  DEFAULT_SITE_SETTINGS.contactLinks,
)
assert.deepEqual(
  normalizeSiteSettings({ contactLinks: [{ label: '없음', href: '' }, { label: '', href: 'mailto:a@b.c' }] }).contactLinks,
  DEFAULT_SITE_SETTINGS.contactLinks,
)
assert.deepEqual(normalizeSiteSettings({ contactLinks: '메일' }).contactLinks, DEFAULT_SITE_SETTINGS.contactLinks)
// A mixed list keeps only the safe entries instead of falling back wholesale.
assert.deepEqual(
  normalizeSiteSettings({
    contactLinks: [{ label: '나쁜 링크', href: 'data:text/html,x' }, { label: '메일', href: 'mailto:kwcoms69@gmail.com' }],
  }).contactLinks,
  [{ label: '메일', href: 'mailto:kwcoms69@gmail.com' }],
)

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ semesterLabel: '2026 2학기', recruitmentStatus: '모집 마감', contactLinks: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const settings = await getSiteSettings()
assert.equal(calls[0].url, '/api/site-settings')
assert.equal(settings.semesterLabel, '2026 2학기')
assert.equal(settings.recruitmentStatus, '모집 마감')
assert.deepEqual(settings.contactLinks, DEFAULT_SITE_SETTINGS.contactLinks)

// The hook must fall back rather than render undefined while the fetch is in
// flight or after it fails — the whole reason the defaults are kept around.
const hookSource = readFileSync('src/hooks/useSiteSettings.ts', 'utf8')
assert.match(hookSource, /query\.data \?\? DEFAULT_SITE_SETTINGS/)
assert.match(hookSource, /retry: false/)

// Consumers read the server values, not their own hardcoded copies.
const homeSource = readFileSync('src/screens/HomeTab.tsx', 'utf8')
assert.match(homeSource, /\{site\.semesterLabel\}/)
assert.match(homeSource, /\{site\.recruitmentStatus\}/)
assert.doesNotMatch(homeSource, /Today COMS/)

const settingsSource = readFileSync('src/screens/SettingsScreen.tsx', 'utf8')
assert.match(settingsSource, /site\.contactLinks\.map/)

console.log('site settings contract passed')
