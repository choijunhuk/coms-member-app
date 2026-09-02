import { readStoredValueAsync, writeStoredValueAsync } from './deviceStorage'

export const COMMUNITY_POST_QUEUE_KEY = 'coms.community.pending-posts'

const MAX_PENDING_POSTS = 20

function parseQueue(value) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.id && item?.payload?.title && item?.payload?.content)
      .slice(0, MAX_PENDING_POSTS)
  } catch {
    return []
  }
}

type CommunityPostPayload = {
  title?: string
  content?: string
  category?: string
  anonymousName?: string
}

function normalizePayload(payload: CommunityPostPayload = {}) {
  return {
    title: String(payload.title || '').trim(),
    content: String(payload.content || '').trim(),
    category: String(payload.category || 'GENERAL'),
    anonymousName: String(payload.anonymousName || '').trim(),
  }
}

function samePayload(a, b) {
  return a.title === b.title
    && a.content === b.content
    && a.category === b.category
    && a.anonymousName === b.anonymousName
}

export async function readPendingCommunityPosts() {
  return parseQueue(await readStoredValueAsync(COMMUNITY_POST_QUEUE_KEY))
}

export async function writePendingCommunityPosts(items) {
  const queue = Array.isArray(items) ? items.slice(0, MAX_PENDING_POSTS) : []
  await writeStoredValueAsync(COMMUNITY_POST_QUEUE_KEY, JSON.stringify(queue))
  return queue
}

export async function enqueuePendingCommunityPost(payload) {
  const normalized = normalizePayload(payload)
  const queue = await readPendingCommunityPosts()
  const existing = queue.find((item) => samePayload(item.payload, normalized))
  if (existing) return queue
  return writePendingCommunityPosts([
    ...queue,
    {
      id: `pending-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      payload: normalized,
    },
  ])
}

export async function removePendingCommunityPost(id) {
  const queue = await readPendingCommunityPosts()
  return writePendingCommunityPosts(queue.filter((item) => item.id !== id))
}

export async function resolvePendingCommunityPostFlushFailure(item, error) {
  if (shouldQueueCommunityPostError(error)) {
    return {
      action: 'retry-later',
      queue: await readPendingCommunityPosts(),
    }
  }

  return {
    action: 'discarded',
    queue: await removePendingCommunityPost(item.id),
  }
}

// Only a request that PROVABLY never reached the server may be queued for
// replay. A REQUEST_TIMEOUT does not qualify: the 30s abort fires client-side
// long before a slow backend gives up, so the post is often already committed —
// replaying it posted a duplicate. The composer surfaces the timeout instead
// and the member decides. status 0 without a code (transport failure) and a
// TypeError from fetch both mean the request never left the device.
export function shouldQueueCommunityPostError(error) {
  if (error?.code === 'REQUEST_TIMEOUT') return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return error?.status === 0 || error?.name === 'TypeError'
}
