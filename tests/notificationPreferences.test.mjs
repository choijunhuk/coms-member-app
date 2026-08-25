import assert from 'node:assert/strict'

// GET fills missing keys with enabled defaults; PUT always sends all seven
// booleans because the backend contract forbids partial updates.

const calls = []
let response = {}

globalThis.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), method: options.method || 'GET', body: options.body })
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const { getNotificationPreferences, updateNotificationPreferences } = await import('../src/services/notificationApi.ts')

// Sparse server response (older backend / never saved) → defaults fill in.
response = { commentOnPost: false, recruitApplication: false }
const prefs = await getNotificationPreferences()
assert.equal(prefs.commentOnPost, false)
assert.equal(prefs.recruitApplication, false)
assert.equal(prefs.replyOnComment, true)
assert.equal(prefs.noticeCreated, true)
assert.equal(prefs.externalInvite, true)
assert.equal(calls[0].url.endsWith('/api/notifications/preferences'), true)

// PUT carries every key, coerced to booleans.
response = {}
await updateNotificationPreferences({ commentOnPost: false })
const put = calls.find((call) => call.method === 'PUT')
assert.ok(put, 'PUT request missing')
const body = JSON.parse(put.body)
assert.deepEqual(Object.keys(body).sort(), ['commentOnPost', 'communityPostDeleted', 'communityPostRestored', 'externalInvite', 'noticeCreated', 'recruitApplication', 'replyOnComment'])
assert.equal(body.commentOnPost, false)
assert.equal(body.replyOnComment, true)

console.log('notification preferences contract passed')
