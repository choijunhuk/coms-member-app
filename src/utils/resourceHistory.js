const KEY = 'coms.resources.recent:v1'

function storage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function readRecentResourceIds() {
  const s = storage()
  if (!s) return []
  try {
    const parsed = JSON.parse(s.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function rememberResource(id) {
  if (id == null) return
  const s = storage()
  if (!s) return
  const next = [String(id), ...readRecentResourceIds().filter((item) => item !== String(id))].slice(0, 8)
  s.setItem(KEY, JSON.stringify(next))
}
