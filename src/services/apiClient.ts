const DEFAULT_API_BASE_URL = ''
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const viteEnv: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

// Error subtype used across the API layer: the thrown Error is augmented with an
// HTTP-ish status and an optional machine-readable code so callers can branch
// (e.g. 401/403 refresh handling, recoverable-error detection).
export type ApiError = Error & { status?: number; code?: string; cause?: unknown }

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
  const error: ApiError = new Error(`요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요. (${Math.round(timeoutMs / 1000)}초)`)
  error.status = 0
  error.code = 'REQUEST_TIMEOUT'
  return error
}

type RequestOptions = RequestInit & { timeoutMs?: number }

async function fetchWithTimeout(url, options: RequestOptions = {}) {
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

function fallbackErrorMessage(status) {
  if (status === 401 || status === 403) return '로그인이 만료되었거나 접근 권한이 없습니다. 다시 로그인해주세요.'
  if (status >= 500) return `서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요. (HTTP ${status})`
  return `요청 처리 중 오류가 발생했습니다. (HTTP ${status})`
}

async function parseError(response) {
  const text = await response.text().catch(() => '')
  if (!text) return fallbackErrorMessage(response.status)
  try {
    const data = JSON.parse(text)
    // Only `message` is an intentional user-facing string. `error`/`detail` are
    // framework defaults ("Unauthorized", "Forbidden") — with the backend's
    // include-message=never they leaked raw English into the login screen.
    return data?.message || fallbackErrorMessage(response.status)
  } catch {
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || fallbackErrorMessage(response.status)
  }
}

async function refreshSession() {
  const response = await fetchWithTimeout(apiUrl('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
  })
  return response.ok
}

// Notified when a 401 survives the token refresh — i.e. the session is truly
// gone. Without this the app kept rendering a logged-in shell where every panel
// errored "로그인이 만료되었습니다" with no way out (same trap the web fixed in #408).
let sessionExpiredHandler: (() => void) | null = null

export function onSessionExpired(handler: () => void) {
  sessionExpiredHandler = handler
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null
  }
}

export async function request(path, options: RequestOptions = {}) {
  const isFormData = options.body instanceof FormData
  const headers = isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers }
  const fetchOnce = () => fetchWithTimeout(apiUrl(path), { credentials: 'include', ...options, headers })

  let response = await fetchOnce()
  // Refreshable: everything except the auth endpoints where a 401 means "the
  // credentials in THIS request are wrong" (login, and password change with a
  // wrong current password) — refresh-retrying those would loop the 401 into
  // the session-expired handler and log the user out on a typo. /api/auth/me
  // and /api/auth/profile 401 only on a dead session, so they stay refreshable.
  const canRefresh = path === '/api/auth/me' || path === '/api/auth/profile' || !path.includes('/api/auth/')
  if ((response.status === 401 || response.status === 403) && canRefresh) {
    if (await refreshSession()) {
      response = await fetchOnce()
    }
    // 401 after (failed or replayed) refresh = expired session. 403 is excluded:
    // it can be a plain permission denial for a signed-in member.
    if (response.status === 401) {
      sessionExpiredHandler?.()
    }
  }

  if (!response.ok) {
    const error: ApiError = new Error(await parseError(response))
    error.status = response.status
    throw error
  }

  return response.json().catch(() => null)
}

export async function requestNoContent(path, options: RequestOptions = {}) {
  await request(path, options)
}
