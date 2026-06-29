import { QueryClient } from '@tanstack/react-query'
import { readStoredValueAsync, removeStoredValueAsync, writeStoredValueAsync } from '../utils/deviceStorage'

export const QUERY_CACHE_STORAGE_KEY = 'coms-member-app-query-cache:v1'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s fresh → no thrashing on tab switches; 24h cache → cold-launch shows last snapshot.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
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

function shouldExcludeFromPersistence(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey)) return false
  return PII_QUERY_KEYS.some(
    (piiKey) =>
      piiKey.length <= queryKey.length &&
      piiKey.every((segment, i) => segment === queryKey[i]),
  )
}

export const queryPersister = {
  persistClient: async (client) => {
    // Strip PII queries before writing; the persisted shape is otherwise identical.
    const safeClient = {
      ...client,
      clientState: {
        ...client.clientState,
        queries: client.clientState.queries.filter(
          (q) => !shouldExcludeFromPersistence(q.queryKey),
        ),
      },
    }
    await writeStoredValueAsync(QUERY_CACHE_STORAGE_KEY, JSON.stringify(safeClient))
  },
  restoreClient: async () => {
    const raw = await readStoredValueAsync(QUERY_CACHE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : undefined
  },
  removeClient: async () => {
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
