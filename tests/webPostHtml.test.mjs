import assert from 'node:assert/strict'
import { looksLikeHtml, renderSafeHtml } from '../src/utils/markdown.ts'

// --- detection ---
assert.equal(looksLikeHtml('<p>hi</p>'), true)
assert.equal(looksLikeHtml('그냥 텍스트\n둘째 줄'), false)
assert.equal(looksLikeHtml('3 < 5 그리고 7 > 2'), false)

// --- formatting survives ---
const rich = renderSafeHtml('<p><strong>중요</strong> 공지</p><ul><li>항목1</li><li>항목2</li></ul>')
assert.ok(rich.includes('<strong>중요</strong>'))
assert.ok(rich.includes('<ul><li>항목1</li><li>항목2</li></ul>'))

// attributes on allowed tags are dropped, tag survives
assert.equal(renderSafeHtml('<p style="color:red" onclick="x()">a</p>'), '<p>a</p>')
assert.ok(renderSafeHtml('첫 줄<br>둘째 줄').includes('<br />'))
assert.ok(renderSafeHtml('<pre>code</pre>').includes('<pre>code</pre>'))

// entities from the web sanitizer display as text, not raw entity source
assert.equal(renderSafeHtml('<p>공지&nbsp;사항 &amp; 안내</p>'), '<p>공지 사항 &amp; 안내</p>')

// --- links ---
assert.equal(
  renderSafeHtml('<a href="https://example.com/a?b=1&amp;c=2" class="x">링크</a>'),
  '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noreferrer">링크</a>',
)
// non-http(s) schemes render as plain label
assert.equal(renderSafeHtml('<a href="javascript:alert(1)">클릭</a>'), '클릭')
assert.equal(renderSafeHtml('<a href="data:text/html,x">x</a>'), 'x')

// --- XSS: nothing outside the allowlist may survive as markup ---
for (const payload of [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<iframe src="https://evil"></iframe>',
  '<svg onload=alert(1)>',
  '<style>*{}</style>',
  '<p><script>alert(1)</script></p>',
  // entity-smuggled script must stay escaped after decode+escape
  '&lt;script&gt;alert(1)&lt;/script&gt;',
]) {
  const out = renderSafeHtml(payload)
  assert.ok(!/<(script|img|iframe|svg|style)/i.test(out), `unsafe tag survived: ${payload} -> ${out}`)
  assert.ok(!/on\w+=/i.test(out) || !/<[^>]*on\w+=/i.test(out), `event handler survived: ${out}`)
}

// quotes can't break out of the rebuilt href attribute
const quoted = renderSafeHtml('<a href="https://a.b/&quot;onmouseover=&quot;alert(1)">x</a>')
assert.ok(!/onmouseover=[^"']/.test(quoted), quoted)

console.log('web post html contract passed')
