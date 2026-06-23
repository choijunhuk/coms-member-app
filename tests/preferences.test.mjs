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

console.log('preferences contract passed')
