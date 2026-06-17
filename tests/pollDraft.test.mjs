import assert from 'node:assert/strict'
import {
  buildComposerContent,
  createEmptyPollDraft,
  pollDraftStatus,
} from '../src/utils/pollDraft.js'

const empty = createEmptyPollDraft()
assert.equal(empty.enabled, false)
assert.deepEqual(empty.options, ['', ''])
assert.equal(pollDraftStatus({ ...empty, enabled: true, question: '점심 메뉴?', options: ['한식', ''] }).valid, false)
assert.equal(pollDraftStatus({ ...empty, enabled: true, question: '점심 메뉴?', options: ['한식', '중식'] }).valid, true)

const content = buildComposerContent({
  text: '오늘 점심 투표합니다.',
  poll: {
    enabled: true,
    question: '점심 메뉴?',
    options: ['한식', '중식', '  '],
  },
  idSeed: 'poll-mobile',
})
const blocks = JSON.parse(content)

assert.equal(blocks.length, 2)
assert.deepEqual(blocks[0], { type: 'text', content: '오늘 점심 투표합니다.' })
assert.equal(blocks[1].type, 'poll')
assert.equal(blocks[1].pollId, 'poll-mobile')
assert.equal(blocks[1].question, '점심 메뉴?')
assert.deepEqual(blocks[1].options, [{ label: '한식' }, { label: '중식' }])

assert.equal(buildComposerContent({ text: '일반 글', poll: empty }), '일반 글')

console.log('poll draft contract passed')
