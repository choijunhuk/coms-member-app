import assert from 'node:assert/strict'

// A 401 that survives the token refresh must notify the session-expired
// handler exactly once per request so the app can drop to the login screen —
// previously it kept a logged-in shell where every panel errored.

let responses = []
const calls = []

globalThis.fetch = async (url) => {
  calls.push(String(url))
  const status = responses.shift() ?? 200
  return new Response(status === 200 ? '{}' : '', { status })
}

const { request, onSessionExpired } = await import('../src/services/apiClient.ts')

let expired = 0
const unsubscribe = onSessionExpired(() => { expired += 1 })

// 401 → refresh fails (401) → expired fires, request throws 401
responses = [401, 401]
await assert.rejects(() => request('/api/notifications'), (err) => err.status === 401)
assert.equal(expired, 1)

// 401 → refresh succeeds → replay 200 → no expiry
responses = [401, 200, 200]
expired = 0
await request('/api/notifications')
assert.equal(expired, 0)

// 401 → refresh succeeds → replay still 401 → expired fires
responses = [401, 200, 401]
expired = 0
await assert.rejects(() => request('/api/notifications'))
assert.equal(expired, 1)

// 403 (permission denial while signed in) must NOT expire the session
responses = [403, 401]
expired = 0
await assert.rejects(() => request('/api/admin/things'))
assert.equal(expired, 0)

// login path never triggers refresh or expiry
responses = [401]
expired = 0
calls.length = 0
await assert.rejects(() => request('/api/auth/login', { method: 'POST', body: '{}' }))
assert.equal(expired, 0)
assert.equal(calls.length, 1)

// password change 401 = wrong CURRENT password — must not refresh or expire
// (expiring here would log the user out on a typo)
responses = [401]
expired = 0
calls.length = 0
await assert.rejects(() => request('/api/auth/password', { method: 'PATCH', body: '{}' }))
assert.equal(expired, 0)
assert.equal(calls.length, 1)

// profile PATCH only 401s on a dead session — refreshable like /api/auth/me
responses = [401, 200, 200]
expired = 0
calls.length = 0
await request('/api/auth/profile', { method: 'PATCH', body: '{}' })
assert.equal(expired, 0)
assert.equal(calls.length, 3)

unsubscribe()
responses = [401, 401]
await assert.rejects(() => request('/api/notifications'))
assert.equal(expired, 0)

console.log('session expiry contract passed')
