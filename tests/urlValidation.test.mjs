import assert from 'node:assert/strict'

import { validateHttpUrl } from '../src/utils/urlValidation.js'

assert.deepEqual(validateHttpUrl('', { allowEmpty: true }), { ok: true, url: '' })
assert.equal(validateHttpUrl('https://coms.kw.ac.kr/PRDoctor/').ok, true)
assert.equal(validateHttpUrl('http://localhost:5173/apps').ok, true)
assert.equal(validateHttpUrl('javascript:alert(1)').ok, false)
assert.equal(validateHttpUrl('ftp://coms.kw.ac.kr/file').ok, false)
assert.equal(validateHttpUrl('https://user:pass@example.com').ok, false)
assert.match(validateHttpUrl('not a url').message, /http/)

console.log('url validation contract passed')
