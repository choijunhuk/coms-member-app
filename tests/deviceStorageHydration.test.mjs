import assert from 'node:assert/strict'

// Native path only: on the web fallback every write goes straight to
// localStorage, so the hydration bookkeeping under test never runs.
const store = new Map()
globalThis.window = {
  localStorage: {
    get length() { return store.size },
    key: (index) => Array.from(store.keys())[index] ?? null,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
}

const { Capacitor } = await import('@capacitor/core')
const { Preferences } = await import('@capacitor/preferences')
Capacitor.isNativePlatform = () => true

const { hydrateStoredValues, readStoredValue, writeStoredValue } = await import('../src/utils/deviceStorage.ts')

// A sync write is authoritative for the rest of the session, but it persists
// fire-and-forget. Hydration used to ignore that and read whatever was on disk
// back over it — so a setting the member had just changed reverted itself.
writeStoredValue('coms.theme', 'dark')
assert.equal(readStoredValue('coms.theme'), 'dark')

// Plant a stale value on disk behind the cache's back. If hydration reads at
// all, it reads this, and the assertion below fails.
await Preferences.set({ key: 'coms.theme', value: 'light' })
await hydrateStoredValues(['coms.theme'])
assert.equal(readStoredValue('coms.theme'), 'dark', 'hydration must not clobber a value written this session')

// A key never written this session still hydrates from disk as before.
await Preferences.set({ key: 'coms.onboarded', value: '1' })
await hydrateStoredValues(['coms.onboarded'])
assert.equal(readStoredValue('coms.onboarded'), '1')

// ...and once hydrated it is authoritative too.
await Preferences.set({ key: 'coms.onboarded', value: '0' })
await hydrateStoredValues(['coms.onboarded'])
assert.equal(readStoredValue('coms.onboarded'), '1')

console.log('device storage hydration contract passed')
