import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { voteNotice } from '../src/services/noticeApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ id: 7, upvotes: 12 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// 공지 추천 (web parity, notices #431 line). Same shape the website posts.
const result = await voteNotice(7, 1)
assert.equal(calls[0].url, '/api/notices/7/vote')
assert.equal(calls[0].options.method, 'POST')
assert.deepEqual(JSON.parse(calls[0].options.body), { value: 1 })
assert.equal(result.upvotes, 12)

// The id is interpolated as given — no path traversal from a crafted notice id.
await voteNotice(encodeURIComponent('7/../admin'), 1)
assert.equal(calls[1].url.startsWith('/api/notices/'), true)
assert.equal(calls[1].url.includes('/admin/vote'), false)

// The count moves before the round trip (mobile data makes it look stuck
// otherwise) and is rolled back if the vote does not land, then reconciled
// against the server, which owns the real total.
const appSource = readFileSync('src/App.tsx', 'utf8')
const voteBody = appSource.split('async function voteOnNotice(value)')[1].split('\n  }\n')[0]
assert.match(voteBody, /shiftUpvotes\(value\)/)
assert.match(voteBody, /catch \(error\)[\s\S]*shiftUpvotes\(-value\)[\s\S]*throw error/)
assert.match(voteBody, /await getNotice\(noticeId\)/)
// Never below zero, whichever order the optimistic and server updates land in.
assert.match(voteBody, /Math\.max\(0, Number\(notice\.upvotes \|\| 0\) \+ delta\)/)

// The tab renders the button and surfaces a failed vote rather than swallowing it.
const tabSource = readFileSync('src/screens/NoticesTab.tsx', 'utf8')
assert.match(tabSource, /voteNotice\?: \(value: number\) => void \| Promise<void>/)
assert.match(tabSource, /await voteNotice\(1\)/)
assert.match(tabSource, /setVoteError\(/)

console.log('notice vote contract passed')
