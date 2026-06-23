import assert from 'node:assert/strict'
import {
  appealDeletedCommunityPost,
  listMyDeletedCommunityPosts,
} from '../src/services/communityApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  const body = url.endsWith('/appeals')
    ? { id: 9, deletedPostId: 5, status: 'OPEN', message: JSON.parse(options.body).message }
    : [{ id: 5, title: '삭제된 질문', deletionReason: '중복 게시글' }]
  return new Response(JSON.stringify(body), {
    status: url === '/api/auth/refresh' ? 204 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const records = await listMyDeletedCommunityPosts()
const appeal = await appealDeletedCommunityPost(5, '다시 확인해주세요.')

assert.equal(calls[0].url, '/api/community/posts/deleted/me')
assert.equal(calls[1].url, '/api/community/posts/deleted/5/appeals')
assert.equal(calls[1].options.method, 'POST')
assert.deepEqual(JSON.parse(calls[1].options.body), { message: '다시 확인해주세요.' })
assert.equal(records[0].title, '삭제된 질문')
assert.equal(appeal.status, 'OPEN')

console.log('community trust api contract passed')
