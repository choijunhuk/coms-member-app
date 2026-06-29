import { useCallback, useEffect, useState } from 'react'
import { AppWindow, CalendarDays, CheckCircle2, Edit3, Loader2, RefreshCcw, ShieldCheck, Sparkles, Trash2, Users } from 'lucide-react'
import { listAuditLogs, listEligibleMembers, listMembers } from '../services/adminApi'
import { categoryLabel, createClubActivity } from '../services/clubActivityApi'
import { createApp, deleteApp, updateApp } from '../services/appCatalogApi'
import { deleteCommunityPost } from '../services/communityApi'
import { createNotice, updateNotice } from '../services/noticeApi'
import { asArray, formatDate, generationFromStudentId, plainText } from '../utils/format'
import { categoryLabels, isAdminUser, latest, noticeCategoryLabels } from '../utils/helpers'
import { validateHttpUrl } from '../utils/urlValidation'
import { Empty, Info, ListItem, Metric, Section } from '../components/ui'
import type { AppItem, ClubActivity, CommunityPost, CurrentUser, Notice } from '../contract/types'

const ACTIVITY_CATEGORIES = ['GENERAL', 'SEMINAR', 'STUDY', 'PROJECT', 'MEETING', 'RECRUIT', 'EVENT', 'MT', 'ACHIEVEMENT']

type AdminRecord = {
  id?: string | number | null
  studentId?: string | number | null
  name?: string | null
  generation?: string | number | null
  action?: string | null
  actorName?: string | null
  actorStudentId?: string | number | null
  createdAt?: string | null
  targetType?: string | null
  targetId?: string | number | null
}

type OperationsTabProps = {
  user?: CurrentUser | null
  notices: Notice[]
  posts: CommunityPost[]
  clubActivities?: ClubActivity[]
  apps?: AppItem[]
  loadDashboard: (options?: { quiet?: boolean }) => void | Promise<void>
}

