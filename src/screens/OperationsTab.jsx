import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Edit3, Loader2, RefreshCcw, ShieldCheck, Trash2, Users } from 'lucide-react'
import { listAuditLogs, listEligibleMembers, listMembers } from '../services/adminApi.js'
import { deleteCommunityPost } from '../services/communityApi.js'
import { createNotice, updateNotice } from '../services/noticeApi.js'
import { asArray, formatDate, generationFromStudentId, plainText } from '../utils/format.js'
import { categoryLabels, isAdminUser, latest } from '../utils/helpers.js'
import { Empty, Info, ListItem, Metric, Section } from '../components/ui.jsx'

export default function OperationsTab({ user, notices, posts, loadDashboard }) {
  const [noticeId, setNoticeId] = useState('')
  const [noticeTitle, setNoticeTitle] = useState('')
  const [noticeContent, setNoticeContent] = useState('')
  const [noticePinned, setNoticePinned] = useState(true)
  const [savingNotice, setSavingNotice] = useState(false)
  const [deletingPostId, setDeletingPostId] = useState(null)
  const [eligibleMembers, setEligibleMembers] = useState([])
  const [members, setMembers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingOps, setLoadingOps] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const recentPosts = latest(posts, 'createdAt').slice(0, 5)
  const recentNotices = latest(notices, 'createdAt').slice(0, 12)
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
      category: 'GENERAL',
    }
    try {
      if (noticeId) await updateNotice(noticeId, payload)
      else await createNotice(payload)
      setMessage(noticeId ? '공지가 수정되었습니다.' : '공지가 등록되었습니다.')
      setNoticeId('')
      setNoticeTitle('')
      setNoticeContent('')
      setNoticePinned(true)
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

  if (!isAdminUser(user)) {
    return <section className="empty-panel"><ShieldCheck size={24} aria-hidden="true" /><p>운영진 권한이 필요합니다.</p></section>
  }

  return (
    <div className="stack">
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
