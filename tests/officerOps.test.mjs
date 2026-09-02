import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { deleteNotice, pinNotice, updateNoticeAuthor } from '../src/services/noticeApi.ts'
import { deleteFile, updateArchiveAuthor } from '../src/services/archiveApi.ts'
import { updateCommunityPostAuthor } from '../src/services/communityApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── 공지 (임원 이상: 고정/삭제, 회장: 작성자 변경) ──────────────────────────
await pinNotice(7, true)
assert.equal(calls[0].url, '/api/notices/7/pin')
assert.equal(calls[0].options.method, 'PATCH')
assert.deepEqual(JSON.parse(calls[0].options.body), { pinned: true })

await pinNotice(7, false)
assert.deepEqual(JSON.parse(calls[1].options.body), { pinned: false })

await updateNoticeAuthor(7, '홍길동')
assert.equal(calls[2].url, '/api/notices/7/author')
assert.equal(calls[2].options.method, 'PATCH')
// NoticeAuthorUpdateRequest is { name } — uploaderName here would 400.
assert.deepEqual(JSON.parse(calls[2].options.body), { name: '홍길동' })

await deleteNotice(7)
assert.equal(calls[3].url, '/api/notices/7')
assert.equal(calls[3].options.method, 'DELETE')

// ─── 자료실 (부회장 이상) ─────────────────────────────────────────────────────
await updateArchiveAuthor(12, '김운영')
assert.equal(calls[4].url, '/api/files/12/author')
assert.equal(calls[4].options.method, 'PATCH')
// ArchiveAuthorUpdateRequest is { uploaderName }, NOT { name }.
assert.deepEqual(JSON.parse(calls[4].options.body), { uploaderName: '김운영' })

await deleteFile(12)
assert.equal(calls[5].url, '/api/files/12')
assert.equal(calls[5].options.method, 'DELETE')

// ─── 커뮤니티 작성자 변경 (회장 전용) ────────────────────────────────────────
// The backend reads the two fields exclusively: a studentId reassigns the post
// to that member, a name only overrides the displayed author. Sending both
// would silently apply the reassignment, so only one may ever go on the wire.
await updateCommunityPostAuthor(30, { studentId: '2023123456' })
assert.equal(calls[6].url, '/api/community/posts/30/author')
assert.equal(calls[6].options.method, 'PATCH')
assert.deepEqual(JSON.parse(calls[6].options.body), { studentId: '2023123456' })

await updateCommunityPostAuthor(30, { name: '표시이름만' })
assert.deepEqual(JSON.parse(calls[7].options.body), { name: '표시이름만' })

// Both supplied → studentId wins and name is dropped (mirrors web communityApi).
await updateCommunityPostAuthor(30, { studentId: '2023123456', name: '무시됨' })
assert.deepEqual(JSON.parse(calls[8].options.body), { studentId: '2023123456' })

// ─── 화면 게이트 ─────────────────────────────────────────────────────────────
// The role gates live in the screens, so assert the helper each screen uses:
// a downgrade here (canManageContent → nothing) would hand 임원 tools to 회원.
const noticesSource = readFileSync('src/screens/NoticesTab.tsx', 'utf8')
assert.match(noticesSource, /const canManageNotice = canManageContent\(currentUser\)/)
assert.match(noticesSource, /const canChangeAuthor = isAdminUser\(currentUser\)/)

const resourcesSource = readFileSync('src/screens/ResourcesTab.tsx', 'utf8')
assert.match(resourcesSource, /const canManageArchive = canModerateCommunity\(currentUser\)/)

const communitySource = readFileSync('src/screens/CommunityTab.tsx', 'utf8')
assert.match(communitySource, /isAdminUser\(currentUser\) && updatePostAuthor/)

console.log('officer ops contract passed')
