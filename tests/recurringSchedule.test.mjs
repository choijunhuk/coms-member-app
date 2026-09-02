import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listScheduleOccurrences, mergeMonthSchedule, schedulesForMonth } from '../src/services/clubActivityApi.ts'

const calls = []
globalThis.fetch = async (url, options = {}) => {
  calls.push({ url, options })
  return new Response(JSON.stringify([
    { date: '2026-09-09', recurringScheduleId: 3, title: '정기 모임', startTime: '19:00:00', endTime: '21:00:00', location: '동아리방' },
  ]), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

// month is 1-12 on the wire, NOT JS's 0-11 — an off-by-one here silently shows
// the wrong month's 정기 일정.
const occurrences = await listScheduleOccurrences(2026, 9)
assert.equal(calls[0].url, '/api/club-activities/schedule?year=2026&month=9')
assert.equal(occurrences[0].title, '정기 모임')

// Non-numeric input cannot smuggle anything into the query string.
await listScheduleOccurrences('2026&admin=1', '9')
assert.equal(calls[1].url, '/api/club-activities/schedule?year=NaN&month=9')

const activities = [
  { id: 1, kind: 'SCHEDULE', title: '개강 총회', eventDate: '2026-09-15', category: 'MEETING' },
  { id: 2, kind: 'SCHEDULE', title: '지난달 일정', eventDate: '2026-08-04', category: 'MEETING' },
  { id: 3, kind: 'ACTIVITY', title: '활동 기록', eventDate: '2026-09-02', category: 'SEMINAR' },
]

const merged = mergeMonthSchedule(schedulesForMonth(activities, 2026, 8), occurrences)

// One-off and recurring entries land in one date-sorted list. Before this the
// month view showed only one-offs, so the weekly 정기 모임 was invisible.
assert.deepEqual(merged.map((item) => item.title), ['정기 모임', '개강 총회'])
assert.equal(merged[0].recurring, true)
assert.equal(merged[0].timeLabel, '19:00~21:00')
assert.equal(merged[0].description, '동아리방')
assert.equal(merged[1].recurring, false)

// Recurring ids are namespaced so they can never collide with an activity id.
assert.equal(merged[0].id, 'recurring-3-2026-09-09')
assert.equal(new Set(merged.map((item) => item.id)).size, merged.length)

// Canceled occurrences are dropped — they are not happening.
assert.deepEqual(
  mergeMonthSchedule([], [{ date: '2026-09-09', recurringScheduleId: 3, title: '취소된 모임', canceled: true }]),
  [],
)
// A dateless occurrence is skipped rather than sorting to the front.
assert.deepEqual(mergeMonthSchedule([], [{ recurringScheduleId: 4, title: '날짜 없음' }]), [])
// Missing/empty inputs are tolerated on both sides.
assert.deepEqual(mergeMonthSchedule(null, null), [])

// A failed occurrence fetch must not blank the month's one-off schedules.
const tabSource = readFileSync('src/screens/ActivityTab.tsx', 'utf8')
assert.match(tabSource, /queryKey: \['member-app', 'schedule-occurrences', year, month \+ 1\]/)
assert.match(tabSource, /listScheduleOccurrences\(year, month \+ 1\)/)
assert.match(tabSource, /retry: false/)
assert.match(tabSource, /asArray\(occurrencesQuery\.data\)/)
assert.match(tabSource, /정기 일정/)

console.log('recurring schedule contract passed')
