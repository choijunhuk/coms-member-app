const DEFAULT_API_BASE_URL = ''
const viteEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

export function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

export const API_BASE_URL = normalizeApiBaseUrl(viteEnv.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)

export function apiUrl(path, baseUrl = API_BASE_URL) {
  const normalizedBase = normalizeApiBaseUrl(baseUrl)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  if (!normalizedBase) return normalizedPath
  if (normalizedPath.startsWith('/api/')) {
    return `${normalizedBase}${normalizedPath.slice('/api'.length)}`
  }
  return `${normalizedBase}${normalizedPath}`
}

async function parseError(response) {
  const text = await response.text().catch(() => '')
  if (!text) return `요청 처리 중 오류가 발생했습니다. (HTTP ${response.status})`
  try {
    const data = JSON.parse(text)
    return data?.message || data?.detail || data?.error || `요청 처리 중 오류가 발생했습니다. (HTTP ${response.status})`
  } catch {
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || `요청 처리 중 오류가 발생했습니다. (HTTP ${response.status})`
  }
}

async function refreshSession() {
  const response = await fetch(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  })
  return response.ok
}

export async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers }
  const fetchOnce = () => fetch(apiUrl(path), { credentials: 'include', ...options, headers })

  let response = await fetchOnce()
  const canRefresh = path === '/api/auth/me' || !path.includes('/api/auth/')
  if ((response.status === 401 || response.status === 403) && canRefresh && await refreshSession()) {
    response = await fetchOnce()
  }

  if (!response.ok) {
    const error = new Error(await parseError(response))
    error.status = response.status
    throw error
  }

  return response.json().catch(() => null)
}

export async function requestNoContent(path, options = {}) {
  await request(path, options)
}
