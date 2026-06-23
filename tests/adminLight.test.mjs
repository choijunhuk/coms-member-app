import assert from 'node:assert/strict'
import { listAuditLogs, listEligibleMembers, listMembers } from '../src/services/adminApi.ts'
import { deleteCommunityPost } from '../src/services/communityApi.ts'
import { createNotice, updateNotice } from '../src/services/noticeApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

await createNotice({ title: '긴급 공지', content: '내용', pinned: true })
await updateNotice(3, { title: '수정 공지', content: '수정 내용', pinned: false })
await deleteCommunityPost(9)
await listEligibleMembers()
await listMembers()
await listAuditLogs()

assert.equal(calls[0].url, '/api/notices')
assert.equal(calls[0].options.method, 'POST')
assert.equal(calls[1].url, '/api/notices/3')
assert.equal(calls[1].options.method, 'PUT')
assert.equal(calls[2].url, '/api/community/posts/9')
assert.equal(calls[2].options.method, 'DELETE')
assert.equal(calls[3].url, '/api/admin/eligible-members')
assert.equal(calls[4].url, '/api/admin/members')
assert.equal(calls[5].url, '/api/admin/audit-logs')

console.log('admin light contract passed')
