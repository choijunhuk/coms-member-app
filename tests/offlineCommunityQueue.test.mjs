import assert from 'node:assert/strict'
import {
  COMMUNITY_POST_QUEUE_KEY,
  enqueuePendingCommunityPost,
  resolvePendingCommunityPostFlushFailure,
  readPendingCommunityPosts,
  removePendingCommunityPost,
  shouldQueueCommunityPostError,
  writePendingCommunityPosts,
} from '../src/utils/communityPostQueue.ts'
import { createRequestTimeoutError } from '../src/services/apiClient.ts'

function createLocalStorage() {
  const store = new Map()
  return {
    get length() {
      return store.size
    },
    key(index) {
      return [...store.keys()][index] ?? null
    },
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(key, String(value))
    },
    removeItem(key) {
      store.delete(key)
    },
  }
}

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: createLocalStorage() },
  configurable: true,
})
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: false },
  configurable: true,
})

await writePendingCommunityPosts([])
assert.deepEqual(await readPendingCommunityPosts(), [])

const payload = {
  title: '오프라인 작성',
  content: JSON.stringify([{ type: 'text', content: '연결 복구 후 등록' }]),
  category: 'GENERAL',
  anonymousName: '',
}

let queue = await enqueuePendingCommunityPost(payload)
assert.equal(queue.length, 1)
assert.equal(queue[0].payload.title, '오프라인 작성')
assert.equal(queue[0].payload.category, 'GENERAL')
assert.ok(window.localStorage.getItem(COMMUNITY_POST_QUEUE_KEY).includes('오프라인 작성'))

queue = await enqueuePendingCommunityPost(payload)
assert.equal(queue.length, 1)

queue = await removePendingCommunityPost(queue[0].id)
assert.deepEqual(queue, [])

assert.equal(shouldQueueCommunityPostError(new TypeError('Failed to fetch')), true)
assert.equal(shouldQueueCommunityPostError({ status: 0 }), true)

// A REQUEST_TIMEOUT is never queued, even while navigator reports offline: the
// 30s abort is client-side, so the server may already have committed the post
// and replaying it posts a duplicate. createRequestTimeoutError also sets
// status 0, so the code check has to win over the transport-failure check.
assert.equal(shouldQueueCommunityPostError({ status: 0, code: 'REQUEST_TIMEOUT' }), false)
assert.equal(shouldQueueCommunityPostError(createRequestTimeoutError(30_000)), false)

// ...and it is not silently dropped from the queue either — it surfaces to the
// composer, which shows the error and lets the member decide.
const timedOut = await enqueuePendingCommunityPost(payload)
const timeoutOutcome = await resolvePendingCommunityPostFlushFailure(timedOut[0], createRequestTimeoutError(30_000))
assert.equal(timeoutOutcome.action, 'discarded')
assert.deepEqual(await readPendingCommunityPosts(), [])

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  configurable: true,
})
assert.equal(shouldQueueCommunityPostError({ status: 500 }), false)

queue = await enqueuePendingCommunityPost(payload)
const rejected = await resolvePendingCommunityPostFlushFailure(queue[0], { status: 400 })
assert.equal(rejected.action, 'discarded')
assert.deepEqual(await readPendingCommunityPosts(), [])

console.log('offline community queue contract passed')
