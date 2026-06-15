const KEY = 'coms.bookmarks.posts:v1'

function storage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function readBookmarks() {
  const s = storage()
  if (!s) return []
  try {
    const raw = s.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : []
  } catch {
    return []
  }
}

export function writeBookmarks(ids) {
  const s = storage()
  if (!s) return
  const normalized = Array.isArray(ids) ? Array.from(new Set(ids.map((value) => String(value)))) : []
  s.setItem(KEY, JSON.stringify(normalized))
}

export function isBookmarked(id) {
  return readBookmarks().includes(String(id))
}

export function toggleBookmark(id) {
  const current = readBookmarks()
  const target = String(id)
  const next = current.includes(target) ? current.filter((value) => value !== target) : [...current, target]
  writeBookmarks(next)
  return next.includes(target)
}