export default function OperationsTab({ user, notices, posts, clubActivities = [], apps = [], loadDashboard }: OperationsTabProps) {
  const [noticeId, setNoticeId] = useState('')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticePinned, setNoticePinned] = useState(true)
  const [noticeCategory, setNoticeCategory] = useState('GENERAL')
  const [savingNotice, setSavingNotice] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState<unknown>(null)
  const [eligibleMembers, setEligibleMembers] = useState<AdminRecord[]>([])
  const [members, setMembers] = useState<AdminRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminRecord[]>([])
  const [loadingOps, setLoadingOps] = useState(false)
  const [activityKind, setActivityKind] = useState('SCHEDULE')
  const [activityTitle, setActivityTitle] = useState('')
  const [activityDate, setActivityDate] = useState('')
  const [activityCategory, setActivityCategory] = useState('MEETING')
  const [activityDescription, setActivityDescription] = useState('')
  const [activityImage, setActivityImage] = useState<File | null>(null)
  const [activityFileKey, setActivityFileKey] = useState(0)
  const [savingActivity, setSavingActivity] = useState(false)
  const [appId, setAppId] = useState('')
  const [appTitle, setAppTitle] = useState('')
  const [appEyebrow, setAppEyebrow] = useState('')
  const [appBody, setAppBody] = useState('')
  const [appHref, setAppHref] = useState('')
  const [appSortOrder, setAppSortOrder] = useState('0')
  const [savingApp, setSavingApp] = useState(false)
  const [deletingAppId, setDeletingAppId] = useState<unknown>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const recentPosts = latest(posts, 'createdAt').slice(0, 5)
  const recentNotices = latest(notices, 'createdAt').slice(0, 12)
  const recentClubActivities = latest(clubActivities, 'eventDate').slice(0, 5)
  const pendingRoster = asArray(eligibleMembers).filter((item) => !asArray(members).some((member) => member.studentId && member.studentId === item.studentId))

  const loadOperations = useCallback(async () => {
    if (!isAdminUser(user)) return
    setLoadingOps(true)
    setError('')
    try {
      const [eligible, memberList, logs] = await Promise.all([listEligibleMembers(), listMembers(), listAuditLogs()])
      setEligibleMembers(asArray(eligible))
      setMembers(asArray(memberList))
      setAuditLogs(asArray(logs).slice(0, 5))
    } catch (err) {
      setError(err.message || '운영진 데이터를 불러오지 못했습니다.')
    } finally {
      setLoadingOps(false)
    }
  }, [user])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOperations()
    })
    return () => {
      cancelled = true
    }
  }, [loadOperations])

  function chooseNotice(id) {
    setNoticeId(id)
    const selected = recentNotices.find((notice) => String(notice.id) === String(id))
    setNoticeTitle(selected?.title || '')
    setNoticeContent(plainText(selected?.content || ''))
    setNoticePinned(Boolean(selected?.pinned))
    setNoticeCategory(selected?.category || 'GENERAL')
  }

  async function submitNotice(event) {
    event.preventDefault()
    if (!noticeTitle.trim() || !noticeContent.trim()) return
    setSavingNotice(true)
    setMessage('')
    setError('')
    const payload = {
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      author: user?.name || '운영진',
      pinned: noticePinned,
      category: noticeCategory,
    }
    try {
      if (noticeId) await updateNotice(noticeId, payload)
      else await createNotice(payload)
      setMessage(noticeId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.')
      setNoticeId('')
      setNoticeTitle('')
      setNoticeContent('')
      setNoticePinned(true)
      setNoticeCategory('GENERAL')
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '공지 저장에 실패했습니다.')
    } finally {
      setSavingNotice(false)
    }
  }

  async function removePost(postId) {
    setDeletingPostId(postId)
    setMessage('')
    setError('')
    try {
      await deleteCommunityPost(postId)
      setMessage('커뮤니티 글을 삭제했습니다.')
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '글 삭제에 실패했습니다.')
    } finally {
      setDeletingPostId(null)
    }
  }

  async function submitActivity(event) {
    event.preventDefault()
    if (!activityTitle.trim() || !activityDate) return
    setSavingActivity(true)
    setMessage('')
    setError('')
    try {
      await createClubActivity({
        kind: activityKind,
        category: activityCategory,
        title: activityTitle.trim(),
        description: activityDescription.trim(),
        eventDate: activityDate,
        image: activityImage,
      })
      setMessage(activityKind === 'SCHEDULE' ? '일정을 등록했습니다.' : '활동 기록을 등록했습니다.')
      setActivityTitle('')
      setActivityDate('')
      setActivityDescription('')
      setActivityImage(null)
      setActivityFileKey((value) => value + 1)
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '활동 정보를 저장하지 못했습니다.')
    } finally {
      setSavingActivity(false)
    }
  }

  function resetAppForm() {
    setAppId('')
    setAppTitle('')
    setAppEyebrow('')
    setAppBody('')
    setAppHref('')
    setAppSortOrder('0')
  }

  function chooseApp(app) {
    setAppId(app.id)
    setAppTitle(app.title || '')
    setAppEyebrow(app.eyebrow || '')
    setAppBody(app.body || '')
    setAppHref(app.href || '')
    setAppSortOrder(String(app.sortOrder ?? 0))
  }

  async function submitApp(event) {
    event.preventDefault()
    if (!appTitle.trim()) return
    const hrefValidation = validateHttpUrl(appHref, { allowEmpty: true })
    if (!hrefValidation.ok) {
      setError(hrefValidation.message)
      return
    }
    setSavingApp(true)
    setMessage('')
    setError('')
    const payload = {
      title: appTitle.trim(),
      eyebrow: appEyebrow.trim(),
      body: appBody.trim(),
      href: hrefValidation.url,
      sortOrder: Number(appSortOrder) || 0,
    }
    try {
      if (appId) await updateApp(appId, payload)
      else await createApp(payload)
      setMessage(appId ? '앱을 수정했습니다.' : '앱을 등록했습니다.')
      resetAppForm()
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '앱 저장에 실패했습니다.')
    } finally {
      setSavingApp(false)
    }
  }

  async function removeApp(id) {
    setDeletingAppId(id)
    setMessage('')
    setError('')
    try {
      await deleteApp(id)
      setMessage('앱을 삭제했습니다.')
      if (String(appId) === String(id)) resetAppForm()
      await loadDashboard({ quiet: true })
    } catch (err) {
      setError(err.message || '앱 삭제에 실패했습니다.')
    } finally {
      setDeletingAppId(null)
    }
  }

  if (!isAdminUser(user)) {
    return <section className="empty-panel"><ShieldCheck size={24} aria-hidden="true" /><p>운영진 권한이 필요합니다.</p></section>
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <h2>{activityKind === 'SCHEDULE' ? <CalendarDays size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} 활동/일정 등록</h2>
        </div>
        <form className="form" onSubmit={submitActivity}>
          <label>
            등록 유형
            <select value={activityKind} onChange={(event) => setActivityKind(event.target.value)}>
              <option value="SCHEDULE">일정</option>
              <option value="ACTIVITY">활동 기록</option>
            </select>
          </label>
          <label>제목<input value={activityTitle} onChange={(event) => setActivityTitle(event.target.value)} maxLength={120} /></label>
          <label>날짜<input type="date" value={activityDate} onChange={(event) => setActivityDate(event.target.value)} /></label>
          <label>
            분류
            <select value={activityCategory} onChange={(event) => setActivityCategory(event.target.value)}>
              {ACTIVITY_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
            </select>
          </label>
          <label>설명<textarea value={activityDescription} onChange={(event) => setActivityDescription(event.target.value)} rows={3} /></label>
          <label>사진<input key={activityFileKey} type="file" accept="image/*" onChange={(event) => setActivityImage(event.target.files?.[0] || null)} /></label>
          <button className="button primary" type="submit" disabled={savingActivity || !activityTitle.trim() || !activityDate}>
            {savingActivity ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}등록
          </button>
        </form>
      </section>
      <Section title="최근 활동/일정">
        {recentClubActivities.map((item) => <ListItem key={item.id} title={item.title} meta={`${item.kind === 'SCHEDULE' ? '일정' : '활동'} · ${categoryLabel(item.category)} · ${formatDate(item.eventDate)}`} body={item.description} />)}
        {recentClubActivities.length === 0 && <Empty text="최근 등록된 활동/일정이 없습니다." />}
      </Section>
      <section className="panel">
        <div className="section-title">
          <h2><AppWindow size={14} aria-hidden="true" /> COMS Apps 관리</h2>
          <button type="button" onClick={resetAppForm}><Edit3 size={15} aria-hidden="true" /> 새 앱</button>
        </div>
        <form className="form" onSubmit={submitApp}>
          <label>제목<input value={appTitle} onChange={(event) => setAppTitle(event.target.value)} maxLength={120} /></label>
          <label>부제목<input value={appEyebrow} onChange={(event) => setAppEyebrow(event.target.value)} maxLength={60} /></label>
          <label>설명<textarea value={appBody} onChange={(event) => setAppBody(event.target.value)} rows={3} /></label>
          <label>링크<input value={appHref} onChange={(event) => setAppHref(event.target.value)} maxLength={500} placeholder="https://" /></label>
          <label>정렬 순서<input type="number" value={appSortOrder} onChange={(event) => setAppSortOrder(event.target.value)} /></label>
          <button className="button primary" type="submit" disabled={savingApp || !appTitle.trim()}>
            {savingApp ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}{appId ? '수정' : '등록'}
          </button>
        </form>
        <div className="list compact-list">
          {asArray(apps).map((app) => (
            <div className="admin-row" key={app.id}>
              <div>
                <strong>{app.title}</strong>
                <span>{[app.eyebrow, app.href].filter(Boolean).join(' · ') || '링크 없음'}</span>
              </div>
              <div className="admin-row-actions">
                <button type="button" className="icon-button" onClick={() => chooseApp(app)} aria-label="앱 수정">
                  <Edit3 size={17} aria-hidden="true" />
                </button>
                <button type="button" className="icon-button danger" onClick={() => removeApp(app.id)} disabled={deletingAppId === app.id} aria-label="앱 삭제">
                  {deletingAppId === app.id ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
                </button>
              </div>
            </div>
          ))}
          {asArray(apps).length === 0 && <Empty text="등록된 앱이 없습니다." />}
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>공지 작성/수정</h2>
          <button type="button" onClick={() => chooseNotice('')}><Edit3 size={15} aria-hidden="true" /> 새 공지</button>
        </div>
        <form className="form" onSubmit={submitNotice}>
          <label>
            수정할 공지
            <select value={noticeId} onChange={(event) => chooseNotice(event.target.value)}>
              <option value="">새 공지 작성</option>
              {recentNotices.map((notice) => <option key={notice.id} value={notice.id}>{notice.title}</option>)}
            </select>
          </label>
          <label>제목<input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} maxLength={255} /></label>
          <label>
            분류
            <select value={noticeCategory} onChange={(event) => setNoticeCategory(event.target.value)}>
              {Object.entries(noticeCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>내용<textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} rows={5} /></label>
          <label className="check-row"><input type="checkbox" checked={noticePinned} onChange={(event) => setNoticePinned(event.target.checked)} />중요 공지로 표시</label>
          <button className="button primary" type="submit" disabled={savingNotice || !noticeTitle.trim() || !noticeContent.trim()}>
            {savingNotice ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}저장
          </button>
        </form>
      </section>
      <Section title="문제 글 빠른 확인">
        {recentPosts.map((post) => (
          <div className="admin-row" key={post.id}>
            <div>
              <strong>{post.title}</strong>
              <span>{categoryLabels[post.category] || '자유'} · 댓글 {post.commentCount || 0} · {formatDate(post.createdAt)}</span>
            </div>
            <button type="button" className="icon-button danger" onClick={() => removePost(post.id)} disabled={deletingPostId === post.id} aria-label="글 삭제">
              {deletingPostId === post.id ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
            </button>
          </div>
        ))}
        {recentPosts.length === 0 && <Empty text="확인할 커뮤니티 글이 없습니다." />}
      </Section>
      <section className="panel">
        <div className="section-title">
          <h2>회원 승인 상태</h2>
          <button type="button" onClick={loadOperations} disabled={loadingOps}><RefreshCcw size={15} className={loadingOps ? 'spin' : ''} aria-hidden="true" /> 새로고침</button>
        </div>
        <div className="metric-grid">
          <Metric icon={Users} label="가입 회원" value={members.length} />
          <Metric icon={ShieldCheck} label="명부 대기" value={pendingRoster.length} />
        </div>
        <div className="list compact-list">
          {pendingRoster.slice(0, 5).map((item) => <Info key={item.id || item.studentId || item.name} label={`${item.name || '이름 없음'} · ${item.generation || generationFromStudentId(item.studentId)}`} value={item.studentId || '졸업생'} />)}
          {pendingRoster.length === 0 && <Empty text="명부 기준 대기자가 없습니다." />}
        </div>
      </section>
      <Section title="최근 운영 기록">
        {auditLogs.map((log) => <ListItem key={log.id} title={log.action || '운영 기록'} meta={`${log.actorName || log.actorStudentId || '운영진'} · ${formatDate(log.createdAt)}`} body={log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}` : ''} />)}
        {auditLogs.length === 0 && <Empty text="최근 운영 기록이 없습니다." />}
      </Section>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
