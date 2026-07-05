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

const { PUSH_TYPES, readOnboarded, markOnboarded, readPushPreferences, readTheme, resolveTheme, writePushPreferences, writeTheme } = await import('../src/utils/preferences.ts')

assert.equal(readTheme(), 'system')
writeTheme('dark')
assert.equal(readTheme(), 'dark')
writeTheme('garbage')
assert.equal(readTheme(), 'dark')
writeTheme('light')
assert.equal(resolveTheme('light'), 'light')
assert.equal(resolveTheme('dark'), 'dark')
assert.equal(resolveTheme('system'), 'light')

const defaults = readPushPreferences()
for (const type of PUSH_TYPES) assert.equal(defaults[type.id], true)

writePushPreferences({ ...defaults, NOTICE: false })
const after = readPushPreferences()
assert.equal(after.NOTICE, false)
assert.equal(after.COMMENT, true)

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
