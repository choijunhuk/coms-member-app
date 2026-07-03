import assert from 'node:assert/strict'
import { renderMarkdownToHtml, stripMarkdown } from '../src/utils/markdown.ts'
import { preview } from '../src/utils/format.ts'

assert.equal(renderMarkdownToHtml('plain'), 'plain')
assert.equal(renderMarkdownToHtml('**bold**'), '<strong>bold</strong>')
assert.equal(renderMarkdownToHtml('a _italic_ b'), 'a <em>italic</em> b')
assert.equal(renderMarkdownToHtml('a__b'), 'a__b')

// Links — only http(s) allowed
assert.equal(renderMarkdownToHtml('[site](https://coms.kw.ac.kr)'), '<a href="https://coms.kw.ac.kr" target="_blank" rel="noreferrer">site</a>')
assert.equal(renderMarkdownToHtml('[bad](javascript:alert(1))'), '[bad](javascript:alert(1))')
assert.equal(renderMarkdownToHtml('[bad](data:text/html,evil)'), '[bad](data:text/html,evil)')

// HTML in input is escaped before transforms
assert.equal(renderMarkdownToHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
assert.equal(renderMarkdownToHtml('"&\'<>'), '&quot;&amp;&#39;&lt;&gt;')

// Newlines become <br />
assert.equal(renderMarkdownToHtml('a\nb'), 'a<br />b')

// stripMarkdown: markers become visible text (used by list previews)
assert.equal(stripMarkdown('**bold**'), 'bold')
assert.equal(stripMarkdown('a _italic_ b'), 'a italic b')
assert.equal(stripMarkdown('see [site](https://coms.kw.ac.kr) here'), 'see site here')
assert.equal(stripMarkdown('plain text'), 'plain text')

// preview() must not leak raw markdown syntax into list previews
assert.equal(preview('**중요** 공지 [링크](https://coms.kw.ac.kr)'), '중요 공지 링크')
assert.ok(!preview('**굵게** _기울임_').includes('*'))
assert.ok(!preview('[제목](https://x.com)').includes('['))

console.log('markdown contract passed')
