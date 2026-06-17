import assert from 'node:assert/strict'
import { networkBannerMessage } from '../src/utils/networkStatus.js'
import { pollResultRows, pollSummaryText } from '../src/utils/pollResults.js'
import { registerPushTokenWithRetry } from '../src/utils/pushRegistration.js'

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

console.log('member experience contract passed')
