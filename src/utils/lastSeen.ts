import { readStoredValue, writeStoredValue } from './deviceStorage'

export const LAST_SEEN_PREFIX = 'coms.lastSeen:v1:'

export function lastSeenStorageKey(key) {
  return LAST_SEEN_PREFIX + key
}

export function readLastSeen(key) {
  const raw = readStoredValue(lastSeenStorageKey(key))
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

export function writeLastSeen(key, value) {
  const next = Number.isFinite(value) ? value : 0
  writeStoredValue(lastSeenStorageKey(key), String(next))
}

export function isNew(createdAt, lastSeen) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (!Number.isFinite(t)) return false
  return t > lastSeen
}
