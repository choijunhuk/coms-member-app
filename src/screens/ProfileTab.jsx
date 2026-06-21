import { useMemo, useState } from 'react'
import { Bookmark, Eraser, FileText, LogOut, MessageCircle, Moon, RotateCcw, ShieldAlert, Smartphone, Sun, UserX } from 'lucide-react'
import { changePassword } from '../services/authApi.js'
import { formatDate, generationFromStudentId, preview } from '../utils/format.js'
import { passwordPolicyMessage, validPassword } from '../utils/passwordPolicy.js'
import { categoryLabels, latest } from '../utils/helpers.js'
import { readBookmarks } from '../utils/bookmarks.js'
import { postPreviewText } from '../utils/postBlocks.js'
import { Empty, Info, ListItem, Section } from '../components/ui.jsx'

const THEME_OPTIONS = [
  { id: 'system', label: '시스템', icon: Smartphone },
  { id: 'light', label: '라이트', icon: Sun },
  { id: 'dark', label: '다크', icon: Moon },
]

function postOwnedBy(post, user) {
  if (!post || !user) return false
  if (post.authorStudentId && user.studentId && String(post.authorStudentId) === String(user.studentId)) return true
  if (post.authorId && user.id && String(post.authorId) === String(user.id)) return true
  return false
}

function deletedByLabel(record) {
  const name = record?.deletedByName || '알 수 없음'
  return record?.deletedByStudentId ? `${name}(${record.deletedByStudentId})` : name
}

