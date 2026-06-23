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

export const queryPersister = {
  persistClient: async (client) => {
    await writeStoredValueAsync(QUERY_CACHE_STORAGE_KEY, JSON.stringify(client))
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
