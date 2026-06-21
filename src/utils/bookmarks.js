import { readStoredValue, writeStoredValue } from './deviceStorage.js'

export const BOOKMARKS_KEY = 'coms.bookmarks.posts:v1'

export function readBookmarks() {
  try {
    const raw = readStoredValue(BOOKMARKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((value) => String(value)) : []
  } catch {
    return []
  }
}

export function writeBookmarks(ids) {
  const normalized = Array.isArray(ids) ? Array.from(new Set(ids.map((value) => String(value)))) : []
  writeStoredValue(BOOKMARKS_KEY, JSON.stringify(normalized))
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
