import assert from 'node:assert/strict'
import {
  postBlocks,
  pollOptionImageUrl,
  pollOptionLabel,
  pollTotals,
  postPreviewText,
} from '../src/utils/postBlocks.js'

const blockPost = {
  content: JSON.stringify([
    { type: 'text', content: '<p>스터디 공지입니다.</p>' },
    { type: 'image', mediaId: 12, width: 'small', align: 'left' },
    {
      type: 'poll',
      pollId: 'poll-1',
      question: '다음 모임 시간은?',
      options: [
        { label: '수요일 저녁', imageUrl: 'https://example.com/wed.png' },
        '토요일 오후',
      ],
    },
  ]),
  imageUrl: '/api/community/posts/7/image',
  imageOriginalName: 'legacy.png',
  imageInfos: [{ id: 12, url: '/api/community/posts/7/images/12', originalName: 'inline.png' }],
  pollResults: [{ pollId: 'poll-1', optionCounts: [3, 1], myOption: null, closed: false }],
}

const blocks = postBlocks(blockPost)

assert.equal(blocks.length, 4)
assert.equal(blocks[0].type, 'text')
assert.equal(blocks[0].content, '<p>스터디 공지입니다.</p>')
assert.deepEqual(blocks[1], {
  type: 'image',
  mediaId: 12,
  name: 'inline.png',
  url: '/api/community/posts/7/images/12',
  width: 'small',
  align: 'left',
})
assert.deepEqual(blocks[2].options.map(pollOptionLabel), ['수요일 저녁', '토요일 오후'])
assert.equal(pollOptionImageUrl(blocks[2].options[0]), 'https://example.com/wed.png')
assert.deepEqual(pollTotals(blockPost.pollResults[0]), { counts: [3, 1], total: 4 })
assert.equal(postPreviewText(blockPost), '스터디 공지입니다.')
assert.deepEqual(blocks[3], {
  type: 'image',
  legacy: true,
  name: 'legacy.png',
  url: '/api/community/posts/7/image',
  width: 'large',
  align: 'center',
})

assert.deepEqual(postBlocks({ content: 'plain text only' }), [{ type: 'text', content: 'plain text only' }])
assert.deepEqual(postBlocks({ content: '[' }), [{ type: 'text', content: '[' }])
assert.equal(postPreviewText({ content: JSON.stringify([{ type: 'image', url: '/api/community/posts/1/image' }]) }), '이미지가 포함된 글입니다.')
assert.equal(postPreviewText({ content: JSON.stringify([{ type: 'poll', question: '점심 메뉴?', options: ['한식', '중식'] }]) }), '투표: 점심 메뉴?')
assert.equal(pollOptionLabel({ label: '찬성' }), '찬성')
assert.equal(pollOptionLabel('반대'), '반대')
assert.equal(pollOptionImageUrl('반대'), '')

console.log('post block contract passed')
