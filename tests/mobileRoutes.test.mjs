import assert from 'node:assert/strict'
import { routeFromNotification, routeFromUrl } from '../src/utils/mobileRoutes.js'

assert.deepEqual(routeFromUrl('coms-member-app://notices/42'), { tab: 'notices', noticeId: '42' })
assert.deepEqual(routeFromUrl('coms-member-app://community/7'), { tab: 'community', postId: '7' })
assert.deepEqual(routeFromUrl('https://coms.kw.ac.kr/notices/4?from=push'), { tab: 'notices', noticeId: '4' })
assert.deepEqual(routeFromUrl('https://coms.kw.ac.kr/community/18'), { tab: 'community', postId: '18' })
assert.deepEqual(routeFromUrl('https://coms.kw.ac.kr/notifications'), { tab: 'notifications' })
assert.deepEqual(routeFromUrl('https://coms.kw.ac.kr/resources'), { tab: 'resources' })
assert.equal(routeFromUrl('https://example.com/community/18'), null)
assert.equal(routeFromUrl('not a url'), null)

assert.deepEqual(routeFromNotification({ data: { url: 'https://coms.kw.ac.kr/notices/5' } }), { tab: 'notices', noticeId: '5' })
assert.deepEqual(routeFromNotification({ data: { type: 'NOTICE', noticeId: 6 } }), { tab: 'notices', noticeId: '6' })
assert.deepEqual(routeFromNotification({ data: { type: 'COMMUNITY_COMMENT', postId: 9 } }), { tab: 'community', postId: '9' })
assert.deepEqual(routeFromNotification({ data: { type: 'COMMUNITY_POST_DELETED' } }), { tab: 'profile', section: 'deleted-posts' })
assert.deepEqual(routeFromNotification({ data: { type: 'COMMUNITY_POST_RESTORED', postId: 10 } }), { tab: 'community', postId: '10' })
assert.deepEqual(routeFromNotification({ data: { target: 'notifications' } }), { tab: 'notifications' })
assert.equal(routeFromNotification({ data: { type: 'UNKNOWN' } }), null)

console.log('mobile route contract passed')
