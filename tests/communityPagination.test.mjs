import assert from 'node:assert/strict'

// The backend community list endpoint is DB-paginated (default 20/page), so
// listCommunityPosts must walk every page — a single unparameterized call would
// silently truncate the board (and the client-side search built on it) to 20.

const calls = []
let pages = []

globalThis.fetch = async (url) => {
  calls.push(String(url))
  const page = Number(new URL(String(url), 'http://localhost').searchParams.get('page'))
  return new Response(JSON.stringify(pages[page] ?? []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const { listCommunityPosts } = await import('../src/services/communityApi.ts')

const post = (id) => ({ id, title: `글 ${id}`, commentCount: 0, viewCount: 0, upvotes: 0, downvotes: 0 })

// full first page (200) → fetches a concurrent window of pages 1-4; short
// page 1 stops further windows. All 202 unique posts collected.
pages = [Array.from({ length: 200 }, (_, i) => post(i)), [post(200), post(201)], [], [], []]
const all = await listCommunityPosts()
assert.equal(all.length, 202)
assert.equal(calls.length, 5)
assert.match(calls[0], /\/api\/community\/posts\?page=0&size=200$/)
assert.ok(calls.slice(1).some((url) => /page=1&size=200$/.test(url)))

// short first page → exactly one request
calls.length = 0
pages = [[post(1), post(2)]]
const few = await listCommunityPosts()
assert.equal(few.length, 2)
assert.equal(calls.length, 1)

// empty board → one request, empty list
calls.length = 0
pages = [[]]
assert.deepEqual(await listCommunityPosts(), [])
assert.equal(calls.length, 1)

// posts created while paging shift offset pages — overlapping ids must dedupe
// (duplicates rendered duplicate rows and misrouted list taps)
calls.length = 0
pages = [Array.from({ length: 200 }, (_, i) => post(i)), [post(199), post(198), post(200)]]
const deduped = await listCommunityPosts()
assert.equal(deduped.length, 201)
assert.equal(new Set(deduped.map((p) => p.id)).size, 201)

console.log('community pagination contract passed')
