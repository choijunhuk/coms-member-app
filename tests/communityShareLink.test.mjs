import assert from 'node:assert/strict'

import { communityShareUrl } from '../src/utils/shareLink.ts'

const BASE = 'https://coms.kw.ac.kr'
const SIGNED = 'https://coms.kw.ac.kr/community/42?s=AbCdEfGhIjKlMnOpQrStUv'

// The signed link from the server is what gets shared, so the chat preview shows the post.
assert.equal(communityShareUrl(42, SIGNED, BASE), SIGNED)

// No signature (anonymous-board post, older server, request failed): the plain public link.
assert.equal(communityShareUrl(42, '', BASE), 'https://coms.kw.ac.kr/community/42')
assert.equal(communityShareUrl(42, undefined, `${BASE}/`), 'https://coms.kw.ac.kr/community/42')

// The base is the public site, not the WebView origin (https://localhost / capacitor://localhost).
assert.ok(!communityShareUrl(7, null, BASE).includes('localhost'))

// Anything that is not this post on the public site over https is ignored.
for (const unexpected of [
  'https://evil.example/community/42?s=AbCdEfGhIjKlMnOpQrStUv',
  'https://coms.kw.ac.kr/community/43?s=AbCdEfGhIjKlMnOpQrStUv',
  'http://coms.kw.ac.kr/community/42?s=AbCdEfGhIjKlMnOpQrStUv',
  'https://coms.kw.ac.kr/community/42',
  'not a url',
]) {
  assert.equal(communityShareUrl(42, unexpected, BASE), 'https://coms.kw.ac.kr/community/42', unexpected)
}

console.log('community share link contract passed')
