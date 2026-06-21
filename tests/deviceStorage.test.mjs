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
} = await import('../src/utils/deviceStorage.js')

writeStoredValue('coms.example', 'one')
assert.equal(readStoredValue('coms.example'), 'one')

await writeStoredValueAsync('coms.async', 'two')
assert.equal(await readStoredValueAsync('coms.async'), 'two')

writeStoredValue('other.key', 'keep')
await removeStoredValuesByPrefix('coms.')
assert.equal(readStoredValue('coms.example'), null)
assert.equal(readStoredValue('coms.async'), null)
assert.equal(readStoredValue('other.key'), 'keep')

console.log('device storage contract passed')
