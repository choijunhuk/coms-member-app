import { request } from './apiClient'

export const CLUB_EVENTS_QUERY_KEY = ['member-app', 'club-events']

export function listClubEvents() {
  return request('/api/club-events')
}

// status: 'GOING' | 'MAYBE' | 'NOT_GOING'
export function rsvpClubEvent(id, status) {
  return request(`/api/club-events/${id}/rsvp`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
}

// Toggle a vote on an entry (submitted work) of a voting event.
export function voteClubEventEntry(eventId, entryId) {
  return request(`/api/club-events/${eventId}/entries/${entryId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ entryId }),
  })
}

export const RSVP_OPTIONS = [
  { status: 'GOING', label: '참석', countKey: 'goingCount' },
  { status: 'MAYBE', label: '미정', countKey: 'maybeCount' },
  { status: 'NOT_GOING', label: '불참', countKey: 'notGoingCount' },
]

export const WORK_TYPE_OPTIONS = [
  { value: 'MAGAZINE', label: '회지' },
  { value: 'WEBZINE', label: '웹진' },
  { value: 'SOURCE', label: '원본/소스' },
  { value: 'DESIGN', label: '디자인' },
  { value: 'OTHER', label: '기타' },
]

// Submit a work entry to a club event. Metadata rides as query params; the
// files go up as multipart `files` (backend accepts ZIP archives).
export function submitClubEventEntry(eventId, meta, files = []) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(meta || {})) {
    if (value != null && String(value).trim()) qs.set(key, String(value).trim())
  }
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return request(`/api/club-events/${eventId}/entries?${qs.toString()}`, {
    method: 'POST',
    body: form,
  })
}