export default function ProfileTab({
  user,
  onLogout,
  onWithdraw,
  onWipeDevice,
  accountActionError = '',
  onShowPrivacy,
  themePreference = 'system',
  onChangeTheme,
  posts = [],
  deletedPosts = [],
  deletedPostsLoading = false,
  appealDeletedPost,
  appealBusy = false,
  openPost,
}) {
  const [withdrawError, setWithdrawError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [appealId, setAppealId] = useState(null)
  const [appealMessage, setAppealMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const passwordError = newPassword ? passwordPolicyMessage(newPassword) : ''
  const canSubmit = currentPassword.trim() && validPassword(newPassword)

  const myPosts = useMemo(
    () => latest(posts.filter((post) => postOwnedBy(post, user)), 'createdAt').slice(0, 8),
    [posts, user],
  )

  // Read once per ProfileTab mount/posts change. localStorage is cheap; rendering with stale ids
  // is fine because toggling happens from CommunityTab and writes synchronously.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bookmarkSet = useMemo(() => new Set(readBookmarks().map(String)), [posts])
  const bookmarkedPosts = useMemo(
    () => latest(posts.filter((post) => bookmarkSet.has(String(post.id))), 'createdAt'),
    [posts, bookmarkSet],
  )

  async function submit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setMessage('')
    setError('')
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('비밀번호가 변경되었습니다.')
    } catch (err) {
      setError(err.message || '비밀번호 변경 중 오류가 발생했습니다.')
    }
  }

  async function submitAppeal(record) {
    const clean = appealMessage.trim()
    if (!clean) {
      setError('복원 요청 사유를 입력해주세요.')
      return
    }
    setError('')
    await appealDeletedPost?.(record.id, clean)
    setAppealId(null)
    setAppealMessage('')
    setMessage('복원 요청이 접수되었습니다.')
  }

  return (
    <div className="stack">
      <section className="profile-card"><div className="avatar">{(user?.name || 'C').slice(0, 1)}</div><div><h2>{user?.name || '회원'}</h2><p>{user?.studentId || '학번 없음'} · {generationFromStudentId(user?.studentId)}</p></div></section>
      <section className="panel"><Info label="이메일 인증" value={user?.emailVerified ? '완료' : '미완료'} /><Info label="학과" value={user?.department || '미등록'} /><Info label="권한" value={user?.role === 'ADMIN' ? '관리자' : '회원'} /></section>
      <Section title={<><MessageCircle size={14} aria-hidden="true" /> 내가 쓴 글</>}>
        {myPosts.map((post) => (
          <ListItem
            key={post.id}
            title={post.title}
            meta={`${categoryLabels[post.category] || '자유'} · ${formatDate(post.createdAt)}`}
            body={postPreviewText(post) || preview(post.content)}
            onClick={() => openPost?.(post.id)}
          />
        ))}
        {myPosts.length === 0 && <Empty text="아직 작성한 글이 없습니다." />}
      </Section>
      <Section title={<><ShieldAlert size={14} aria-hidden="true" /> 삭제된 내 글</>}>
        {deletedPostsLoading && <Empty text="삭제 기록을 불러오는 중입니다." />}
        {!deletedPostsLoading && deletedPosts.map((record) => {
          const restored = Boolean(record.restoredPostId)
          const appealed = Boolean(record.latestAppealStatus)
          return (
            <article key={record.id} className="deleted-record">
              <div className="deleted-record-head">
                <strong>{record.title}</strong>
                <span className={restored ? 'status-pill restored' : 'status-pill deleted'}>{restored ? '복원됨' : '삭제됨'}</span>
              </div>
              <p className="item-meta">처리자 {deletedByLabel(record)} · {formatDate(record.deletedAt)}</p>
              <p className="item-body">사유: {record.deletionReason || '사유 없음'}</p>
              <p className="item-body">원문: {postPreviewText(record) || preview(record.content)}</p>
              {restored ? (
                <button type="button" className="button secondary compact" onClick={() => openPost?.(record.restoredPostId)}><RotateCcw size={14} aria-hidden="true" /> 복원된 글 열기</button>
              ) : appealed ? (
                <p className="trust-note">복원 요청 접수됨: {record.latestAppealMessage}</p>
              ) : appealId === record.id ? (
                <div className="appeal-box">
                  <textarea value={appealMessage} onChange={(event) => setAppealMessage(event.target.value)} maxLength={500} rows={3} placeholder="복원이 필요한 이유를 적어주세요." />
                  <div className="button-row">
                    <button type="button" className="button primary compact" disabled={appealBusy} onClick={() => submitAppeal(record)}>{appealBusy ? '보내는 중' : '요청 보내기'}</button>
                    <button type="button" className="button secondary compact" onClick={() => { setAppealId(null); setAppealMessage('') }}>취소</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="button secondary compact" onClick={() => setAppealId(record.id)}><RotateCcw size={14} aria-hidden="true" /> 복원 요청</button>
              )}
            </article>
          )
        })}
        {!deletedPostsLoading && deletedPosts.length === 0 && <Empty text="삭제된 내 글이 없습니다." />}
      </Section>
      <Section title={<><Bookmark size={14} aria-hidden="true" /> 북마크</>}>
        {bookmarkedPosts.map((post) => (
          <ListItem
            key={post.id}
            title={post.title}
            meta={`${categoryLabels[post.category] || '자유'} · ${formatDate(post.createdAt)}`}
            body={postPreviewText(post) || preview(post.content)}
            onClick={() => openPost?.(post.id)}
          />
        ))}
        {bookmarkedPosts.length === 0 && <Empty text="아직 북마크한 글이 없습니다. 글 상세에서 별표로 추가하세요." />}
      </Section>
      <section className="panel">
        <div className="section-title">
          <h2>테마</h2>
        </div>
        <div className="segments">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={themePreference === id ? 'active' : ''}
              onClick={() => onChangeTheme?.(id)}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </section>
      <form className="form panel" onSubmit={submit}>
        <h2>비밀번호 변경</h2>
        <label>현재 비밀번호<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
        <label>새 비밀번호<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="영문·숫자·특수문자 포함 8자 이상" /></label>
        {passwordError && <p className="form-error">{passwordError}</p>}
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="button primary" disabled={!canSubmit}>변경</button>
      </form>
      <section className="panel">
        <div className="section-title">
          <h2>계정</h2>
        </div>
        <div className="stack">
          <button type="button" className="button secondary" onClick={onShowPrivacy}><FileText size={16} aria-hidden="true" /> 개인정보 처리방침 보기</button>
          <button
            type="button"
            className="button secondary"
            disabled={busyAction === 'wipe'}
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm('이 기기에 저장된 캐시·북마크·테마 설정을 모두 지우고 로그아웃합니다. 계속할까요?')) return
              setBusyAction('wipe')
              try { await onWipeDevice?.() } finally { setBusyAction('') }
            }}
          >
            <Eraser size={16} aria-hidden="true" /> 이 기기에서 데이터 지우기
          </button>
          <button
            type="button"
            className="button danger"
            disabled={busyAction === 'withdraw'}
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm('정말로 회원에서 탈퇴할까요? 작성한 글과 댓글도 함께 삭제되며 되돌릴 수 없습니다.')) return
              setBusyAction('withdraw')
              setWithdrawError('')
              try {
                await onWithdraw?.()
              } catch (err) {
                setWithdrawError(err?.message || '회원 탈퇴 처리 중 오류가 발생했습니다.')
              } finally {
                setBusyAction('')
              }
            }}
          >
            <UserX size={16} aria-hidden="true" /> 회원 탈퇴
          </button>
          {(withdrawError || accountActionError) && <p className="form-error">{withdrawError || accountActionError}</p>}
        </div>
      </section>
      <button
        type="button"
        className="button danger"
        disabled={busyAction === 'logout'}
        onClick={async () => {
          setBusyAction('logout')
          setWithdrawError('')
          try {
            await onLogout?.()
          } catch (err) {
            setWithdrawError(err?.message || '로그아웃에 실패했습니다.')
          } finally {
            setBusyAction('')
          }
        }}
      >
        <LogOut size={17} />{busyAction === 'logout' ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  )
}
