import assert from 'node:assert/strict'

// Concurrent 401s must share ONE /api/auth/refresh call (refresh-token rotation
// makes parallel refreshes interleave Set-Cookie writes), a 403 must never
// refresh at all, and a refresh that throws must resolve to "not refreshed"
// instead of escaping and masking the original 401.

const calls = []
let refreshResponse = () => new Response('', { status: 200 })
let protectedStatus = 401
let releaseRefresh = null

globalThis.fetch = async (url) => {
  const path = String(url)
  calls.push(path)
  if (path === '/api/auth/refresh') {
    // Hold the refresh open so all three protected requests are in flight
    // together — otherwise they would serialise and each start its own.
    if (releaseRefresh) await new Promise((resolve) => { releaseRefresh = resolve })
    return refreshResponse()
  }
  return new Response(protectedStatus === 200 ? '{}' : '', { status: protectedStatus })
}

const { request, onSessionExpired } = await import('../src/services/apiClient.ts')

let expired = 0
const unsubscribe = onSessionExpired(() => { expired += 1 })

function refreshCalls() {
  return calls.filter((path) => path === '/api/auth/refresh').length
}

// --- 3 concurrent 401s → exactly one refresh ---
calls.length = 0
expired = 0
protectedStatus = 401
releaseRefresh = () => {}
const inFlight = [
  assert.rejects(() => request('/api/notifications')),
  assert.rejects(() => request('/api/notices')),
  assert.rejects(() => request('/api/community/posts')),
]
// Let all three reach their 401 and queue on the shared refresh promise.
await new Promise((resolve) => setTimeout(resolve, 10))
releaseRefresh?.()
releaseRefresh = null
await Promise.all(inFlight)
assert.equal(refreshCalls(), 1, '3 concurrent 401s must share one refresh')

// --- 403 → zero refresh calls, no expiry ---
calls.length = 0
expired = 0
protectedStatus = 403
await assert.rejects(() => request('/api/admin/things'), (error) => error.status === 403)
assert.equal(refreshCalls(), 0, '403 must not trigger a refresh')
assert.equal(expired, 0)

// --- a later 401 refreshes again (the in-flight promise is not sticky) ---
calls.length = 0
expired = 0
protectedStatus = 401
await assert.rejects(() => request('/api/notifications'))
assert.equal(refreshCalls(), 1)
assert.equal(expired, 1)

// --- refresh that throws → resolves false, original 401 still surfaces ---
calls.length = 0
expired = 0
refreshResponse = () => { throw new TypeError('Failed to fetch') }
await assert.rejects(() => request('/api/notifications'), (error) => error.status === 401)
assert.equal(refreshCalls(), 1)
assert.equal(expired, 1, 'a thrown refresh must still reach the session-expired handler')

// --- a throwing refresh must not poison the next attempt ---
calls.length = 0
refreshResponse = () => new Response('', { status: 200 })
protectedStatus = 200
await request('/api/notifications')
assert.equal(refreshCalls(), 0)

unsubscribe()

console.log('refresh single-flight contract passed')
