import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, CalendarDays, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { downloadUrl } from '../services/archiveApi'
import { formatActivityDate, listScheduleOccurrences, mergeMonthSchedule, nextSchedules, recentActivities } from '../services/clubActivityApi'
import { asArray, formatDate } from '../utils/format'
import { categoryLabels, fileCategoryLabels, latest, postImage } from '../utils/helpers'
import { postPreviewText, contentPreview } from '../utils/postBlocks'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { ListItem, Metric, Section } from '../components/ui'
import ClubRoomCard from '../components/ClubRoomCard'
import type { ClubActivity, ArchiveFile, CommunityPost, Notice } from '../contract/types'

// 다가오는 일정은 달 경계를 넘어가므로 이번 달과 다음 달 두 번을 펼쳐 옵니다.
// (월말에 이번 달만 조회하면 "다음 일정 없음"으로 보였습니다.)
function upcomingOccurrenceMonths(reference: Date) {
  const next = new Date(reference.getFullYear(), reference.getMonth() + 1, 1)
  return [
    { year: reference.getFullYear(), month: reference.getMonth() + 1 },
    { year: next.getFullYear(), month: next.getMonth() + 1 },
  ]
}

type HomeTabProps = {
  notices: Notice[]
  posts: CommunityPost[]
  files: ArchiveFile[]
  unreadCount: number
  clubActivities?: ClubActivity[]
  openNotice: (id: unknown) => void
  openPost: (id: unknown) => void
  setActiveTab: (tabId: string) => void
}

export default function HomeTab({ notices, posts, files, unreadCount, clubActivities = [], openNotice, openPost, setActiveTab }: HomeTabProps) {
  const site = useSiteSettings()
  const recentNotices = latest(notices, 'createdAt').slice(0, 3)
  const recentPosts = latest(posts, 'createdAt').slice(0, 3)
  const recentFiles = latest(files, 'uploadedAt').slice(0, 2)
  const latestActivities = recentActivities(clubActivities, 2)

  // 정기 일정은 별도 엔드포인트에서 월 단위로 펼쳐져 옵니다. 부가 정보이므로
  // 실패해도 일회성 일정 목록을 비우면 안 됩니다 — 재시도 없이 빈 배열로.
  const months = useMemo(() => upcomingOccurrenceMonths(new Date()), [])
  const occurrencesQuery = useQuery({
    queryKey: ['member-app', 'schedule-occurrences-upcoming', months.map((item) => `${item.year}-${item.month}`).join(',')],
    queryFn: async () => {
      const pages = await Promise.all(months.map((item) => listScheduleOccurrences(item.year, item.month)))
      return pages.flat()
    },
    retry: false,
  })
  const upcomingSchedules = useMemo(
    () => nextSchedules(mergeMonthSchedule(clubActivities, asArray(occurrencesQuery.data)), new Date(), 2),
    [clubActivities, occurrencesQuery.data],
  )

  return (
    <div className="stack">
      <section className="hero-card">
        <p className="eyebrow">{site.semesterLabel}</p>
        <h2>오늘 볼 일정, 활동, 공지, 자료를 한 화면에서 확인합니다.</h2>
        <span className="badge">{site.recruitmentStatus}</span>
      </section>
      <ClubRoomCard />
      <div className="metric-grid">
        <Metric icon={Bell} label="공지" value={recentNotices.length} />
        <Metric icon={CalendarDays} label="예정" value={upcomingSchedules.length} />
        <Metric icon={MessageCircle} label="최근 글" value={recentPosts.length} />
        <Metric icon={ShieldCheck} label="알림" value={unreadCount} />
      </div>
      {upcomingSchedules.length > 0 && (
        <Section title="다가오는 일정" action="활동" onAction={() => setActiveTab('activity')}>
          {upcomingSchedules.map((item) => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={item.recurring
                ? `${formatActivityDate(item.eventDate)} · 정기 일정${item.timeLabel ? ` · ${item.timeLabel}` : ''}`
                : formatActivityDate(item.eventDate)}
              body={item.description || '월별 캘린더에 등록된 일정입니다.'}
            />
          ))}
        </Section>
      )}
      {latestActivities.length > 0 && (
        <Section title="최근 활동" action="전체" onAction={() => setActiveTab('activity')}>
          {latestActivities.map((item) => <ListItem key={item.id} title={item.title} meta={formatActivityDate(item.eventDate)} body={item.description || '활동 로그에 등록된 기록입니다.'}><span className="media-chip"><Sparkles size={14} />활동</span></ListItem>)}
        </Section>
      )}
      {recentNotices.length > 0 && (
        <Section title="최신 공지" action="전체" onAction={() => setActiveTab('notices')}>
          {recentNotices.map((notice) => <ListItem key={notice.id} title={notice.title} pinned={notice.pinned} meta={formatDate(notice.createdAt)} body={contentPreview(notice.content)} onClick={() => openNotice(notice.id)} />)}
        </Section>
      )}
      {recentPosts.length > 0 && (
        <Section title="최근 커뮤니티" action="전체" onAction={() => setActiveTab('community')}>
          {recentPosts.map((post) => <ListItem key={post.id} title={post.title} meta={`${categoryLabels[post.category] || '자유'} · 댓글 ${post.commentCount || 0}`} body={postPreviewText(post)} image={postImage(post)} onClick={() => openPost(post.id)} />)}
        </Section>
      )}
      {recentFiles.length > 0 && (
        <Section title="빠른 자료실" action="열기" onAction={() => setActiveTab('resources')}>
          {recentFiles.map((file) => <ListItem key={file.id} title={file.title} meta={fileCategoryLabels[file.category] || '일반'} body={file.originalName} onClick={() => window.open(downloadUrl(file.id), '_blank', 'noopener,noreferrer')} />)}
        </Section>
      )}
    </div>
  )
}
