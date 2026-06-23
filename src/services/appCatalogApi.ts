import { request } from './apiClient'
import { companionServices } from './clubActivityApi'

export const APPS_PATH = '/api/apps'

// Fallback used when the catalog is empty so the COMS Apps section still renders.
export const fallbackApps = companionServices

export function listApps() {
  return request(APPS_PATH)
}

export function createApp(payload) {
  return request(APPS_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateApp(id, payload) {
  return request(`${APPS_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteApp(id) {
  return request(`${APPS_PATH}/${id}`, {
    method: 'DELETE',
  })
}
