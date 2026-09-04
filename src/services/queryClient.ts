import { QueryClient } from '@tanstack/react-query'
import { CommunityCategory } from '../contract/enums'
import { readStoredValueAsync, removeStoredValueAsync, writeStoredValueAsync } from '../utils/deviceStorage'
import type { ApiError } from './apiClient'

export const QUERY_CACHE_STORAGE_KEY = 'coms-member-app-query-cache:v1'

export const DASHBOARD_QUERY_KEY = ['member-app', 'dashboard']

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s fresh → no thrashing on tab switches; 24h cache → cold-launch shows last snapshot.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: ApiError) => {
        if (error?.status === 401 || error?.status === 403) return false
        return failureCount < 2
      },
    },
  },
})

// Query keys whose cached data contains user PII and must never be written to disk.
// The dashboard query (notices, files, etc.) is kept for offline use.
const PII_QUERY_KEYS: ReadonlyArray<ReadonlyArray<string>> = [
  ['member-app', 'deleted-community-posts'],
]

function matchesQueryKey(prefix: ReadonlyArray<string>, queryKey: unknown): boolean {
  if (!Array.isArray(queryKey)) return false
  return prefix.length <= queryKey.length && prefix.every((segment, i) => segment === queryKey[i])
}

function shouldExcludeFromPersistence(queryKey: unknown): boolean {
  return PII_QUERY_KEYS.some((piiKey) => matchesQueryKey(piiKey, queryKey))
}

// Shared by TanStack's dehydration pass and the persister's defensive filter.
// Accepting the small queryKey shape keeps it compatible with both a live Query
// and the serialized query entries passed directly to persistClient in tests.
export function shouldPersistQuery(query: { queryKey: unknown }): boolean {
  return !shouldExcludeFromPersistence(query?.queryKey)
}

// Fields dropped before a query is written to disk because a stale copy would
// change what the app DOES, not merely what it shows. appConfig carries
// minimumSupportedVersion: restored from a 24h-old cache it can hold the whole
// app behind the forced-update screen even after the server lowered the floor,
// and that screen has no way to fetch a fresher one. Without it a cold launch
// falls back to DEFAULT_APP_CONFIG, which gates nothing, until the live fetch
// lands — the dashboard's notices/posts/files still restore for offline use.
const VOLATILE_QUERY_FIELDS: ReadonlyArray<{
  queryKey: ReadonlyArray<string>
  fields: ReadonlyArray<string>
}> = [
  { queryKey: DASHBOARD_QUERY_KEY, fields: ['appConfig'] },
]

function stripVolatileFields(query) {
  const match = VOLATILE_QUERY_FIELDS.find((entry) => matchesQueryKey(entry.queryKey, query.queryKey))
  const data = query?.state?.data
  if (!match || !data || typeof data !== 'object') return query
  const trimmed = { ...data }
  for (const field of match.fields) delete trimmed[field]
  return { ...query, state: { ...query.state, data: trimmed } }
}

// 익명 게시판 글은 "작성자를 모른다"는 것 하나로 보호됩니다. 그 글이 24시간짜리
// 디스크 캐시에 평문으로 남으면, 기기를 잠깐 빌려 간 사람이나 백업을 뒤진 사람이
// 앱에 로그인하지 않고도 읽을 수 있습니다. 인메모리 캐시는 그대로라 앱을 쓰는
// 동안에는 평소와 똑같이 보이고, 콜드 런치 때만 서버에서 다시 받아옵니다.
// (secure-storage 네이티브 플러그인 도입은 보류 — 익명 글만 빼는 게 최소 수정.)
function stripAnonymousPosts(query) {
  if (!matchesQueryKey(DASHBOARD_QUERY_KEY, query.queryKey)) return query
  const data = query?.state?.data
  if (!data || typeof data !== 'object' || !Array.isArray(data.posts)) return query
  const posts = data.posts.filter((post) => String(post?.category) !== CommunityCategory.ANONYMOUS)
  if (posts.length === data.posts.length) return query
  return { ...query, state: { ...query.state, data: { ...data, posts } } }
}

function safePersistedClient(client) {
  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries
        .filter(shouldPersistQuery)
        .map(stripVolatileFields)
        .map(stripAnonymousPosts),
    },
  }
}

let persistThrottleTime = 0
let pendingPersistClient = null
let persistTimer: ReturnType<typeof setTimeout> | null = null
let pendingPersistWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = []

async function writePersistedClient(client) {
  await writeStoredValueAsync(QUERY_CACHE_STORAGE_KEY, JSON.stringify(safePersistedClient(client)))
}

function cancelPendingPersist() {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = null
  pendingPersistClient = null
  const waiters = pendingPersistWaiters
  pendingPersistWaiters = []
  for (const waiter of waiters) waiter.resolve()
}

export function configureQueryPersister({ throttleTime = 0 } = {}) {
  persistThrottleTime = Number.isFinite(throttleTime) ? Math.max(0, throttleTime) : 0
  return queryPersister
}

export const queryPersister = {
  persistClient: async (client) => {
    // Strip PII queries, volatile fields and anonymous-board posts before
    // writing; the persisted shape is otherwise identical. The app configures
    // a short throttle so bursts of cache notifications produce one disk write.
    if (persistThrottleTime === 0) {
      await writePersistedClient(client)
      return
    }

    pendingPersistClient = client
    await new Promise<void>((resolve, reject) => {
      pendingPersistWaiters.push({ resolve, reject })
      if (persistTimer) return
      persistTimer = setTimeout(async () => {
        const latestClient = pendingPersistClient
        const waiters = pendingPersistWaiters
        persistTimer = null
        pendingPersistClient = null
        pendingPersistWaiters = []
        try {
          await writePersistedClient(latestClient)
          for (const waiter of waiters) waiter.resolve()
        } catch (error) {
          for (const waiter of waiters) waiter.reject(error)
        }
      }, persistThrottleTime)
    })
  },
  restoreClient: async () => {
    const raw = await readStoredValueAsync(QUERY_CACHE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : undefined
  },
  removeClient: async () => {
    cancelPendingPersist()
    await removeStoredValueAsync(QUERY_CACHE_STORAGE_KEY)
  },
}

export async function purgePersistedCache() {
  try {
    if (queryPersister?.removeClient) {
      await queryPersister.removeClient()
    }
  } catch {
    // ignore — fallthrough to direct storage wipe
  }
  try {
    await removeStoredValueAsync(QUERY_CACHE_STORAGE_KEY)
  } catch {
    // storage unavailable — nothing to wipe
  }
}
