import assert from 'node:assert/strict'

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

const {
  INSTALLATION_DEVICE_ID_KEY,
  getInstallationDeviceId,
} = await import('../src/utils/installationDeviceId.ts')

const first = await getInstallationDeviceId()
const second = await getInstallationDeviceId()

assert.equal(first, second)
assert.match(first, /^install-[a-z0-9-]{8,}$/)
assert.notEqual(first, '2020123456')
assert.equal(window.localStorage.getItem(INSTALLATION_DEVICE_ID_KEY), first)

console.log('installation device id contract passed')
