import assert from 'node:assert/strict'
import { API_BASE_URL, apiUrl, normalizeApiBaseUrl } from '../src/services/apiClient.js'

assert.equal(normalizeApiBaseUrl('https://coms.kw.ac.kr/api/'), 'https://coms.kw.ac.kr/api')
assert.equal(normalizeApiBaseUrl('https://coms.kw.ac.kr'), 'https://coms.kw.ac.kr/api')
assert.equal(apiUrl('/api/auth/me', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/auth/me')
assert.equal(apiUrl('/auth/me', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/auth/me')
assert.equal(apiUrl('community/posts', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/community/posts')
assert.equal(apiUrl('/api/community/posts', ''), '/api/community/posts')
assert.equal(API_BASE_URL, '')
assert.equal(apiUrl('/api/auth/me'), '/api/auth/me')

console.log('api client contract passed')
