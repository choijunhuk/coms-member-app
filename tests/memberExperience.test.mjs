import assert from 'node:assert/strict'
import { networkBannerMessage } from '../src/utils/networkStatus.ts'
import { generationLabel } from '../src/utils/format.ts'
import { sortCommunityPosts } from '../src/utils/helpers.ts'
import { pollResultRows, pollSummaryText } from '../src/utils/pollResults.ts'
import { registerPushTokenWithRetry } from '../src/utils/pushRegistration.ts'

const rows = pollResultRows(
  {
    pollId: 'poll-1',
    question: '다음 모임 시간은?',
    options: [{ label: '수요일', imageUrl: 'https://example.com/wed.png' }, { label: '토요일' }],
  },
  { optionCounts: [3, 1], myOption: 0, closed: false },
)

assert.deepEqual(rows.map((row) => ({
  label: row.label,
  count: row.count,
  percent: row.percent,
  selected: row.selected,
  leading: row.leading,
})), [
  { label: '수요일', count: 3, percent: 75, selected: true, leading: true },
  { label: '토요일', count: 1, percent: 25, selected: false, leading: false },
])
assert.equal(rows[0].imageUrl, 'https://example.com/wed.png')
assert.equal(pollSummaryText({ optionCounts: [0, 0], closed: false }), '아직 투표 전')
assert.equal(pollSummaryText({ optionCounts: [5, 4], closed: true }), '종료 · 총 9표')

assert.equal(networkBannerMessage({ online: false, slow: false }), '오프라인 — 마지막 동기화된 내용을 보고 있습니다.')
assert.equal(networkBannerMessage({ online: true, slow: true }), '동기화가 지연되고 있습니다. 현재 화면은 최근 저장된 내용일 수 있습니다.')
assert.equal(networkBannerMessage({ online: true, slow: false }), '')

let attempts = 0
const result = await registerPushTokenWithRetry({
  register: async () => {
    attempts += 1
    if (attempts < 3) {
      const err = new Error('temporary')
      err.status = 503
      throw err
    }
    return { ok: true }
  },
  payload: { token: 'push-token' },
  isRecoverable: (err) => err.status >= 500,
  delay: async () => {},
  maxAttempts: 3,
})

assert.deepEqual(result, { ok: true })
assert.equal(attempts, 3)

// Community sort modes mirror the web: pinned first, then the chosen ordering.
const sortPosts = [
  { id: 1, createdAt: '2026-07-01T10:00:00Z', commentCount: 1, upvotes: 5, downvotes: 0, viewCount: 10 },
  { id: 2, createdAt: '2026-07-03T10:00:00Z', commentCount: 9, upvotes: 0, downvotes: 2, viewCount: 90 },
  { id: 3, createdAt: '2026-07-02T10:00:00Z', commentCount: 4, upvotes: 3, downvotes: 1, viewCount: 40, pinned: true },
]
assert.deepEqual(sortCommunityPosts(sortPosts, 'latest').map((p) => p.id), [3, 2, 1])
assert.deepEqual(sortCommunityPosts(sortPosts, 'comments').map((p) => p.id), [3, 2, 1])
assert.deepEqual(sortCommunityPosts(sortPosts, 'score').map((p) => p.id), [3, 1, 2])
assert.deepEqual(sortCommunityPosts(sortPosts, 'views').map((p) => p.id), [3, 2, 1])
// Ties fall back to newest-first; unknown mode behaves like latest.
assert.deepEqual(sortCommunityPosts([{ id: 'a', createdAt: '2026-01-01' }, { id: 'b', createdAt: '2026-01-02' }], 'nope').map((p) => p.id), ['b', 'a'])
assert.deepEqual(sortCommunityPosts(null, 'latest'), [])

// 기수: the server's own number wins. Deriving it from the 학번 is a guess that
// breaks for 졸업생 synthetic ids, transfers, and roster hand-corrections
// (website #431) — so it is only the fallback when the server sent nothing.
assert.equal(generationLabel(59, '2025000001'), '59기')
assert.equal(generationLabel('59', '2025000001'), '59기')
assert.equal(generationLabel(null, '2025000001'), '59기')
assert.equal(generationLabel(undefined, 'G2020-14'), '54기')
// A server value that disagrees with the 학번 is still authoritative.
assert.equal(generationLabel(42, '2025000001'), '42기')
// Junk falls through to the 학번, and an unusable 학번 says so rather than lying.
assert.equal(generationLabel(0, '2025000001'), '59기')
assert.equal(generationLabel('없음', 'nope'), '기수 미상')

console.log('member experience contract passed')
