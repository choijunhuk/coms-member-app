import assert from 'node:assert/strict'
import {
  COMMUNITY_POST_QUEUE_KEY,
  enqueuePendingCommunityPost,
  readPendingCommunityPosts,
  removePendingCommunityPost,
  shouldQueueCommunityPostError,
  writePendingCommunityPosts,
} from '../src/utils/communityPostQueue.ts'

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
assert.equal(shouldQueueCommunityPostError({ code: 'REQUEST_TIMEOUT' }), true)

Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  configurable: true,
})
assert.equal(shouldQueueCommunityPostError({ status: 500 }), false)

console.log('offline community queue contract passed')
