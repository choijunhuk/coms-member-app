import assert from 'node:assert/strict'
import { externalBlockFromUrl } from '../src/utils/externalEmbed.ts'
import { buildComposerContent } from '../src/utils/pollDraft.ts'

// YouTube variants → youtube embed block
for (const url of [
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/shorts/dQw4w9WgXcQ',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
]) {
  const block = externalBlockFromUrl(url)
  assert.equal(block.type, 'externalEmbed')
  assert.equal(block.kind, 'youtube')
  assert.equal(block.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
}

// Generic https link → link block
const link = externalBlockFromUrl('https://coms.kw.ac.kr/notice/1')
assert.equal(link.kind, 'link')
assert.equal(link.url, 'https://coms.kw.ac.kr/notice/1')

// Junk / unsafe schemes → null (never rendered)
assert.equal(externalBlockFromUrl('javascript:alert(1)'), null)
assert.equal(externalBlockFromUrl('not a url'), null)
assert.equal(externalBlockFromUrl(''), null)

// buildComposerContent with media blocks → JSON with text + media
const yt = externalBlockFromUrl('https://youtu.be/dQw4w9WgXcQ')
const content = buildComposerContent({ text: '영상 보세요', poll: { enabled: false }, media: [yt] })
const parsed = JSON.parse(content)
assert.equal(parsed[0].type, 'text')
assert.equal(parsed[0].content, '영상 보세요')
assert.equal(parsed[1].type, 'externalEmbed')

// No media, no poll → stays plain text (unchanged behavior)
assert.equal(buildComposerContent({ text: '그냥 글', poll: { enabled: false }, media: [] }), '그냥 글')

// Video + file blocks preserved in order
const withVideoFile = buildComposerContent({
  text: 'cap',
  poll: { enabled: false },
  media: [{ type: 'video', mediaId: 3, name: 'v.mp4' }, { type: 'file', fileId: 7, name: 'a.pdf' }],
})
const pv = JSON.parse(withVideoFile)
assert.equal(pv[1].type, 'video')
assert.equal(pv[1].mediaId, 3)
assert.equal(pv[2].type, 'file')
assert.equal(pv[2].fileId, 7)

// extra metadata (YouTube search results, link previews) merges over defaults
const enriched = externalBlockFromUrl('https://youtu.be/dQw4w9WgXcQ', { title: '검색 결과 제목', thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg' })
assert.equal(enriched.kind, 'youtube')
assert.equal(enriched.title, '검색 결과 제목')
assert.equal(enriched.thumbnailUrl, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg')
assert.equal(enriched.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ')

// malformed video ids (wrong length / charset) must NOT become youtube embeds —
// they fall back to a plain link card so no crafted id reaches the embed URL
assert.equal(externalBlockFromUrl('https://youtu.be/abc123').kind, 'link')
assert.equal(externalBlockFromUrl('https://www.youtube.com/watch?v=abc%26evil%3D1').kind, 'link')
const linkMeta = externalBlockFromUrl('https://example.com/post', { title: '기사 제목', description: '설명', image: 'https://example.com/og.png', siteName: 'Example' })
assert.equal(linkMeta.kind, 'link')
assert.equal(linkMeta.title, '기사 제목')
assert.equal(linkMeta.siteName, 'Example')

// A hostile `extra` must not be able to replace the validated URLs. Spread last,
// a link preview could swap `url`/`embedUrl` for a javascript: or data: URL that
// never passed the protocol check, and the composer would embed it.
const hijacked = externalBlockFromUrl('https://youtu.be/dQw4w9WgXcQ', {
  title: '정상 제목',
  url: 'javascript:alert(1)',
  embedUrl: 'https://evil.example/steal',
})
assert.equal(hijacked.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
assert.equal(hijacked.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
assert.equal(hijacked.title, '정상 제목')

const hijackedLink = externalBlockFromUrl('https://example.com/post', {
  siteName: 'Example',
  url: 'data:text/html,<script>alert(1)</script>',
})
assert.equal(hijackedLink.url, 'https://example.com/post')
assert.equal(hijackedLink.siteName, 'Example')

console.log('externalEmbed + composer media contract passed')
