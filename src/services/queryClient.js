import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const STORAGE_KEY = 'coms-member-app-query-cache:v1'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s fresh → no thrashing on tab switches; 24h cache → cold-launch shows last snapshot.
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.status === 401 || error?.status === 403) return false
        return failureCount < 2
      },
    },
  },
})

function safeStorage() {
  try {
    if (typeof window === 'undefined') return null
    const probe = '__coms-probe__'
    window.localStorage.setItem(probe, probe)
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

export const queryPersister = (() => {
  const storage = safeStorage()
  if (!storage) return null
  return createSyncStoragePersister({ storage, key: STORAGE_KEY })
})()
