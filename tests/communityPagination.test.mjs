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

// full first page (200) → must fetch the next page; short second page → stop
pages = [Array.from({ length: 200 }, (_, i) => post(i)), [post(200), post(201)]]
const all = await listCommunityPosts()
assert.equal(all.length, 202)
assert.equal(calls.length, 2)
assert.match(calls[0], /\/api\/community\/posts\?page=0&size=200$/)
assert.match(calls[1], /\/api\/community\/posts\?page=1&size=200$/)

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

console.log('community pagination contract passed')
