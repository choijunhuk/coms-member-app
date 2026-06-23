import assert from 'node:assert/strict'
import { API_BASE_URL, DEFAULT_REQUEST_TIMEOUT_MS, apiUrl, createRequestTimeoutError, normalizeApiBaseUrl } from '../src/services/apiClient.ts'

assert.equal(normalizeApiBaseUrl('https://coms.kw.ac.kr/api/'), 'https://coms.kw.ac.kr/api')
assert.equal(normalizeApiBaseUrl('https://coms.kw.ac.kr'), 'https://coms.kw.ac.kr/api')
assert.equal(apiUrl('/api/auth/me', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/auth/me')
assert.equal(apiUrl('/auth/me', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/auth/me')
assert.equal(apiUrl('community/posts', 'https://coms.kw.ac.kr/api'), 'https://coms.kw.ac.kr/api/community/posts')
assert.equal(apiUrl('/api/community/posts', ''), '/api/community/posts')
assert.equal(API_BASE_URL, '')
assert.equal(apiUrl('/api/auth/me'), '/api/auth/me')
assert.equal(DEFAULT_REQUEST_TIMEOUT_MS, 30_000)

const timeoutError = createRequestTimeoutError()
assert.equal(timeoutError.status, 0)
assert.equal(timeoutError.code, 'REQUEST_TIMEOUT')
assert.match(timeoutError.message, /30초/)

console.log('api client contract passed')
