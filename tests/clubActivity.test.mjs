import assert from 'node:assert/strict'
import {
  CLUB_ACTIVITIES_PATH,
  companionServices,
  companionServicesForLinks,
  createClubActivity,
  listClubActivities,
  nextSchedules,
  recentActivities,
  schedulesForMonth,
} from '../src/services/clubActivityApi.js'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

await listClubActivities()
await createClubActivity({
  kind: 'SCHEDULE',
  category: 'MEETING',
  title: '정기 회의',
  description: '운영진 회의',
  eventDate: '2026-06-30',
})

assert.equal(CLUB_ACTIVITIES_PATH, '/api/club-activities')
assert.equal(calls[0].url, '/api/club-activities')
assert.equal(calls[1].url, '/api/club-activities')
assert.equal(calls[1].options.method, 'POST')
assert.ok(calls[1].options.body instanceof FormData)
assert.equal(companionServices.length, 5)
assert.deepEqual(companionServices.map((service) => service.title), ['Food Club', 'TeamMate', 'Game Club', 'KW Mate', 'Daily Coding'])
assert.deepEqual(companionServicesForLinks({ foodClub: 'https://example.com/food/' }).map((service) => service.href)[0], 'https://example.com/food/')

const records = [
  { id: 1, kind: 'SCHEDULE', title: '이번 주 세미나', eventDate: '2026-06-21' },
  { id: 2, kind: 'SCHEDULE', title: '다음 달 발표', eventDate: '2026-07-02' },
  { id: 3, kind: 'ACTIVITY', title: '프로젝트 발표회', eventDate: '2026-06-18' },
  { id: 4, kind: 'ACTIVITY', title: '알고리즘 스터디', eventDate: '2026-06-12' },
]

assert.deepEqual(nextSchedules(records, new Date(2026, 5, 20)).map((item) => item.title), ['이번 주 세미나', '다음 달 발표'])
assert.deepEqual(recentActivities(records).map((item) => item.title), ['프로젝트 발표회', '알고리즘 스터디'])
assert.deepEqual(schedulesForMonth(records, 2026, 5).map((item) => item.title), ['이번 주 세미나'])

console.log('club activity contract passed')
