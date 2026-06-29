import { useMemo, useState } from 'react'
import { CalendarDays, Eye, ExternalLink, Image, Sparkles, ThumbsUp } from 'lucide-react'
import {
  categoryLabel,
  companionServicesForLinks,
  formatActivityDate,
  recentActivities,
  schedulesForMonth,
} from '../services/clubActivityApi'
import { Empty, ListItem, Section } from '../components/ui'
import type { AppItem, AppLinks, ClubActivity } from '../contract/types'

const MONTHS = Array.from({ length: 12 }, (_, index) => ({ value: index, label: `${index + 1}월` }))

function isSafeHttpUrl(url) {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

async function openService(url) {
  if (!url || !isSafeHttpUrl(url)) return
  try {
    const mod = await import('@capacitor/browser').catch(() => ({})) as { Browser?: { open?: (options: { url: string }) => Promise<void> } }
    if (mod?.Browser?.open) {
      await mod.Browser.open({ url })
      return
    }
  } catch (err) {
    console.warn('open service failed', err)
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

type ServiceCard = {
  id?: AppItem['id']
  title?: string | null
  eyebrow?: string | null
  body?: string | null
  href?: string | null
}

type ActivityTabProps = {
  clubActivities: ClubActivity[]
  apps?: AppItem[]
  appLinks?: AppLinks
}

export default function ActivityTab({ clubActivities, apps, appLinks }: ActivityTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const activities = useMemo(() => recentActivities(clubActivities, 12), [clubActivities])
  const monthSchedules = useMemo(() => schedulesForMonth(clubActivities, year, month), [clubActivities, year, month])
  const services = useMemo<ServiceCard[]>(() => (
    Array.isArray(apps) && apps.length > 0 ? apps : companionServicesForLinks(appLinks)
  ), [appLinks, apps])

  return (
    <div className="stack">
      <section className="hero-card">
        <p className="eyebrow">Activity loop</p>
        <h2>동아리 일정과 활동 기록을 앱에서 바로 확인합니다.</h2>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2><CalendarDays size={14} aria-hidden="true" /> 월별 일정</h2>
        </div>
        <div className="calendar-picker">
          <label>년도<input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())} /></label>
          <label>월<select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        <div className="list compact-list">
          {monthSchedules.map((item) => (
            <ListItem key={item.id} title={item.title} meta={`${formatActivityDate(item.eventDate)} · ${categoryLabel(item.category)}`} body={item.description} />
          ))}
          {monthSchedules.length === 0 && <Empty text="선택한 달에 등록된 일정이 없습니다." />}
        </div>
      </section>

      <Section title={<><Sparkles size={14} aria-hidden="true" /> 활동 기록</>}>
        {activities.map((item) => (
          <ListItem key={item.id} title={item.title} meta={`${formatActivityDate(item.eventDate)} · ${categoryLabel(item.category)}`} body={item.description}>
            {item.imageUrl && <span className="media-chip"><Image size={14} aria-hidden="true" /> 사진</span>}
            <div className="stats"><span><Eye size={14} />{item.viewCount || 0}</span><span><ThumbsUp size={14} />{item.upvotes || 0}</span></div>
          </ListItem>
        ))}
        {activities.length === 0 && <Empty text="등록된 활동 기록이 없습니다." />}
      </Section>

      <Section title="COMS Apps">
        {services.map((service) => (
          <ListItem key={service.id ?? service.title} title={service.title} meta={service.eyebrow} body={service.body} onClick={() => openService(service.href)}>
            <span className="media-chip"><ExternalLink size={14} aria-hidden="true" /> 열기</span>
          </ListItem>
        ))}
      </Section>
    </div>
  )
}
