import { useMemo, useState } from 'react'
import { Bookmark, LogOut, MessageCircle, Moon, Smartphone, Sun } from 'lucide-react'
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

export default function ProfileTab({ user, onLogout, themePreference = 'system', onChangeTheme, posts = [], openPost }) {
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
      <button type="button" className="button danger" onClick={onLogout}><LogOut size={17} />로그아웃</button>
    </div>
  )
}
