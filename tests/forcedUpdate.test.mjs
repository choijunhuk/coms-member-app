import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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
  DASHBOARD_QUERY_KEY,
  QUERY_CACHE_STORAGE_KEY,
  queryPersister,
} = await import('../src/services/queryClient.ts')

// appConfig must never be restored from disk. minimumSupportedVersion decides
// whether the forced-update screen blocks the whole app, and that screen cannot
// fetch a fresher config — so a 24h-old cached floor could lock a member out
// long after the server lowered it, with no way back.
await queryPersister.persistClient({
  buster: '',
  timestamp: Date.now(),
  clientState: {
    mutations: [],
    queries: [
      {
        queryKey: DASHBOARD_QUERY_KEY,
        queryHash: '["member-app","dashboard"]',
        state: {
          data: {
            appConfig: { minimumSupportedVersion: '9.9.9', updateUrl: 'https://example.com' },
            notices: [{ id: 1, title: '공지' }],
            posts: [{ id: 2, title: '글' }],
            unreadCount: 3,
          },
        },
      },
      {
        queryKey: ['member-app', 'deleted-community-posts'],
        queryHash: '["member-app","deleted-community-posts"]',
        state: { data: [{ id: 9, title: '삭제된 내 글' }] },
      },
    ],
  },
})

const persisted = JSON.parse(window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY))
const queries = persisted.clientState.queries

// The PII query is still dropped wholesale.
assert.equal(queries.length, 1)
assert.deepEqual(queries[0].queryKey, DASHBOARD_QUERY_KEY)

// appConfig is gone...
assert.equal('appConfig' in queries[0].state.data, false)
assert.equal(window.localStorage.getItem(QUERY_CACHE_STORAGE_KEY).includes('9.9.9'), false)

// ...but everything the dashboard needs offline survives.
assert.deepEqual(queries[0].state.data.notices, [{ id: 1, title: '공지' }])
assert.deepEqual(queries[0].state.data.posts, [{ id: 2, title: '글' }])
assert.equal(queries[0].state.data.unreadCount, 3)

const restored = await queryPersister.restoreClient()
assert.equal('appConfig' in restored.clientState.queries[0].state.data, false)

// The blocking screen must offer a way out: without a logout, a member on a
// device that cannot be updated has no way to sign the account off it.
const screen = readFileSync('src/screens/ForcedUpdateScreen.tsx', 'utf8')
assert.match(screen, /onLogout\?: \(\) => void \| Promise<void>/)
assert.match(screen, /로그아웃/)

const appSource = readFileSync('src/App.tsx', 'utf8')
const forcedUpdate = appSource.split('<ForcedUpdateScreen')[1].split('/>')[0]
assert.match(forcedUpdate, /onLogout=/)
assert.match(forcedUpdate, /await retirePushToken\(\)/)
assert.match(forcedUpdate, /await logoutUser\(\)/)
assert.match(forcedUpdate, /await clearLocalSession\(\)/)

console.log('forced update contract passed')
