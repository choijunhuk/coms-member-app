import assert from 'node:assert/strict'
import {
  AppConfigSchema,
  CommunityPostListSchema,
  CurrentUserSchema,
  MobileHomeSchema,
  parseApiResponse,
} from '../src/services/responseSchemas.js'

const posts = parseApiResponse(CommunityPostListSchema, [
  { id: 1, title: '정상 글', category: 'GENERAL', extra: 'preserved' },
], '커뮤니티 글 목록')

assert.equal(posts[0].category, 'GENERAL')
assert.equal(posts[0].extra, 'preserved')

assert.throws(
  () => parseApiResponse(CommunityPostListSchema, [{ id: 2, title: '잘못된 글', category: 'NOTICE' }], '커뮤니티 글 목록'),
  (error) => error.code === 'INVALID_API_RESPONSE' && error.message.includes('커뮤니티 글 목록'),
)

const user = parseApiResponse(CurrentUserSchema, { id: 7, studentId: '2024000001', role: 'ADMIN', nickname: '관리자' }, '현재 사용자')
assert.equal(user.role, 'ADMIN')
assert.equal(user.nickname, '관리자')

assert.throws(
  () => parseApiResponse(CurrentUserSchema, { id: 8, role: 'OWNER' }, '현재 사용자'),
  (error) => error.code === 'INVALID_API_RESPONSE',
)

assert.deepEqual(parseApiResponse(MobileHomeSchema, { ok: true }, '모바일 홈'), { ok: true })
assert.equal(parseApiResponse(AppConfigSchema, { links: { hub: 'https://coms.kw.ac.kr/' } }, '앱 설정').links.hub, 'https://coms.kw.ac.kr/')

console.log('response schema validation passed')
