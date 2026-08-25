import assert from 'node:assert/strict'

// Stub localStorage in Node before importing the module.
const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
  matchMedia: () => ({ matches: false }),
}

const { NOTIFICATION_CATEGORIES, defaultNotificationPreferences, readOnboarded, markOnboarded, readTheme, resolveTheme, writeTheme } = await import('../src/utils/preferences.ts')

assert.equal(readTheme(), 'system')
writeTheme('dark')
assert.equal(readTheme(), 'dark')
writeTheme('garbage')
assert.equal(readTheme(), 'dark')
writeTheme('light')
assert.equal(resolveTheme('light'), 'light')
assert.equal(resolveTheme('dark'), 'dark')
assert.equal(resolveTheme('system'), 'light')

// Server-backed notification categories: keys must match the backend
// NotificationPreferences contract exactly, all default-enabled.
const SERVER_KEYS = ['commentOnPost', 'replyOnComment', 'noticeCreated', 'externalInvite', 'communityPostRestored', 'communityPostDeleted', 'recruitApplication']
assert.deepEqual(NOTIFICATION_CATEGORIES.map((category) => category.id), SERVER_KEYS)
for (const category of NOTIFICATION_CATEGORIES) {
  assert.ok(category.label, `label missing for ${category.id}`)
  assert.ok(category.description, `description missing for ${category.id}`)
}
const notifDefaults = defaultNotificationPreferences()
for (const key of SERVER_KEYS) assert.equal(notifDefaults[key], true)

assert.equal(readOnboarded(), false)
markOnboarded()
assert.equal(readOnboarded(), true)

// Font family preference (web parity)
const { sanitizeFontFamily, fontFamilyValue, buildFontFaceCss, safeFontUrl, BUILT_IN_FONTS, DEFAULT_FONT_FAMILY } = await import('../src/utils/fontPreferences.ts')

assert.equal(sanitizeFontFamily('Pretendard Variable'), 'Pretendard Variable')
assert.equal(sanitizeFontFamily('Bad"Name\\'), 'BadName')
assert.equal(fontFamilyValue(null), DEFAULT_FONT_FAMILY)
assert.ok(fontFamilyValue(BUILT_IN_FONTS[0]).startsWith('"Pretendard Variable", '))

// custom font css: relative fileUrl resolves to the API origin; hostile urls dropped
const css = buildFontFaceCss([{ name: 'Custom Font', fileUrl: '/api/fonts/3/file' }])
assert.ok(css.includes('font-family:"Custom Font"'))
assert.ok(css.includes('/api/fonts/3/file'))
assert.equal(buildFontFaceCss([{ name: 'Evil', fileUrl: 'javascript:alert(1)' }]), '')
assert.equal(safeFontUrl('https://x.com/a"b.woff2'), null)
assert.equal(buildFontFaceCss([]), '')

console.log('preferences contract passed')
