const DEFAULT_API_BASE_URL = ''
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
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

export function createRequestTimeoutError(timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const error = new Error(`요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요. (${Math.round(timeoutMs / 1000)}초)`)
  error.status = 0
  error.code = 'REQUEST_TIMEOUT'
  return error
}

async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(createRequestTimeoutError(timeoutMs))
  }, timeoutMs)
  const abortFromExternal = () => {
    controller.abort(externalSignal.reason)
  }
  if (externalSignal) {
    if (externalSignal.aborted) abortFromExternal()
    else externalSignal.addEventListener('abort', abortFromExternal, { once: true })
  }
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw controller.signal.reason || createRequestTimeoutError(timeoutMs)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener?.('abort', abortFromExternal)
  }
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
  const response = await fetchWithTimeout(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  })
  return response.ok
}

export async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers }
  const fetchOnce = () => fetchWithTimeout(apiUrl(path), { credentials: 'include', ...options, headers })

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
