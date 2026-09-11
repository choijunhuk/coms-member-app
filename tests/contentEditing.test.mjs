import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  downloadUrl,
  inlineUrl,
  updateArchiveAuthor,
  updateArchiveFile,
} from '../src/services/archiveApi.ts'
import { updateCommunityPostAuthor } from '../src/services/communityApi.ts'
import { updateNoticeAuthor } from '../src/services/noticeApi.ts'
import {
  canEditArchiveFile,
  canEditCommunityPost,
  canEditNotice,
} from '../src/utils/helpers.ts'
import { replaceContentTextPreservingBlocks } from '../src/utils/postBlocks.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify({ id: 7, contentVersion: 3, uploaderName: '표시 이름' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const owner = { id: 1, studentId: '2024000001', role: 'USER' }
const admin = { id: 2, studentId: '2024000002', role: 'ADMIN' }
const vicePresident = { id: 3, studentId: '2024000003', role: 'VICE_PRESIDENT' }
const officer = { id: 4, studentId: '2024000004', role: 'OFFICER' }
const otherPost = { id: 11, authorStudentId: '2024999999', authorId: 99, content: 'plain' }
const ownPost = { ...otherPost, authorStudentId: owner.studentId }
const otherArchive = { id: 12, uploadedBy: '2024999999' }
const ownArchive = { ...otherArchive, uploadedBy: owner.studentId }
const otherNotice = { id: 13, authorStudentId: '2024999999' }
const ownNotice = { ...otherNotice, authorStudentId: owner.studentId }

assert.equal(canEditCommunityPost(owner, ownPost), true)
assert.equal(canEditCommunityPost(admin, otherPost), true)
assert.equal(canEditCommunityPost(vicePresident, otherPost), false)
assert.equal(canEditCommunityPost(vicePresident, { ...otherPost, editable: true }), true)
assert.equal(canEditCommunityPost(admin, { ...otherPost, editable: false }), false)
assert.equal(canEditArchiveFile(owner, ownArchive), true)
assert.equal(canEditArchiveFile(admin, otherArchive), true)
assert.equal(canEditArchiveFile(vicePresident, otherArchive), false)
assert.equal(canEditNotice(owner, ownNotice), true)
assert.equal(canEditNotice(admin, otherNotice), true)
assert.equal(canEditNotice(officer, otherNotice), false)
assert.equal(canEditNotice(vicePresident, otherNotice), false)

const replacement = new File(['new bytes'], 'replacement.pdf', { type: 'application/pdf' })
await updateArchiveFile(7, {
  title: '새 제목',
  description: '새 설명',
  category: 'ACADEMIC_JOURNAL',
  file: replacement,
})
assert.equal(calls[0].url, '/api/files/7')
assert.equal(calls[0].options.method, 'PUT')
assert.equal(calls[0].options.body instanceof FormData, true)
assert.equal(calls[0].options.body.get('title'), '새 제목')
assert.equal(calls[0].options.body.get('description'), '새 설명')
assert.equal(calls[0].options.body.get('category'), 'ACADEMIC_JOURNAL')
assert.equal(calls[0].options.body.get('file').name, 'replacement.pdf')

await updateArchiveAuthor(8, { uploaderName: '직접 표시' })
await updateArchiveAuthor(9, { studentId: '2023123456' })
await updateNoticeAuthor(10, { name: '공지 표시' })
await updateNoticeAuthor(11, { studentId: '2022123456' })
await updateCommunityPostAuthor(12, { name: '커뮤니티 표시' })
await updateCommunityPostAuthor(13, { studentId: '2021123456' })

assert.deepEqual(JSON.parse(calls[1].options.body), { uploaderName: '직접 표시' })
assert.deepEqual(JSON.parse(calls[2].options.body), { studentId: '2023123456' })
assert.deepEqual(JSON.parse(calls[3].options.body), { name: '공지 표시' })
assert.deepEqual(JSON.parse(calls[4].options.body), { studentId: '2022123456' })
assert.deepEqual(JSON.parse(calls[5].options.body), { name: '커뮤니티 표시' })
assert.deepEqual(JSON.parse(calls[6].options.body), { studentId: '2021123456' })

assert.equal(downloadUrl(7, { contentVersion: 3 }), '/api/files/7/download?v=3')
assert.equal(inlineUrl(7, { contentVersion: 3 }), '/api/files/7/inline?v=3')
assert.equal(downloadUrl(7), '/api/files/7/download')

const richContent = JSON.stringify([
  { type: 'text', content: '<p>기존 본문</p>' },
  { type: 'poll', pollId: 'poll-1', question: '투표?', options: ['찬성', '반대'] },
  { type: 'file', fileId: 5, name: '첨부.pdf' },
])
assert.deepEqual(JSON.parse(replaceContentTextPreservingBlocks(richContent, '새 본문')), [
  { type: 'text', content: '새 본문' },
  { type: 'poll', pollId: 'poll-1', question: '투표?', options: ['찬성', '반대'] },
  { type: 'file', fileId: 5, name: '첨부.pdf' },
])
assert.equal(replaceContentTextPreservingBlocks('기존 본문', '새 본문'), '새 본문')

const resourcesSource = readFileSync('src/screens/ResourcesTab.tsx', 'utf8')
assert.match(resourcesSource, /canEditArchiveFile\(currentUser, selected\)/)
assert.match(resourcesSource, /updateArchiveFile/)

console.log('content editing contract passed')
