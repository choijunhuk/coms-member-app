import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { QueryClient, dehydrate } from '@tanstack/react-query'

const store = new Map()
let writes = 0
globalThis.window = {
  localStorage: {
    get length() { return store.size },
    key: (index) => Array.from(store.keys())[index] ?? null,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { writes += 1; store.set(key, String(value)) },
    removeItem: (key) => store.delete(key),
  },
}

const {
  DASHBOARD_QUERY_KEY,
  QUERY_CACHE_STORAGE_KEY,
  configureQueryPersister,
  queryPersister,
  shouldPersistQuery,
} = await import('../src/services/queryClient.ts')

const dashboardData = {
  appConfig: { minimumSupportedVersion: '9.9.9' },
  notices: [{ id: 1, title: '공지' }],
  posts: [
    { id: 10, title: '일반 글', category: 'GENERAL' },
    { id: 11, title: '익명 글', category: 'ANONYMOUS', content: '누가 썼는지 밝히면 안 되는 내용' },
    { id: 12, title: '질문 글', category: 'QUESTION' },
    { id: 13, title: '분류 없는 글' },
  ],
}

const client = {
  timestamp: 1,
  buster: '',
  clientState: {
    mutations: [],
    queries: [
      { queryKey: DASHBOARD_QUERY_KEY, queryHash: 'dash', state: { data: dashboardData, dataUpdatedAt: 1 } },
      { queryKey: ['member-app', 'deleted-community-posts'], queryHash: 'deleted', state: { data: [{ id: 5 }], dataUpdatedAt: 1 } },
      { queryKey: ['member-app', 'site-settings'], queryHash: 'site', state: { data: { semesterLabel: '2026 2학기' }, dataUpdatedAt: 1 } },
    ],
  },
}

await queryPersister.persistClient(client)
const persisted = JSON.parse(store.get(QUERY_CACHE_STORAGE_KEY))
const byHash = Object.fromEntries(persisted.clientState.queries.map((query) => [query.queryHash, query]))

// 익명 게시판 글은 디스크에 남지 않습니다 — 24시간짜리 캐시가 남아 있으면
// 로그인하지 않은 사람도 기기에서 그대로 읽을 수 있기 때문입니다.
const persistedPosts = byHash.dash.state.data.posts
assert.deepEqual(persistedPosts.map((post) => post.id), [10, 12, 13])
assert.equal(JSON.stringify(persisted).includes('ANONYMOUS'), false)
assert.equal(JSON.stringify(persisted).includes('누가 썼는지'), false)

// 나머지 대시보드 데이터(오프라인용)는 그대로 남습니다.
assert.deepEqual(byHash.dash.state.data.notices, dashboardData.notices)
// 기존 규칙도 유지: PII 쿼리는 아예 빠지고, appConfig 는 잘려 나갑니다.
assert.equal(byHash.deleted, undefined)
assert.equal(byHash.dash.state.data.appConfig, undefined)
assert.equal(byHash.site.state.data.semesterLabel, '2026 2학기')

// 인메모리 캐시는 손대지 않습니다 — 앱을 쓰는 동안 익명 글은 평소대로 보입니다.
assert.equal(dashboardData.posts.length, 4)
assert.equal(dashboardData.posts[1].category, 'ANONYMOUS')
assert.equal(client.clientState.queries[0].state.data.appConfig.minimumSupportedVersion, '9.9.9')

// 익명 글이 하나도 없으면 원본 객체를 그대로 흘려보냅니다 (불필요한 복사 없음).
store.clear()
const cleanData = { notices: [], posts: [{ id: 1, category: 'GENERAL' }] }
await queryPersister.persistClient({
  timestamp: 1,
  buster: '',
  clientState: { mutations: [], queries: [{ queryKey: DASHBOARD_QUERY_KEY, queryHash: 'dash', state: { data: cleanData, dataUpdatedAt: 1 } }] },
})
assert.deepEqual(JSON.parse(store.get(QUERY_CACHE_STORAGE_KEY)).clientState.queries[0].state.data.posts, cleanData.posts)

// Dehydration must use the same privacy decision as the defensive persister
// filter, so excluded PII never reaches serialization in the first place.
const queryClient = new QueryClient()
queryClient.setQueryData(['member-app', 'deleted-community-posts'], [{ id: 99 }])
queryClient.setQueryData(['member-app', 'site-settings'], { semesterLabel: '2026 2학기' })
const dehydrated = dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistQuery })
assert.deepEqual(dehydrated.queries.map((query) => query.queryKey), [['member-app', 'site-settings']])

// Rapid cache events collapse into one storage write carrying the latest state.
configureQueryPersister({ throttleTime: 20 })
const writesBeforeThrottle = writes
void queryPersister.persistClient({ ...client, timestamp: 2 })
void queryPersister.persistClient({ ...client, timestamp: 3 })
assert.equal(writes, writesBeforeThrottle)
await new Promise((resolve) => setTimeout(resolve, 35))
assert.equal(writes, writesBeforeThrottle + 1)
assert.equal(JSON.parse(store.get(QUERY_CACHE_STORAGE_KEY)).timestamp, 3)
configureQueryPersister({ throttleTime: 0 })

// main.tsx owns the production tuning while reusing the exported predicate.
const mainSource = readFileSync('src/main.tsx', 'utf8')
assert.match(mainSource, /configureQueryPersister\(\{ throttleTime: 2_000 \}\)/)
assert.match(mainSource, /shouldDehydrateQuery: \(query\) => query\.state\.status === 'success' && shouldPersistQuery\(query\)/)

// shouldPersistQuery alone doesn't know about query status, so main.tsx's
// shouldDehydrateQuery must also restore TanStack's default gate: only a
// 'success' query is safe to persist — a pending or errored one has no data
// worth writing to disk (and an errored query may carry a stale/partial shape).
const productionShouldDehydrateQuery = (query) => query.state.status === 'success' && shouldPersistQuery(query)
const siteSettingsKey = ['member-app', 'site-settings']
assert.equal(productionShouldDehydrateQuery({ queryKey: siteSettingsKey, state: { status: 'success' } }), true)
assert.equal(productionShouldDehydrateQuery({ queryKey: siteSettingsKey, state: { status: 'pending' } }), false)
assert.equal(productionShouldDehydrateQuery({ queryKey: siteSettingsKey, state: { status: 'error' } }), false)

console.log('persisted cache contract passed')
