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
  readStoredValue,
  readStoredValueAsync,
  removeStoredValuesByPrefix,
  writeStoredValue,
  writeStoredValueAsync,
} = await import('../src/utils/deviceStorage.ts')
const { INSTALLATION_DEVICE_ID_KEY } = await import('../src/utils/installationDeviceId.ts')

writeStoredValue('coms.example', 'one')
assert.equal(readStoredValue('coms.example'), 'one')

await writeStoredValueAsync('coms.async', 'two')
assert.equal(await readStoredValueAsync('coms.async'), 'two')

writeStoredValue('other.key', 'keep')
await removeStoredValuesByPrefix('coms.')
assert.equal(readStoredValue('coms.example'), null)
assert.equal(readStoredValue('coms.async'), null)
assert.equal(readStoredValue('other.key'), 'keep')

// Logout wipes the prefix but must spare the installation device id — it keys
// this device (not the member) on the push-token endpoints, so regenerating it
// every logout would orphan the server's token rows.
writeStoredValue(INSTALLATION_DEVICE_ID_KEY, 'install-abc')
writeStoredValue('coms.theme', 'dark')
writeStoredValue('coms.pending-community-posts', '[]')
await removeStoredValuesByPrefix('coms.', [INSTALLATION_DEVICE_ID_KEY])
assert.equal(readStoredValue(INSTALLATION_DEVICE_ID_KEY), 'install-abc')
assert.equal(readStoredValue('coms.theme'), null)
assert.equal(readStoredValue('coms.pending-community-posts'), null)

// A full wipe (탈퇴 / 기기에서 지우기) still takes the id with it.
await removeStoredValuesByPrefix('coms.')
assert.equal(readStoredValue(INSTALLATION_DEVICE_ID_KEY), null)

console.log('device storage contract passed')
