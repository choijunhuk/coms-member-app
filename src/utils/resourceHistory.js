import { readStoredValue, writeStoredValue } from './deviceStorage.js'

export const RECENT_RESOURCES_KEY = 'coms.resources.recent:v1'

export function readRecentResourceIds() {
  try {
    const parsed = JSON.parse(readStoredValue(RECENT_RESOURCES_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function rememberResource(id) {
  if (id == null) return
  const next = [String(id), ...readRecentResourceIds().filter((item) => item !== String(id))].slice(0, 8)
  writeStoredValue(RECENT_RESOURCES_KEY, JSON.stringify(next))
}
