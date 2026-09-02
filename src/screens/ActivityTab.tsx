import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, CalendarCheck, CalendarDays, CalendarPlus, Download, Eye, ExternalLink, Image, Sparkles, ThumbsUp, Trophy, Upload } from 'lucide-react'
import { exportSchedulesIcs } from '../utils/calendarExport'
import { CLUB_EVENTS_QUERY_KEY, RSVP_OPTIONS, WORK_TYPE_OPTIONS, listClubEvents, rsvpClubEvent, voteClubEventEntry, submitClubEventEntry } from '../services/clubEventApi'
import { listClubProjects } from '../services/clubProjectApi'
import { apiUrl } from '../services/apiClient'
import { asArray, formatDate } from '../utils/format'
import {
  categoryLabel,
  companionServicesForLinks,
  formatActivityDate,
  listScheduleOccurrences,
  mergeMonthSchedule,
  recentActivities,
  schedulesForMonth,
} from '../services/clubActivityApi'
import { Empty, ListItem, Section } from '../components/ui'
import EntrySubmitForm from './community/EntrySubmitForm'
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

function projectFileUrl(projectId, fileId) {
  const path = apiUrl(`/api/club-projects/${projectId}/files/${fileId}/download`)
  if (/^https?:\/\//i.test(path)) return path
  return typeof window !== 'undefined' ? new URL(path, window.location.origin).toString() : path
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
  // 정기 일정 come from their own endpoint, already expanded per occurrence for
  // the month on screen. They are additive to the one-off list, so a failure
  // must not blank the month — hence no retry and a plain empty fallback.
  const occurrencesQuery = useQuery({
    queryKey: ['member-app', 'schedule-occurrences', year, month + 1],
    queryFn: () => listScheduleOccurrences(year, month + 1),
    retry: false,
  })
  const monthSchedules = useMemo(
    () => mergeMonthSchedule(schedulesForMonth(clubActivities, year, month), asArray(occurrencesQuery.data)),
    [clubActivities, year, month, occurrencesQuery.data],
  )
  const services = useMemo<ServiceCard[]>(() => (
    Array.isArray(apps) && apps.length > 0 ? apps : companionServicesForLinks(appLinks)
  ), [appLinks, apps])

  const queryClient = useQueryClient()
  const projectsQuery = useQuery({ queryKey: ['club-projects'], queryFn: listClubProjects })
  const clubProjects = asArray(projectsQuery.data)
  const eventsQuery = useQuery({ queryKey: CLUB_EVENTS_QUERY_KEY, queryFn: listClubEvents })
  const events = asArray(eventsQuery.data)
  const rsvpMutation = useMutation({
    mutationFn: ({ id, status }: { id: unknown; status: string }) => rsvpClubEvent(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLUB_EVENTS_QUERY_KEY }),
  })
  const voteMutation = useMutation({
    mutationFn: ({ eventId, entryId }: { eventId: unknown; entryId: unknown }) => voteClubEventEntry(eventId, entryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CLUB_EVENTS_QUERY_KEY }),
  })
  const [submitEventId, setSubmitEventId] = useState<unknown>(null)
  const submitEntryMutation = useMutation({
    mutationFn: ({ eventId, meta, files }: { eventId: unknown; meta: Record<string, string>; files: File[] }) => submitClubEventEntry(eventId, meta, files),
    onSuccess: () => {
      setSubmitEventId(null)
      queryClient.invalidateQueries({ queryKey: CLUB_EVENTS_QUERY_KEY })
    },
  })

  return (
    <div className="stack">
      <section className="hero-card">
        <p className="eyebrow">Activity loop</p>
        <h2>동아리 일정과 활동 기록을 앱에서 바로 확인합니다.</h2>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2><CalendarDays size={14} aria-hidden="true" /> 월별 일정</h2>
          {monthSchedules.length > 0 && (
            <button
              type="button"
              className="button secondary compact"
              onClick={() => { void exportSchedulesIcs(monthSchedules, `COM's ${year}년 ${month + 1}월 일정`) }}
            >
              <CalendarPlus size={15} aria-hidden="true" /> 내보내기
            </button>
          )}
        </div>
        <div className="calendar-picker">
          <label>년도<input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())} /></label>
          <label>월<select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        <div className="list compact-list">
          {monthSchedules.map((item) => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={item.recurring
                ? `${formatActivityDate(item.eventDate)} · 정기 일정${item.timeLabel ? ` · ${item.timeLabel}` : ''}`
                : `${formatActivityDate(item.eventDate)} · ${categoryLabel(item.category)}`}
              body={item.description}
            />
          ))}
          {monthSchedules.length === 0 && <Empty text="선택한 달에 등록된 일정이 없습니다." />}
        </div>
      </section>

      {events.length > 0 && (
        <section className="panel">
          <div className="section-title">
            <h2><CalendarCheck size={14} aria-hidden="true" /> 동아리 이벤트</h2>
          </div>
          <div className="stack">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <strong>{event.title}</strong>
                <p className="muted">{formatDate(event.startsAt)}{event.description ? ` · ${event.description}` : ''}</p>
                <div className="rsvp-row">
                  {RSVP_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      type="button"
                      className={`button compact ${event.myRsvpStatus === option.status ? 'primary' : 'secondary'}`}
                      disabled={rsvpMutation.isPending}
                      onClick={() => rsvpMutation.mutate({ id: event.id, status: option.status })}
                    >
                      {option.label} {event[option.countKey] || 0}
                    </button>
                  ))}
                </div>
                {asArray(event.entries).length > 0 && (
                  <div className="entry-list">
                    <p className="entry-list-head"><Trophy size={13} aria-hidden="true" /> 출품작 {event.votingOpen ? '· 투표 진행 중' : '· 투표 마감'}</p>
                    {[...asArray(event.entries)].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((entry) => (
                      <div key={entry.id} className="entry-row">
                        <div className="entry-info">
                          <strong>{entry.rank ? `${entry.rank}위 · ` : ''}{entry.title}</strong>
                          {entry.authorName && <span className="muted"> · {entry.authorName}</span>}
                          {asArray(entry.files).map((file) => (
                            isSafeHttpUrl(file.downloadUrl) ? (
                              <a key={file.id} className="entry-file" href={file.downloadUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} aria-hidden="true" /> {file.originalName || '첨부파일'}</a>
                            ) : (
                              <span key={file.id} className="entry-file muted">{file.originalName || '첨부파일'}</span>
                            )
                          ))}
                        </div>
                        <button
                          type="button"
                          className={`button compact ${entry.myVote ? 'primary' : 'secondary'}`}
                          disabled={!event.votingOpen || voteMutation.isPending}
                          onClick={() => voteMutation.mutate({ eventId: event.id, entryId: entry.id })}
                          aria-pressed={Boolean(entry.myVote)}
                        >
                          <ThumbsUp size={14} aria-hidden="true" /> {entry.voteCount || 0}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {event.votingOpen && (
                  submitEventId === event.id ? (
                    <EntrySubmitForm
                      submitting={submitEntryMutation.isPending}
                      onSubmit={(meta, files) => submitEntryMutation.mutateAsync({ eventId: event.id, meta, files })}
                      onClose={() => setSubmitEventId(null)}
                    />
                  ) : (
                    <button type="button" className="button secondary compact entry-submit-btn" onClick={() => setSubmitEventId(event.id)}>
                      <Upload size={15} aria-hidden="true" /> 작품 제출
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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

      {clubProjects.length > 0 && (
        <section className="panel">
          <div className="section-title"><h2><Boxes size={14} aria-hidden="true" /> COM's 프로젝트</h2></div>
          <p className="muted">동아리에서 만든 웹사이트·앱·게임 모음입니다.</p>
          <div className="stack" style={{ marginTop: '0.6rem' }}>
            {clubProjects.map((project) => (
              <article key={project.id} className="project-card">
                {(project.categoryName || project.eyebrow) && <p className="eyebrow">{project.categoryName || project.eyebrow}</p>}
                <strong>{project.title}</strong>
                {project.description && <p className="item-body">{project.description}</p>}
                {project.madeBy && <p className="item-meta">만든 사람: {project.madeBy}</p>}
                <div className="button-row">
                  {isSafeHttpUrl(project.linkUrl) && (
                    <button type="button" className="button secondary compact" onClick={() => openService(project.linkUrl)}>
                      <ExternalLink size={14} aria-hidden="true" /> {project.displayUrl || '열기'}
                    </button>
                  )}
                  {asArray(project.files).map((file) => (
                    <button key={file.id} type="button" className="button secondary compact" onClick={() => openService(projectFileUrl(project.id, file.id))}>
                      <Download size={14} aria-hidden="true" /> {file.originalName || '다운로드'}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
