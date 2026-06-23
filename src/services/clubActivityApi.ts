import { request } from './apiClient'
import { DEFAULT_APP_LINKS, normalizeAppLinks } from '../config/appLinks'
import { ActivityCategory } from '../contract/enums'
import { enumLabels } from '../contract/labels'

export const CLUB_ACTIVITIES_PATH = '/api/club-activities'

// Keys bound to the canonical ClubActivity.Category enum (drift-guarded).
const ACTIVITY_CATEGORY_LABELS = enumLabels(ActivityCategory, {
  [ActivityCategory.GENERAL]: '일반',
  [ActivityCategory.SEMINAR]: '세미나',
  [ActivityCategory.STUDY]: '스터디',
  [ActivityCategory.PROJECT]: '프로젝트',
  [ActivityCategory.MEETING]: '회의',
  [ActivityCategory.RECRUIT]: '모집',
  [ActivityCategory.EVENT]: '행사',
  [ActivityCategory.MT]: 'MT',
  [ActivityCategory.ACHIEVEMENT]: '성과',
})

export function companionServicesForLinks(links = DEFAULT_APP_LINKS) {
  const normalized = normalizeAppLinks({ links })
  return [
  {
    title: 'Food Club',
    eyebrow: 'Meal loop',
    body: '부원들과 밥 약속과 맛집 후보를 모읍니다.',
    href: normalized.foodClub,
  },
  {
    title: 'TeamMate',
    eyebrow: 'Team randomizer',
    body: '스터디와 프로젝트 팀을 조건에 맞춰 나눕니다.',
    href: normalized.teamMate,
  },
  {
    title: 'Game Club',
    eyebrow: 'Playground',
    body: '동아리 안에서 함께 즐길 작은 게임 공간입니다.',
    href: normalized.gameClub,
  },
  {
    title: 'KW Mate',
    eyebrow: 'Campus utility',
    body: '광운대 생활 연결과 정보를 빠르게 찾습니다.',
    href: normalized.kwMate,
  },
  {
    title: 'Daily Coding',
    eyebrow: 'Practice',
    body: '매일 코딩 문제와 학습 루틴을 이어갑니다.',
    href: normalized.dailyCoding,
  },
  ]
}

export const companionServices = companionServicesForLinks()

export function listClubActivities() {
  return request(CLUB_ACTIVITIES_PATH)
}

export async function createClubActivity({ kind, category, title, description, eventDate, image }: any) {
  const form = new FormData()
  form.append('kind', kind)
  form.append('category', category)
  form.append('title', title)
  form.append('description', description || '')
  form.append('eventDate', eventDate)
  if (image) form.append('image', image)

  return request(CLUB_ACTIVITIES_PATH, {
    method: 'POST',
    body: form,
  })
}

export function parseActivityDate(value) {
  if (typeof value !== 'string') return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function formatActivityDate(value) {
  const date = parseActivityDate(value)
  if (!date) return value || ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

export function categoryLabel(value) {
  return ACTIVITY_CATEGORY_LABELS[value] || value || '일반'
}

export function nextSchedules(records, referenceDate = new Date(), limit = 4) {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())
  return [...(records || [])]
    .filter((item) => item.kind === 'SCHEDULE')
    .filter((item) => {
      const date = parseActivityDate(item.eventDate)
      return date && date >= today
    })
    .sort((a, b) => Number(parseActivityDate(a.eventDate)) - Number(parseActivityDate(b.eventDate)))
    .slice(0, limit)
}

export function recentActivities(records, limit = 4) {
  return [...(records || [])]
    .filter((item) => item.kind === 'ACTIVITY')
    .sort((a, b) => Number(parseActivityDate(b.eventDate)) - Number(parseActivityDate(a.eventDate)))
    .slice(0, limit)
}

export function schedulesForMonth(records, year, month) {
  return [...(records || [])]
    .filter((item) => item.kind === 'SCHEDULE')
    .filter((item) => {
      const date = parseActivityDate(item.eventDate)
      return date && date.getFullYear() === year && date.getMonth() === month
    })
    .sort((a, b) => Number(parseActivityDate(a.eventDate)) - Number(parseActivityDate(b.eventDate)))
}
