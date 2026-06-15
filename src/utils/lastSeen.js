const PREFIX = 'coms.lastSeen:v1:'

function storage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function readLastSeen(key) {
  const s = storage()
  if (!s) return 0
  const raw = s.getItem(PREFIX + key)
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

export function writeLastSeen(key, value) {
  const s = storage()
  if (!s) return
  const next = Number.isFinite(value) ? value : 0
  s.setItem(PREFIX + key, String(next))
}

export function isNew(createdAt, lastSeen) {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (!Number.isFinite(t)) return false
  return t > lastSeen
}
