import { request } from './apiClient'

// Active custom fonts uploaded by admins on the web. Optional feature — a
// failing/absent endpoint just means "no custom fonts".
export async function listFonts() {
  try {
    const data = await request('/api/fonts')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}
