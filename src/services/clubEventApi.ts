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

export const RSVP_OPTIONS = [
  { status: 'GOING', label: '참석', countKey: 'goingCount' },
  { status: 'MAYBE', label: '미정', countKey: 'maybeCount' },
  { status: 'NOT_GOING', label: '불참', countKey: 'notGoingCount' },
]
