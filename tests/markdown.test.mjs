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

// Markers our composer doesn't render but members paste in anyway
assert.equal(stripMarkdown('# 제목\n본문'), '제목\n본문')
assert.equal(stripMarkdown('## 소제목 텍스트'), '소제목 텍스트')
assert.equal(stripMarkdown('`코드` 조각'), '코드 조각')
assert.equal(stripMarkdown('```js\nconst a = 1\n```'), 'const a = 1\n')
assert.equal(stripMarkdown('> 인용문'), '인용문')
assert.equal(stripMarkdown('- 항목 하나\n- 항목 둘'), '항목 하나\n항목 둘')
assert.equal(stripMarkdown('1. 첫째\n2) 둘째'), '첫째\n둘째')
assert.equal(stripMarkdown('- [ ] 할 일\n- [x] 끝난 일'), '할 일\n끝난 일')
assert.equal(stripMarkdown('*기울임* 그리고 ~~취소~~ 그리고 ==강조=='), '기울임 그리고 취소 그리고 강조')
assert.equal(stripMarkdown('__밑줄__ 텍스트'), '밑줄 텍스트')
assert.equal(stripMarkdown('![사진](https://x.com/a.png) 설명'), '사진 설명')
assert.equal(stripMarkdown('위\n---\n아래'), '위\n\n아래')

// preview() strips line-anchored markers BEFORE flattening newlines
assert.equal(preview('# 공지\n- 첫번째\n- 두번째'), '공지 첫번째 두번째')
assert.ok(!preview('> 인용\n`code`').includes('>'))
assert.ok(!preview('> 인용\n`code`').includes('`'))

// Web posts store sanitized HTML — tags AND entities must not leak into previews
assert.equal(preview('<p>공지&nbsp;사항</p>'), '공지 사항')
assert.equal(preview('<b>A &amp; B</b> &lt;중요&gt; &#39;인용&#39; &#x1F389;'), "A & B <중요> '인용' 🎉")
assert.ok(!preview('<span style="color:#f00">빨강</span>&nbsp;텍스트').includes('&nbsp;'))
// Out-of-range/invalid numeric entities vanish instead of throwing
assert.equal(preview('a&#9999999;b'), 'ab')

console.log('markdown contract passed')
